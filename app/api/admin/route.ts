import {admin,database,expireHolds,respond,fail,ApiError,sameOrigin,deliverMail,mailConfigured} from '@/lib/server';
import {priceFor,tariffFor} from '@/lib/expo';
export async function GET(){try{await admin();await expireHolds();const db=database();
 const rows=await db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all<any>();
 const mails=await db.prepare('SELECT * FROM mail_outbox ORDER BY created_at DESC').all<any>();
 const history=await db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 200').all<any>();
 const settings=await db.prepare("SELECT key,value FROM settings WHERE key!='admin_user_id'").all<any>();
 return respond({applications:rows.results.map(r=>({...r,token:undefined,booths:JSON.parse(r.booths),meetings:JSON.parse(r.meetings),rate_per_sqm:r.rate_per_sqm??tariffFor(r.chapter),total_price:r.total_price??priceFor(JSON.parse(r.booths),r.chapter)})),mails:mails.results,history:history.results,settings:Object.fromEntries(settings.results.map(r=>[r.key,r.value])),mailConfigured:mailConfigured()});
}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 sameOrigin(req);const actor=await admin();const db=database();const d=await req.json() as Record<string,any>;const now=Date.now();
 if(d.action==='settings'){
 const allowed=['chapters','contact_phone','contact_email'];const pairs=Object.entries(d.values||{}).filter(([k])=>allowed.includes(k));
 if(pairs.some(([,v])=>typeof v!=='string'||v.length>5000))throw new ApiError(400,'Мэдээллээ шалгана уу.');
 if(pairs.length)await db.batch(pairs.map(([k,v])=>db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,v)));return respond({ok:true});
 }
 if(d.action==='retry_mail'){await deliverMail(String(d.id),new URL(req.url).origin);return respond({ok:true,mailConfigured:mailConfigured()});}
 await expireHolds();const app=await db.prepare('SELECT * FROM applications WHERE id=?').bind(String(d.id)).first<any>();if(!app)throw new ApiError(404,'Хүсэлт олдсонгүй.');
 const action=String(d.action);let status='';
 if(action==='approve'&&app.status==='pending')status='approved';
 else if(action==='reject'&&app.status==='pending')status='rejected';
 else if(action==='cancel'&&['pending','approved'].includes(app.status))status='cancelled';
 else if(action==='extend'&&app.status==='pending'){
  await db.batch([db.prepare("UPDATE applications SET expires_at=?,updated_at=? WHERE id=? AND status='pending'").bind(now+48*3_600_000,now,app.id),db.prepare('INSERT INTO audit(id,application_id,actor,action,detail,at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),app.id,actor,'extended','48 цаг',now)]);return respond({ok:true});
 }else throw new ApiError(409,'Хүсэлтийн төлөв өөрчлөгдсөн. Шинэчилнэ үү.');
 const reason=String(d.reason||'').trim().slice(0,1200);if(['rejected','cancelled'].includes(status)&&!reason)throw new ApiError(400,'Шалтгаан оруулна уу.');
 const mailId=crypto.randomUUID(),decisionKey=crypto.randomUUID();
 // A guarded UPDATE plus conditional follow-ups keeps competing decisions atomic in a D1 batch.
 const statements=[db.prepare('UPDATE applications SET status=?,reason=?,updated_at=?,decision_key=? WHERE id=? AND status=?').bind(status,reason,now,decisionKey,app.id,app.status)];
 if(status!=='approved')statements.push(db.prepare('DELETE FROM reservations WHERE application_id=? AND EXISTS(SELECT 1 FROM applications WHERE id=? AND decision_key=?)').bind(app.id,app.id,decisionKey));
 statements.push(db.prepare('INSERT INTO audit(id,application_id,actor,action,detail,at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM applications WHERE id=? AND decision_key=?)').bind(crypto.randomUUID(),app.id,actor,status,reason,now,app.id,decisionKey));
 statements.push(db.prepare('INSERT INTO mail_outbox(id,application_id,kind,recipient,status,error,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM applications WHERE id=? AND decision_key=?)').bind(mailId,app.id,status,app.email,'pending','',now,app.id,decisionKey));
 const result=await db.batch(statements);if(!result[0].meta.changes)throw new ApiError(409,'Хүсэлтийн төлөв өөрчлөгдсөн. Шинэчилнэ үү.');
 await deliverMail(mailId,new URL(req.url).origin);return respond({ok:true});
}catch(e){return fail(e);}}
