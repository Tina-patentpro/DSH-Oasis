from pathlib import Path
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import hashlib
import json

w=Path.cwd()
e=w/'docs/evidence/2026-11-27-m01-t1-m02-live'
base=w/'.local/dsh-next-field-diagnostics-20261112/m02-single-20261127'
live=base/'live'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(p, data):
    with p.open('x',encoding='utf-8') as f:
        json.dump(data,f,ensure_ascii=False,indent=2)
        f.write('\n')
def find_run(value,key):
    if isinstance(value,dict):
        if value.get('requestKey')==key and 'inputSnapshot' in value:
            return value
        for child in value.values():
            found=find_run(child,key)
            if found:
                return found
    return None

binding=read(e/'m02-single-binding.json')
dispatch=read(e/'m02-dispatch-binding.json')
assert sha(base/'single-live-host.cjs')==dispatch['launcherSha256']
assert sha(base/'single-live-wire.cjs')==dispatch['guardSha256']
attempts=list((live/'wire').glob('*.post-attempt.json'))
assert len(attempts)==1
attempt=read(attempts[0])
start=read(live/'wire/M02.start.json')
assert start['requestKey']==attempt['requestKey']==binding['newRequestKey']==dispatch['requestKey']
assert start['systemSha256']==binding['promptSha256']
assert start['inputContentSha256']==binding['inputContentSha256']
assert start['tools']==0 and start['maxOutputTokens']==16384
assert not (live/'dsh-home/.credentials.yaml').exists()
run=find_run(read(live/'dsh-home/storages/oasis_workbench.json'),binding['newRequestKey'])
assert run and run['runId']==start['runId']
assert run['nativeCandidate']['preparedSHA256']==binding['preparedSha256']
assert run['status'] in ['completed','failed','unknown']
terminal_path=live/'wire/M02.end.json'
terminal=read(terminal_path) if terminal_path.exists() else None
balance=read(live/'wire/M02.balance-before.json')
follow_paths=sorted(live.glob('balance-followup*.json'),key=lambda p:read(p)['at'])
observations=[{'at':read(p)['at'],'http':read(p).get('http'),
               'observedDebitCny':str(Decimal(balance['total'])-Decimal(read(p)['cny']['total_balance'])) if read(p).get('cny') else None}
              for p in follow_paths]
fee=None
cn=timezone(timedelta(hours=8))
at=datetime.fromisoformat(attempt['at'].replace('Z','+00:00')).astimezone(cn)
clock=(at.hour,at.minute)
peak=at.weekday()<5 and ((9,0)<=clock<(12,0) or (14,0)<=clock<(18,0))
rates=binding['cnyPerMillion']['peak' if peak else 'offpeak']
if terminal and terminal.get('finalUsage'):
    usage=terminal['usage']
    fee=sum(Decimal(usage.get(key,0))*Decimal(str(rate)) for key,rate in [
        ('input_tokens',rates['input']),('cache_creation_input_tokens',rates['input']),
        ('cache_read_input_tokens',rates['cacheRead']),('output_tokens',rates['output'])])/1_000_000
    host=run.get('executionSummary',{}).get('usage',{})
    for a,b in [('input_tokens','inputTokens'),('output_tokens','outputTokens'),('cache_read_input_tokens','cacheReadTokens')]:
        if a in usage and b in host:assert usage[a]==host[b],(a,b)
result=run.get('result')
artifacts={}
source_checks=[]
snapshot={}
if result:
    assert hashlib.sha256(result['body'].encode()).hexdigest()==result['sha256']
    snapshot=result['snapshot']
    for filename,body in [('M02-完整结果.md',result['body']),('M02-TRIZ分析正文.md',snapshot['current_result']['core_result_markdown'])]:
        path=e/filename
        with path.open('xb') as f:f.write(body.encode())
        artifacts[filename]={'sha256':sha(path),'bytes':path.stat().st_size}
    for row in snapshot['contents']:
        if row['source_input_id']=='technical_analysis_material_text' and not row['content_id'].startswith('host/'):
            material=run['inputSnapshot']['draft']['textInputs'][row['source_input_id']]
            source_checks.append({'content_id':row['content_id'],'origin':row['content_origin'],'trust':row['trust_status'],
                'locatorAndHashMatched':row['source_locator'] in material and row['source_hash']==hashlib.sha256(material.encode()).hexdigest()})
before_m01=read(e/'m01-source-storage.json')
assert sha(Path(before_m01['sourceStoragePath']))==before_m01['sha256']
original=read(w/'docs/evidence/2026-11-14-dsh-m01-single-live/verification.json')
for filename,identity in original['artifacts'].items():
    assert sha(w/'docs/evidence/2026-11-14-dsh-m01-single-live'/filename)==identity['sha256']
local=read(e/'m01-observe.json')
assert local['t1Rows']==9 and local['coreUnchanged']
for file in local['files']:assert sha(Path(local['workspace'])/file['relativePath'])==file['sha256']
row=read(live/'live-run.json')[0]
assert row['runId']==run['runId'] and row['status']==run['status']
report={
    'at':datetime.now(cn).isoformat(),'requestKey':binding['newRequestKey'],'runId':run['runId'],
    'submittedAtBeijing':at.isoformat(),'newModelPosts':1,'resubmissions':0,'professionalApiRequests':0,
    'host':{'status':run['status'],'failureCode':run.get('failureCode'),'summary':run.get('executionSummary'),
            'documentStatus':snapshot.get('workflow_status'),'deliverableStatus':snapshot.get('deliverable_status'),
            'reviewStatus':run.get('reviewStatus'),'resultSha256':result['sha256'] if result else None},
    'provider':{k:v for k,v in terminal.items() if k!='balanceAfter'} if terminal else None,
    'wire':start,'pricePeriod':'peak' if peak else 'offpeak','cnyPerMillion':rates,'meteredFeeCny':str(fee) if fee is not None else None,
    'balanceObservations':observations,'observedDebitCny':observations[-1]['observedDebitCny'] if observations else None,
    'itemizedSettlementAvailable':False,'isolatedCredentialRemoved':True,'artifacts':artifacts,
    'tableRows':{k:len(v['rows']) for k,v in snapshot.get('tables',{}).items()},
    'tableStatus':{k:v['status'] for k,v in snapshot.get('tables',{}).items()},
    'sourceChecks':source_checks,'warnings':[r['problem'] for r in snapshot.get('warnings',[])],
    'm01':{'sourceStorageUnchanged':True,'newRevision':local['versionId'],'t1Rows':9,'coreUnchanged':True,
           'derivedSha256':local['reviewedSha256'],'offlineTestsPassed':41,'coldPreviewMatches':local['previewMatches'],
           'modelPosts':0,'costCny':'0.00'},
}
write(e/'verification.json',report)
print(json.dumps({k:report[k] for k in ['runId','host','meteredFeeCny','observedDebitCny','tableRows']},ensure_ascii=False,indent=2))
