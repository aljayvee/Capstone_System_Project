const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname;
const manifest=file=>new Map(fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(line=>[line.slice(66).replace(/^\.\//,''),line.slice(0,64)]));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function walk(dir,fn,rel=''){for(const item of fs.readdirSync(path.join(dir,rel),{withFileTypes:true})){const name=path.posix.join(rel,item.name);if(item.isDirectory())walk(dir,fn,name);else fn(name,path.join(dir,name));}}
const live=manifest(path.join(root,'live-before.sha256'));
let baselineAssets=0;
walk(path.join(root,'baseline/dist'),(name,file)=>{if(name!=='index.html'){assert.equal(sha(file),live.get(name),'Baseline mismatch: '+name);baselineAssets++;}});
const releaseHtml=fs.readFileSync(path.join(root,'release/dist/index.html'),'utf8');
const baselineHtml=fs.readFileSync(path.join(root,'baseline/dist/index.html'),'utf8');
const liveHtml=fs.readFileSync(path.join(root,'live-index-before.html'),'utf8');
const assets=html=>[...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/g)].map(m=>m[1]);
const normalize=html=>html.replace(/^\uFEFF/,'').replace(/\r/g,'').replace(/>\s+</g,'><');
let normalizedRelease=releaseHtml;
const oldAssets=assets(baselineHtml),newAssets=assets(releaseHtml);
assert.equal(oldAssets.length,newAssets.length);
newAssets.forEach((name,index)=>{normalizedRelease=normalizedRelease.replaceAll(name,oldAssets[index]);});
assert.equal(normalize(liveHtml),normalize(normalizedRelease),'Unrelated HTML change');
// Absolute font preloads resolve from root/node_modules in the real checkout.
// The private snapshot inherits module resolution without its own node_modules.
const resolvedBaselineHtml=baselineHtml.replace(/href="(\/node_modules\/[^\"]+\.woff2)"/g,(_match,ref)=>{
  const sourceFile=path.join(process.cwd(),ref.slice(1));
  const digest=sha(sourceFile);
  const asset=[...live].find(([name,hash])=>name.startsWith('assets/')&&name.endsWith('.woff2')&&hash===digest);
  assert.ok(asset,'Unverified font preload: '+ref);
  return `href="/${asset[0]}"`;
});
assert.equal(normalize(liveHtml),normalize(resolvedBaselineHtml),'Baseline HTML mismatch');
const frozen=JSON.parse(fs.readFileSync(path.join(root,'release.sha256.json'),'utf8'));
let releaseFiles=0;walk(path.join(root,'release/dist'),(name,file)=>{assert.equal(sha(file),frozen[name]);releaseFiles++;});
const entry=html=>html.match(/src="(\/assets\/index-[^\"]+\.js)"/)[1];
const proof={baselineAssets,releaseFiles,expectedLiveIndexHash:live.get('index.html'),previousEntry:entry(liveHtml),releaseEntry:entry(releaseHtml),scope:'Only Kuya Sugo redesign; baseline rebuild restores original three Kuya files and omits four new character/UI/CSS files. All other source and public files match the previous release source with its already-deployed rates animation.'};
fs.writeFileSync(path.join(root,'release-proof.json'),JSON.stringify(proof,null,2));
fs.writeFileSync(path.join(root,'deploy-release.sh'),`#!/usr/bin/env bash\nset -euo pipefail\nssh -o BatchMode=yes -o ConnectTimeout=15 root@109.123.239.182 'sha256sum /var/www/web/dist/index.html; test ! -d /var/www/web/.deploy-staging' | grep -q '^${proof.expectedLiveIndexHash} '\nexport DEPLOY_SOURCE=/c/Capstone_Project_Web/scratch/kuya-sugo-20261027/deployment/release\nexport DEPLOY_ROOT=/var/www/web\nexport DEPLOY_LABEL=web\nexport DEPLOY_URL=https://portal.sugo-express.org\nbash /c/Capstone_Project_Web/scripts/deploy-site.sh --no-build\n`);
console.log(JSON.stringify(proof));
