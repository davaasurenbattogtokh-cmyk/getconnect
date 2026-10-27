import {spawn} from 'node:child_process';
// Hostinger injects PORT. Do not bind a fixed port or run a development server.
const port=process.env.PORT||'3000';
if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535)throw new Error('Invalid PORT');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','0.0.0.0','-p',port],{stdio:'inherit',env:{...process.env,NODE_ENV:'production'}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exit(1);});
child.on('exit',code=>process.exit(code??1));
