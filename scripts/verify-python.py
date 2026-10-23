"""Run the native Python regression suites using this interpreter."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
commands=[('modbus',['-m','unittest','discover','-s','tests','-q']),
          ('serial',['-m','unittest','discover','-s','tests','-q']),
          ('vision',['-m','unittest','discover','-s','tests','-q']),
          ('bi',['-m','pytest','tests/test_workspaces.py','tests/test_semantic.py','tests/test_preparation.py',
                 'tests/test_suite_live.py','tests/test_ab_suite_telemetry.py','tests/test_launcher.py','-q'])]
failed=False
for app,args in commands:
    print('\nAB Suite · '+app,flush=True)
    result=subprocess.run([sys.executable,*args],cwd=root/'apps'/app)
    failed=failed or result.returncode!=0
raise SystemExit(1 if failed else 0)
