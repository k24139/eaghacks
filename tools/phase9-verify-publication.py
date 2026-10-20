import subprocess,json,hashlib,tempfile,os
from pathlib import Path

def git(*args,cwd=None):return subprocess.check_output(['git',*args],cwd=cwd,timeout=30)
root=Path.cwd();expected=git('rev-parse','HEAD').decode().strip();branch=git('branch','--show-current').decode().strip();assert branch=='meteor-client-integration'
verify=Path(tempfile.mkdtemp(prefix='eaghacks-phase9-published-',dir='/private/tmp'))
subprocess.run(['git','init','-q',str(verify)],check=True)
remote=git('remote','get-url','origin').decode().strip()
print('Fetching published branch into '+str(verify),flush=True)
subprocess.run(['git','-c','http.version=HTTP/1.1','-c','http.lowSpeedLimit=1024','-c','http.lowSpeedTime=30','fetch','--no-tags','--depth=1',remote,branch],cwd=verify,check=True,timeout=120,env={**os.environ,'GIT_TERMINAL_PROMPT':'0'})
fetched=git('rev-parse','FETCH_HEAD',cwd=verify).decode().strip();assert fetched==expected,(fetched,expected)
tree=git('rev-parse','HEAD^{tree}').decode().strip();remote_tree=git('rev-parse','FETCH_HEAD^{tree}',cwd=verify).decode().strip();assert tree==remote_tree
subprocess.run(['git','fsck','--full','--no-reflogs','FETCH_HEAD'],cwd=verify,check=True)
files=[]
for record in git('ls-tree','-rz','--full-tree','HEAD').split(b'\0'):
 if not record:continue
 meta,name=record.split(b'\t',1);mode,kind,blob=meta.split();assert kind==b'blob';path=name.decode();local=(root/path).read_bytes();published=git('show','FETCH_HEAD:'+path,cwd=verify);assert published==local,path
 files.append({'path':path,'bytes':len(local),'sha256':hashlib.sha256(local).hexdigest()})
initial=json.loads((root/'reports/reliability-phase9/initial-state.json').read_text());assert git('-C','../..','rev-parse','HEAD').decode().strip()==initial['originalHead'];assert git('-C','../..','status','--short').decode()==initial['originalStatus'];assert git('status','--porcelain').decode()==''
receipt={'startingCommit':initial['start'],'publishedCommit':expected,'fetchedCommit':fetched,'tree':tree,'fetchedTree':remote_tree,'branch':branch,'independentFetchDirectory':str(verify),'verifiedFiles':len(files),'allPublishedBytesMatch':True,'originalMainAndStatusUnchanged':True,'cleanIntegrationWorktree':True,'files':files}
(root/'input/phase9/publication-verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k!='files'},indent=2))
