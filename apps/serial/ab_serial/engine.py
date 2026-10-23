# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MS ROBOTIKA
"""Read-only capture, protocol analysis, bounded history and deterministic demo."""
from __future__ import annotations
from collections import deque
from datetime import datetime,timezone
import importlib.util
import threading,time
from .protocol import append_crc,decode_rtu,RTUCollector

class Analyzer:
    def __init__(self):
        self._lock=threading.RLock()
        self._events=deque(maxlen=500)
        self._seq=0
        self._reader=None
        self._stop=threading.Event()
        self.mode='detenido'
        self.device=''
        self.errors=0
        self._started=time.monotonic()

    def _publish(self,raw:bytes,source:str):
        report=decode_rtu(raw)
        with self._lock:
            self._seq+=1
            if not report['valid']:self.errors+=1
            self._events.append({'id':self._seq,'time':datetime.now(timezone.utc).isoformat(timespec='milliseconds'),
                'source':source,'hex':raw.hex(' ').upper(),'length':len(raw),**report})

    def snapshot(self):
        with self._lock:
            events=list(self._events)
            return {'mode':self.mode,'device':self.device,'events':events,'count':self._seq,
                    'errors':self.errors,'version':'0.1.0','writes_enabled':False,
                    'max_events':500,'rx_bytes':sum(e['length'] for e in events),
                    'uptime_sec':round(time.monotonic()-self._started)}

    def clear(self):
        with self._lock:
            self._events.clear();self._seq=0;self.errors=0

    def _claim(self,mode,device):
        with self._lock:
            if self.mode!='detenido':raise ValueError('Detén la captura anterior antes de iniciar otra')
            self.mode=mode;self.device=device;self._stop.clear()

    def start_demo(self):
        self._claim('laboratorio','Simulador RTU interno')
        self._reader=threading.Thread(target=self._demo_worker,daemon=True)
        self._reader.start()

    def _demo_worker(self):
        values=[230,1500,42,2026,100,0,65535,1234]
        req=append_crc(bytes.fromhex('01 03 00 00 00 08'))
        response=append_crc(bytes([1,3,16])+b''.join(x.to_bytes(2,'big') for x in values))
        coils=append_crc(bytes([1,1,2,0b01010101,0b00001111]))
        exception=append_crc(bytes([1,0x83,2]))
        bad=response[:-1]+bytes([response[-1]^0x40])
        frames=[req,response,coils,response,exception,bad]
        i=0
        while not self._stop.is_set():
            self._publish(frames[i%len(frames)],'LAB')
            i+=1
            if self._stop.wait(.85):break

    @staticmethod
    def ports():
        if importlib.util.find_spec('serial') is None:return []
        from serial.tools.list_ports import comports
        return [{'device':p.device,'description':p.description,'hwid':p.hwid} for p in comports()][:64]

    def start_serial(self,*,port:str,baud:int,parity:str,stop_bits:int,data_bits:int,authorized:bool):
        if authorized is not True:raise ValueError('Debes autorizar explícitamente la apertura del puerto de solo recepción')
        if type(port) is not str or port not in {x['device'] for x in self.ports()}:
            raise ValueError('Selecciona un puerto detectado en este equipo')
        if type(baud) is not int or baud not in (1200,2400,4800,9600,19200,38400,57600,115200):
            raise ValueError('Baud rate no permitido')
        if parity not in ('N','E','O') or type(stop_bits) is not int or stop_bits not in (1,2) or type(data_bits) is not int or data_bits not in (7,8):
            raise ValueError('Formato serie no permitido')
        if importlib.util.find_spec('serial') is None:raise ValueError('Instala pyserial para hardware real')
        import serial
        handle=serial.Serial(port=port,baudrate=baud,parity=parity,stopbits=stop_bits,
                bytesize=data_bits,timeout=.01,write_timeout=.05,rtscts=False,dsrdtr=False,xonxoff=False)
        try:
            try:
                handle.dtr=False;handle.rts=False
            except (OSError,ValueError,AttributeError):pass
            self._claim('serial',port)
            self._reader=threading.Thread(target=self._serial_worker,
                       args=(handle,baud,parity,stop_bits,data_bits),daemon=True)
            self._reader.start()
        except Exception:
            handle.close();raise

    def _serial_worker(self,handle,baud,parity,stop_bits,data_bits):
        collector=RTUCollector(baud=baud,parity=parity,stop_bits=stop_bits,data_bits=data_bits)
        try:
            while not self._stop.is_set():
                data=handle.read(256)
                at=time.monotonic()
                for frame in collector.feed(data,at):self._publish(frame,'RX')
                for frame in collector.flush_if_idle(at):self._publish(frame,'RX')
            for frame in collector.feed(b'',time.monotonic()+collector.gap):self._publish(frame,'RX')
        except Exception as error:
            with self._lock:
                self.errors+=1;self._seq+=1
                self._events.append({'id':self._seq,'time':datetime.now(timezone.utc).isoformat(timespec='milliseconds'),
                    'source':'SYSTEM','kind':'error puerto','detail':str(error)[:200],
                    'valid':False,'crc_ok':False,'hex':'','length':0,'unit':None,'function':None,'values':[]})
        finally:
            handle.close()
            with self._lock:self.mode='detenido';self.device=''

    def stop(self):
        self._stop.set()
        current=self._reader
        if current is not None and current is not threading.current_thread():
            current.join(timeout=1.5)
        with self._lock:
            self.mode='detenido';self.device='';self._reader=None
