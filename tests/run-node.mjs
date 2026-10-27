import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import mysql from 'mysql2/promise';

// Creates and removes ONLY a fresh, randomly named local test database.
const host=process.env.DB_HOST||'127.0.0.1';
assert(['127.0.0.1','localhost'].includes(host),'Tests require a local MySQL server. Never use a production connection.');
const connection=await mysql.createConnection({host,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||''});
const database='getconnect_qa_'+randomBytes(8).toString('hex');
await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
const portServer=createServer();portServer.listen(0,'127.0.0.1');await once(portServer,'listening');
const port=portServer.address().port;await new Promise(resolve=>portServer.close(resolve));
const origin=`http://127.0.0.1:${port}`,password=randomBytes(24).toString('base64url'),salt=randomBytes(16);
const hash=`pbkdf2-sha256$100000$${salt.toString('hex')}$${pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}`;
const env={...process.env,DB_HOST:host,DB_PORT:String(process.env.DB_PORT||3306),DB_USER:process.env.DB_USER||'root',DB_PASSWORD:process.env.DB_PASSWORD||'',DB_NAME:database,ADMIN_USERNAME:'admin',ADMIN_PASSWORD_HASH:hash,APP_URL:origin,PORT:String(port),RESEND_API_KEY:'',MAIL_FROM:'',NEXT_TELEMETRY_DISABLED:'1'};
let child,logs='';
async function start(){
 child=spawn(process.execPath,['scripts/start.mjs'],{env,stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{logs=(logs+chunk).slice(-12000);});
 for(let i=0;i<150;i++){
  if(child.exitCode!==null)throw new Error('Server exited: '+logs);
  try{if((await fetch(origin)).ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw new Error('Server startup timed out: '+logs);
}
async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}}
try{
 await start();process.env.QA_ADMIN_PASSWORD=password;process.argv[2]=origin;
 await import('./integration.mjs');
 // Reset the fixture's intentional failed-login rate limit before further checks.
 await connection.query(`DELETE FROM \`${database}\`.admin_login_attempts`);
 const login=await fetch(origin+'/api/admin/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password})});
 assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const headers={Origin:origin,cookie,'Content-Type':'application/json'};
 const png=await readFile(new URL('../public/assets/logo.png',import.meta.url));
 const data={company:'Hostinger QA байгууллага',chapter:'BNI NEXUS',sector:'Технологи',description:'Hostinger MySQL орчинд ажиллах бүртгэлийн туршилт.',audience:'B2B',contact:'Туршилт',position:'QA',phone:'99990000',email:'mysql-qa@example.invalid',website:'',notes:'',consent:true,honeypot:'',meetings:[{company:'Түнш',person:'Харилцагч',goal:'Уулзалт'}]};
 const apply=async(booths,logo=png)=>{
  const form=new FormData();form.set('data',JSON.stringify({...data,booths,email:randomBytes(8).toString('hex')+'@example.invalid'}));
  form.set('logo',new Blob([logo],{type:'image/png'}),'qa.png');
  const r=await fetch(origin+'/api/applications',{method:'POST',headers:{Origin:origin},body:form});return {status:r.status,data:await r.json()};
 };
 const decide=(id,action)=>fetch(origin+'/api/admin',{method:'POST',headers,body:JSON.stringify({id,action,reason:'Local MySQL QA'})});
 const before=await connection.query(`SELECT COUNT(*) n FROM \`${database}\`.logos`);
 const races=await Promise.all([apply(['75','76']),apply(['76','77'])]);
 assert.deepEqual(races.map(r=>r.status).sort(),[201,409],JSON.stringify(races));
 const winner=races.find(r=>r.status===201);const [reservations]=await connection.query(`SELECT booth_id FROM \`${database}\`.reservations WHERE application_id=?`,[winner.data.id]);
 assert.equal(reservations.length,2);
 const [logos]=await connection.query(`SELECT COUNT(*) n FROM \`${database}\`.logos`);
 assert.equal(logos[0].n,before[0][0].n+1,'Conflicting upload must be cleaned up');
 await decide(winner.data.id,'cancel');
 // A complete 5 MB upload spans multiple packet-safe rows and survives a process restart.
 const large=Buffer.alloc(5_000_000);png.copy(large);
 const persistent=await apply(['79'],large);assert.equal(persistent.status,201,JSON.stringify(persistent));
 assert.equal((await decide(persistent.data.id,'approve')).status,200);
 let expo=await (await fetch(origin+'/api/expo')).json();const logo=expo.exhibitors.find(x=>x.id===persistent.data.id).logo;
 assert.deepEqual(Buffer.from(await (await fetch(origin+logo)).arrayBuffer()),large);
 await stop();await start();
 assert.equal((await fetch(origin+'/api/admin',{headers:{cookie}})).status,200,'Sessions survive restarts');
 assert.deepEqual(Buffer.from(await (await fetch(origin+logo)).arrayBuffer()),large,'Logo survives restart');
 assert((await (await fetch(origin+'/api/expo')).json()).exhibitors.some(x=>x.id===persistent.data.id));
 const settings=await fetch(origin+'/api/admin',{method:'POST',headers,body:JSON.stringify({action:'settings',values:{contact_phone:'99990000',chapters:'QA Chapter'}})});assert.equal(settings.status,200);
 assert.equal((await (await fetch(origin+'/api/expo')).json()).settings.contact_phone,'99990000');
 const expired=await apply(['80']);assert.equal(expired.status,201);
 await connection.query(`UPDATE \`${database}\`.applications SET expires_at=? WHERE id=?`,[Date.now()-1000,expired.data.id]);
 expo=await (await fetch(origin+'/api/expo')).json();assert(!expo.occupancy.some(x=>x.boothId==='80'));
 const [expiredRows]=await connection.query(`SELECT status FROM \`${database}\`.applications WHERE id=?`,[expired.data.id]);assert.equal(expiredRows[0].status,'expired');
 const contested=await apply(['81']);assert.equal(contested.status,201);
 const decisions=await Promise.all([decide(contested.data.id,'approve'),decide(contested.data.id,'cancel')]);
 assert(decisions.every(r=>[200,409].includes(r.status)));
 const [final]=await connection.query(`SELECT status FROM \`${database}\`.applications WHERE id=?`,[contested.data.id]);
 const [held]=await connection.query(`SELECT booth_id FROM \`${database}\`.reservations WHERE application_id=?`,[contested.data.id]);
 assert.equal(held.length,final[0].status==='approved'?1:0,'Concurrent decisions preserve inventory');
 console.log('PASS: real MySQL transaction races, failed-upload cleanup, 5 MB chunked logos, restart durability, persisted sessions/settings, expiry and concurrent admin decisions.');
 for(const path of ['/','/exhibitors','/register','/program','/admin/login','/status?token=invalid','/assets/hero-exterior.webp','/fonts/Montserrat.ttf'])assert.equal((await fetch(origin+path)).status,200,path);
 console.log('PASS: production Next.js pages and public assets.');
 // Hostinger terminates HTTPS before the Node server; APP_URL remains authoritative.
 await stop();env.APP_URL='https://getconnect.business';await start();
 const proxied=await fetch(origin+'/api/admin/session',{method:'POST',headers:{Origin:env.APP_URL,'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password})});
 assert.equal(proxied.status,200);assert(proxied.headers.get('set-cookie').includes('; Secure'));
 const wrongOrigin=await fetch(origin+'/api/admin/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password})});assert.equal(wrongOrigin.status,403);
 console.log('PASS: HTTPS proxy origin validation and Secure admin cookies behind HTTP upstream.');
}catch(error){console.error(logs);throw error;}
finally{delete process.env.QA_ADMIN_PASSWORD;await stop();await connection.query(`DROP DATABASE \`${database}\``);await connection.end();}
