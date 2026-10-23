/**
 * Read-only Modbus TCP adapter for AB-PLC Simulator.
 * Only binds to 127.0.0.1; cannot write PLC memory or connect to hardware.
 * Modbus Application Protocol V1.1b3 subset: FC01, FC02, FC03, FC04.
 */
import { createServer } from "node:net";
import { modbusPreview } from "./suite-contract.js";

const MAX_ADU = 260;
const exception = (fc, code) => Buffer.from([fc | 0x80, code]);
const u16 = (x) => Math.max(0,Math.min(65535,Math.trunc(Number(x)||0)));

export function responsePDU(request, registerMap) {
  if (!Buffer.isBuffer(request) || request.length < 1) return exception(0,3);
  const fc=request[0];
  if (![1,2,3,4].includes(fc)) return exception(fc,1);
  if (request.length !== 5) return exception(fc,3);
  const start=request.readUInt16BE(1);
  const count=request.readUInt16BE(3);
  const max = fc < 3 ? 2000 : 125;
  if (count === 0 || count > max) return exception(fc,3);
  const registers = fc === 1 ? registerMap.coils : fc === 2 ?
    registerMap.discrete_inputs : fc === 3 ? registerMap.holding_registers :
    registerMap.input_registers;
  if (!Array.isArray(registers) || start+count > registers.length) return exception(fc,2);
  const data = registers.slice(start,start+count);
  if (fc===1 || fc===2) {
    const packed=Buffer.alloc(Math.ceil(count/8));
    data.forEach((v,i)=>{if(v)packed[Math.trunc(i/8)] |= (1<<(i%8));});
    return Buffer.concat([Buffer.from([fc,packed.length]),packed]);
  }
  const payload=Buffer.alloc(2+count*2);
  payload[0]=fc;payload[1]=count*2;
  data.forEach((value,i)=>payload.writeUInt16BE(u16(value),2+i*2));
  return payload;
}

export function modbusResponse(requestAdu, snapshot) {
  if (!Buffer.isBuffer(requestAdu) || requestAdu.length < 8) throw new Error("ADU demasiado corta");
  const transaction=requestAdu.readUInt16BE(0);
  const protocol=requestAdu.readUInt16BE(2);
  const declared=requestAdu.readUInt16BE(4);
  const unit=requestAdu[6];
  if (declared !== requestAdu.length-6 || declared > 254)
    throw new Error("MBAP length inválido");
  const pdu=protocol!==0 ? exception(requestAdu[7],1) :
    unit!==1 ? exception(requestAdu[7],2) :
    responsePDU(requestAdu.subarray(7),modbusPreview(snapshot));
  const reply=Buffer.alloc(7+pdu.length);
  reply.writeUInt16BE(transaction,0);
  reply.writeUInt16BE(0,2);
  reply.writeUInt16BE(1+pdu.length,4);
  reply[6]=unit;
  pdu.copy(reply,7);
  return reply;
}

export function createModbusLabServer({simulator,host="127.0.0.1",port=1502}={}) {
  if(!simulator || typeof simulator.snapshot!=="function")
    throw new Error("Se requiere CPU virtual");
  if(host!=="127.0.0.1") throw new Error("Solo localhost por motivos de seguridad");
  if(!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("Puerto inválido (0 para pruebas o 1–65535)");
  const server=createServer(socket=>{
    socket.setNoDelay(true);
    socket.setTimeout(15000);
    let buffer=Buffer.alloc(0);
    socket.on("timeout",()=>socket.destroy());
    socket.on("data",chunk=>{
      buffer=Buffer.concat([buffer,chunk]);
      if(buffer.length>MAX_ADU*8) {socket.destroy();return;}
      while(buffer.length>=7) {
        const length=buffer.readUInt16BE(4);
        if(length<2||length>254) {socket.destroy();return;}
        const total=6+length;
        if(buffer.length<total)break;
        const request=buffer.subarray(0,total);
        buffer=buffer.subarray(total);
        try {socket.write(modbusResponse(request,simulator.snapshot()));}
        catch {socket.destroy();return;}
      }
    });
  });
  return new Promise((resolve,reject)=>{
    const rejectListener=e=>{server.removeListener("listening",ok);reject(e);};
    const ok=()=>{server.removeListener("error",rejectListener);resolve(server);};
    server.once("error",rejectListener);
    server.once("listening",ok);
    server.listen(port,host);
  });
}
