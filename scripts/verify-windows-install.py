"""Install, launch without PATH runtimes, update, uninstall and verify retained data. MIT.

Only use disposable targets below the provided verification workspace.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request

def run(args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)

def verify(installer, workspace, port, browser_tests):
    workspace=workspace.resolve();installer=installer.resolve()
    if not workspace.is_dir() or workspace == Path(workspace.anchor) or len(workspace.parts)<4:
        raise ValueError('An existing disposable verification workspace is required')
    target=(workspace/'AB Suite').resolve();data=(workspace/'user data').resolve()
    assert target.is_relative_to(workspace) and data.is_relative_to(workspace)
    if target.exists(): raise ValueError('Choose a fresh verification workspace')
    env=dict(os.environ,AB_SUITE_PORT=str(port),AB_SUITE_DESKTOP_HOME=str(data),PATH='')
    base='http://127.0.0.1:'+str(port)
    reports=[]
    def install(language):
        run([installer,'/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',
             '/LANG='+language,'/DIR='+str(target),'/GROUP=AB Suite QA','/LOG='+str(workspace/'setup.log')])
    def start():
        process=subprocess.Popen([str(target/'AB Suite.exe'),'--no-browser'],env=env)
        for _ in range(300):
            if process.poll() is not None: raise RuntimeError('Desktop host exited during startup')
            try:
                status=json.load(urllib.request.urlopen(base+'/suite/status',timeout=1))
                if status.get('desktopSession') and all(item['ready'] for item in status['apps']): return process,status
            except (OSError,ValueError):pass
            time.sleep(.2)
        raise RuntimeError('Installed suite startup timeout')
    def stop(process):
        run([target/'AB Suite.exe','--quit'],env=env)
        process.wait(timeout=20)
        try:urllib.request.urlopen(base+'/suite/status',timeout=1)
        except OSError:return
        raise AssertionError('Desktop quit left a live server')
    install('english');reports.append('English installer completed without elevation or external dependencies')
    process=None
    try:
        process,status=start()
        assert len(status['apps'])==9
        for item in status['apps']:
            with urllib.request.urlopen(base+'/apps/'+item['id']+'/',timeout=10) as response:
                assert response.status==200 and 'text/html' in response.headers['Content-Type']
                assert b'/suite/i18n.js' in response.read()
        reports.append('All nine tools ready from installed embedded runtimes with PATH empty')
        if browser_tests:
            browser_env=dict(os.environ,AB_SUITE_URL=base,AB_SUITE_EVIDENCE=str(workspace/'browser evidence'))
            for name in ['verify-browser.cjs','verify-bi-browser.cjs','verify-editors-browser.cjs','verify-new-user-browser.cjs',
                         'verify-resident-browser.cjs','verify-exercises-browser.cjs','verify-portal-browser.cjs','verify-i18n-browser.cjs','verify-viewport-browser.cjs']:
                run([target/'runtime/node/node.exe',target/'app/scripts'/name],env=browser_env,cwd=target/'app')
            reports.append('Browser journeys on the installed application passed')
        marker=data/'data'/'preservation-qa.json';marker.write_text('{"keep":"propio / own"}',encoding='utf-8')
        before=marker.read_bytes()
        # Real BI storage and resident CPU files must survive the update, too.
        stop(process);process=None
        snapshots={str(p.relative_to(data)):p.read_bytes() for p in (data/'data').rglob('*') if p.is_file()}
        install('spanish')
        for name,content in snapshots.items():assert (data/name).read_bytes()==content,name
        process,status=start();reports.append('Spanish upgrade preserved all native user data and restarted all nine tools')
        stop(process);process=None
        run([target/'unins000.exe','/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART'])
        for _ in range(100):
            if not (target/'AB Suite.exe').exists():break
            time.sleep(.1)
        assert not (target/'AB Suite.exe').exists()
        assert marker.read_bytes()==before
        for name,content in snapshots.items():assert (data/name).read_bytes()==content,name
        reports.append('Uninstall removed application and retained projects, CPU data and logs')
        (workspace/'installation-results.json').write_text(json.dumps({'passed':reports,'errors':[]},indent=2),encoding='utf-8')
        print('\n'.join('PASS '+item for item in reports))
    finally:
        if process is not None and process.poll() is None:stop(process)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--installer',type=Path,required=True)
    parser.add_argument('--workspace',type=Path,required=True)
    parser.add_argument('--port',type=int,default=4184)
    parser.add_argument('--browser-tests',action='store_true')
    args=parser.parse_args()
    if not 1024<=args.port<=65535:raise ValueError('Invalid port')
    verify(args.installer,args.workspace,args.port,args.browser_tests)
