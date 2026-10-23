import json
import pytest
from fastapi.testclient import TestClient
from backend.workspaces import WorkspaceLibrary,empty_project
from backend.semantic import model_validate,Engine
import backend.server as server

@pytest.fixture
def client(tmp_path,monkeypatch):
    library=WorkspaceLibrary(tmp_path,model_validate)
    monkeypatch.setattr(server,'LIBRARY',library)
    monkeypatch.setattr(server,'MODEL',library.initialize())
    monkeypatch.setattr(server,'STATE',library.state_path)
    return TestClient(server.app)

def test_first_start_is_empty_and_reopening_preserves_active_space(client):
    model=client.get('/api/model').json()
    assert model['tables']==[] and model['measures']=={} and model['visuals']==[]
    created=client.post('/api/workspaces',json={'name':'Mi práctica','template':'blank'}).json()
    reopened=WorkspaceLibrary(server.LIBRARY.root,model_validate)
    assert reopened.initialize()['name']=='Mi práctica'
    assert reopened.active==created['workspace_id']

def test_new_import_creates_own_space_without_demo_tables(client):
    original=client.get('/api/model').json()['workspace_id']
    response=client.post('/api/data/import',data={'destination':'new','name':'Sensores'},files=[('files',('lecturas.csv',b'sensor,valor\nA,12\nB,18','text/csv'))])
    assert response.status_code==200,response.text
    result=response.json();assert result['model']['name']=='Sensores'
    assert result['model']['workspace_id']!=original
    assert [t['name'] for t in result['model']['tables']]==['lecturas']
    assert len(result['model']['measures'])==1
    count=next(iter(result['model']['measures']))
    assert Engine(server.MODEL).measure(count)==2
    back=client.post(f'/api/workspaces/{original}/activate',json={}).json()
    assert back['tables']==[]

def test_multi_file_import_is_atomic_when_last_file_is_invalid(client):
    before=client.get('/api/model').json();spaces=client.get('/api/workspaces').json()
    result=client.post('/api/data/import',data={'destination':'new','name':'No parcial'},files=[('files',('ok.csv',b'x\n1','text/csv')),('files',('bad.json',b'{bad','application/json'))])
    assert result.status_code==422
    assert client.get('/api/model').json()==before
    assert client.get('/api/workspaces').json()==spaces

def test_demo_and_portable_projects_open_in_new_spaces(client):
    first=client.get('/api/model').json()['workspace_id']
    demo=client.post('/api/demo',json={}).json();assert len(demo['tables'])==4
    assert len(client.get('/api/workspaces').json()['spaces'])==2
    assert client.post(f'/api/workspaces/{first}/activate',json={}).json()['tables']==[]
    document=empty_project('Importado')
    result=client.post('/api/project/import',files={'file':('mio.abbi',json.dumps(document),'application/json')}).json()
    assert result['workspace_id'] not in (first,demo['workspace_id'])

def test_append_requires_the_intended_active_workspace(client):
    old=client.get('/api/model').json()['workspace_id']
    client.post('/api/workspaces',json={'name':'Otro'})
    response=client.post('/api/data/import',data={'destination':'current','workspace_id':old},files={'files':('datos.csv',b'a\n2','text/csv')})
    assert response.status_code==409
    assert client.get('/api/model').json()['tables']==[]
    stale=client.post('/api/measure',headers={'x-abbi-workspace':old},json={'name':'Total','expression':'1'})
    assert stale.status_code==409

def test_invalid_ids_cannot_escape_the_library(client):
    with pytest.raises(ValueError):server.LIBRARY.activate('../../outside')
    response=client.post('/api/workspaces',json={'name':''});assert response.status_code==422

def test_legacy_workspace_is_migrated_once_without_inserting_demo(tmp_path):
    project=empty_project('Proyecto existente');project['tables']={'Datos':[{'x':7}]}
    (tmp_path/'workspace.json').write_text(json.dumps(project),encoding='utf-8')
    library=WorkspaceLibrary(tmp_path,model_validate);assert library.initialize()==project
    assert len(library.list())==1
    again=WorkspaceLibrary(tmp_path,model_validate);assert again.initialize()==project
    assert len(again.list())==1
