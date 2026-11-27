# -*- coding: utf-8 -*-
"""Evidence-only bounded composition using the existing fixed installer format."""
from pathlib import Path
import json, hashlib, subprocess, tarfile, shutil, os

repo = Path(__file__).resolve().parents[3]
evidence = Path(__file__).resolve().parent
read = lambda p: json.loads(p.read_bytes())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
def save(p, value):
    with p.open('x') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')

old = read(repo/'docs/evidence/2026-11-06-m06-p4-installed-update-r1/update-spec.json')
base = Path(old['target']['bundle'])
assert sha(base/'bundle.json') == old['target']['expectedSHA256'] == '1c5baba6844b1b9e28e3cfd0c0a8913cf68bb1857f317d68096851c0eefe4bef'
info = read(repo/'docs/evidence/2026-11-07-m06-zero-preview-r1/package-member-inspection.json')
archive = Path(info['archive'])
assert sha(archive) == info['sha256'] == '5160c4e910018e71cdd3f46452a2cc80b1cab6aab810bd4ae23dc5b5a7a89785'
assert sha(Path(old['archive'])) == old['archiveSHA256']
scratch = repo/'.local/m06-zero-preview-installed-20261107-r1'
scratch.mkdir()
bundle = scratch/'bundle'
bundle.mkdir()
payload = bundle/'payload'
root = repo/'.dsh-test/m06-zero-preview-installed-20261107-r1'
assert not root.exists()
cmd = ['/bin/cp', '-cR', str(base/'payload'), str(payload)]
result = subprocess.run(cmd, capture_output=True, text=True)
save(evidence/'copy-command.json', {'argv':cmd, 'exit_code':result.returncode, 'stderr':result.stderr})
result.check_returncode()
component = payload/'components/c3'
assert component.is_dir() and not component.is_symlink() and component.is_relative_to(payload)
shutil.rmtree(component)
component.mkdir()

def archive_members(path):
    out = {}
    with tarfile.open(path) as tf:
        for m in tf.getmembers():
            rel = Path(m.name).relative_to('package')
            assert m.isfile() and '..' not in rel.parts and str(rel) not in out
            out[str(rel)] = {'data':tf.extractfile(m).read(), 'mode':m.mode & 0o777}
    return out

previous = archive_members(Path(old['archive']))
current = archive_members(archive)
assert len(current) == info['member_count'] == 140
for rel, row in current.items():
    p = component/rel
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open('xb') as f:
        f.write(row['data'])
    p.chmod(row['mode'])

template = read(payload/'profile-template.json')
old_policy = json.loads(json.dumps(template['nativeZeroGeneration']))
assert old_policy['archiveSHA256'] == old['archiveSHA256']
assert old_policy['budget'] == {'model':0, 'api':0, 'upload':0, 'payment':0}
assert set(old_policy['guardedFiles']) == {'src/index.js', 'src/workbench-rpc.js'}
template['nativeZeroGeneration']['archiveSHA256'] = sha(archive)
for rel in old_policy['guardedFiles']:
    assert hashlib.sha256(previous[rel]['data']).hexdigest() == old_policy['guardedFiles'][rel]
    template['nativeZeroGeneration']['guardedFiles'][rel] = sha(component/rel)
(payload/'profile-template.json').write_text(json.dumps(template, ensure_ascii=False, indent=2)+'\n')
files, links = {}, {}
for parent, dirs, names in os.walk(payload, followlinks=False):
    for name in list(dirs):
        p = Path(parent)/name
        if p.is_symlink():
            links[str(p.relative_to(payload))] = os.readlink(p)
            dirs.remove(name)
    for name in names:
        p = Path(parent)/name
        key = str(p.relative_to(payload))
        if p.is_symlink(): links[key] = os.readlink(p)
        else: files[key] = sha(p)
before = read(base/'bundle.json')
modified = sorted(k for k,v in files.items() if k in before['files'] and before['files'][k] != v)
added = sorted(set(files)-set(before['files']))
removed = sorted(set(before['files'])-set(files))
expected_modified = sorted(['components/c3/'+k for k,v in current.items() if k in previous and v['data'] != previous[k]['data']] + ['profile-template.json'])
assert modified == expected_modified, modified
assert added == sorted('components/c3/'+k for k in current if k not in previous)
assert removed == sorted('components/c3/'+k for k in previous if k not in current)
assert links == before['links']
manifest = {**before, 'source':{
    'baseBundle':str(base), 'baseBundleSHA256':old['target']['expectedSHA256'],
    'archive':str(archive), 'archiveSHA256':sha(archive),
    'scope':'V0.1 side-by-side local installation preparation; no App/Host/model/API/publication acceptance',
    'previousArchiveSHA256':old['archiveSHA256'],
}, 'files':dict(sorted(files.items())), 'links':dict(sorted(links.items()))}
save(bundle/'bundle.json', manifest)
spec = {'root':str(root), 'base':old['target'], 'target':{'bundle':str(bundle), 'expectedSHA256':sha(bundle/'bundle.json')},
    'archive':str(archive), 'archiveSHA256':sha(archive), 'modified':modified, 'added':added, 'removed':removed,
    'unchanged_files':len(files)-len(modified)-len(added), 'unchanged_links':len(links),
    'versions':manifest['versions'], 'checkpoint':manifest['checkpoint'],
    'old_zero_policy':old_policy, 'new_zero_policy':template['nativeZeroGeneration'], 'AppStartAuthorized':False}
save(evidence/'installation-spec.json', spec)
print(json.dumps({'targetBundleSHA256':spec['target']['expectedSHA256'], 'files':len(files), 'links':len(links), 'modified':modified, 'added':added, 'removed':removed}, ensure_ascii=False))
