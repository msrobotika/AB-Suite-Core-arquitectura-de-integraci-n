"""Build the offline Windows x64 distribution. Never packages local user data. MIT.

Requires a CPython 3.13 x64 build host, .NET Framework C# compiler and Inno Setup.
Run: python scripts/build-windows.py --output <directory> --iscc <ISCC.exe>
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RUNTIMES = {
    'node': ('https://nodejs.org/dist/v22.23.3/node-v22.23.3-win-x64.zip',
             '2b0ff57b049cda1bbcea2240eec20467018713c1efe1f7360c2681859b90ed71'),
    'python': ('https://www.python.org/ftp/python/3.13.17/python-3.13.17-embed-amd64.zip',
               '9e35319bffedab8b36ad44d8f377cb4f1733bcec257a0b6d04d94f01486ddb38')
}

def run(args, **kwargs):
    subprocess.run([str(a) for a in args], check=True, **kwargs)

def build(output, iscc, cache):
    if os.name != 'nt' or sys.version_info[:2] != (3, 13):
        raise RuntimeError('Use a Windows CPython 3.13 x64 build host')
    version = json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']
    output.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    payload = output / ('AB-Suite-' + version + '-Windows-x64')
    if payload.exists():
        raise RuntimeError('Build directory already exists; choose a new output directory')
    app = payload/'app'
    app.mkdir(parents=True)
    # Explicit tracked files only: no working projects, credentials, caches or tests.
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    for name in tracked:
        if not name or name.startswith(('.github/', 'tests/', 'desktop/')):
            continue
        if any(part in ('node_modules', '.venv', '.suite-data', '__pycache__') for part in Path(name).parts):
            raise RuntimeError('Private build input: ' + name)
        source = ROOT/name
        target = app/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    for name, (url, expected) in RUNTIMES.items():
        archive = cache/(name + '-' + expected[:12] + '.zip')
        if not archive.exists():
            urllib.request.urlretrieve(url, archive)
        if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
            raise RuntimeError('Runtime checksum mismatch: ' + name)
        destination = payload/'runtime'/name
        destination.mkdir(parents=True)
        with zipfile.ZipFile(archive) as zipped:
            if name == 'python':
                zipped.extractall(destination)
            else:
                prefix = 'node-v22.23.3-win-x64/'
                for member in ('node.exe', 'LICENSE'):
                    (destination/member).write_bytes(zipped.read(prefix+member))
    python_dir = payload/'runtime/python'
    (python_dir/'python313._pth').write_text('python313.zip\n.\nLib/site-packages\nimport site\n', encoding='ascii')
    # Vendor the locked wheels using the build host; the embedded runtime never runs pip.
    run([sys.executable, '-m', 'pip', 'install', '--only-binary=:all:', '--no-compile',
         '--target', python_dir/'Lib/site-packages', '-r', ROOT/'desktop/requirements.txt'])
    run([python_dir/'python.exe', '-B', '-c', 'import fastapi,uvicorn,openpyxl,sqlite3,serial; print("Embedded engines ready")'])
    # A vector-like original monogram is drawn locally, without external brand assets.
    icon_script = r'''Add-Type -AssemblyName System.Drawing
$bitmap=New-Object Drawing.Bitmap 64,64
$g=[Drawing.Graphics]::FromImage($bitmap)
$g.Clear([Drawing.Color]::FromArgb(16,20,29))
$font=New-Object Drawing.Font 'Segoe UI',28,([Drawing.FontStyle]::Bold)
$brush=New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(119,223,199))
$g.DrawString('ab',$font,$brush,0,4)
$icon=[Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream=[IO.File]::Create($args[0]);$icon.Save($stream);$stream.Close()
$g.Dispose();$font.Dispose();$brush.Dispose();$bitmap.Dispose()'''
    icon_file=output/'make-icon.ps1';icon_file.write_text(icon_script,encoding='utf-8-sig')
    run(['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',icon_file,payload/'ab-suite.ico'])
    compiler=Path(os.environ['WINDIR'])/'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
    metadata=output/'AssemblyInfo.cs'
    metadata.write_text('using System.Reflection;\n[assembly: AssemblyTitle("AB Suite")]\n[assembly: AssemblyProduct("AB Suite")]\n[assembly: AssemblyCompany("MS ROBOTIKA")]\n[assembly: AssemblyVersion("'+version+'.0")]\n[assembly: AssemblyFileVersion("'+version+'.0")]\n',encoding='utf-8')
    run([compiler, '/nologo', '/target:winexe', '/platform:x64', '/optimize+',
         '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll',
         '/win32icon:'+str(payload/'ab-suite.ico'), '/out:'+str(payload/'AB Suite.exe'), ROOT/'desktop/Launcher.cs',metadata])
    shutil.copyfile(ROOT/'desktop/README.md', payload/'README.md')
    (payload/'BUILD.json').write_text(json.dumps({'version':version,'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),
         'runtimes':{name:{'url':url,'sha256':sha} for name,(url,sha) in RUNTIMES.items()},
         'signing':'Unsigned AB Suite launcher and installer; upstream runtime signatures retained'},indent=2),encoding='utf-8')
    run([iscc, '/DAppVersion='+version, '/DPayload='+str(payload), '/DOutputPath='+str(output), ROOT/'desktop/installer.iss'])
    portable=output/(payload.name+'-Portable.zip')
    with zipfile.ZipFile(portable,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as zipped:
        for file in payload.rglob('*'):
            if file.is_file(): zipped.write(file,Path(payload.name)/file.relative_to(payload))
    for file in (portable,output/('AB-Suite-'+version+'-Windows-x64-Setup.exe')):
        print(file,hashlib.sha256(file.read_bytes()).hexdigest())

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--iscc',required=True,type=Path)
    parser.add_argument('--cache',type=Path,default=ROOT.parent/'tools/installer-cache')
    args=parser.parse_args()
    build(args.output.resolve(),args.iscc.resolve(),args.cache.resolve())
