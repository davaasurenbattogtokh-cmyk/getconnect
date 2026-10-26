// Reads a password through hidden terminal input or stdin; prints only the derived hash.
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import {stdin,stdout,stderr} from 'node:process';
let password='';
if(stdin.isTTY){
 stderr.write('Admin password (hidden): ');stdin.setRawMode(true);stdin.resume();stdin.setEncoding('utf8');
 password=await new Promise(resolve=>{stdin.on('data',chunk=>{for(const c of chunk){if(c==='\u0003'){stdin.setRawMode(false);stderr.write('\n');process.exit(130);}if(c==='\r'||c==='\n'){stdin.setRawMode(false);stdin.pause();stderr.write('\n');resolve(password);return;}if(c==='\u007f'||c==='\b')password=password.slice(0,-1);else if(c>=' ')password+=c;}});});
}else{for await(const chunk of stdin)password+=chunk;password=password.replace(/\r?\n$/,'');}
if(password.length<8||password.length>512){stderr.write('Use a password between 8 and 512 characters.\n');process.exit(1);}
const salt=randomBytes(16).toString('hex');
const derived=pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');
password='';stdout.write(`pbkdf2-sha256$100000$${salt}$${derived}\n`);
