from pathlib import Path
import json, hashlib, subprocess, datetime, tarfile

r = Path(__file__).resolve().parents[3]
e = Path(__file__).resolve().parent
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
pre = json.loads((e / 'preflight.json').read_text())
baseline = json.loads((e / 'protected-baseline.json').read_text())
input_hashes = {x['path']: x['sha256'] for x in pre['inputs']}
checks = []
def check(name, passed, details=None):
    checks.append({'name': name, 'passed': bool(passed), 'details': details})

names = ['m06-fast39-contract.js', 'm06-fast39-result.js', 'oasis-remote-service.js', 'workbench-contract.js', 'workbench-domain.js']
states = [r / 'docs/project-current-state.md', r / 'docs/evidence/2026-10-23-stage5-progress-and-remaining.md']
allowed = {str(r / 'packages/oasis-professional-service/src' / n) for n in names} | {str(p) for p in states}
unexpected = [p for p, h in baseline.items() if sha(p) != h and p not in allowed]
check('protected unrelated original bytes', not unexpected, {'protected': len(baseline), 'unexpected': unexpected})
for name in names:
    check(name + ' original preimage', sha(e / (name + '.before')) == baseline[str(r / 'packages/oasis-professional-service/src' / name)])
for p in states:
    before = (e / (p.name + '.before')).read_bytes()
    # project-current-state is an execution input outside the scanned evidence
    # tree; its exact before hash is already bound in the immutable preflight.
    expected = baseline.get(str(p), input_hashes.get(str(p)))
    check(p.name + ' full original suffix', expected is not None and p.read_bytes().endswith(before) and hashlib.sha256(before).hexdigest() == expected)

for label, command, log in [('source', 'affected-tests-final-command.json', 'affected-tests-final.log'), ('archive-r2', 'archive-r2-tests-command.json', 'archive-r2-tests.log')]:
    c = json.loads((e / command).read_text()); output = (e / log).read_text()
    check(label + '185/185 tests exit0', c['exit_code'] == 0 and 'ℹ tests 185' in output and 'ℹ pass 185' in output and 'ℹ fail 0' in output)
for name in ['evidence-red', 'reload-integrity-red', 'workspace-guard-red', 'pre-owner-regression-red']:
    check(name + ' failure retained', json.loads((e / (name + '-command.json')).read_text())['exit_code'] == 1)
check('isolated fixed-tool client build', json.loads((e / 'client-build-command.json').read_text())['exit_code'] == 0)

proof = json.loads((e / 'package-member-inspection-r2.json').read_text())
unpack = Path(proof['unpack'])
check('actual137 archive/member identity', sha(proof['archive']) == proof['sha256'] and len(proof['members']) == 137 and all(sha(unpack / m['path']) == m['sha256'] for m in proof['members']))
check('first68d8 archive unchanged', sha(proof['parent_archive']) == proof['parent_sha256'] == '68d8d7b540a6aff9ca75375debf5904e97e0ce9611996903f620e363b26e76bc')
base = r / '.local/m06-structured-revision-20261106-r1/archive-r2/oasis-professional-service-0.0.1.tgz'
check('old6f2f archive unchanged', sha(base) == '6f2f16e771cb56bf5514b35de87bbf0903d6bd4faabad36cfef4f4ac327504bb')
with tarfile.open(base, 'r:gz') as archive:
    check('existing package lib unchanged', all(sha(r / 'packages/oasis-professional-service/lib' / n) == hashlib.sha256(archive.extractfile('package/lib/' + n).read()).hexdigest() for n in ['client.js', 'client.js.map']))
loads = json.loads((e / 'archive-execution-proof-r2.json').read_text())
check('actual archive execution scope', loads['processes'] == 14 and loads['loaded_modules'] >= 7 and loads['unpack_bytes_match_all137'])
check('seven archived source modules match current', all((unpack / 'src' / n).read_bytes() == (r / 'packages/oasis-professional-service/src' / n).read_bytes() for n in loads['seven_source_modules_actually_loaded']))
check('final tested source manifest stable', all(sha(x['path']) == x['sha256'] for x in json.loads((e / 'candidate-source-manifest.json').read_text())))

drift = [x['path'] for x in pre['inputs'] if x['path'] not in allowed and sha(x['path']) != x['sha256']]
check('preflight inputs stable', not drift, drift)
c4 = r / 'docs/business-baseline/fast39-result-contract-candidate-4'
freeze = json.loads((c4 / 'FREEZE.json').read_text())
check('C4 frozen15 members unchanged', all(sha(c4 / x['path']) == x['sha256'] for x in freeze['files']))
check('runtime binding proposal disabled', json.loads((c4 / 'delivery-binding.candidate.json').read_text())['activation'] == 'disabled')
check('no application/RPC activation', all('fast39Delivery' not in (r / 'packages/oasis-professional-service/src' / n).read_text() and 'acceptFast39Response' not in (r / 'packages/oasis-professional-service/src' / n).read_text() for n in ['index.js', 'workbench-service.js', 'workbench-rpc.js']))
check('HEAD and feature checkout unchanged', subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=r, text=True).strip() == pre['head'] and subprocess.check_output(['git', 'branch', '--show-current'], cwd=r, text=True).strip() == pre['branch'])
meta = json.loads((unpack / 'package.json').read_text())
check('private internal package; no license adoption', meta.get('private') is True and meta['version'] == '0.0.1' and not meta.get('license') and proof['publication_approved'] is False)

report = {'time': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
          'status': 'PASS_BOUNDED_C4_SYNTHETIC_PERSISTENCE_AND_ACTUAL_ARCHIVE' if all(x['passed'] for x in checks) else 'FAIL',
          'checks': checks, 'final_archive': {'path': proof['archive'], 'sha256': proof['sha256'], 'members': 137},
          'scope': 'source+actual archive185tests each; isolated client build; real repository with file-backed Domain substitute, no native SDK/installed/App acceptance',
          'review': 'single-agent self-review; not independent acceptance', 'full_goal_complete': False, 'p5_overall_complete': False,
          'next_step': 'R1 task4 backend isolated mock; source CI/B/A and actual activation/calls remain gated'}
(e / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'checks': len(checks), 'failures': [x for x in checks if not x['passed']]}, ensure_ascii=False))
assert all(x['passed'] for x in checks)
