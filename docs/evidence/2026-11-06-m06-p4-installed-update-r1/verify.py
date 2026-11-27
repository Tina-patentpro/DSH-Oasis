from pathlib import Path
import datetime,hashlib,json,subprocess,tarfile
repo=Path(__file__).resolve().parents[3];e=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_bytes());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();checks=[]
def check(n,p,d=None):checks.append({'name':n,'passed':bool(p),'details':d})
s=read(e/'update-spec.json');root=Path(s['root']);target=root/'releases'/s['target']['expectedSHA256']
for n in ['installed-update','target-composition-recheck','installed-guard']:check(n+' command exit0',read(e/(n+'-command.json'))['exit_code']==0)
check('initial SDK descriptor failure retained',read(e/'attempt1-installed-update-command.json')['exit_code']==1 and 'descriptor.tables is not iterable' in (e/'attempt1-installed-update.stderr.log').read_text())
check('final logging failure retained',read(e/'target-composition-command.json')['exit_code']==1 and 'not defined' in (e/'target-composition.stderr.log').read_text())
u=read(e/'installed-update-result.json');check('full public synthetic UNKNOWN',u['fixture']['evidenceKind']=='synthetic' and not u['fixture']['realRequest'] and u['syntheticInitialExecutions']==1)
check('busy SDK upgrade rejected',u['busyUpgradeRefused'])
check('upgraded and rolled back exact identities',u['upgraded']['current']==s['target']['expectedSHA256'] and u['rolledBack']['current']==s['base']['expectedSHA256'])
for stage in ['before','after','rollback']:
 r=u[stage];check(stage+' full record kept',r['record']==u['before']['record'] and r['unknown']['status']=='unknown')
 check(stage+' observe/edit/new/replay behaviors',all(r['checks'].values()))
check('business bytes retained',sha(root/'data/home/storages/oasis_workbench.json')==u['fixture']['businessSHA256'])
check('later note retained',sha(root/'data/workspace-a/public-note.md')==u['laterNoteSHA256'])
check('no later dispatch or App',u['postSeedDispatchAttempts']==u['realFetchAttempts']==u['appSpawnAttempts']==0)
check('dual locks absent',all(not (root/n).exists() for n in ['startup.lock','data/startup.lock']))
check('no App launch artifacts',not list((root/'data/evidence').iterdir()))
o=read(e/'target-composition-result-recheck.json');check('target currently selected',read(root/'installation.json')['current']==s['target']['expectedSHA256']==o['current'])
check('604 target internal links',o['linkCount']==604 and o['appPair']==o['profilePair'] and all(str(target/'components/c3') in x for x in o['appPair'].values()))
check('one active business Host',len(o['activeBusiness'])==1 and o['activeBusiness'][0]['id']=='oasis-professional-service-m06-controlled-013')
check('actual Desktop preparation',o['port']==57619 and o['networkExposure']=='loopback' and o['requiresDependencyMigration']==False and o['warnings']==[] and o['profileMetadataPreserved'])
check('actual zero spec',o['zeroMarker'] and o['fixtureAbsent'] and o['realCallBudget']==o['fetchAttempts']==0 and not o['applicationStarted'])
ad=read(e/'installed-admission-candidate-recheck.json');check('all target admission pins match',all(sha(Path(p))==h for p,h in ad['files'].items()),len(ad['files']))
check('readiness scoped not launch permission',ad['runtime_ready'] and not ad['app_start_authorized_this_task'])
check('only three runtime source plus template changed',s['changedFromBase']==['components/c3/src/v340-document.js','components/c3/src/v340-result-service.js','components/c3/src/v340-runtime-contract.js','profile-template.json'])
with tarfile.open(s['archive'],'r:gz') as tf:
 members=tf.getmembers();bad=[]
 for m in members:
  digest=hashlib.sha256(tf.extractfile(m).read()).hexdigest();p=target/'components/c3'/Path(m.name).relative_to('package')
  if sha(p)!=digest:bad.append(m.name)
 check('134 actual installed members equal archive',len(members)==134 and not bad,bad)
check('archive unchanged',sha(Path(s['archive']))==s['archiveSHA256']=='6f2f16e771cb56bf5514b35de87bbf0903d6bd4faabad36cfef4f4ac327504bb')
check('new bundle pin',sha(Path(s['target']['bundle'])/'bundle.json')==s['target']['expectedSHA256'])
g=read(e/'installed-guard-observation.json');check('3 installed guard tests', 'pass 3' in (e/'installed-guard.log').read_text() and 'fail 0' in (e/'installed-guard.log').read_text())
check('52 guard paths and zero effects',len(g['rejectedEndpoints'])==52 and g['recordUnchanged'] and all(g[k]==0 for k in ['modelPreparations','adapterCalls','credentialCalls','fetchAttempts']))
f=read(e/'release-file-disposition.json');check('134 member dispositions',len(f['files'])==134 and len({r['path'] for r in f['files']})==134 and sum(f['counts'].values())==134)
check('every disposition hashes actual target',all(sha(target/'components/c3'/r['path'])==r['sha256'] for r in f['files']))
check('8 payload/2 operator preserved',len(f['embedded_entries'])==10 and sum(r['model_context_allowed'] for r in f['embedded_entries'])==8 and all(not r['public_permission_inferred_from_role'] for r in f['embedded_entries']))
check('public scope not approved or relicensed',all(not r['publication_approved'] for r in f['files']) and not f['license_formally_adopted'] and f['licensing_contact']=='TinaD.qd@outlook.com')
protected=read(e/'protected-baseline.json');allowed={str(repo/'docs/project-current-state.md'),str(repo/'docs/evidence/2026-10-23-stage5-progress-and-remaining.md')}
bad=[p for p,h in protected.items() if p not in allowed and (not Path(p).is_file() or sha(Path(p))!=h)]
check('protected original bytes unchanged',not bad,{'count':len(protected),'unexpected':bad})
for name,where in [('project-current-state.md','docs'),('2026-10-23-stage5-progress-and-remaining.md','docs/evidence')]:check(name+' full previous suffix', (repo/where/name).read_bytes().endswith((e/('before-'+name)).read_bytes()))
pre=read(e/'preflight.json');drift=[r['path'] for r in pre['inputs'] if r['path'] not in allowed and sha(Path(r['path']))!=r['sha256']];check('preflight inputs stable',not drift,drift)
extra=read(e/'supplemental-inputs.json');check('supplemental inputs stable',all(sha(Path(r['path']))==r['sha256'] for r in extra['inputs']))
check('HEAD unchanged',subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()==pre['head'])
cmd=[str(root/'control/node'),str(root/'control/scripts/f-installed-runtime.mjs'),'--check',str(root)];r=subprocess.run(cmd,capture_output=True,text=True);(e/'final-controller-check.stdout.log').write_text(r.stdout);(e/'final-controller-check.stderr.log').write_text(r.stderr);(e/'final-controller-check-command.json').write_text(json.dumps({'argv':cmd,'exit_code':r.returncode},indent=2)+'\n');check('fresh actual standalone installed controller',r.returncode==0,r.stdout+r.stderr)
report={'status':'PASS_BOUNDED_P4_INSTALLED_UNKNOWN_AND_RELEASE_PREPARATION' if all(x['passed'] for x in checks) else 'FAIL','time':datetime.datetime.now().astimezone().isoformat(),'checks':checks,'executor':'Codex single agent self-review; not independent acceptance','full_goal_complete':False,'limitations':['Synthetic UNKNOWN only; no actual unknown request','No App/Host/UI/start-stop lifecycle','license ownership/formal adoption/public scope and professional/user gates open','remote/source and independent followups incomplete']}
(e/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':[x for x in checks if not x['passed']]},ensure_ascii=False));raise SystemExit(0 if all(x['passed'] for x in checks) else 1)
