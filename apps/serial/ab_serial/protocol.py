# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MS ROBOTIKA
"""Independent read-only Modbus RTU decoder; no transmitting capabilities."""
from dataclasses import dataclass

MAX_RTU_ADU = 256

def crc16(data: bytes) -> int:
    crc = 0xffff
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0xA001 if crc & 1 else 0)
    return crc

def append_crc(pdu: bytes) -> bytes:
    if not 2 <= len(pdu) <= 254:
        raise ValueError('Longitud RTU fuera de rango')
    return pdu + crc16(pdu).to_bytes(2, 'little')

def _bits(data, quantity=None):
    bits = [(byte >> bit) & 1 for byte in data for bit in range(8)]
    return bits[:quantity] if quantity is not None else bits

def _function_name(fn):
    return {1:'Read Coils',2:'Read Discrete Inputs',3:'Read Holding Registers',
            4:'Read Input Registers',5:'Write Single Coil',6:'Write Single Register',
            15:'Write Multiple Coils',16:'Write Multiple Registers'}.get(fn, f'FC {fn:02X}')

def _exception_name(code):
    return {1:'Illegal Function',2:'Illegal Data Address',3:'Illegal Data Value',
            4:'Slave Device Failure',6:'Slave Device Busy'}.get(code,'Código no identificado')

def decode_rtu(raw: bytes) -> dict:
    """Decode a candidate RTU ADU without assuming traffic direction."""
    if not isinstance(raw,bytes) or not 4 <= len(raw) <= MAX_RTU_ADU:
        return {'valid':False,'crc_ok':False,'kind':'incompleta',
                'detail':'Longitud ADU inválida','unit':None,'function':None,'values':[]}
    unit,fn=raw[0],raw[1]
    got,expected=int.from_bytes(raw[-2:],'little'),crc16(raw[:-2])
    base=dict(valid=got==expected,crc_ok=got==expected,unit=unit,function=fn,
              function_name=_function_name(fn),values=[],kind='desconocida',
              detail='',crc_received=f'{got:04X}',crc_calculated=f'{expected:04X}')
    if got!=expected:
        return {**base,'kind':'error CRC','detail':'CRC inválido — trama no fiable'}
    if fn&0x80:
        if len(raw)==5:
            code=raw[2]
            return {**base,'kind':'excepción','exception':code,
                    'detail':f'Excepción Modbus {code:02X} ({_exception_name(code)})'}
        return {**base,'valid':False,'kind':'malformada','detail':'Longitud de excepción incorrecta'}
    pdu=raw[2:-2]
    if fn in (1,2,3,4):
        if len(raw)==8:
            address=int.from_bytes(pdu[:2],'big')
            quantity=int.from_bytes(pdu[2:4],'big')
            if 1<=quantity<=(2000 if fn<3 else 125):
                return {**base,'kind':'solicitud de lectura','address':address,
                        'quantity':quantity,'detail':f'Inicio {address} · {quantity} punto(s)'}
        if len(pdu)>=1 and pdu[0]==len(pdu)-1:
            data=pdu[1:]
            if fn in (3,4):
                if not data or len(data)%2:
                    return {**base,'valid':False,'kind':'malformada',
                            'detail':'Registros con cantidad de bytes impar o nula'}
                values=[int.from_bytes(data[i:i+2],'big') for i in range(0,len(data),2)]
            else:
                if not data:
                    return {**base,'valid':False,'kind':'malformada','detail':'Bits sin bytes de datos'}
                values=_bits(data)
            return {**base,'kind':'respuesta de lectura','values':values,
                    'byte_count':len(data),'detail':f'{len(data)} byte(s) de datos'}
        return {**base,'valid':False,'kind':'malformada','detail':'FC lectura: estructura no reconocida'}
    if fn in (5,6):
        if len(raw)!=8:
            return {**base,'valid':False,'kind':'malformada','detail':'FC escritura simple: longitud incorrecta'}
        address,value=int.from_bytes(pdu[:2],'big'),int.from_bytes(pdu[2:4],'big')
        return {**base,'kind':'solicitud/respuesta escritura','address':address,
                'values':[value],'detail':f'Dirección {address} · valor {value} (solo observado)'}
    if fn in (15,16):
        if len(raw)==8:
            return {**base,'kind':'respuesta escritura múltiple',
                    'address':int.from_bytes(pdu[:2],'big'),'quantity':int.from_bytes(pdu[2:4],'big'),
                    'detail':'Confirmación de escritura observada; NO enviada por esta aplicación'}
        if len(pdu)>=5 and pdu[4]==len(pdu)-5:
            return {**base,'kind':'solicitud escritura múltiple',
                    'address':int.from_bytes(pdu[:2],'big'),'quantity':int.from_bytes(pdu[2:4],'big'),
                    'detail':'Trama de escritura detectada pasivamente'}
        return {**base,'valid':False,'kind':'malformada','detail':'Escritura múltiple: formato incorrecto'}
    return {**base,'kind':'función no decodificada','detail':'CRC válido · función no interpretada'}

@dataclass
class RTUCollector:
    """Approximate idle gap delimiter; OS/USB timestamps are not wire precise."""
    baud: int=9600
    data_bits: int=8
    parity: str='N'
    stop_bits: int=1
    buffer: bytes=b''
    last_at: float|None=None

    @property
    def gap(self):
        if self.baud>19200:
            return .00175
        char_bits=1+self.data_bits+(self.parity!='N')+self.stop_bits
        return 3.5*char_bits/self.baud

    def feed(self,data:bytes,at:float)->list[bytes]:
        if not isinstance(data,bytes):raise TypeError('Se requieren bytes')
        out=[]
        if self.buffer and self.last_at is not None and at-self.last_at>=self.gap:
            out.append(self.buffer);self.buffer=b''
        if data:
            self.buffer+=data;self.last_at=at
        if len(self.buffer)>MAX_RTU_ADU:
            out.append(self.buffer);self.buffer=b'';self.last_at=None
        return out

    def flush_if_idle(self,at:float)->list[bytes]:
        return self.feed(b'',at)
