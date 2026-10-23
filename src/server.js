/**
 * Loopback-only HTTP/SSE Suite bus v1. Bearer identities issued per process.
 * No commands to PLCs, no LAN bind, no unauthenticated event stream.
 */
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { SuiteEventBus } from "./bus.js";
import { SUITE_TOPICS } from "./protocol.js";

const json=(res,status,value)=>{
  const body=Buffer.from(JSON.stringify(value));
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8","Content-Length":body.length,
    "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer"
  });
  res.end(body);
};
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const authEqual=(actual,expected)=>{
  const a=Buffer.from(actual??"");const b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
};
function identity(req,tokens){
  const authorization=req.headers.authorization??"";
  for(const [clientId,token] of Object.entries(tokens)){
    if(authEqual(authorization,"Bearer "+token))return clientId;
  }
  return null;
}
async function readJSON(req){
  const chunks=[];let size=0;
  for await(const chunk of req){
    size+=chunk.length;
    if(size>24_576)throw error("Cuerpo demasiado grande",413);
    chunks.push(chunk);
  }
  try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
  catch{throw error("Cuerpo JSON inválido");}
}
function parseCursor(raw,defaultValue=0){
  if(raw==null||raw==="")return defaultValue;
  if(!/^(0|[1-9][0-9]*)$/.test(raw))throw error("Cursor inválido");
  const cursor=Number(raw);
  if(!Number.isSafeInteger(cursor))throw error("Cursor fuera de rango");
  return cursor;
}
function sseData(event){
  return "id: "+event.sequence+"\nevent: "+event.topic+
    "\ndata: "+JSON.stringify(event)+"\n\n";
}

export async function startSuiteCore({
  host="127.0.0.1",port=4175,bus=new SuiteEventBus(),
  tokens=null
}={}){
  if(host!=="127.0.0.1")throw error("Suite Core solo admite 127.0.0.1");
  if(!Number.isInteger(port)||port<0||port>65535)throw error("Puerto inválido");
  const credentials=tokens??Object.fromEntries(
    [...Object.keys(SUITE_TOPICS),"monitor"].map(id=>[id,randomBytes(32).toString("hex")])
  );
  const clients=new Set();
  const sockets=new Set();
  let server;
  const handler=async(req,res)=>{
    try{
      const origin="http://127.0.0.1:"+server.address().port;
      if(req.headers.host!=="127.0.0.1:"+server.address().port ||
         (req.headers.origin && req.headers.origin!==origin) ||
         req.headers["sec-fetch-site"]==="cross-site")throw error("Origen no permitido",403);
      const url=new URL(req.url,origin);
      if(url.pathname==="/v1/health" && req.method==="GET")
        return json(res,200,bus.stats());
      const clientId=identity(req,credentials);
      if(!clientId)throw error("Credencial ausente o inválida",401);

      if(url.pathname==="/v1/events" && req.method==="POST"){
        if(clientId==="monitor" || !Object.hasOwn(SUITE_TOPICS,clientId))
          throw error("El monitor es de solo lectura",403);
        const input=await readJSON(req);
        let published;
        try {published=bus.publish(clientId,input);}
        catch(err){throw error(err.message,422);}
        return json(res,201,published);
      }
      if(url.pathname==="/v1/events/history" && req.method==="GET"){
        const after=parseCursor(url.searchParams.get("after"));
        const limit=parseCursor(url.searchParams.get("limit"),100);
        return json(res,200,{schema:"msrobotika.suite.history.v1",
          events:bus.since(after,limit),head:bus.sequence});
      }
      if(url.pathname==="/v1/events" && req.method==="GET"){
        const after=parseCursor(url.searchParams.get("after")??req.headers["last-event-id"]);
        // Reject expired cursors BEFORE beginning the streaming response.
        bus.since(after,1);
        if(clients.size>=bus.maxListeners)throw error("Conexiones SSE agotadas",503);
        res.writeHead(200,{
          "Content-Type":"text/event-stream; charset=utf-8",
          "Cache-Control":"no-cache, no-transform","Connection":"keep-alive",
          "X-Accel-Buffering":"no","X-Content-Type-Options":"nosniff"
        });
        res.write(": suite-core-v1\n\n");
        let cursor=after;
        let replaying=true;
        const pending=[];
        const send=(event)=>{
          if(event.sequence<=cursor || res.destroyed)return;
          cursor=event.sequence;
          if(!res.write(sseData(event)))res.destroy();
        };
        const unsubscribe=bus.subscribe(event=>{
          if(replaying)pending.push(event);
          else send(event);
        });
        clients.add(res);
        const heartbeat=setInterval(()=>{
          if(!res.destroyed && !res.write(": heartbeat\n\n"))res.destroy();
        },15_000);
        res.on("close",()=>{clearInterval(heartbeat);unsubscribe();clients.delete(res);});
        try{
          for(;;){
            const page=bus.since(cursor,200);
            if(!page.length)break;
            page.forEach(send);
            if(page.length<200)break;
          }
          replaying=false;
          pending.sort((a,b)=>a.sequence-b.sequence).forEach(send);
        }catch{res.destroy();}
        return;
      }
      throw error("Ruta o método inexistente",404);
    }catch(err){
      if(!res.headersSent){
        json(res,err.status??400,{error:err.message,...(err.oldest_sequence?{oldest_sequence:err.oldest_sequence}:{})});
      }else res.destroy();
    }
  };
  server=createServer(handler);
  server.on("connection",socket=>{
    sockets.add(socket);
    socket.on("close",()=>sockets.delete(socket));
  });
  await new Promise((ok,bad)=>{
    server.once("error",bad);
    server.listen(port,host,ok);
  });
  const close=async()=>{
    for(const res of clients)res.destroy();
    for(const socket of sockets)socket.destroy();
    await new Promise(ok=>server.close(ok));
    bus.close();
  };
  return {url:"http://127.0.0.1:"+server.address().port,
    port:server.address().port,tokens:credentials,bus,close};
}
