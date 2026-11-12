const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root='scratch/merchant-entrance-20261027/deployment/';
const parseManifest=file=>new Map(fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(line=>[line.slice(66).replace(/^\.\//,''),line.slice(0,64)]));
const live=parseManifest(root+'live-before.sha256');let assetCount=0;
function walk(dir,prefix=''){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=prefix+item.name;if(item.isDirectory())walk(path.join(dir,item.name),file+'/');else if(file!=='index.html'){assert.equal(live.get(file),crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,item.name))).digest('hex'),'Baseline mismatch: '+file);assetCount++;}}}
walk(root+'baseline/dist');
const releaseHtml=fs.readFileSync(root+'release/dist/index.html','utf8');
const baselineHtml=fs.readFileSync(root+'baseline/dist/index.html','utf8');
const liveHtml=fs.readFileSync(root+'live-index-before.html','utf8');
const entry=html=>html.match(/src="(\/assets\/index-[^"]+\.js)"/)[1];
const css=html=>html.match(/href="(\/assets\/index-[^"]+\.css)"/)[1];
const normalize=html=>html.replace(/\r/g,'').replace(/>\s+</g,'><');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+'live-index-before.html')).digest('hex'),live.get('index.html'));
assert.equal(normalize(liveHtml),normalize(releaseHtml.replaceAll(entry(releaseHtml),entry(baselineHtml)).replaceAll(css(releaseHtml),css(baselineHtml))));
const proof={baselineAssets:assetCount,expectedLiveIndexHash:live.get('index.html'),releaseEntry:entry(releaseHtml),releaseCss:css(releaseHtml),previousEntry:entry(liveHtml)};
fs.writeFileSync(root+'release-proof.json',JSON.stringify(proof,null,2));
const script=`#!/usr/bin/env bash\nset -euo pipefail\nssh -o BatchMode=yes -o ConnectTimeout=15 root@109.123.239.182 'sha256sum /var/www/web/dist/index.html; test ! -d /var/www/web/.deploy-staging' | grep -q '^${proof.expectedLiveIndexHash} '\nexport DEPLOY_SOURCE=/c/Capstone_Project_Web/${root}release\nexport DEPLOY_ROOT=/var/www/web\nexport DEPLOY_LABEL=web\nexport DEPLOY_URL=https://portal.sugo-express.org\nbash /c/Capstone_Project_Web/scripts/deploy-site.sh --no-build\n`;
fs.writeFileSync(root+'deploy-release.sh',script);
console.log(JSON.stringify(proof));
