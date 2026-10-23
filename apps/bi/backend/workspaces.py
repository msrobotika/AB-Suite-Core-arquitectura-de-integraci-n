"""AB BI workspace library. Each space owns its data, recipes and recovery files."""
from pathlib import Path
from uuid import uuid4
import json,re

def empty_project(name='Mi espacio de datos'):
    if not isinstance(name,str) or not name.strip() or len(name.strip())>90:
        raise ValueError('El nombre del espacio debe tener entre 1 y 90 caracteres')
    return {'format':'AB-BI Project','version':3,'name':name.strip(),'tables':{},
            'relationships':[],'measures':{},'visuals':[],'filters':{}}

class WorkspaceLibrary:
    def __init__(self,root,validate):
        self.root=Path(root);self.validate=validate;self.active=None
    def path(self,identifier):
        if not isinstance(identifier,str) or not re.fullmatch(r'[a-f0-9]{32}',identifier):
            raise ValueError('Identificador de espacio inválido')
        return self.root/'spaces'/identifier/'workspace.json'
    @property
    def state_path(self):return self.path(self.active)
    @staticmethod
    def atomic(path,document):
        path.parent.mkdir(parents=True,exist_ok=True)
        tmp=path.with_suffix('.tmp')
        tmp.write_text(json.dumps(document,ensure_ascii=False,allow_nan=False,indent=1),encoding='utf-8')
        tmp.replace(path)
    def read(self,identifier):
        path=self.path(identifier)
        if not path.is_file():raise ValueError('No existe ese espacio de datos')
        if path.stat().st_size>30*1024*1024:raise ValueError('El espacio supera 30 MB')
        document=json.loads(path.read_text(encoding='utf-8'));self.validate(document)
        if document.get('format')!='AB-BI Project' or document.get('version')!=3:raise ValueError('Proyecto incompatible')
        return document
    def initialize(self):
        pointer=self.root/'active-space.json'
        if pointer.exists():
            identifier=json.loads(pointer.read_text(encoding='utf-8'))['id']
            document=self.read(identifier);self.active=identifier;return document
        legacy=self.root/'workspace.json'
        if legacy.exists():
            document=json.loads(legacy.read_text(encoding='utf-8'));self.validate(document)
        else:document=empty_project()
        self.create(document);return document
    def create(self,document):
        self.validate(document)
        if len(list((self.root/'spaces').glob('*/workspace.json')))>=100:
            raise ValueError('Máximo 100 espacios locales; exporta los que quieras conservar fuera de la suite')
        identifier=uuid4().hex
        self.atomic(self.path(identifier),document)
        self.atomic(self.root/'active-space.json',{'id':identifier})
        self.active=identifier;return identifier
    def activate(self,identifier):
        document=self.read(identifier)
        self.atomic(self.root/'active-space.json',{'id':identifier})
        self.active=identifier;return document
    def list(self):
        result=[]
        for path in (self.root/'spaces').glob('*/workspace.json'):
            try:
                document=self.read(path.parent.name)
                result.append({'id':path.parent.name,'name':document['name'],'tables':len(document['tables']),
                               'rows':sum(len(rows) for rows in document['tables'].values()),'updated':path.stat().st_mtime})
            except (OSError,ValueError,KeyError):
                result.append({'id':path.parent.name,'name':'Espacio no legible · recuperar desde copia','error':True,'tables':0,'rows':0,'updated':0})
        return sorted(result,key=lambda item:item['updated'],reverse=True)
