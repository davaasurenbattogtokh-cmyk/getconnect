import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const origin=process.argv[2]||'http://127.0.0.1:4173';
assert(['127.0.0.1','localhost','terminal.local'].includes(new URL(origin).hostname),'Integration tests are local-only.');
let owner={};
const qaPassword=process.env.QA_ADMIN_PASSWORD;assert(qaPassword,'Run the isolated Worker test harness to supply ephemeral test credentials.');
async function request(path,init={}){const response=await fetch(origin+path,init);const data=await response.json();return {response,data};}
const content={company:'QA туршилтын байгууллага',chapter:'QA Chapter',sector:'Технологи',description:'Зөвхөн local орчинд шалгах туршилтын байгууллагын танилцуулга.',audience:'B2B + B2C',contact:'QA хэрэглэгч',position:'QA',phone:'99990000',email:'qa@example.invalid',website:'https://example.com',notes:'Туршилтын өгөгдөл',consent:true,honeypot:'',meetings:[{company:'QA түнш',person:'QA хүн',goal:'Хамтын ажиллагаа ярилцах'}]};
const logo=await readFile(new URL('../public/assets/logo.png',import.meta.url));
async function apply(booths,email=content.email,extra={}){const fd=new FormData();fd.set('data',JSON.stringify({...content,booths,email,...extra}));fd.set('logo',new Blob([logo],{type:'image/png'}),'qa-logo.png');return request('/api/applications',{method:'POST',headers:{Origin:origin},body:fd});}
const initial=await request('/api/expo');assert.equal(initial.response.status,200);
assert.equal((await request('/api/admin')).response.status,401);
assert.equal((await request('/api/admin',{headers:{'x-admin-user':'qa-owner'}})).response.status,401,'Untrusted identity headers must not bypass password login');
const login=(username,password)=>request('/api/admin/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username,password})});
assert.equal((await login('admin','wrong-test-password')).response.status,401);
const signed=await login('admin',qaPassword);assert.equal(signed.response.status,200);
const cookie=signed.response.headers.get('set-cookie');assert(cookie.includes('HttpOnly'));assert(cookie.includes('SameSite=Strict'));assert(cookie.includes('Path=/'));owner={cookie:cookie.split(';')[0]};
assert.equal((await request('/api/admin/session',{headers:owner})).response.status,200);
assert.equal((await request('/api/admin',{headers:{cookie:'gc_admin_session='+('0'.repeat(64))}})).response.status,401);

const a=await apply(['70','71']);assert.equal(a.response.status,201,JSON.stringify(a.data));
const status=await request('/api/status?token='+a.data.token);assert.equal(status.data.status,'pending');assert.equal(status.data.booths.length,2);
const conflict=await apply(['71','72'],'qa-conflict@example.invalid');assert.equal(conflict.response.status,409);
let expo=(await request('/api/expo')).data;assert.equal(expo.occupancy.filter(o=>['70','71'].includes(o.boothId)).length,2);assert(!expo.occupancy.some(o=>o.boothId==='72'),'Failed multi-booth request must roll back completely');
const privateData=(await request('/api/admin',{headers:owner})).data;const app=privateData.applications.find(x=>x.id===a.data.id);assert(app);assert.equal((await fetch(origin+'/api/logos/'+app.logo)).status,404,'Unapproved logos must remain private');
const decide=(action,reason='')=>request('/api/admin',{method:'POST',headers:{...owner,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:a.data.id,action,reason})});
assert.equal((await decide('approve')).response.status,200);
expo=(await request('/api/expo')).data;const visible=expo.exhibitors.find(e=>e.id===a.data.id);assert(visible);assert.deepEqual(visible.booths,['70','71']);assert.equal((await fetch(origin+visible.logo)).status,200);
assert.equal(expo.exhibitors.filter(e=>e.id===a.data.id).length,1,'Multi-booth company must appear once in directory');
assert.equal((await decide('cancel')).response.status,400,'Cancellation must require a reason');
assert.equal((await decide('cancel','QA шалгалт дууссан')).response.status,200);
expo=(await request('/api/expo')).data;assert(!expo.exhibitors.some(e=>e.id===a.data.id));assert(!expo.occupancy.some(o=>['70','71'].includes(o.boothId)));
assert.equal((await request('/api/status?token='+a.data.token)).data.status,'cancelled');
const after=(await request('/api/admin',{headers:owner})).data;assert.equal(after.mailConfigured,false);assert(after.mails.filter(m=>m.application_id===a.data.id).every(m=>m.status==='pending'),'Never report mail sent without configured transport');
assert.equal((await request('/api/admin',{method:'POST',headers:{...owner,Origin:'https://wrong-origin.invalid','Content-Type':'application/json'},body:'{}'})).response.status,403);
assert.equal((await request('/api/status?token=invalid')).response.status,404);
console.log('PASS: durable request + logo upload, required data, 2-booth reservation, conflict rollback, admin authorization, approval publication, private-logo access, reason validation, cancellation release, protected status, mail outbox and cross-origin guard.');

// Every organizer-supplied reduced-rate chapter must be priced by the server.
const reducedChapters=['BNI NEXUS','BNI GOLD','BNI BAIDAR','BNI DAYAN','BNI ERDENES','BNI KHARKHIRA','BNI BUYANT','BNI KHAN GOBI','BNI NOMGON','BNI HORIZON','BNI OASIS','BNI NAIRAMDAL','BNI BLUE PEARL','BNI KHAN KHENTI','BNI BOGD'];
const cancelApplication=id=>request('/api/admin',{method:'POST',headers:{...owner,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id,action:'cancel',reason:'Local tariff QA complete'})});
assert.equal((await apply(['1'],'missing@example.invalid',{chapter:''})).response.status,400,'Chapter is mandatory');
assert.equal((await apply(['1'],'placeholder@example.invalid',{chapter:'__other'})).response.status,400,'Other-chapter placeholder is not a chapter');
for(let i=0;i<reducedChapters.length;i++){
 const chapter=reducedChapters[i];
 const r=await apply(['1','54'],`chapter-${i}@example.invalid`,{chapter,ratePerSqm:1,totalPrice:1,rate_per_sqm:1,total_price:1});
 assert.equal(r.response.status,201,JSON.stringify(r.data));
 assert.equal(r.data.ratePerSqm,200000,chapter);assert.equal(r.data.totalPrice,3000000,chapter+' 6 + 9 m²');
 const saved=(await request('/api/status?token='+r.data.token)).data;assert.equal(saved.rate_per_sqm,200000);assert.equal(saved.total_price,3000000,'Submitted prices must not override server price');
 assert.equal((await cancelApplication(r.data.id)).response.status,200);
}
for(const chapter of ['BNI Future Chapter','BNI NEXUS EXTRA','BNI NEXUS САЛБАР']){
 const r=await apply(['1','54'],'standard-'+crypto.randomUUID()+'@example.invalid',{chapter,ratePerSqm:200000,totalPrice:1});
 assert.equal(r.response.status,201,JSON.stringify(r.data));assert.equal(r.data.ratePerSqm,350000);assert.equal(r.data.totalPrice,5250000);await cancelApplication(r.data.id);
}
const alias=await apply(['1'],'alias@example.invalid',{chapter:'  nexus  '});assert.equal(alias.data.chapter,'BNI NEXUS');assert.equal(alias.data.totalPrice,1200000);await cancelApplication(alias.data.id);
const sponsor=await apply(['H1'],'sponsor@example.invalid',{chapter:'BNI GOLD'});assert.equal(sponsor.data.totalPrice,20000000,'Sponsor package remains fixed');await cancelApplication(sponsor.data.id);
console.log('PASS: required chapter; all 15 discounted chapters; standard chapters; exact matching and normalization; server-side quote ignores tampered client prices; stored quote and sponsor package.');

const secureLogin=await request('/api/admin/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'incorrect',password:qaPassword})});assert.equal(secureLogin.response.status,401,'Wrong username is denied even with correct password');
assert.equal((await request('/api/admin/session',{method:'DELETE',headers:{...owner,Origin:origin}})).response.status,200);
assert.equal((await request('/api/admin',{headers:owner})).response.status,401,'Logout revokes the server-side session');
for(let i=0;i<9;i++)assert.equal((await login('admin','incorrect-test-value')).response.status,401);
assert.equal((await login('admin','incorrect-test-value')).response.status,429,'Repeated failed login attempts are limited');
console.log('PASS: password authentication, invalid credentials, no platform-identity bypass, HttpOnly/SameSite cookie, protected operations, forged session rejection, logout revocation and login rate limit.');
