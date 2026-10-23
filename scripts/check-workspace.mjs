import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {workspaceRoot as root} from '../src/workspace-server.js';
let failed=false;
const run=(args,cwd=root)=>{const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',windowsHide:true});if(result.status!==0){failed=true;console.error(result.stdout,result.stderr)}return result};
async function files(dir){let all=[];for(const e of await readdir(dir,{withFileTypes:true})){if(['node_modules','.git','.venv','__pycache__'].includes(e.name))continue;const p=resolve(dir,e.name);all.push(...e.isDirectory()?await files(p):[p])}return all}
const source=(await Promise.all(['src','scripts','web','apps'].map(dir=>files(resolve(root,dir))))).flat().filter(p=>/\.(js|mjs|cjs)$/.test(p)&&!p.includes('node_modules'));
for(const path of source)run(['--check',path]);
let count=0;
for(const dir of ['tests','apps/plc/tests','apps/kop/tests','apps/scl/tests','apps/grafcet/tests','apps/vision/tests','apps/scada/tests']){
 const tests=(await readdir(resolve(root,dir))).filter(name=>/\.test\.(js|mjs)$/.test(name));if(!tests.length)continue;
 const r=run(['--test',...tests.map(name=>resolve(root,dir,name))]);if(r.status===0){const match=r.stdout.match(/(?:tests|test) (\d+)/);count+=Number(match?.[1]??0);console.log(`${dir}: correcto`)}
}
console.log(`${source.length} archivos JavaScript comprobados; ${count} pruebas Node correctas.`);
process.exitCode=failed?1:0;
