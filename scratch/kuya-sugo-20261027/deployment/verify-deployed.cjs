const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname;
const live=new Map(fs.readFileSync(path.join(root,'live-after.sha256'),'utf8').trim().split(/\r?\n/).map(line=>[line.slice(66).replace(/^\.\//,''),line.slice(0,64)]));
const expected=JSON.parse(fs.readFileSync(path.join(root,'release.sha256.json'),'utf8'));
for(const [name,digest] of Object.entries(expected))assert.equal(live.get(name),digest,'Deployed mismatch: '+name);
console.log(`${Object.keys(expected).length}/${Object.keys(expected).length} deployed files match the verified release.`);
