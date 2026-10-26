import {bucket,database} from '@/lib/server';
export async function GET(req:Request,{params}:{params:Promise<{key:string}>}){
 const {key}=await params;if(!/^[\w-]+\.(png|jpg|webp)$/.test(key))return new Response('Not found',{status:404});
 const publicApp=await database().prepare("SELECT id FROM applications WHERE logo=? AND status='approved'").bind(key).first();
 if(!publicApp){const {admin}=await import('@/lib/server');try{await admin();}catch{return new Response('Not found',{status:404});}}
 const obj=await bucket().get(key);if(!obj)return new Response('Not found',{status:404});
 return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'image/png','Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff'}});
}
