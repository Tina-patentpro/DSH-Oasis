from datetime import datetime, timezone, timedelta
from decimal import Decimal
import hashlib
import json
from pathlib import Path

project = Path.cwd()
e = project/'docs/evidence/2026-11-14-dsh-m01-single-live'
base = project/'.local/dsh-next-field-diagnostics-20261112/m01-single-20261114'
runroot = base/'live'
cn = timezone(timedelta(hours=8))
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def matching_runs(data,key):
    if isinstance(data, dict):
        if data.get('requestKey') == key and 'inputSnapshot' in data:
            yield data
        else:
            for entry in data.values():
                yield from matching_runs(entry,key)
    elif isinstance(data,list):
        for entry in data:
            yield from matching_runs(entry,key)

pre=read(e/'execution-preflight.json')
proof=read(e/'proof-reconciliation.json')
auth=read(e/'dispatch-binding.json')
attempts=list((runroot/'wire').glob('*.post-attempt.json'))
assert len(attempts)==1 and not (runroot/'wire/M01.transport-unknown.json').exists()
attempt=read(attempts[0])
start=read(runroot/'wire/M01.start.json')
assert start['requestKey']==attempt['requestKey']==auth['requestKey']==pre['requestKey']
assert start['tools']==0 and start['maxOutputTokens']==pre['technicalLimits']['maxTokens']
assert start['systemSha256']==proof['wire']['systemSha256']
assert start['inputContentSha256']==proof['wire']['inputContentSha256']
assert all(sha(Path(p))==s for p,s in pre['historicalFiles'].items())
assert not (runroot/'dsh-home/.credentials.yaml').exists()
state=read(runroot/'dsh-home/storages/oasis_workbench.json')
runs=list(matching_runs(state,pre['requestKey']))
assert len(runs)==1
run=runs[0]
assert run['runId']==start['runId']
assert run['nativeCandidate']['preparedSHA256']==proof['preparedSha256']
result=run.get('result')
artifacts={}
if result is not None:
    snap=result['snapshot']
    assert hashlib.sha256(result['body'].encode()).hexdigest()==result['sha256']
    for filename,body in [('M01-完整结果.md',result['body']),('M01-技术背景研究正文.md',snap['current_result']['core_result_markdown'])]:
        path=e/filename
        with path.open('xb') as f:
            f.write(body.encode())
        artifacts[filename]={'sha256':sha(path),'bytes':path.stat().st_size}
    material=run['inputSnapshot']['draft']['textInputs']['research_request_text']
    entries=[row for row in snap['contents'] if row['content_id'].startswith('m01.')]
    review=[{'contentId':row['content_id'],'trustStatus':row['trust_status'],'sourceInputId':row['source_input_id'],'exactLocatorAndHash':row['source_locator'] in material and row['source_hash']==hashlib.sha256(material.encode()).hexdigest()} for row in entries]
    assert len(review)==4 and all(row['exactLocatorAndHash'] for row in review)
else:
    snap={}
    review=[]
terminal=runroot/'wire/M01.end.json'
provider=read(terminal) if terminal.exists() else None
balance=read(runroot/'wire/M01.balance-before.json')
fee=None
if provider and provider.get('finalUsage'):
    u=provider['usage']
    rates=pre['priceCnyPerMillion']
    assert provider['messageStop'] and provider['stopReason']=='end_turn' and provider['http']==200
    fee=sum(Decimal(u.get(k,0))*Decimal(str(r)) for k,r in [
        ('input_tokens',rates['input']),('cache_creation_input_tokens',rates['input']),
        ('cache_read_input_tokens',rates['cacheRead']),('output_tokens',rates['output'])])/1_000_000
    host_usage=run['executionSummary'].get('usage',{})
    for model_k,host_k in [('input_tokens','inputTokens'),('output_tokens','outputTokens'),('cache_read_input_tokens','cacheReadTokens'),('cache_creation_input_tokens','cacheCreationTokens')]:
        if model_k in u and host_k in host_usage:
            assert u[model_k]==host_usage[host_k],(model_k,host_k)
immediate=provider.get('balanceAfter') if provider else None
follow_files=sorted(runroot.glob('balance-followup*.json'),key=lambda p:read(p)['at'])
follow=read(follow_files[-1]) if follow_files else None
actual=None
if follow and follow.get('cny') and balance.get('total'):
    actual=Decimal(balance['total'])-Decimal(follow['cny']['total_balance'])
obs={'requestKey':pre['requestKey'],'runId':run['runId'],'newModelPosts':1,'resubmissions':0,'professionalApiRequests':0,
     'provider':{k:v for k,v in provider.items() if k!='balanceAfter'} if provider else None,'host':{'status':run['status'],'failureCode':run.get('failureCode'),'summary':run.get('executionSummary'),
     'inputSha256':run['inputSha256'],'outputHash':result['sha256'] if result else None,'documentStatus':snap.get('workflow_status'),
     'reviewStatus':run.get('reviewStatus'),'deliverableStatus':snap.get('deliverable_status'),'fieldIssue':run.get('executionSummary',{}).get('fieldIssue')},
     'wire':start,'submittedAtBeijing':datetime.fromisoformat(attempt['at'].replace('Z','+00:00')).astimezone(cn).isoformat(),
     'meteredFeeCny':str(fee) if fee is not None else None,'accountDebitObservedCny':str(actual) if actual is not None else None,
     'immediateBalanceReadable':bool(immediate and immediate.get('total')),
     'followupAt':follow.get('at') if follow else None,'settlementLineItemAvailable':False,'isolatedCredentialRemoved':True,
     'artifacts':artifacts,'sourceProjection':review,'historicalFilesUnchanged':True,
     't1Status':snap.get('tables',{}).get('T1',{}).get('status'),'t1Rows':len(snap.get('tables',{}).get('T1',{}).get('rows',[])),
     'warningIds':[row['warning_id'] for row in snap.get('warnings',[])],
     'providerBalanceObservations':[{'at':read(f)['at'],'http':read(f).get('http'),'observedDebitCny':str(Decimal(balance['total'])-Decimal(read(f)['cny']['total_balance'])) if read(f).get('cny') else None} for f in follow_files]}
with (e/'verification.json').open('x',encoding='utf8') as f:
    json.dump(obs,f,ensure_ascii=False,indent=2)
    f.write('\n')
print(json.dumps({k:obs[k] for k in ['runId','host','meteredFeeCny','accountDebitObservedCny','artifacts']},ensure_ascii=False,indent=2))
