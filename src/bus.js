/** In-memory append-only event bus, deterministic sequence and bounded retention. */
import { validateSuiteEvent } from "./protocol.js";

export class SuiteEventBus {
  constructor({capacity=1000,maxListeners=32}={}){
    if(!Number.isInteger(capacity) || capacity<10 || capacity>100_000)throw new Error("Capacidad inválida");
    if(!Number.isInteger(maxListeners)||maxListeners<1||maxListeners>100)throw new Error("Límite de suscriptores inválido");
    this.capacity=capacity;
    this.maxListeners=maxListeners;
    this.sequence=0;
    this.history=[];
    this.listeners=new Set();
  }
  publish(source,raw){
    const item=validateSuiteEvent(raw,source);
    const event=Object.freeze({...item,sequence:++this.sequence,
      received_at:new Date().toISOString(),
      id:"evt-"+String(this.sequence).padStart(12,"0")});
    this.history.push(event);
    if(this.history.length>this.capacity)this.history.shift();
    for(const subscriber of [...this.listeners]){
      try{subscriber(event);}catch{this.listeners.delete(subscriber);}
    }
    return event;
  }
  since(after=0,limit=200){
    if(!Number.isSafeInteger(after)||after<0 || !Number.isInteger(limit)||limit<1||limit>200)
      throw new Error("Cursor o límite inválido");
    const oldest=this.history[0]?.sequence??this.sequence+1;
    if(after<oldest-1) {
      const error=new Error("Cursor caducado: histórico sobrescrito");
      error.status=409;error.oldest_sequence=oldest;throw error;
    }
    return this.history.filter(x=>x.sequence>after).slice(0,limit);
  }
  subscribe(callback){
    if(typeof callback!=="function")throw new Error("Suscriptor inválido");
    if(this.listeners.size>=this.maxListeners){
      const e=new Error("Demasiados suscriptores");e.status=503;throw e;
    }
    this.listeners.add(callback);
    return ()=>this.listeners.delete(callback);
  }
  close(){this.listeners.clear();}
  stats(){return {schema:"msrobotika.suite.health.v1",version:1,
    sequence:this.sequence,retained:this.history.length,clients:this.listeners.size,
    capacity:this.capacity};}
}
