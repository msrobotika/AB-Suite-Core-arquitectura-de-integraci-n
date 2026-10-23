import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {workspaceRoot} from '../src/workspace-server.js';
import {persistCPU,restoreCPU} from '../src/workspace-project.js';
import {VirtualPLC} from '../apps/plc/src/plant-runtime.js';
import {toBIRow} from '../src/bi-capture.js';
test('El programa de la CPU se conserva; no se restaura una ejecución RUN',async t=>{
 const base=resolve(workspaceRoot,'.suite-data');await mkdir(base,{recursive:true});const dir=await mkdtemp(resolve(base,'test-cpu-'));
 t.after(async()=>{const target=resolve(dir);assert.ok(target.startsWith(base+sep+'test-cpu-'));await rm(target,{recursive:true,force:true})});
 const original=new VirtualPLC('rack');original.setMode('RUN');original.tick(100);
 await persistCPU(original,dir);const restored=new VirtualPLC('conveyor');
 assert.equal(await restoreCPU(restored,dir),true);assert.equal(restored.scenario,'rack');assert.equal(restored.mode,'STOP');assert.deepEqual(restored.program,original.program);assert.equal(restored.scanNumber,0);
});
test('Captura BI: señales y unidades proceden del snapshot de la CPU',()=>{
 const cpu=new VirtualPLC('tank');const snapshot=cpu.snapshot(),row=toBIRow(snapshot,7);
 assert.equal(row.sequence,7);assert.equal(row.process_unit,'percent');assert.equal(row.process_value,snapshot.plant.level);assert.equal(row.Q0_0,Number(Boolean(snapshot.cpu.outputs['Q0.0'])));assert.equal(row.scan,snapshot.scan);
});
