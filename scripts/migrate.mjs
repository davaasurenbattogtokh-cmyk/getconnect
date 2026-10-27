import mysql from 'mysql2/promise';
import {schemaStatements} from '../db/mysql-schema.mjs';
for(const key of ['DB_USER','DB_PASSWORD','DB_NAME'])if(!process.env[key])throw new Error(`Set ${key} before migrating`);
const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4'});
try{for(const sql of schemaStatements)await db.query(sql);console.log('MySQL schema ready. Existing records were preserved.');}finally{await db.end();}
