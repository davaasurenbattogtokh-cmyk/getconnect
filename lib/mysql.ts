import mysql, {type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader} from 'mysql2/promise';
import {schemaStatements} from '../db/mysql-schema.mjs';

type MysqlState={pool:Pool;ready?:Promise<void>};
const state=globalThis as typeof globalThis & {__getconnectMysql?:MysqlState};
function connectionState(){
 if(!state.__getconnectMysql){
  for(const key of ['DB_USER','DB_PASSWORD','DB_NAME'])if(!process.env[key])throw new Error(`Missing runtime configuration: ${key}`);
  state.__getconnectMysql={pool:mysql.createPool({
   host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),
   user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,
   charset:'utf8mb4',connectionLimit:5,waitForConnections:true,queueLimit:50,
   connectTimeout:10000,supportBigNumbers:true,bigNumberStrings:false,
   multipleStatements:false,
  })};
 }
 return state.__getconnectMysql;
}
async function ready(){
 const s=connectionState();
 // No database access during next build. Initialize additive tables on first request.
 s.ready??=(async()=>{for(const sql of schemaStatements)await s.pool.query(sql);})().catch(error=>{s.ready=undefined;throw error;});
 await s.ready;return s.pool;
}
type SqlResult<T>={results:T[];meta:{changes:number}};
type SqlValue=string|number|boolean|null|Buffer;
class Statement{
 constructor(readonly sql:string,readonly values:SqlValue[]=[]){ }
 bind(...values:unknown[]){
  if(values.some(value=>value!==null&&!['string','number','boolean'].includes(typeof value)&&!Buffer.isBuffer(value)))throw new Error('Unsupported SQL parameter');
  return new Statement(this.sql,values as SqlValue[]);
 }
 async execute<T>(connection:Pool|PoolConnection):Promise<SqlResult<T>>{
  const [result]=await connection.execute<RowDataPacket[]|ResultSetHeader>(this.sql,this.values);
  return Array.isArray(result)?{results:result as T[],meta:{changes:0}}:{results:[],meta:{changes:result.affectedRows}};
 }
 async all<T=Record<string,unknown>>(){return this.execute<T>(await ready());}
 async first<T=Record<string,unknown>>(){return (await this.all<T>()).results[0]??null;}
 async run(){return this.all();}
}
const databaseClient={
 prepare:(sql:string)=>new Statement(sql),
 async batch(statements:Statement[]){
  const pool=await ready();
  for(let attempt=0;;attempt++){
   const connection=await pool.getConnection();
   try{
    await connection.beginTransaction();const results=[];
    for(const statement of statements)results.push(await statement.execute<Record<string,unknown>>(connection));
    await connection.commit();return results;
   }catch(error){
    await connection.rollback();
    const code=(error as {code?:string}).code;
    if(attempt>=2||!['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(code||''))throw error;
   }finally{connection.release();}
  }
 },
};
export const database=()=>databaseClient;

// Keep uploads outside the deployment filesystem. Chunks stay below small packet limits.
const CHUNK_SIZE=256*1024;
export const bucket=()=>({
 async put(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}}){
  const db=database(),statements=[db.prepare('INSERT INTO logos(`key`,content_type,size) VALUES(?,?,?)').bind(key,options.httpMetadata.contentType,bytes.length)];
  for(let offset=0,part=0;offset<bytes.length;offset+=CHUNK_SIZE,part++)statements.push(db.prepare('INSERT INTO logo_chunks(logo_key,part,bytes) VALUES(?,?,?)').bind(key,part,Buffer.from(bytes.subarray(offset,offset+CHUNK_SIZE))));
  await db.batch(statements);
 },
 async get(key:string){
  const db=database(),metadata=await db.prepare('SELECT content_type,size FROM logos WHERE `key`=?').bind(key).first<{content_type:string;size:number}>();
  if(!metadata)return null;
  const chunks=await db.prepare('SELECT bytes FROM logo_chunks WHERE logo_key=? ORDER BY part').bind(key).all<{bytes:Buffer}>();
  const body=Buffer.concat(chunks.results.map(chunk=>chunk.bytes));
  if(body.length!==metadata.size)throw new Error('Incomplete stored logo');
  return {body:new Uint8Array(body),httpMetadata:{contentType:metadata.content_type}};
 },
 async delete(key:string){await database().prepare('DELETE FROM logos WHERE `key`=?').bind(key).run();},
});
