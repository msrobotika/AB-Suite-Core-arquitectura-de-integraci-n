/** Original educational HMI contract. No fixed factory, no eval. MIT. */
export const HMI_SCHEMA='ab-suite.hmi.v1';
export const TYPES=['indicator','value','trend','alarm'];
const sources=['plc','kop','scl','grafcet','vision','modbus','serial','bi'];
const assert=(ok,message)=>{if(!ok)throw Error(message)};
export function blankProject(){return {schema:HMI_SCHEMA,name:'Mi primer panel',screens:[{id:crypto.randomUUID(),name:'Pantalla 1',widgets:[]}]}}
export function newWidget(type){assert(TYPES.includes(type),'Tipo de componente desconocido');return {id:crypto.randomUUID(),type,label:({indicator:'Indicador digital',value:'Valor de señal',trend:'Tendencia',alarm:'Alarma de umbral'})[type],source:'plc',tag:'',unit:'',threshold:1,comparison:'gte'}}
export function validateProject(p){
 assert(p&&p.schema===HMI_SCHEMA,'Formato HMI incompatible');
 assert(typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=90,'Nombre de proyecto: 1–90 caracteres');
 assert(Array.isArray(p.screens)&&p.screens.length>=1&&p.screens.length<=12,'Se requieren entre 1 y 12 pantallas');
 const ids=new Set();let count=0;
 const id=x=>{assert(typeof x==='string'&&/^[\w-]{1,80}$/.test(x)&&!ids.has(x),'Identificador duplicado o inválido');ids.add(x)};
 for(const screen of p.screens){
  id(screen.id);assert(typeof screen.name==='string'&&screen.name.trim()&&screen.name.length<=60,'Nombre de pantalla: 1–60 caracteres');
  assert(Array.isArray(screen.widgets)&&screen.widgets.length<=30,'Máximo 30 componentes por pantalla');
  for(const w of screen.widgets){count++;id(w.id);assert(TYPES.includes(w.type),'Componente no admitido');assert(typeof w.label==='string'&&w.label.trim()&&w.label.length<=90,'Título de componente inválido');assert(sources.includes(w.source),'Origen de señal desconocido');assert(typeof w.tag==='string'&&(w.tag===''||/^[A-Za-z0-9_.:-]{1,100}$/.test(w.tag)),'Nombre de señal inválido');assert(typeof w.unit==='string'&&w.unit.length<=20,'Unidad demasiado larga');assert(typeof w.threshold==='number'&&Number.isFinite(w.threshold),'Umbral no finito');assert(['gte','lte','eq'].includes(w.comparison),'Comparación desconocida')}
 }assert(count<=120,'Máximo 120 componentes en el proyecto');return structuredClone(p);
}
export function isAlarm(w,value){const number=typeof value==='boolean'?Number(value):value;return w.comparison==='gte'?number>=w.threshold:w.comparison==='lte'?number<=w.threshold:number===w.threshold}
