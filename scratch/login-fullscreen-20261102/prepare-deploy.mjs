import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root='C:/Capstone_Project_Web', work=path.join(root,'scratch/login-fullscreen-20261102/deployment');
fs.mkdirSync(work,{recursive:true});
const head=p=>execFileSync('git',['-c','core.fsmonitor=false','show',`HEAD:${p}`],{cwd:root,encoding:'utf8'});
const write=(dir,p,data)=>{fs.mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});fs.writeFileSync(path.join(dir,p),data);};
const baseline=path.join(work,'baseline');
if(fs.existsSync(baseline)) throw Error('Baseline already exists');
fs.mkdirSync(baseline);
for(const p of ['src','public','index.html','vite.config.ts','tsconfig.json','package.json','package-lock.json','.env','.env.production','.env.local','.env.production.local']) {
 const source=path.join(root,p);if(!fs.existsSync(source))continue;
 fs.cpSync(source,path.join(baseline,p),{recursive:true,filter:s=>!s.replaceAll('\\','/').includes('/src/assets/login')&&!s.endsWith('login-page.css')&&!s.replaceAll('\\','/').includes('/preview/login-candidates-20261102')});
}
for(const p of ['src/context/AuthContext.tsx','src/types/auth.ts','src/components/auth/SessionExpiredModal.tsx']) write(baseline,p,head(p));
let api=head('src/services/apiClient.ts');
api=api.replace('import axios from "axios";','import axios from "axios";\nimport { rememberErrandReferences } from "../utils/formatErrandId";');
api=api.replace('(response) => response,','(response) => {\n    rememberErrandReferences(response.data);\n    return response;\n  },');
write(baseline,'src/services/apiClient.ts',api);
let login=head('src/components/LoginPage.tsx');
login=login.replace('import { LiveEditNoticeModal } from "./LiveEditNoticeModal";','import { LiveEditNoticeModal } from "./LiveEditNoticeModal";\nimport { BrandMark } from "./brand/BrandMark";');
login=login.replace('<div className="pb-6 text-center pt-2">','<div className="pb-6 text-center pt-2">\n          <div className="mx-auto mb-4 size-14 rounded-xl bg-signal flex items-center justify-center text-white">\n            <BrandMark className="w-10" label="Sugo on the Go" />\n          </div>');
write(baseline,'src/components/LoginPage.tsx',login);
console.log('Prepared baseline without login redesign or unrelated cookie-only changes.');
