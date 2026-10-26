// In-process Worker integration QA, independent of the browser preview daemon.
import {createRequire} from 'node:module';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {readFile,readdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const root=resolve('dist/server');
const js=(await readdir(root,{recursive:true})).filter(f=>f.endsWith('.js')&&f!=='index.js');
const modules=[{type:'ESModule',path:resolve(root,'index.js')},...js.map(f=>({type:'ESModule',path:resolve(root,f)}))];
const qaPassword=randomBytes(18).toString('hex'),salt=randomBytes(16).toString('hex');
const qaHash='pbkdf2-sha256$100000$'+salt+'$'+pbkdf2Sync(qaPassword,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');
process.env.QA_ADMIN_PASSWORD=qaPassword;
const mf=new Miniflare({bindings:{ADMIN_USERNAME:'admin',ADMIN_PASSWORD_HASH:qaHash},modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],cf:false});
const original=globalThis.fetch;
try{
 const {DB}=await mf.getBindings();
 const files=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();
 for(const file of files){for(const statement of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(statement).run();}
 // Only authenticated password sessions may access organizer operations.
 globalThis.fetch=async(url,init)=>{const req=new Request(url,init);return mf.dispatchFetch(req.url,{method:req.method,headers:Object.fromEntries(req.headers),body:['GET','HEAD'].includes(req.method)?undefined:new Uint8Array(await req.arrayBuffer())});};
 process.argv[2]='http://localhost:4173';
 await import('./integration.mjs');
}finally{delete process.env.QA_ADMIN_PASSWORD;globalThis.fetch=original;await mf.dispose();}
