export const runtime='nodejs';
export const dynamic='force-dynamic';
const env=process.env;
import {admin,database,respond,fail,ApiError,sameOrigin} from '@/lib/server';
import {hashToken,newSessionToken,sessionToken,sessionCookie,SESSION_SECONDS,verifyPassword} from '@/lib/admin-auth';
export async function GET(){try{await admin();return respond({authenticated:true});}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 sameOrigin(req);if(Number(req.headers.get('content-length')||0)>2048)throw new ApiError(413,'Хүсэлт хэт том байна.');
 const db=database(),now=Date.now();
 const key=await hashToken((req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown')+'|'+Math.floor(now/900000));
 await db.prepare('DELETE FROM admin_login_attempts WHERE expires_at<?').bind(now).run();
 const attemptResults=await db.batch([
  db.prepare('INSERT INTO admin_login_attempts(`key`,attempts,expires_at) VALUES(?,1,?) ON DUPLICATE KEY UPDATE attempts=attempts+1').bind(key,now+900000),
  db.prepare('SELECT attempts FROM admin_login_attempts WHERE `key`=? FOR UPDATE').bind(key),
 ]);
 const attempts=attemptResults[1].results[0] as {attempts:number}|undefined;
 if((attempts?.attempts||0)>10)throw new ApiError(429,'Олон удаа буруу оролдлоо. 15 минутын дараа дахин оролдоно уу.');
 if(!env.ADMIN_USERNAME||!env.ADMIN_PASSWORD_HASH)throw new ApiError(503,'Админы нэвтрэх тохиргоо хийгдээгүй байна.');
 let body:any;try{body=await req.json();}catch{throw new ApiError(400,'Нэвтрэх мэдээллээ шалгана уу.');}
 const username=typeof body.username==='string'?body.username.trim():'',password=typeof body.password==='string'?body.password:'';
 if(password.length>512||username.length>100)throw new ApiError(401,'Нэвтрэх нэр эсвэл нууц үг буруу байна.');
 const valid=await verifyPassword(password,env.ADMIN_PASSWORD_HASH);
 if(username!==env.ADMIN_USERNAME||!valid)throw new ApiError(401,'Нэвтрэх нэр эсвэл нууц үг буруу байна.');
 const token=newSessionToken(),old=sessionToken(req.headers.get('cookie'));
 const statements=[db.prepare('DELETE FROM admin_sessions WHERE expires_at<?').bind(now),db.prepare('INSERT INTO admin_sessions(token_hash,created_at,expires_at) VALUES(?,?,?)').bind(await hashToken(token),now,now+SESSION_SECONDS*1000),db.prepare('DELETE FROM admin_login_attempts WHERE `key`=?').bind(key)];
 if(old)statements.push(db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await hashToken(old)));
 await db.batch(statements);const response=respond({ok:true});response.headers.set('Set-Cookie',sessionCookie(token,req));return response;
}catch(e){return fail(e);}}
export async function DELETE(req:Request){try{sameOrigin(req);const token=sessionToken(req.headers.get('cookie'));if(token)await database().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await hashToken(token)).run();const response=respond({ok:true});response.headers.set('Set-Cookie',sessionCookie('',req,true));return response;}catch(e){return fail(e);}}
