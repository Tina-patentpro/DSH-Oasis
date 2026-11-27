"""Read-only verification of native UI-produced records; never writes business storage."""
import copy,hashlib,json,subprocess
from pathlib import Path
E=Path(__file__).resolve().parent;P=E.parents[2]
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(name,x):
 with (E/name).open('x',encoding='utf-8') as f:f.write(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
auth=read(E/'authorization.json');scope=auth['scope'];root=Path(auth['root'])
def records(x):
 if isinstance(x,dict):
  if 'tasks' in x and 'revision' in x:yield x
  else:
   for v in x.values():yield from records(v)
 elif isinstance(x,list):
  for v in x:yield from records(v)
def record(p):
 rows=[r for r in records(read(p)) if r['workspaceId']==scope['workspaceId']];assert len(rows)==1;return rows[0]
before=record(E/'before/target-root/data/home/storages/oasis_workbench.json')
draft=record(E/'native-draft-storage.json');unreviewed=record(E/'native-unreviewed-storage.json')
first=record(E/'first-exit-storage.json');second=record(E/'second-exit-storage.json')
actual=record(root/'data/home/storages/oasis_workbench.json')
assert before['revision']==10 and draft['revision']==12 and unreviewed['revision']==13 and first['revision']==15
assert first==second==actual
task=scope['taskId'];runid=scope['runId']
getrun=lambda r:r['tasks'][task]['v340']['runs'][runid]
oldrun=getrun(before);draftrun=getrun(draft);newrun=getrun(actual);unreviewedrun=getrun(unreviewed)
assert all(r['activeTaskId']==task for r in [before,draft,unreviewed,first,second,actual])
assert set(actual['tasks'])==set(before['tasks']) and actual['taskOrder']==before['taskOrder']
assert set(newrun)==set(oldrun)|{'coreResultDrafts'} or set(newrun)==set(oldrun)
assert newrun['inputSha256']==scope['inputSha256'] and newrun['status']=='completed' and newrun['evidenceKind']=='synthetic'
assert len(oldrun['resultVersions'])==2 and len(newrun['resultVersions'])==3
assert newrun['resultVersions'][:2]==oldrun['resultVersions']
new=newrun['resultVersions'][-1];assert newrun['activeVersionId']==new['versionId']
assert new['parentVersionId']==oldrun['activeVersionId']
assert unreviewedrun['resultVersions'][-1]['review']['status']=='not-reviewed'
assert new['review']['status']=='approved' and new['review']['sha256']==new['result']['sha256']
assert len(new['writebacks'])==1 and new['writebacks'][0]['reviewStatus']=='approved'
assert len(draftrun['coreResultDrafts'])==1
body=next(iter(draftrun['coreResultDrafts'].values()))['body']
assert 'RC2_NATIVE_RECOVERY_R1' in body and body==new['result']['snapshot']['current_result']['core_result_markdown']
assert newrun.get('coreResultDrafts',{})=={}
for k in oldrun:
 if k not in ['activeVersionId','resultVersions','coreResultDrafts']:assert oldrun[k]==newrun[k],k
before_task=copy.deepcopy(before['tasks'][task]);actual_task=copy.deepcopy(actual['tasks'][task]);before_task['v340']['runs']=actual_task['v340']['runs'];assert before_task==actual_task
assert [len(v['result']['snapshot']['warnings']) for v in newrun['resultVersions']]==[7,9,11]
assert all(w['status']=='open' for w in new['result']['snapshot']['warnings'])
assert new['result']['snapshot']['workflow_status']=='completed_with_warnings'
assert new['result']['snapshot']['deliverable_status']=='not_recommended_for_filing'
for v in newrun['resultVersions']:
 assert hashlib.sha256(v['result']['body'].encode()).hexdigest()==v['result']['sha256']
files=root/'data/workspace-a';expected_before=read(E/'business-before.json')['originalWorkspaceFiles']
for rel,h in expected_before.items():assert sha(files/rel)==h,rel
added={str(p.relative_to(files)) for p in files.rglob('*') if p.is_file()}-set(expected_before)
receipt=new['writebacks'][0];assert added=={f['relativePath'] for f in receipt['files']}
for row in receipt['files']:assert sha(files/row['relativePath'])==row['sha256']
assert sha(files/new['result']['fileName'])==new['result']['sha256']
old=oldrun['resultVersions'][-1];old_file=files/old['result']['fileName']
assert sha(old_file)==expected_before[old_file.name] and sha(old_file)!=old['result']['sha256']
old_workspace=read(E/'before/target-root/data/home/storages/workspace.json');workspace=read(root/'data/home/storages/workspace.json')
normalized=copy.deepcopy(workspace);workspace_changes=[]
assert set(old_workspace['tables']['workspaces'])==set(workspace['tables']['workspaces'])
for key,old_row in old_workspace['tables']['workspaces'].items():
 row=workspace['tables']['workspaces'][key]
 assert old_row['path']==row['path'] and old_row['sessionIds']==[] and len(row['sessionIds'])==1
 workspace_changes.append({'workspaceId':key,'path':row['path'],'oldSessionIds':old_row['sessionIds'],'newSessionIds':row['sessionIds'],'oldUpdatedAt':old_row['updatedAt'],'newUpdatedAt':row['updatedAt']})
 normalized['tables']['workspaces'][key]['sessionIds']=old_row['sessionIds'];normalized['tables']['workspaces'][key]['updatedAt']=old_row['updatedAt']
assert normalized==old_workspace
session_observation=read(E/'native-session-observation.json')
assert session_observation['officialReadOnlySessionAPI'] and session_observation['noWriteHandle']
assert session_observation['listedCount']==2
assert sorted(s['eventCount'] for s in session_observation['sessions'])==[3,4]
assert all(set(s['eventTypes'])<={'permission/preset','sandbox/mode','approval/policy','session/end-seed'} for s in session_observation['sessions'])
write('workspace-native-delta.json',{'beforeSHA256':sha(E/'before/target-root/data/home/storages/workspace.json'),'afterSHA256':sha(root/'data/home/storages/workspace.json'),'identityAndOtherFieldsUnchanged':True,'changes':workspace_changes,'cause':'DSH first new conversation defaulted to B; choosing approved A created another conversation. Public read handles found only preset/sandbox/approval/seed metadata, no user/assistant/tool/model events. Registry original snapshot retained, no rollback/deletion.','verifierCorrection':'initial byte-unchanged and zero-total-events expectations were incorrect; both FAIL logs retained. Exact native session metadata deltas and event types now checked; no new App startup or business operation repeated.'})
protected=[]
for row in read(E/'protected-before.json'):
 h=sha(Path(row['path']));assert h==row['sha256'];protected.append({**row,'afterSHA256':h,'unchanged':True})
write('protected-after.json',protected)
launches=[];patterns=['uncaughtException','UnhandledPromiseRejection','EADDRINUSE','ERR_MODULE_NOT_FOUND','resolves from multiple active Loader sources','M06_BUSINESS_RESOURCE_UNAVAILABLE']
for stage in ['first','second']:
 launch=read(E/(stage+'-launch.json'));exit=read(E/(stage+'-exit-observation.json'))['exit'];assert exit['code']==0 and exit['signal'] is None
 p=Path(launch['recordPath']);assert read(p)['current']==auth['bundleSHA256'];logs=[]
 for suffix in ['.stdout.log','.stderr.log']:
  path=p.with_suffix(suffix);b=path.read_bytes();t=b.decode(errors='replace')
  counts={s:t.count(s) for s in patterns};assert not any(counts.values())
  logs.append({'path':str(path),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'knownFatalPatternCounts':counts,'unappliedPatchWarnings':t.count('unused or unapplied')})
 launches.append({'stage':stage,'pid':launch['pid'],'recordPath':str(p),'exit':exit,'logs':logs})
assert len(list((root/'data/evidence').glob('installed-launch-*.json')))==4
assert len({r['pid'] for r in launches})==2
assert read(E/'active-writer-refusal.json')['code']=='F_INSTALL_BUSY'
assert read(E/'lease-readmission.json')['writerReleased']
assert not any((root/p).exists() for p in ['startup.lock','data/startup.lock','RECOVERY_REQUIRED'])
assert sha(root/'control/scripts/f-installed-runtime.mjs')==auth['controllerSHA256']
for stage in ['before','between','after']:assert read(E/('controller-check-'+stage+'.log'))['current']==auth['bundleSHA256']
write('selected-launch-diagnostics.json',{'scope':'only listed diagnostic patterns; not a full network/model/account monitor; original logs remain in isolated root, credentials not printed/copied','launches':launches})
write('business-native-result.json',{'status':'NATIVE_SYNTHETIC_BUSINESS_RECOVERY_OBSERVED_WITH_UI_FINDING','root':str(root),'workspaceId':scope['workspaceId'],'taskId':task,'runId':runid,'recordRevisions':{'before':10,'draft':12,'newUnreviewed':13,'afterReviewAndSave':15,'afterNativeRestart':15},'businessBeforeSHA256':sha(E/'before/target-root/data/home/storages/oasis_workbench.json'),'businessAfterSHA256':sha(root/'data/home/storages/oasis_workbench.json'),'draftBodySHA256':hashlib.sha256(body.encode()).hexdigest(),'newVersionId':new['versionId'],'newResultSHA256':new['result']['sha256'],'newFileName':new['result']['fileName'],'writeback':receipt,'warningCountsByVersion':[7,9,11],'oldVersionsUnchanged':True,'oldWorkspaceFilesUnchanged':True,'oldCurrentFileDiffersFromReviewed':True,'newFileMatchesReviewed':True,'oldRunNotRecreated':True,'newRuns':0,'coreDraftConsumedByNewVersion':True,'workspaceJSONUnchanged':False,'workspaceIdentityUnchanged':True,'nativeEmptySessionMetadataRecorded':True,'firstAndSecondExitBusinessBytesIdentical':(E/'first-exit-storage.json').read_bytes()==(E/'second-exit-storage.json').read_bytes(),'nativeStarts':2,'nativeNormalExits':2,'restartCount':1,'failedStartRetries':0,'protectedOriginals':len(protected),'professionalOrUserAccepted':False,'publication':False,'UIFinding':'empty no-task state and task tab strip expose forbidden create/import affordances; no forbidden click performed, backend denial evidence reused; frozen candidate not changed'})
print('Native evidence verified: same run, 2 -> 3 versions, record 10 -> 15, warnings 7/9/11, exact new file and receipt, old bytes preserved, 2 normal exits and released lease; UI finding remains.')
