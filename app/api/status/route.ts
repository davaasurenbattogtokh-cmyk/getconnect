import {database,expireHolds,respond,fail,ApiError} from '@/lib/server';
import {priceFor,tariffFor} from '@/lib/expo';
export async function GET(req:Request){try{
 const token=new URL(req.url).searchParams.get('token');if(!token||token.length<50)throw new ApiError(404,'Хүсэлт олдсонгүй.');await expireHolds();
 const row=await database().prepare('SELECT id,company,chapter,booths,status,reason,created_at,expires_at,rate_per_sqm,total_price FROM applications WHERE token=?').bind(token).first<any>();if(!row)throw new ApiError(404,'Хүсэлт олдсонгүй.');
 const booths=JSON.parse(row.booths);return respond({...row,booths,rate_per_sqm:row.rate_per_sqm??tariffFor(row.chapter),total_price:row.total_price??priceFor(booths,row.chapter)});
}catch(e){return fail(e);}}
