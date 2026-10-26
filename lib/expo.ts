export type Booth = {id:string; x:number; y:number; w:number; h:number; area:number; sponsor?:boolean};
export const BOOTHS: Booth[] = [];
const add=(id:number|string,x:number,y:number,w=68,h=70)=>BOOTHS.push({id:String(id),x,y,w,h,area:typeof id==='string'?36:id<=20?6:9,sponsor:typeof id==='string'});
for(let i=0;i<15;i++)add(30+i,82+i*68,8);
[29,28,27].forEach((n,i)=>add(n,14,78+i*68,68,68));
[26,25,24,23,22,21].forEach((n,i)=>add(n,14,558+i*68,68,68));
for(let i=0;i<9;i++)add(45+i,1128,150+i*68,68,68);
const grid=(nums:number[],x:number,y:number,cols:number,heights?:number[])=>nums.forEach((n,i)=>add(n,x+(i%cols)*68,y+Math.floor(i/cols)*68,68,heights?.[Math.floor(i/cols)]||68));
grid([54,55,56,57],150,147,2);grid([58,59,60,61],355,147,2);grid([62,63,64,65],560,147,2);grid([66,67,19,68,69,20],765,147,3);
add('H1',355,364,136,136);add('S1',150,560,136,136);
grid([70,71,72,73],560,364,2);grid([74,75,76,77,78,79],765,364,3);
grid([80,81,82,83],355,560,2);grid([84,85,86,87],560,560,2);grid([88,89,90,91,92,93],765,560,3);
grid([94,95],355,748,2);grid([18,17],355,816,2,[42]);grid([96,97],560,748,2);grid([16,15],560,816,2,[42]);grid([98,99,100],765,748,3);grid([14,13,12],765,816,3,[42]);
for(let i=0;i<11;i++)add(11-i,220+i*68,923,68,45);
export const boothById=(id:string)=>BOOTHS.find(b=>b.id===id);
// The organizer's confirmed reduced-rate chapter list (BNI Nexus + 14 supplied regional chapters).
export const DISCOUNT_CHAPTERS = [
 {name:'BNI NEXUS',region:'Хөнгөлөлттэй тариф'},
 {name:'BNI GOLD',region:'Дорнод'},
 {name:'BNI BAIDAR',region:'Сэлэнгэ'},
 {name:'BNI DAYAN',region:'Завхан'},
 {name:'BNI ERDENES',region:'Орхон'},
 {name:'BNI KHARKHIRA',region:'Увс'},
 {name:'BNI BUYANT',region:'Ховд'},
 {name:'BNI KHAN GOBI',region:'Өмнөговь'},
 {name:'BNI NOMGON',region:'Баянхонгор'},
 {name:'BNI HORIZON',region:'Архангай'},
 {name:'BNI OASIS',region:'Говьсүмбэр / Дорноговь'},
 {name:'BNI NAIRAMDAL',region:'Дархан-Уул'},
 {name:'BNI BLUE PEARL',region:'Хөвсгөл'},
 {name:'BNI KHAN KHENTI',region:'Хэнтий'},
 {name:'BNI BOGD',region:'Өвөрхангай'},
] as const;
export const chapterKey=(chapter:string)=>chapter.normalize('NFKC').trim().toUpperCase().replace(/[\s_-]+/g,'').replace(/^BNI/,'');
export const canonicalChapter=(chapter:string)=>DISCOUNT_CHAPTERS.find(c=>chapterKey(c.name)===chapterKey(chapter))?.name||chapter.trim();
export const validChapter=(chapter:string)=>chapter.trim().length>=2&&chapter.trim().length<=100&&chapter!=='__other';
export const tariffFor=(chapter:string)=>DISCOUNT_CHAPTERS.some(c=>chapterKey(c.name)===chapterKey(chapter))?200_000:350_000;
export const priceFor=(ids:string[],chapter='')=>ids.reduce((s,id)=>s+(boothById(id)?.sponsor?20_000_000:(boothById(id)?.area||0)*tariffFor(chapter)),0);
export const areaFor=(ids:string[])=>ids.reduce((s,id)=>s+(boothById(id)?.area||0),0);
export const money=(n:number)=>new Intl.NumberFormat('mn-MN').format(n)+' ₮';
export const STATUS:Record<string,string>={pending:'Шалгаж байгаа',approved:'Баталгаажсан',rejected:'Татгалзсан',cancelled:'Цуцалсан',expired:'Хугацаа дууссан'};
export type Exhibitor={id:string;company:string;chapter:string;sector:string;description:string;website:string;logo:string;booths:string[];audience:string};
export type Occupancy={boothId:string;status:string;exhibitor?:Exhibitor};
