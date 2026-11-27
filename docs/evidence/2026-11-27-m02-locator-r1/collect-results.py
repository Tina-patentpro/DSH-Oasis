from pathlib import Path
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import hashlib
import json

w=Path.cwd()
e=w/'docs/evidence/2026-11-27-m02-locator-r1'
root=w/'.local/dsh-m02-locator-r1-20261127'
live=root/'live'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def find_run(value,key):
    if isinstance(value,dict):
        if value.get('requestKey')==key and 'inputSnapshot' in value:
            return value
        for child in value.values():
            found=find_run(child,key)
            if found:return found
    elif isinstance(value,list):
        for child in value:
            found=find_run(child,key)
            if found:return found
    return None
def write(path,data):
    with path.open('x',encoding='utf-8') as f:
        json.dump(data,f,ensure_ascii=False,indent=2)
        f.write('\n')
binding=read(e/'single-binding.json')
dispatch=read(e/'dispatch-binding.json')
assert sha(root/'single-live-host.cjs')==dispatch['launcherSha256']
assert sha(root/'single-live-wire.cjs')==dispatch['guardSha256']
assert len(list((live/'wire').glob('*.post-attempt.json')))==1
assert not (live/'dsh-home/.credentials.yaml').exists()
start=read(live/'wire/M02.start.json')
attempt=read(live/'wire/M02.post-attempt.json')
assert start['requestKey']==attempt['requestKey']==binding['newRequestKey']
assert start['systemSha256']==binding['promptSha256']
assert start['inputContentSha256']==binding['inputContentSha256']
assert start['tools']==0 and start['maxOutputTokens']==16384
run=find_run(read(live/'dsh-home/storages/oasis_workbench.json'),binding['newRequestKey'])
assert run['runId']==start['runId']
assert run['nativeCandidate']['version']=='v340-native-candidate-8'
assert run['nativeCandidate']['systemSHA256']==binding['promptSha256']
assert run['nativeCandidate']['preparedSHA256']==binding['preparedSha256']
terminal_path=live/'wire/M02.end.json'
provider=read(terminal_path) if terminal_path.exists() else None
before=read(live/'wire/M02.balance-before.json')
cn=timezone(timedelta(hours=8))
at=datetime.fromisoformat(attempt['at'].replace('Z','+00:00')).astimezone(cn)
clock=(at.hour,at.minute)
peak=at.weekday()<5 and ((9,0)<=clock<(12,0) or (14,0)<=clock<(18,0))
rates=binding['cnyPerMillion']['peak' if peak else 'offpeak']
fee=None
if provider and provider.get('finalUsage'):
    usage=provider['usage']
    fee=sum(Decimal(usage.get(k,0))*Decimal(str(v)) for k,v in [
        ('input_tokens',rates['input']),('cache_read_input_tokens',rates['cacheRead']),
        ('cache_creation_input_tokens',rates['input']),('output_tokens',rates['output'])])/1_000_000
    host=run.get('executionSummary',{}).get('usage',{})
    for a,b in [('input_tokens','inputTokens'),('output_tokens','outputTokens'),('cache_read_input_tokens','cacheReadTokens')]:
        if a in usage and b in host:assert usage[a]==host[b],(a,b)
follow_paths=sorted(live.glob('balance-followup*.json'),key=lambda p:read(p)['at'])
observations=[{'at':read(p)['at'],'http':read(p).get('http'),
 'observedDebitCny':str(Decimal(before['total'])-Decimal(read(p)['cny']['total_balance'])) if read(p).get('cny') else None} for p in follow_paths]
result=run.get('result')
snapshot=result['snapshot'] if result else {}
artifacts={}
checks=[]
if result:
    assert hashlib.sha256(result['body'].encode()).hexdigest()==result['sha256']
    for name,body in [('M02-R1完整结果.md',result['body']),('M02-R1 TRIZ分析正文.md',snapshot['current_result']['core_result_markdown'])]:
        path=e/name
        with path.open('xb') as f:f.write(body.encode())
        artifacts[name]={'sha256':sha(path),'bytes':path.stat().st_size}
    prepared=run['inputSnapshot']['draft']['textInputs']
    for row in snapshot['contents']:
        if not row['content_id'].startswith('host/') and row['content_origin'] in ['user_file','user_text']:
            material=prepared.get(row['source_input_id'])
            checks.append({'content_id':row['content_id'],'source_input_id':row['source_input_id'],
                'trust_status':row['trust_status'],'exactLocator':isinstance(material,str) and row['source_locator'] in material,
                'exactHash':isinstance(material,str) and row['source_hash']==hashlib.sha256(material.encode()).hexdigest()})
    assert all(x['exactLocator'] and x['exactHash'] for x in checks)
pre=read(e/'execution-preflight.json')
assert all(sha(Path(p))==h for p,h in pre['sourceInputs'].items())
assert all(sha(Path(p))==h for p,h in dispatch['baselineBeforeRunSha256'].items())
report={'at':datetime.now(cn).isoformat(),'requestKey':binding['newRequestKey'],'runId':run['runId'],
 'submittedAtBeijing':at.isoformat(),'candidateReceiptVersion':run['nativeCandidate']['version'],
 'modelPosts':1,'resubmissions':0,'professionalApiRequests':0,
 'host':{'status':run['status'],'failureCode':run.get('failureCode'),'summary':run.get('executionSummary'),
 'documentStatus':snapshot.get('workflow_status'),'deliverableStatus':snapshot.get('deliverable_status'),
 'reviewStatus':run.get('reviewStatus'),'resultSha256':result['sha256'] if result else None},
 'provider':{k:v for k,v in provider.items() if k!='balanceAfter'} if provider else None,
 'meteredFeeCny':str(fee) if fee is not None else None,'pricePeriod':'peak' if peak else 'offpeak','cnyPerMillion':rates,
 'balanceObservations':observations,'observedDebitCny':observations[-1]['observedDebitCny'] if observations else None,
 'itemizedSettlementAvailable':False,'isolatedCredentialRemoved':True,'artifacts':artifacts,
 'coreCharacters':len(snapshot['current_result']['core_result_markdown']) if result else 0,
 'tableRows':{name:len(table['rows']) for name,table in snapshot.get('tables',{}).items()},
 'tableStatus':{name:table['status'] for name,table in snapshot.get('tables',{}).items()},
 'sourceChecks':checks,'warningIds':[row['warning_id'] for row in snapshot.get('warnings',[])],
 'historicalFilesUnchanged':True}
write(e/'verification.json',report)
print(json.dumps({k:report[k] for k in ['runId','host','meteredFeeCny','observedDebitCny','tableRows','sourceChecks']},ensure_ascii=False,indent=2))
