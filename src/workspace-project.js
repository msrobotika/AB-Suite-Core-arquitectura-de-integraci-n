import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {validateProgram} from '../apps/plc/src/plc-engine.js';
/** Persist only editable configuration; never restore a running CPU or forced input. */
export async function restoreCPU(cpu,directory){
 try{const saved=JSON.parse(await readFile(resolve(directory,'plc-program.json'),'utf8'));if(saved.schema!=='ab-suite.cpu-project.v1')throw Error('Versión de proyecto CPU desconocida');validateProgram(saved.program);cpu.loadScenario(saved.scenario,saved.program);return true}
 catch(error){if(error.code==='ENOENT')return false;throw error}
}
export async function persistCPU(cpu,directory){
 await mkdir(directory,{recursive:true});
 const text=JSON.stringify({schema:'ab-suite.cpu-project.v1',scenario:cpu.scenario,program:cpu.program},null,2);
 await writeFile(resolve(directory,'plc-program.tmp'),text);await rename(resolve(directory,'plc-program.tmp'),resolve(directory,'plc-program.json'));
}
