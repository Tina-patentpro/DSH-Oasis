from pathlib import Path
import datetime,hashlib,json,re,subprocess,tarfile
repo=Path(__file__).resolve().parents[3];e=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_bytes());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name,passed,details=None):checks.append({'name':name,'passed':bool(passed),'details':details})
for name in ['tests-final-r2','pack-r2','archive-r2-public-revision','archive-r2-guard-tests']:
 d=read(e/(name+'-command.json'));check(name+' exit0',d['exit_code']==0,d)
check('70 source tests', 'pass 70' in (e/'tests-final-r2.log').read_text() and 'fail 0' in (e/'tests-final-r2.log').read_text())
check('3 archive guard tests','pass 3' in (e/'archive-r2-guard-tests.log').read_text() and 'fail 0' in (e/'archive-r2-guard-tests.log').read_text())
for n in ['tests-red','duplicate-row-red','quote-boundary-red']:check(n+' observed',read(e/(n+'-command.json'))['exit_code']==1)
a=read(e/'archive-inspection-r2.json');archive=Path(a['archive']);check('final archive hash',sha(archive)==a['sha256']=='6f2f16e771cb56bf5514b35de87bbf0903d6bd4faabad36cfef4f4ac327504bb')
with tarfile.open(archive,'r:gz') as tf:
 rows={m.name:hashlib.sha256(tf.extractfile(m).read()).hexdigest() for m in tf.getmembers()}
 check('134 actual members match source',len(rows)==134 and all(sha(repo/'packages/oasis-professional-service'/Path(n).relative_to('package'))==h for n,h in rows.items()))
check('only three source members changed',sorted(a['changed_from_c07f'])==['package/src/v340-document.js','package/src/v340-result-service.js','package/src/v340-runtime-contract.js'])
check('package/client/resource policy retained',a['client_rebuilt']==False and a['installed']==False and a['published']==False and a['old_archive_preserved'])
result=read(e/'public-revision-archive-r2-result.json');check('eight public RPC outcomes',len(result['steps'])==8 and [s['ok'] for s in result['steps']]==[True,True,False,True,True,True,True,True])
check('no dispatch or App',result['generationCalls']==result['networkAttempts']==0 and result['applicationStarted']==False and result['conversationSent']==False)
check('source business record untouched',sha(Path(result['sourceRecord']['path']))==result['sourceRecord']['sha256'])
source=read(Path(result['sourceRecord']['path']))['tables']['workspaces'];wid=next(iter(source));tid='af16eb37-30de-400e-a2cf-d88bd9b0f430';rid='v340-d4fda3b7-6cf4-4191-b727-2f36827e8276'
original=source[wid]['tasks'][tid]['v340']['runs'][rid];stored=read(Path(result['scratch'])/'records.json')[wid]['tasks'][tid]['v340']['runs'][rid]
parent=next(v for v in original['resultVersions'] if v['versionId']==result['parent']['versionId']);current=stored['resultVersions'][-1];snapshot=current['result']['snapshot']
check('parent version and original result unchanged',parent==next(v for v in stored['resultVersions'] if v['versionId']==parent['versionId']) and stored['result']==original['result'])
check('frozen input preserved',stored['inputSnapshot']==original['inputSnapshot'] and stored['inputSha256']==original['inputSha256'])
check('all twelve warnings retained open',snapshot['warnings'][:12]==parent['result']['snapshot']['warnings'] and len(snapshot['warnings'])==15 and all(w['status']=='open' for w in snapshot['warnings'][:12]))
check('four other tables retained',all(snapshot['tables'][t]==parent['result']['snapshot']['tables'][t] for t in ['T1','T3','T5','T6']))
check('four row histories with unconfirmed assessment',len(snapshot['revisions'])==len(parent['result']['snapshot']['revisions'])+4 and all(r['assessment']=='manual_revision_not_fact_confirmation' for r in snapshot['revisions'][-4:]))
check('exact saved revision body',sha(Path(result['revision']['savedFile']))==result['revision']['sha256']=='18250e4cd496d52f0f0459782ca2305dd2fdcaf646794ecdfbbbbf63c814237c')
check('review binds current hash without filing acceptance',current['review']['status']=='approved' and current['review']['sha256']==current['result']['sha256'] and snapshot['deliverable_status']=='not_recommended_for_filing')
check('reopen and prior file preserved',result['reopenExact'] and result['parentFilePreserved'])
check('professional/user remain pending',result['professionalAcceptance']==result['userAcceptance']=='PENDING')
guard=read(e/'archive-r2-guard-observation.json');check('52 zero guard endpoints unchanged',len(guard['rejectedEndpoints'])==52 and all(guard[k]==0 for k in ['modelPreparations','adapterCalls','credentialCalls','fetchAttempts']))
old=read(repo/'docs/evidence/2026-11-06-m06-native-zero-installed-r1/admission-candidate.json');check('old installed pins retained',all(sha(Path(p))==h for p,h in old['files'].items()),len(old['files']))
protected=read(e/'protected-baseline.json');allowed={str(repo/n) for n in ['docs/project-current-state.md','docs/evidence/2026-10-23-stage5-progress-and-remaining.md','packages/oasis-professional-service/src/v340-document.js','packages/oasis-professional-service/src/v340-result-service.js','packages/oasis-professional-service/src/v340-runtime-contract.js']}
bad=[p for p,h in protected.items() if p not in allowed and (not Path(p).is_file() or sha(Path(p))!=h)]
check('protected originals retained',not bad,{'count':len(protected),'expected_edits':sorted(allowed),'unexpected':bad})
for name in ['project-current-state.md','2026-10-23-stage5-progress-and-remaining.md']:
 p=repo/('docs/'+name if name=='project-current-state.md' else 'docs/evidence/'+name);check(name+' old full suffix retained',p.read_bytes().endswith((e/('before-'+name)).read_bytes()))
pre=read(e/'preflight.json');drift=[r['path'] for r in pre['inputs'] if r['path'] not in allowed and sha(Path(r['path']))!=r['sha256']];check('governance inputs stable',not drift,drift)
check('HEAD unchanged',subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()==pre['head'])
paths=['packages/oasis-professional-service/src/v340-document.js','packages/oasis-professional-service/src/v340-result-service.js','packages/oasis-professional-service/src/v340-runtime-contract.js','packages/oasis-professional-service/test/v340-result-fixture.mjs'];r=subprocess.run(['git','diff','--check','--',*paths],cwd=repo,capture_output=True,text=True);check('diff whitespace',r.returncode==0,r.stdout+r.stderr)
(e/'implementation.diff').write_bytes(subprocess.check_output(['git','diff','--',*paths],cwd=repo))
c=read(e/'license-contact-addendum.json');check('user commercial contact recorded without rights inference',c['commercial_authorization_email']=='TinaD.qd@outlook.com' and not c['rights_chain_provided'] and not c['formal_adoption'] and sha(Path(c['artifact']))==c['sha256'])
g=read(e/'goal-progress-audit.json');check('full goal remains active/incomplete',g['goal_status']=='active' and not g['completion_proven'] and len(g['items'])==21)
report={'status':'PASS_BOUNDED_P3_CODE_AND_OFFLINE_RPC_REVISION' if all(x['passed'] for x in checks) else 'FAIL','time':datetime.datetime.now().astimezone().isoformat(),'executor':'Codex single agent self-review; not independent professional acceptance','checks':checks,'source_tests':70,'archive_guard_tests':3,'full_goal_complete':False,'application_started':False,'limitations':['No App/Host/UI or native lifecycle evidence','final archive not yet installed','professional and user acceptance pending','release rights/UNKNOWN update pairing and remote/source work incomplete']}
(e/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':[x for x in checks if not x['passed']]},ensure_ascii=False));raise SystemExit(0 if all(x['passed'] for x in checks) else 1)
