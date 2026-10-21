"""Independent read-only remote verification after the authorized push."""
import subprocess, json, hashlib, tempfile
from pathlib import Path

def git(*args,cwd=None):
    return subprocess.check_output(['git',*args],cwd=cwd,timeout=120)
root=Path.cwd()
initial=json.loads((root/'input/phase14/initial-state.json').read_text())
branch=git('branch','--show-current').decode().strip()
assert branch=='meteor-client-integration'
expected=git('rev-parse','HEAD').decode().strip()
remote=git('remote','get-url','origin').decode().strip()
assert remote in ('https://github.com/k24139/eaghacks.git','git@github.com:k24139/eaghacks.git')
repo=Path(tempfile.mkdtemp(prefix='eaghacks-phase14-publication-',dir='/private/tmp'))
subprocess.run(['git','init','-q',str(repo)],check=True)
subprocess.run(['git','fetch','--no-tags','--depth=1',remote,branch],cwd=repo,check=True,timeout=120)
published=git('rev-parse','FETCH_HEAD',cwd=repo).decode().strip()
assert published==expected
assert git('rev-parse','HEAD^{tree}')==git('rev-parse','FETCH_HEAD^{tree}',cwd=repo)
subprocess.run(['git','fsck','--full','--no-reflogs','FETCH_HEAD'],cwd=repo,check=True)
files=[]
for record in git('ls-tree','-rz','--full-tree','HEAD').split(b'\0'):
    if not record: continue
    meta,name=record.split(b'\t',1)
    mode,kind,blob=meta.split()
    assert kind==b'blob'
    path=name.decode()
    local=(root/path).read_bytes()
    assert local==git('show','FETCH_HEAD:'+path,cwd=repo),path
    files.append({'path':path,'bytes':len(local),'sha256':hashlib.sha256(local).hexdigest()})
assert git('-C','../..','rev-parse','HEAD').decode().strip()==initial['originalHead']
assert git('-C','../..','status','--porcelain=v1','-uall').decode()==initial['originalStatus']
assert git('rev-parse','main').decode().strip()==initial['main']
assert git('ls-remote',remote,'refs/heads/main').decode().split()[0]==initial['main']
for path,digest in initial['originalFileHashes'].items():
    assert hashlib.sha256((root/'../..'/path).read_bytes()).hexdigest()==digest,path
assert git('status','--porcelain').decode()==''
assert hashlib.sha256((root/'input/phase8/native-fixed.html').read_bytes()).hexdigest()=='9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0'
assert hashlib.sha256((root/'input/phase12/candidate.html').read_bytes()).hexdigest()=='4513fb5bb769f8538bd792734ad07f59b71fdcb50433584bd7865b24ca194dff'
for path,digest in initial['preservedArtifacts'].items():
    assert hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,path
manifest=json.loads((root/'reports/release-phase14/artifact-manifest.json').read_text())
assert hashlib.sha256((root/manifest['artifact']).read_bytes()).hexdigest()==manifest['html']['sha256']
for path,digest in manifest['verificationTools'].items():
    assert hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,path
assert hashlib.sha256((root/manifest['injectionTool']['path']).read_bytes()).hexdigest()==manifest['injectionTool']['sha256']
assert subprocess.check_output(['node','--input-type=module','-e',"import {gameplaySourceDigest} from './native-bridge/source-digest.mjs'; console.log(await gameplaySourceDigest());"],cwd=root).decode().strip()==manifest['sourceDigest']
receipt={'publishedCommit':published,'tree':git('rev-parse','HEAD^{tree}').decode().strip(),'commitMatch':True,'treeMatch':True,'fsckPassed':True,'everyTrackedFileByteIdentical':True,'fileCount':len(files),'originalCheckoutUnchanged':True,'mainUnchanged':True,'integrationWorktreeClean':True,'historicalArtifactsUnchanged':True,'releaseCandidateMatchesManifest':True,'verificationToolsMatchManifest':True,'sourceDigestMatches':True,'files':files}
(root/'input/phase14/publication-verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k!='files'},indent=2))
