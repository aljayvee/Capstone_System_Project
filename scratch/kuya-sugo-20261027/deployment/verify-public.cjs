const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),https=require('node:https');
const root=__dirname,dist=path.join(root,'release/dist');
function read(name){return new Promise((resolve,reject)=>{const request=https.get('https://portal.sugo-express.org/'+name,{headers:{'Cache-Control':'no-cache'}},response=>{const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve({status:response.statusCode,type:response.headers['content-type'],body:Buffer.concat(chunks)}));});request.setTimeout(20000,()=>request.destroy(new Error('Public request timed out')));request.on('error',reject);});}
(async()=>{
 const localIndex=fs.readFileSync(path.join(dist,'index.html'),'utf8');
 const ownerJs=fs.readdirSync(path.join(dist,'assets')).find(name=>/^OwnerPortal-.*\.js$/.test(name));
 const ownerCss=fs.readdirSync(path.join(dist,'assets')).find(name=>/^OwnerPortal-.*\.css$/.test(name));
 const entry=localIndex.match(/src="\/(assets\/index-[^\"]+\.js)"/)[1];
 const resources=['index.html',entry,'assets/'+ownerJs,'assets/'+ownerCss];
 const results=[];
 for(const name of resources){
  const response=await read(name);assert.equal(response.status,200,name);
  const expected=fs.readFileSync(path.join(dist,name));
  if(name==='index.html'){
   fs.writeFileSync(path.join(root,'public-index.html'),response.body);
   const normalize=html=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,tag=>/window\.__CF\$cv\$params|https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js/.test(tag)?'':tag).replace(/\r/g,'').replace(/>\s+</g,'><').trim();
   assert.equal(normalize(response.body.toString('utf8')),normalize(expected.toString('utf8')),'Public HTML differs beyond known Cloudflare injections');
  }else assert.ok(response.body.equals(expected),'Public asset differs: '+name);
  results.push({path:name,status:response.status,contentType:response.type,verification:name==='index.html'?'HTML matches after removing known Cloudflare scripts':'byte-for-byte match'});
 }
 const css=fs.readFileSync(path.join(dist,'assets',ownerCss),'utf8');
 const js=fs.readFileSync(path.join(dist,'assets',ownerJs),'utf8');
 assert.ok(css.includes('kuya-character__hand')&&css.includes('prefers-reduced-motion')&&css.includes('kuya-drawer'));
 assert.ok(js.includes('Need a hand?')&&js.includes('kuya-character')&&js.includes('Pause animation'));
 fs.writeFileSync(path.join(root,'public-verification.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
