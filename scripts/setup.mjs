import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {workspaceRoot as root} from '../src/workspace-server.js';
const python=process.env.AB_SUITE_PYTHON??(process.platform==='win32'?'python':'python3');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{cwd:root,stdio:'inherit',windowsHide:true});if(r.error||r.status!==0){console.error(r.error?.message??'Instalación fallida');process.exit(1)}};
run(python,['-m','venv','.venv']);
const executable=resolve(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
run(executable,['-m','pip','install','-r','apps/bi/requirements.txt']);
console.log('Preparación completada. Ejecuta node scripts/workspace.mjs');
