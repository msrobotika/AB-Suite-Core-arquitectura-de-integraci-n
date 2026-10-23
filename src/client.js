/**
 * Node/browser-compatible, dependency-free SDK.
 * Caller owns its app-specific token. Tokens are never inserted in URLs.
 */
import { SUITE_EVENT_SCHEMA } from "./protocol.js";
export class SuiteClient {
  constructor({url="http://127.0.0.1:4175",token,source="monitor"}={}){
    if(!/^https?:\/\/127\.0\.0\.1:\d{1,5}$/.test(url))
      throw new Error("El SDK solo admite endpoints loopback");
    if(typeof token!=="string" || !/^[a-f0-9]{64}$/.test(token))
      throw new Error("Token inválido");
    this.url=url;this.token=token;this.source=source;
  }
  async request(path,{method="GET",body,signal}={}){
    const response=await fetch(this.url+path,{method,
      headers:{"Authorization":"Bearer "+this.token,
        ...(body!==undefined?{"Content-Type":"application/json"}:{})},
      ...(body!==undefined?{body:JSON.stringify(body)}:{}),signal
    });
    const payload=await response.json();
    if(!response.ok){
      const e=new Error(payload.error??"Error Suite HTTP "+response.status);
      e.status=response.status;e.details=payload;throw e;
    }
    return payload;
  }
  health(){return this.request("/v1/health");}
  history({after=0,limit=100}={}){
    return this.request("/v1/events/history?after="+encodeURIComponent(after)+
      "&limit="+encodeURIComponent(limit));
  }
  publish({topic,data,trace_id,simulated_ms}){
    if(this.source==="monitor")throw new Error("Monitor sin permiso de publicación");
    return this.request("/v1/events",{method:"POST",body:{
      schema:SUITE_EVENT_SCHEMA,source:this.source,topic,data,trace_id,
      ...(simulated_ms===undefined?{}:{simulated_ms})
    }});
  }
  /** Fetch-based SSE async iterator; works in Node 20+ and modern browsers. */
  async *events({after=0,signal}={}){
    const res=await fetch(this.url+"/v1/events?after="+encodeURIComponent(after),{
      headers:{"Authorization":"Bearer "+this.token,"Accept":"text/event-stream"},signal
    });
    if(!res.ok){
      const body=await res.json();const error=new Error(body.error??"SSE falló");
      error.status=res.status;throw error;
    }
    if(!res.body)throw new Error("Streaming no disponible");
    const reader=res.body.getReader();
    const decoder=new TextDecoder();
    let buffer="";
    try{
      while(true){
        const {done,value}=await reader.read();
        if(done)break;
        buffer+=decoder.decode(value,{stream:true});
        if(buffer.length>131072)throw new Error("Evento SSE demasiado grande");
        let index;
        while((index=buffer.indexOf("\n\n"))!==-1){
          const chunk=buffer.slice(0,index).replace(/\r/g,"");
          buffer=buffer.slice(index+2);
          const raw=chunk.split("\n").find(x=>x.startsWith("data: "));
          if(raw){
            const event=JSON.parse(raw.slice(6));
            if(event.schema!==SUITE_EVENT_SCHEMA)throw new Error("Evento SSE incompatible");
            yield event;
          }
        }
      }
    }finally{await reader.cancel().catch(()=>{});}
  }
}
