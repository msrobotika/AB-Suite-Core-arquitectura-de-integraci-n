#!/usr/bin/env node
/** Executes a reproducible offline PLC bench scenario; no PLC hardware or internet. */
import { readFile, writeFile } from "node:fs/promises";
import { runScenario, sampleScenario } from "../src/scenario-runner.js";
import { telemetryCSV, telemetryEnvelope } from "../src/suite-contract.js";
import { importABKop } from "../src/kop-import.js";
const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
try {
  const scenarioFile=option("--scenario");
  const spec=scenarioFile?JSON.parse(await readFile(scenarioFile,"utf8")):JSON.parse(JSON.stringify(sampleScenario));
  const kopPath=option("--ab-kop");
  const nativePath=option("--program");
  if(kopPath&&nativePath)throw new Error("Usa solo --ab-kop o --program");
  let program;
  if(kopPath) {program=importABKop(JSON.parse(await readFile(kopPath,"utf8"))).program;
    if(!scenarioFile){spec.events=[];spec.scans=100;}
    spec.scenario="rack";}
  if(nativePath) {program=JSON.parse(await readFile(nativePath,"utf8"));
    if(!scenarioFile){spec.events=[];spec.scans=100;}
    spec.scenario="rack";}
  const run=runScenario(spec,program);
  const out=option("--csv")??"ab-plc-scenario.csv";
  await writeFile(out,telemetryCSV(run.samples),"utf8");
  const json=option("--json");
  if(json) await writeFile(json,JSON.stringify({
    schema:"msrobotika.suite.telemetry.v1",producer:{app:"AB-PLC-Simulator",version:"0.3.0"},
    source:"virtual",scenario:spec.scenario,samples:run.samples.map(x=>({
      scan:x.scan,simulatedMs:x.simulatedMs,outputs:x.cpu.outputs,
      inputs:x.cpu.inputs,plant:x.plant,faults:x.faults
    }))
  },null,2),"utf8");
  process.stdout.write(JSON.stringify({
    ok:true,scenario:spec.scenario,scans:run.snapshot.scan,timeMs:run.snapshot.simulatedMs,
    output:out,plant:run.snapshot.plant,faults:run.snapshot.faults
  },null,2)+"\n");
}catch(err){process.stderr.write("AB-PLC scenario error: "+err.message+"\n");process.exitCode=1;}
