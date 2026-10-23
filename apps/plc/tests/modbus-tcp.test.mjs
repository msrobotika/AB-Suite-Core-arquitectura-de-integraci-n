import test from "node:test";
import assert from "node:assert/strict";
import { connect } from "node:net";
import { VirtualPLC } from "../src/plant-runtime.js";
import { modbusPreview } from "../src/suite-contract.js";
import { responsePDU,modbusResponse,createModbusLabServer } from "../src/modbus-tcp.js";

function adu(fc,addr=0,count=1,tid=123){
 const req=Buffer.alloc(12);req.writeUInt16BE(tid,0);req.writeUInt16BE(0,2);
 req.writeUInt16BE(6,4);req[6]=1;req[7]=fc;
 req.writeUInt16BE(addr,8);req.writeUInt16BE(count,10);return req;
}
const plc=()=>{const m=new VirtualPLC("rack");m.setMode("RUN");m.setInput("I0.0",true);m.tick();return m;};

test("FC01 serializa coils en bits LSB",()=>{
 const map=modbusPreview(plc().snapshot());
 const pdu=responsePDU(Buffer.from([1,0,0,0,3]),map);
 assert.deepEqual([...pdu],[1,1,1]);
});
test("FC02 lee entradas virtuales como bits",()=>{
 const map=modbusPreview(plc().snapshot());
 const pdu=responsePDU(Buffer.from([2,0,0,0,4]),map);
 assert.deepEqual([...pdu],[2,1,7]);
});
test("FC03 holding registers emite big-endian y MBAP conserva transaction",()=>{
 const m=plc(),req=adu(3,0,2,567),rep=modbusResponse(req,m.snapshot());
 assert.equal(rep.readUInt16BE(0),567);
 assert.equal(rep.readUInt16BE(2),0);
 assert.equal(rep[7],3);
 assert.equal(rep[8],4);
 assert.equal(rep.readUInt16BE(9),1);
});
test("FC04 devuelve input registers del mapa de proceso",()=>{
 const m=plc(),pdu=responsePDU(Buffer.from([4,0,0,0,2]),modbusPreview(m.snapshot()));
 assert.equal(pdu[0],4);assert.equal(pdu[1],4);
});
test("FC06 escritura prohibida; direcciones y cantidades inválidas rechazadas",()=>{
 const map=modbusPreview(plc().snapshot());
 assert.deepEqual([...responsePDU(Buffer.from([6,0,0,0,1]),map)],[0x86,1]);
 assert.deepEqual([...responsePDU(Buffer.from([3,0,99,0,1]),map)],[0x83,2]);
 assert.deepEqual([...responsePDU(Buffer.from([3,0,0,0,0]),map)],[0x83,3]);
});
test("MBAP malformed se rechaza, unit ID desconocido recibe excepción",()=>{
 const m=plc(),req=adu(3);req.writeUInt16BE(9,4);
 assert.throws(()=>modbusResponse(req,m.snapshot()),/MBAP/);
 const other=adu(3);other[6]=2;
 assert.deepEqual([...modbusResponse(other,m.snapshot()).subarray(7)],[0x83,2]);
});
test("servidor real localhost: FC03 responde y FC06 deniega escritura",async()=>{
 const m=plc();
 const srv=await createModbusLabServer({simulator:m,port:0});
 const assignedPort=srv.address().port;
 const exchange=request=>new Promise((resolve,reject)=>{
   const sock=connect({host:"127.0.0.1",port:assignedPort},()=>sock.write(request));
   const chunks=[];
   sock.setTimeout(3000,()=>sock.destroy(new Error("Timeout Modbus")));
   sock.on("data",data=>{
     chunks.push(data);
     const total=Buffer.concat(chunks);
     if(total.length>=7 && total.length>=6+total.readUInt16BE(4)){
       sock.destroy();resolve(total);
     }
   });
   sock.on("error",reject);
 });
 try {
   const read=await exchange(adu(3,0,2,145));
   assert.equal(read.readUInt16BE(0),145);
   assert.equal(read[7],3);
   assert.equal(read[8],4);
   assert.equal(read.readUInt16BE(9),1);
   const write=await exchange(adu(6,0,1,146));
   assert.deepEqual([...write.subarray(7)],[0x86,1]);
 } finally {await new Promise(resolve=>srv.close(resolve));}
 assert.throws(() => createModbusLabServer({simulator:m,host:"0.0.0.0",port:1502}),/localhost/);
});
