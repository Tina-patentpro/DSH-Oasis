"""Bounded new installation composition; old inputs never mutated."""
from pathlib import Path
import hashlib, json, os, shutil, subprocess, tarfile

repo = Path(__file__).resolve().parents[3]
evidence = Path(__file__).resolve().parent
read = lambda p: json.loads(p.read_bytes())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
base = repo / '.local/m06-zero-preview-installed-20261107-r1/bundle'
base_id = '7aca55e9d5ccf7be21d20a3a33a7a02cbac256b7e725e69bca913ae03d624af5'
archive = repo / '.local/m06-public-release-20261107-r1/oasis-professional-service-0.1.0-rc.1.tgz'
archive_id = 'a7cf9a5dd59db1da2c7fe34fb4eac413c3dbb0d2baad7ab88147c7bfaab63bc3'
scratch = repo / '.local/m06-public-installed-20261107-r1'
root = repo / '.dsh-test/m06-public-installed-20261107-r1'
assert sha(base / 'bundle.json') == base_id and sha(archive) == archive_id
assert not root.exists() and not scratch.exists()
scratch.mkdir()
bundle = scratch / 'bundle'
bundle.mkdir()
payload = bundle / 'payload'
cmd = ['/bin/cp', '-cR', str(base / 'payload'), str(payload)]
result = subprocess.run(cmd, capture_output=True, text=True)
(evidence / 'copy-command.json').write_text(json.dumps({'argv': cmd, 'exitCode': result.returncode, 'stderr': result.stderr}, indent=2)+'\n')
result.check_returncode()
component = payload / 'components/c3'
assert component.is_dir() and not component.is_symlink() and component.is_relative_to(payload)
shutil.rmtree(component)
component.mkdir()
members = {}
with tarfile.open(archive) as tf:
    for item in tf.getmembers():
        rel = Path(item.name).relative_to('package')
        assert item.isfile() and '..' not in rel.parts and str(rel) not in members
        data = tf.extractfile(item).read()
        path = component / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        path.chmod(item.mode & 0o777)
        members[str(rel)] = hashlib.sha256(data).hexdigest()
assert len(members) == 123
template = read(payload / 'profile-template.json')
old_policy = json.loads(json.dumps(template['nativeZeroGeneration']))
assert old_policy['archiveSHA256'] == '5160c4e910018e71cdd3f46452a2cc80b1cab6aab810bd4ae23dc5b5a7a89785'
assert old_policy['budget'] == {'model': 0, 'api': 0, 'upload': 0, 'payment': 0}
template['nativeZeroGeneration']['archiveSHA256'] = archive_id
for name, digest in old_policy['guardedFiles'].items():
    assert sha(base / 'payload/components/c3' / name) == digest
    assert sha(component / name) == digest  # release did not alter either guard
(payload / 'profile-template.json').write_text(json.dumps(template, ensure_ascii=False, indent=2)+'\n')
before = read(base / 'bundle.json')
files, links = {}, {}
for parent, dirs, names in os.walk(payload, followlinks=False):
    for name in list(dirs):
        path = Path(parent) / name
        if path.is_symlink():
            links[str(path.relative_to(payload))] = os.readlink(path)
            dirs.remove(name)
    for name in names:
        path = Path(parent) / name
        rel = str(path.relative_to(payload))
        if path.is_symlink(): links[rel] = os.readlink(path)
        else: files[rel] = sha(path)
assert links == before['links']
manifest = {**before, 'businessPackageVersion': '0.1.0-rc.1', 'source': {
    'baseBundle': str(base), 'baseBundleSHA256': base_id,
    'archive': str(archive), 'archiveSHA256': archive_id,
    'scope': 'rc1 exact side-by-side offline installation; no App/Host/live call/release acceptance',
}, 'files': dict(sorted(files.items())), 'links': dict(sorted(links.items()))}
(bundle / 'bundle.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
(evidence / 'bundle-unadapted-manifest.json').write_bytes((bundle / 'bundle.json').read_bytes())
(evidence / 'controller-before.mjs').write_bytes((payload / 'controller/scripts/f-installed-runtime.mjs').read_bytes())
spec = {'root': str(root), 'base': {'bundle': str(base), 'expectedSHA256': base_id},
    'target': {'bundle': str(bundle), 'expectedSHA256': sha(bundle / 'bundle.json')},
    'archive': str(archive), 'archiveSHA256': archive_id, 'businessVersion': '0.1.0-rc.1',
    'versions': manifest['versions'], 'checkpoint': manifest['checkpoint'],
    'old_zero_policy': old_policy, 'new_zero_policy': template['nativeZeroGeneration'],
    'AppStartAuthorized': False, 'controllerAdaptationPending': True}
(evidence / 'installation-spec.unadapted.json').write_text(json.dumps(spec, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'bundle': str(bundle), 'unadaptedSHA256': spec['target']['expectedSHA256'],
    'businessMembers': len(members), 'fixedFiles': len(files), 'links': len(links)}, ensure_ascii=False))
