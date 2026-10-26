// Prepares a separate, standalone deployment config; does not publish or change DNS.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const databaseId=process.env.EXPO_D1_DATABASE_ID||'';
const databaseName=process.env.EXPO_D1_DATABASE_NAME||'getconnect-business';
const bucketName=process.env.EXPO_R2_BUCKET_NAME||'';
if(!/^[a-f0-9-]{36}$/i.test(databaseId)||databaseId==='00000000-0000-4000-8000-000000000000'||!bucketName){
 console.error('Set EXPO_D1_DATABASE_ID to your provisioned D1 ID and EXPO_R2_BUCKET_NAME to your existing bucket name. No deployment config was written.');process.exit(1);
}
const input=resolve('dist/server/wrangler.json');
const config=JSON.parse(await readFile(input,'utf8'));
config.name='getconnect-business';
config.workers_dev=false;
config.preview_urls=false;
config.routes=[{pattern:'getconnect.business',custom_domain:true}];
config.d1_databases=[{binding:'DB',database_name:databaseName,database_id:databaseId,migrations_dir:'../../drizzle'}];
config.r2_buckets=[{binding:'BUCKET',bucket_name:bucketName}];
config.find_additional_modules=true;
config.rules=[{type:'ESModule',globs:['**/*.js','**/*.mjs']}];
// Keep entrypoint, compatibility, asset paths and module filenames from the verified build.
const output=resolve('dist/server/wrangler.production.json');
await writeFile(output,JSON.stringify(config,null,2)+'\n');
console.log('Prepared dist/server/wrangler.production.json for https://getconnect.business');
