const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Capstone/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://127.0.0.1:4183';
const user={id:1,username:'animation-test',role:'owner',name:'Animation Test',email:'',phone:'',avatar:''};
const token=`e30.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.test`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  for(const width of (process.argv.includes('--desktop-only')?[1440]:[390,1440])) for(const reducedMotion of ['no-preference','reduce']) {
   let failRead=true,saves=0;
   let config={id:1,baseFee:70,perKmRate:10,multiStoreFeePerStore:30,maxAdditionalStores:2,groceryFeeThreshold:1001,groceryFeePercent:10,groceryFeeFlat:50,nonCodThreshold:3000,nonCodFeeHigh:15,nonCodFeeLow:0};
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion});
   await context.addInitScript(({user})=>{sessionStorage.setItem('errand_system_session_user',JSON.stringify(user));window.entrances=[];document.addEventListener('animationstart',event=>{if(event.animationName==='owner-screen-enter')window.entrances.push(event.target.className);});},{user});
   await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname.startsWith('/api/')) {
     let status=200,body=[];
     if(url.pathname==='/api/auth/refresh')body={user,token};
     else if(url.pathname==='/api/maintenance/status')body={isActive:false};
     else if(url.pathname==='/api/rate-config'){
      if(request.method()==='PUT'){config={...config,...request.postDataJSON()};saves++;body=config;}
      else if(failRead){failRead=false;status=503;body={error:'Local verification: unavailable'};}
      else body=config;
     }
     else if(url.pathname==='/api/auth/firebase-token'){status=503;body={error:'Local verification: unavailable'};}
     return route.fulfill({status,json:body,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PUT,OPTIONS','x-total-count':'0'}});
    }
    return url.origin===origin?route.continue():route.abort();
   });
   const page=await context.newPage();
   const footerAction=async name=>{const button=page.getByRole('button',{name,exact:true});if(width===1440){await button.focus();await page.keyboard.press('Enter');}else await button.click();};
   await page.goto(origin+'/owner?module=rates');
   const regions=page.locator('.owner-rates-enter > :first-child,.owner-rates-enter > :nth-child(2)');
   await regions.first().waitFor();
   await page.getByRole('button',{name:'Retry Loading Rates',exact:true}).waitFor();
   await page.waitForTimeout(650);
   const states=await regions.evaluateAll(nodes=>nodes.map(node=>{const s=getComputedStyle(node);return{name:s.animationName,delay:s.animationDelay,opacity:s.opacity,transform:s.transform};}));
   assert.equal(states.length,2);
   assert.ok(states.every(s=>s.name===(reducedMotion==='reduce'?'none':'owner-screen-enter')&&s.opacity==='1'&&s.transform==='none'));
   if(reducedMotion==='no-preference')assert.deepEqual(states.map(s=>s.delay),['0s','0.09s']);
   const before=await page.evaluate(()=>window.entrances.length);
   await page.getByRole('button',{name:'Retry Loading Rates',exact:true}).click();
   const edit=page.getByRole('button',{name:'Edit Base Delivery Fare',exact:true});
   await edit.waitFor();
   await edit.click();
   await footerAction('Cancel');
   await edit.click();
   await page.getByRole('spinbutton',{name:/^Base Delivery Fare/}).fill('71');
   await footerAction('Update');
   await page.getByRole('dialog',{name:'Confirm Service Rates Configuration',exact:true}).waitFor();
   await page.getByRole('button',{name:'Back to Rates',exact:true}).click();
   await footerAction('Update');
   await page.getByRole('button',{name:'Confirm & Apply Rates',exact:true}).click();
   await page.getByText('Saved to Database',{exact:true}).waitFor();
   await page.getByRole('region',{name:'Base Delivery Fare',exact:true}).getByText('₱71.00',{exact:true}).waitFor();
   assert.equal(saves,1);
   assert.equal(await page.evaluate(()=>window.entrances.length),before);
   assert.ok(await regions.evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).opacity==='1'&&getComputedStyle(node).transform==='none')));
   console.log(`${width}px ${reducedMotion}: entrance, load retry, edit/cancel and stubbed save passed without replay (desktop footer uses keyboard due to existing Copilot overlap)`);
   await context.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
