export const ADMIN_COOKIE='gc_admin_session';
export const SESSION_SECONDS=8*60*60;
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=(s:string)=>new Uint8Array(s.match(/.{2}/g)?.map(x=>parseInt(x,16))||[]);
export const newSessionToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const hashToken=async(token:string)=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))));
export function sessionToken(cookies:string|null){const token=(cookies||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(ADMIN_COOKIE+'='))?.slice(ADMIN_COOKIE.length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null;}
export async function verifyPassword(password:string,stored:string){
 const [algorithm,iterations,salt,expected]=stored.split('$');
 if(algorithm!=='pbkdf2-sha256'||Number(iterations)!==100000||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{64}$/.test(expected||''))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const result=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations:100000},key,256));
 const wanted=unhex(expected);let diff=0;for(let i=0;i<32;i++)diff|=result[i]^wanted[i];return diff===0;
}
export function sessionCookie(token:string,req:Request,clear=false){return `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${clear?0:SESSION_SECONDS}${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
