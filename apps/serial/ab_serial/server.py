# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MS ROBOTIKA
"""Loopback-only authenticated API for passive serial diagnostics."""
from __future__ import annotations
import argparse,json,secrets,webbrowser
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from .engine import Analyzer
from .protocol import decode_rtu, append_crc

BASE=Path(__file__).parent/'web'
ASSETS={'/':('index.html','text/html; charset=utf-8'),
        '/app.js':('app.js','text/javascript; charset=utf-8'),
        '/style.css':('style.css','text/css; charset=utf-8'),
        '/favicon.svg':('favicon.svg','image/svg+xml')}

class LocalServer(ThreadingHTTPServer):
    allow_reuse_address=False
    daemon_threads=True
    def __init__(self,port:int=0):
        self.engine=Analyzer()
        self.token=secrets.token_urlsafe(32)
        super().__init__(('127.0.0.1',port),Request)
        self.origin=f'http://127.0.0.1:{self.server_port}'

class Request(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def setup(self):
        super().setup();self.connection.settimeout(5)
    def response(self,status,data,content_type='application/json; charset=utf-8'):
        if not isinstance(data,bytes):data=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        for k,v in [('Content-Type',content_type),('Content-Length',str(len(data))),
                    ('Cache-Control','no-store'),('X-Content-Type-Options','nosniff'),
                    ('Referrer-Policy','no-referrer'),('Cross-Origin-Resource-Policy','same-origin'),
                    ('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"),
                    ('Connection','close')]:self.send_header(k,v)
        self.end_headers();self.wfile.write(data)
    def authorize(self,api=False):
        if self.headers.get_all('Host',[])!=[f'127.0.0.1:{self.server.server_port}']:
            self.response(403,{'error':'Host ajeno bloqueado'});return False
        origins=self.headers.get_all('Origin',[])
        if origins and origins!=[self.server.origin]:
            self.response(403,{'error':'Origin ajeno bloqueado'});return False
        if self.headers.get('Sec-Fetch-Site')=='cross-site':
            self.response(403,{'error':'Petición entre sitios bloqueada'});return False
        if api and not secrets.compare_digest(self.headers.get('Authorization',''),'Bearer '+self.server.token):
            self.response(401,{'error':'Sesión inválida. Abre la URL de inicio completa.'});return False
        return True
    def do_GET(self):
        if not self.authorize(self.path.startswith('/api/')):return
        if self.path=='/api/state':
            self.response(200,self.server.engine.snapshot());return
        if self.path=='/api/ports':
            self.response(200,{'ports':self.server.engine.ports()});return
        if self.path in ASSETS:
            filename,mime=ASSETS[self.path]
            self.response(200,(BASE/filename).read_bytes(),mime);return
        self.response(404,{'error':'Ruta no disponible'})
    def do_POST(self):
        if not self.authorize(True):return
        if self.headers.get_content_type()!='application/json':
            self.response(415,{'error':'Se requiere JSON'});return
        lengths=self.headers.get_all('Content-Length',[])
        if self.headers.get('Transfer-Encoding') or len(lengths)!=1:
            self.response(400,{'error':'Longitud de cuerpo no válida'});return
        try:
            size=int(lengths[0])
            if not 1<=size<=4096:
                self.response(413,{'error':'Solicitud demasiado grande'});return
            raw=self.rfile.read(size)
            if len(raw)!=size:raise ValueError('Cuerpo incompleto')
            body=json.loads(raw)
            if type(body) is not dict:raise ValueError('Se requiere un objeto JSON')
            a=self.server.engine
            if self.path=='/api/decode' and set(body)=={'hex','append_crc'}:
                text=body['hex']
                if not isinstance(text,str) or len(text)>1024 or type(body['append_crc']) is not bool:raise ValueError('Texto hexadecimal o modo inválido')
                raw=bytes.fromhex(text)
                if body['append_crc']:raw=append_crc(raw)
                if not 4<=len(raw)<=256:raise ValueError('La ADU RTU debe tener entre 4 y 256 bytes')
                result={**decode_rtu(raw),'hex':raw.hex(' ').upper(),'length':len(raw)}
            elif self.path=='/api/demo/start' and body=={}:
                a.start_demo();result={'ok':True,'mode':'laboratorio'}
            elif self.path=='/api/stop' and body=={}:
                a.stop();result={'ok':True}
            elif self.path=='/api/clear' and body=={}:
                a.clear();result={'ok':True}
            elif self.path=='/api/serial/open' and set(body)=={'port','baud','parity','stop_bits','data_bits','authorized'}:
                a.start_serial(**body);result={'ok':True,'mode':'serial'}
            else:raise ValueError('Operación no habilitada. No existen comandos TX.')
            self.response(200,result)
        except (ValueError,TypeError,RuntimeError,ImportError,OSError,UnicodeError) as error:
            self.response(400,{'error':str(error)[:350]})

def main():
    parser=argparse.ArgumentParser(description='AB-Serial Analyzer · MS ROBOTIKA · solo recepción')
    parser.add_argument('--port',type=int,default=0,help='Puerto HTTP local, 0 automático')
    parser.add_argument('--no-browser',action='store_true',help='No abrir navegador')
    args=parser.parse_args()
    if not 0<=args.port<=65535:parser.error('Puerto HTTP no válido')
    with LocalServer(args.port) as server:
        url=f'{server.origin}/#token={server.token}'
        print('AB-Serial Analyzer 0.1.0 · MS ROBOTIKA',flush=True);print(url,flush=True)
        if not args.no_browser:webbrowser.open(url)
        try:server.serve_forever(poll_interval=.1)
        except KeyboardInterrupt:pass
        finally:server.engine.stop()

if __name__=='__main__':main()
