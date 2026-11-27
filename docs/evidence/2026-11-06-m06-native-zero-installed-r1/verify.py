from pathlib import Path
import datetime,hashlib,json,os,re,subprocess

repo=Path(__file__).resolve().parents[3];e=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_bytes())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name,passed,details=None):checks.append({'name':name,'passed':bool(passed),'details':details})
spec=read(e/'install-spec.json');root=Path(spec['root']);release=root/'releases'/spec['expectedSHA256']
candidate=read(e/'candidate-inputs.json');admission=read(e/'admission-candidate.json')
for name in ['installation','check-installed','controller-check','tests-final','installed-guard-tests']:
 d=read(e/(name+'-command.json'));check(name+' exit0',d['exit_code']==0,d)
check('RED observed missing preparation and accepted invalid policy',read(e/'tests-red-command.json')['exit_code']==1 and 'fail 3' in (e/'tests-red.log').read_text())
for name,count in [('tests-final',19),('installed-guard-tests',3)]:
 text=(e/(name+'.log')).read_text();check(name+' count',f'pass {count}' in text and 'fail 0' in text,count)
bundle=Path(spec['bundle']);check('new bundle manifest pin',sha(bundle/'bundle.json')==spec['expectedSHA256'])
check('same c07f archive',sha(Path(candidate['archive']))=='c07f2120a42e1a9d8110901eb35ed314eb5dd7225b1b35234c5b8d770fb03494')
members=read(e/'archive-member-checks.json');check('134 installed archive members unchanged',len(members)==134 and all(sha(Path(x['installed']))==x['sha256'] for x in members))
check('all admission pins match',all(sha(Path(p))==h for p,h in admission['files'].items()),len(admission['files']))
observation=read(e/'installed-observation.json');guard=read(e/'installed-guard-observation.json')
check('604 internal links',observation['linkCount']==604 and all(Path(x['actual']).is_relative_to(release) for x in read(e/'link-checks.json')))
check('actual unique host and paired client',len(observation['activeBusiness'])==1 and observation['appPair']==observation['profilePair'])
check('actual Desktop config',observation['port']==57619 and observation['networkExposure']=='loopback' and observation['requiresDependencyMigration']==False and observation['warnings']==[])
check('second process writer rejected',observation['secondWriter']=={'exit':0,'code':'F_INSTALL_BUSY'})
check('second process storage owner rejected',observation['secondStorageOwner']=={'exit':0,'code':'DSH_STORAGE_ROOT_BUSY'})
check('release reacquire and expired lease refusal',all(observation[n] for n in ['writerReacquired','storageOwnerReacquired','releasedLeaseRejected','locksReleased']))
check('dual locks absent',all(not (root/n).exists() for n in ['startup.lock','data/startup.lock']))
check('no app launch files',not list((root/'data/evidence').iterdir()) and observation['appSpawnAttempts']==0 and observation['hostStarted']==False)
check('52 endpoint guard and counters',len(guard['rejectedEndpoints'])==52 and guard['recordUnchanged'] and all(guard[n]==0 for n in ['modelPreparations','adapterCalls','credentialCalls','fetchAttempts']))
check('data only owner metadata',sorted(p.name for p in (root/'data/home/storages').iterdir())==['.dsh-json-single-owner.sqlite'])
check('no credential or session migration',all(not (root/'data/home'/n).exists() for n in ['sessions','credentials','attachments']))
check('technical readiness is not launch acceptance',admission['runtime_ready'] and not admission['app_start_authorized_this_task'] and not admission['host_ui_verified'])
for n in ['2026-11-06-m06-native-zero-generation-r1','2026-11-06-m06-native-zero-assembly-r1']:
 check(n+' old unready retained',read(repo/'docs/evidence'/n/'admission-candidate.json')['runtime_ready']==False)
allowed={str(repo/n) for n in ['scripts/f-installed-runtime.mjs','docs/project-current-state.md','docs/evidence/2026-10-23-stage5-progress-and-remaining.md']}
protected=read(e/'protected-baseline.json');bad=[p for p,h in protected.items() if p not in allowed and (not Path(p).is_file() or sha(Path(p))!=h)]
check('protected original files preserved',not bad,{'protected':len(protected),'expected_existing_edits':sorted(allowed),'unexpected':bad})
for file,before in [('docs/project-current-state.md','before-project-current-state.md'),('docs/evidence/2026-10-23-stage5-progress-and-remaining.md','before-2026-10-23-stage5-progress-and-remaining.md')]:
 check(file+' old byte suffix retained',(repo/file).read_bytes().endswith((e/before).read_bytes()))
source=read(e/'source-release-baseline.json');old=Path(source['root'])
bad=[p for p,h in source['files'].items() if not (old/p).is_file() or sha(old/p)!=h]
badlinks=[p for p,target in source['links'].items() if not (old/p).is_symlink() or os.readlink(old/p)!=target]
check('original retained release bytes and links preserved',not bad and not badlinks,{'files':len(source['files']),'links':len(source['links']),'changed':bad,'changed_links':badlinks})
appPrefix='App/DSH Desktop.app/'
manifest=read(bundle/'bundle.json')
appRows=[(p,h) for p,h in manifest['files'].items() if p.startswith(appPrefix)]
check('fixed App source/new bundle/installed bytes paired',len(appRows)==26160 and all(source['files'].get(p)==h and sha(release/p)==h for p,h in appRows),len(appRows))
preflight=read(e/'preflight.json');expectedChanges=allowed
drift=[row['path'] for row in preflight['inputs'] if row['path'] not in expectedChanges and sha(Path(row['path']))!=row['sha256']]
check('governance and contract inputs did not drift',not drift,drift)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip();check('HEAD unchanged',head==preflight['head'],head)
diff=subprocess.run(['git','diff','--check','--','scripts/f-installed-runtime.mjs'],cwd=repo,capture_output=True,text=True);check('controller diff whitespace',diff.returncode==0,diff.stdout+diff.stderr)
(e/'implementation.diff').write_bytes(subprocess.check_output(['git','diff','--','scripts/f-installed-runtime.mjs'],cwd=repo))
report={'scope':'BOUNDED_OFFLINE_INSTALLED_LAYOUT_AND_COOPERATIVE_WRITER_ZERO_SPEC','time':datetime.datetime.now().astimezone().isoformat(),'executor':'Codex single-agent implementation and self-review; not independent acceptance','status':'PASS_BOUNDED_INSTALLED_ZERO_SPEC_NO_APP_START' if all(x['passed'] for x in checks) else 'FAIL','checks':checks,'test_count':22,'real_app_started':False,'real_calls_authorized':False,'release_authorized':False,'limitations':['No Host/UI/lifecycle acceptance','cooperative writer only, no arbitrary writer/OS network enforcement','professional/user and final release/license gates open']}
(e/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':[x for x in checks if not x['passed']]},ensure_ascii=False))
raise SystemExit(0 if all(x['passed'] for x in checks) else 1)
