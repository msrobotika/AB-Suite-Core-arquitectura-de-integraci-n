"""One companion process for the three original Python engines. MIT."""
import json, os, socket, sys, threading
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for name in ('modbus','serial','bi','vision'):sys.path.insert(0,str(ROOT/'apps'/name))
DATA=Path(os.environ.get('AB_SUITE_DATA_DIR',str(ROOT/'.suite-data'))); DATA.mkdir(parents=True,exist_ok=True)
os.environ['ABBI_DATA_DIR']=str(DATA/'bi')
from ab_modbus.application import Application, LocalHTTPServer
from ab_serial.server import LocalServer
from serve import Server as VisionServer
import uvicorn

modbus=LocalHTTPServer(Application(DATA/'modbus'))
serial=LocalServer()
vision=VisionServer()
for server in (modbus,serial,vision):
    threading.Thread(target=server.serve_forever,daemon=True).start()
sock=socket.socket();sock.bind(('127.0.0.1',0));sock.listen(128)
print(json.dumps({'modbus':{'port':modbus.server_port,'token':modbus.application.token},
                  'serial':{'port':serial.server_port,'token':serial.token},
                  'vision':{'port':vision.server_port,'token':vision.token},
                  'bi':{'port':sock.getsockname()[1]}}),flush=True)
try:
    uvicorn.Server(uvicorn.Config('backend.server:app',host='127.0.0.1',log_level='error')).run(sockets=[sock])
finally:
    for server in (modbus,serial,vision):server.shutdown();server.server_close()
    modbus.application.simulator.stop();serial.engine.stop()
