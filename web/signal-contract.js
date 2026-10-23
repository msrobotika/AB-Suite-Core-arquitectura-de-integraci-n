/** Typed browser telemetry. Latest values only; never assume a stale source is live. */
export const SCHEMA='ab-suite.signals.v1';
export const PREFIX='ab-suite:signals:';
export function validSnapshot(value){
 if(!value||value.schema!==SCHEMA||!/^([a-z]{2,8})$/.test(value.source)||!Number.isFinite(value.at)||typeof value.instance!=='string'||typeof value.tags!=='object'||!value.tags||Array.isArray(value.tags))return false;
 const entries=Object.entries(value.tags);
 return entries.length<=256&&entries.every(([name,v])=>/^[A-Za-z0-9_.:-]{1,100}$/.test(name)&&(typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)));
}
export function quality(snapshot,now=Date.now()){
 if(!validSnapshot(snapshot))return 'missing';
 return now-snapshot.at<0||now-snapshot.at>5000?'stale':'good';
}
export function parseSnapshot(raw){try{const value=JSON.parse(raw);return validSnapshot(value)?value:null}catch{return null}}
export function signalValue(snapshots,source,tag,now=Date.now()){
 const snapshot=snapshots[source];const status=quality(snapshot,now);
 if(status!=='good'||!Object.hasOwn(snapshot.tags,tag))return {quality:status==='good'?'missing':status,value:null};
 return {quality:'good',value:snapshot.tags[tag]};
}
