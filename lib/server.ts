import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import {money,priceFor,tariffFor} from './expo';
import {sessionToken,hashToken} from './admin-auth';
export const database=()=>{if(!env.DB)throw new Error('Database unavailable');return env.DB;};
export const bucket=()=>{if(!env.BUCKET)throw new Error('File storage unavailable');return env.BUCKET;};
export class ApiError extends Error{constructor(public status:number,message:string){super(message);}}
export function respond(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function fail(e:unknown){if(e instanceof ApiError)return respond({error:e.message},e.status);console.error('Expo request failed',e);return respond({error:'Үйлдлийг гүйцэтгэж чадсангүй. Дахин оролдоно уу.'},500);}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new ApiError(403,'Зөвшөөрөлгүй хүсэлт.');}
export async function admin(){
 const h=await headers(),token=sessionToken(h.get('cookie'));
 if(!token)throw new ApiError(401,'Админы нэр, нууц үгээрээ нэвтэрнэ үү.');
 const row=await database().prepare('SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(await hashToken(token),Date.now()).first();
 if(!row)throw new ApiError(401,'Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.');
 return 'admin';
}
export async function expireHolds(){
 const db=database(),now=Date.now();
 await db.batch([
  db.prepare("DELETE FROM reservations WHERE application_id IN (SELECT id FROM applications WHERE status='pending' AND expires_at<?)").bind(now),
  db.prepare("UPDATE applications SET status='expired',updated_at=? WHERE status='pending' AND expires_at<?").bind(now,now),
 ]);
}
const htmlEscape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function deliverMail(mailId:string,origin:string){
 const db=database();const mail=await db.prepare('SELECT * FROM mail_outbox WHERE id=?').bind(mailId).first<any>();
 if(!mail||mail.status==='sent')return;
 if(!env.RESEND_API_KEY||!env.MAIL_FROM)return;
 const app=await db.prepare('SELECT * FROM applications WHERE id=?').bind(mail.application_id).first<any>();if(!app)return;
 const titles:Record<string,string>={received:'Оролцох хүсэлтийг хүлээн авлаа',approved:'Таны бүртгэл баталгаажлаа',rejected:'Оролцох хүсэлтийн шийдвэр',cancelled:'Таны бүртгэл цуцлагдлаа'};
 const title=titles[mail.kind]||'GET CONNECTED EXPO';
 const url=`${origin}/status?token=${app.token}`;
 const html=`<div style="font-family:Arial,sans-serif;max-width:600px;padding:32px;background:#f4f5f6;color:#1f1f1f"><h3 style="color:#ed1b2e">GET CONNECTED EXPO 2026</h3><h1>${title}</h1><p>Сайн байна уу, ${htmlEscape(app.contact)}.</p><p><b>${htmlEscape(app.company)}</b> · ${htmlEscape(app.chapter)}</p><p>Хүсэлт: ${app.id}<br>Талбай: ${htmlEscape(JSON.parse(app.booths).join(', '))}<br>Тариф: ${money(app.rate_per_sqm??tariffFor(app.chapter))} / м²<br>Нийт дүн: ${money(app.total_price??priceFor(JSON.parse(app.booths),app.chapter))}</p><p>2026.11.20–22 · Мишээл Экспо</p>${app.reason?`<p>${htmlEscape(app.reason)}</p>`:''}<p>${mail.kind==='received'?'Энэ нь хүсэлт хүлээн авсан мэдэгдэл. Админ баталсны дараа оролцоо баталгаажна.':''}</p><p><a href="${url}" style="color:#ed1b2e">Хүсэлтийн төлөв харах</a></p></div>`;
 try{
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':mail.id},body:JSON.stringify({from:env.MAIL_FROM,to:[mail.recipient],subject:`GET CONNECTED · ${title}`,html})});
  if(!r.ok)throw new Error(`Mail provider ${r.status}`);
  await db.prepare("UPDATE mail_outbox SET status='sent',error='' WHERE id=?").bind(mailId).run();
 }catch(e){await db.prepare("UPDATE mail_outbox SET status='failed',error=? WHERE id=?").bind(e instanceof Error?e.message:'Delivery failed',mailId).run();}
}
export const mailConfigured=()=>Boolean(env.RESEND_API_KEY&&env.MAIL_FROM);
