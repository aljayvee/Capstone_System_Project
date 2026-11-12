const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Capstone/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://127.0.0.1:4182';
const user={id:1,username:'animation-test',role:'owner',name:'Animation Test',email:'',phone:'',avatar:''};
const token=`e30.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.test`;
const categories=[{id:1001,name:'Fixture Groceries',description:'Local test category',status:'Active',_count:{places:0}},{id:1002,name:'Fixture Pharmacy',description:'Local test category',status:'Active',_count:{places:0}}];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  for(const width of [390,1440]) for(const reducedMotion of ['no-preference','reduce']) {
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion});
   await context.addInitScript(({user})=>{sessionStorage.setItem('errand_system_session_user',JSON.stringify(user));window.entrances=[];document.addEventListener('animationstart',event=>{if(event.animationName==='owner-screen-enter')window.entrances.push(event.target.className);});},{user});
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/api/')) {
     let status=200,body=[];
     if(url.pathname==='/api/auth/refresh')body={user,token};
     else if(url.pathname==='/api/maintenance/status')body={isActive:false};
     else if(url.pathname==='/api/merchant-categories')body=categories;
     else if(url.pathname==='/api/rate-config'||url.pathname==='/api/auth/firebase-token'){status=503;body={error:'Local verification: unavailable'};}
     return route.fulfill({status,json:body,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS','x-total-count':'0'}});
    }
    return url.origin===origin?route.continue():route.abort();
   });
   const page=await context.newPage();
   await page.goto(origin+'/owner?module=merchants');
   const regions=page.locator('.owner-merchants-header-enter,.owner-merchants-tabs-enter,.owner-merchants-panel-enter');
   await regions.first().waitFor();
   await page.getByRole('heading',{name:'Fixture Groceries',exact:true}).waitFor();
   await page.waitForTimeout(650);
   const states=await regions.evaluateAll(nodes=>nodes.map(node=>{const s=getComputedStyle(node);return{name:s.animationName,delay:s.animationDelay,opacity:s.opacity,transform:s.transform};}));
   assert.equal(states.length,3);
   assert.ok(states.every(s=>s.name===(reducedMotion==='reduce'?'none':'owner-screen-enter')&&s.opacity==='1'&&s.transform==='none'));
   if(reducedMotion==='no-preference')assert.deepEqual(states.map(s=>s.delay),['0s','0.04s','0.09s']);
   const before=await page.evaluate(()=>window.entrances.length);
   await page.getByRole('textbox',{name:'Search merchant categories'}).fill('no-such-category');
   await page.getByRole('heading',{name:'No categories found',exact:true}).waitFor();
   await page.getByRole('textbox',{name:'Search merchant categories'}).fill('Groceries');
   await page.getByRole('combobox',{name:'Sort the categories'}).selectOption('name-desc');
   await page.getByRole('button',{name:'Add Category',exact:true}).click();
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
   await page.getByRole('button',{name:'Edit',exact:true}).click();
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.entrances.length),before);
   for(const tab of ['Location Stores','Archive','Merchant Categories']) {
    const previous=await page.evaluate(()=>window.entrances.length);
    await page.getByRole('tab',{name:new RegExp(tab)}).click();
    await page.waitForTimeout(650);
    assert.equal(await page.evaluate(()=>window.entrances.length),previous+(reducedMotion==='reduce'?0:1));
    assert.ok(await page.locator('.owner-merchants-panel-enter').evaluate(node=>getComputedStyle(node).opacity==='1'&&getComputedStyle(node).transform==='none'));
   }
   console.log(`${width}px ${reducedMotion}: entrance, filtering, sort, Add/Edit and tab switching passed`);
   await context.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
