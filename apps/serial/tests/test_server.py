import http.client,json,threading,time,unittest
from ab_serial.server import LocalServer

class ServerTests(unittest.TestCase):
    def setUp(self):
        self.server=LocalServer(0);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
    def tearDown(self):
        self.server.engine.stop();self.server.shutdown();self.server.server_close();self.thread.join(timeout=2)
    def request(self,path='/api/state',method='GET',body=None,authorized=True,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
        hs={'Content-Type':'application/json'}
        if authorized:hs['Authorization']='Bearer '+self.server.token
        hs.update(headers or {})
        data=None if body is None else json.dumps(body)
        conn.request(method,path,data,hs)
        res=conn.getresponse();raw=res.read();status=res.status;hdr=dict(res.getheaders());conn.close()
        return status,hdr,raw
    def test_auth_and_safety(self):
        self.assertEqual(self.request(authorized=False)[0],401)
        self.assertEqual(self.request(headers={'Origin':'https://evil.test'})[0],403)
        self.assertEqual(self.request(headers={'Host':'foo.invalid'})[0],403)
        self.assertEqual(self.request(method='POST',path='/api/serial/write',body={})[0],400)
        state=json.loads(self.request()[2]);self.assertIs(state['writes_enabled'],False)
    def test_assets(self):
        for path in ['/','/app.js','/style.css','/favicon.svg']:
            s,h,b=self.request(path,authorized=False)
            self.assertEqual(s,200);self.assertGreater(len(b),100);self.assertIn('frame-ancestors',h['Content-Security-Policy'])
    def test_demo_flow(self):
        self.assertEqual(self.request('/api/demo/start','POST',{})[0],200)
        time.sleep(.05)
        state=json.loads(self.request()[2]);self.assertEqual(state['mode'],'laboratorio');self.assertGreaterEqual(len(state['events']),1)
        self.assertEqual(self.request('/api/stop','POST',{})[0],200)
        self.assertEqual(json.loads(self.request()[2])['mode'],'detenido')
        self.assertEqual(self.request('/api/clear','POST',{})[0],200)
        self.assertEqual(json.loads(self.request()[2])['count'],0)
    def test_only_enumerated_and_authorized_serial(self):
        self.assertEqual(self.request('/api/serial/open','POST',{
            'port':'/dev/does-not-exist','baud':9600,'parity':'N',
            'data_bits':8,'stop_bits':1,'authorized':True})[0],400)
        self.assertEqual(self.request('/api/serial/open','POST',{
            'port':'COM1','baud':9600,'parity':'N','data_bits':8,'stop_bits':1,'authorized':False})[0],400)
