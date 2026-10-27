export const runtime='nodejs';
export const dynamic='force-dynamic';
import {database,expireHolds,respond,fail} from '@/lib/server';
export async function GET(){try{
 await expireHolds();const db=database();
 const rows=await db.prepare("SELECT id,company,chapter,sector,description,website,logo,booths,audience FROM applications WHERE status='approved' ORDER BY company").all<any>();
 const exhibitors=rows.results.map(r=>({...r,booths:JSON.parse(r.booths),logo:'/api/logos/'+r.logo}));
 const holds=await db.prepare('SELECT r.booth_id,a.status,a.id FROM reservations r JOIN applications a ON a.id=r.application_id').all<any>();
 const occupancy=holds.results.map(r=>({boothId:r.booth_id,status:r.status,exhibitor:exhibitors.find(e=>e.id===r.id)}));
 const config=await db.prepare("SELECT `key`,value FROM settings WHERE `key` IN ('chapters','contact_phone','contact_email')").all<{key:string;value:string}>();
 return respond({exhibitors,occupancy,settings:Object.fromEntries(config.results.map(r=>[r.key,r.value]))});
}catch(e){return fail(e);}}
