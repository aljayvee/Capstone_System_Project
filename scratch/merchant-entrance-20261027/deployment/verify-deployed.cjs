const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root='scratch/merchant-entrance-20261027/deployment/';
const live=new Map(fs.readFileSync(root+'live-after.sha256','utf8').trim().split(/\r?\n/).map(line=>[line.slice(66).replace(/^\.\//,''),line.slice(0,64)]));
let count=0;
function walk(dir,prefix=''){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=prefix+item.name;if(item.isDirectory())walk(path.join(dir,item.name),file+'/');else{assert.equal(live.get(file),crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,item.name))).digest('hex'),file);count++;}}}
walk(root+'release/dist');console.log(`${count}/${count} deployed files match the verified release byte-for-byte.`);
