import {z} from 'zod';
import {database,bucket,expireHolds,respond,fail,ApiError,sameOrigin,deliverMail} from '@/lib/server';
import {boothById,canonicalChapter,validChapter,tariffFor,priceFor} from '@/lib/expo';
const dataSchema=z.object({company:z.string().trim().min(2).max(150),chapter:z.string().trim().min(2).max(100),sector:z.string().trim().min(2).max(100),description:z.string().trim().min(10).max(1200),audience:z.enum(['B2B','B2C','B2B + B2C']),contact:z.string().trim().min(2).max(100),position:z.string().trim().max(100),phone:z.string().trim().regex(/^[+\d\s()-]{8,25}$/),email:z.string().trim().email().max(150),website:z.string().trim().max(300).refine(s=>!s||/^https?:\/\//i.test(s),'Холбоос https:// гэж эхэлнэ.'),booths:z.array(z.string()).min(1).max(102),meetings:z.array(z.object({company:z.string().trim().min(2).max(150),person:z.string().trim().min(2).max(100),goal:z.string().trim().min(2).max(500)})).min(1).max(20),notes:z.string().trim().max(1200),consent:z.literal(true),honeypot:z.string().max(0)});
export async function POST(req:Request){let logoKey='';try{
 sameOrigin(req);if(Number(req.headers.get('content-length')||0)>6_000_000)throw new ApiError(413,'Лого 5 MB-ээс бага байна.');
 const form=await req.formData();let raw;try{raw=JSON.parse(String(form.get('data')));}catch{throw new ApiError(400,'Формын мэдээлэл буруу байна.');}
 const parsed=dataSchema.safeParse(raw);if(!parsed.success)throw new ApiError(400,'Заавал бөглөх мэдээллээ шалгана уу. '+parsed.error.issues[0]?.path.join('.'));
 const d=parsed.data;if(!validChapter(d.chapter))throw new ApiError(400,'Эхлээд chapter-аа сонгоно уу.');d.chapter=canonicalChapter(d.chapter);const ratePerSqm=tariffFor(d.chapter);d.booths=[...new Set(d.booths)];if(d.booths.some(id=>!boothById(id)))throw new ApiError(400,'Талбайн дугаар буруу байна.');const totalPrice=priceFor(d.booths,d.chapter);
 const logo=form.get('logo');if(!(logo instanceof File)||!logo.size||logo.size>5_000_000)throw new ApiError(400,'Лого хавсаргана уу. Дээд хэмжээ 5 MB.');
 const bytes=new Uint8Array(await logo.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!png&&!jpg&&!webp)throw new ApiError(400,'Лого PNG, JPG эсвэл WebP зураг байна.');
 await expireHolds();const db=database(),now=Date.now();
 const recent=await db.prepare('SELECT COUNT(*) as n FROM applications WHERE email=? AND created_at>?').bind(d.email.toLowerCase(),now-3_600_000).first<{n:number}>();if((recent?.n||0)>=5)throw new ApiError(429,'Түр хүлээгээд дахин оролдоно уу.');
 const id='GC-'+crypto.randomUUID().slice(0,8).toUpperCase(),token=crypto.randomUUID()+crypto.randomUUID();logoKey=crypto.randomUUID()+ (png?'.png':jpg?'.jpg':'.webp');
 await bucket().put(logoKey,bytes,{httpMetadata:{contentType:png?'image/png':jpg?'image/jpeg':'image/webp'}});
 const expires=now+48*3_600_000;const mailId=crypto.randomUUID();
 try{await db.batch([
 db.prepare('INSERT INTO applications(id,token,company,chapter,sector,description,audience,contact,position,phone,email,website,logo,booths,meetings,notes,status,reason,created_at,updated_at,expires_at,rate_per_sqm,total_price) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,token,d.company,d.chapter,d.sector,d.description,d.audience,d.contact,d.position,d.phone,d.email.toLowerCase(),d.website,logoKey,JSON.stringify(d.booths),JSON.stringify(d.meetings),d.notes,'pending','',now,now,expires,ratePerSqm,totalPrice),
 ...d.booths.map(b=>db.prepare('INSERT INTO reservations(booth_id,application_id) VALUES(?,?)').bind(b,id)),
 db.prepare('INSERT INTO mail_outbox(id,application_id,kind,recipient,status,error,created_at) VALUES(?,?,?,?,?,?,?)').bind(mailId,id,'received',d.email.toLowerCase(),'pending','',now),
 db.prepare('INSERT INTO audit(id,application_id,actor,action,detail,at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,'applicant','submitted',d.booths.join(', '),now),
 ]);}catch(e){if(String(e).includes('UNIQUE'))throw new ApiError(409,'Сонгосон талбайд өөр хүсэлт бүртгэгдсэн байна. Map-аа шинэчилж дахин сонгоно уу.');throw e;}
 logoKey='';await deliverMail(mailId,new URL(req.url).origin);return respond({id,token,status:'pending',expiresAt:expires,chapter:d.chapter,ratePerSqm,totalPrice},201);
}catch(e){if(logoKey)try{await bucket().delete(logoKey);}catch{}return fail(e);}}
