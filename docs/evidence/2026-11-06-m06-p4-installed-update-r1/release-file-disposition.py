"""Per-member draft decisions on the exact retained package, not a repacker."""
from pathlib import Path
import json,hashlib,tarfile,datetime,collections
repo=Path(__file__).resolve().parents[3];e=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_bytes());sha=lambda b:hashlib.sha256(b).hexdigest()
a=read(repo/'docs/evidence/2026-11-06-m06-structured-revision-r1/archive-inspection-r2.json')
old=read(repo/'docs/evidence/2026-11-06-m06-release-scope-r1/release-scope.json')
prior={r['path']:r for r in old['files']};rows=[]
with tarfile.open(a['archive'],'r:gz') as tf:
 for m in tf.getmembers():
  name=str(Path(m.name).relative_to('package'));data=tf.extractfile(m).read();digest=sha(data);assert digest==next(r['sha256'] for r in a['members'] if r['member']==m.name)
  role=prior.get(name,{}).get('role','new_notice_or_license_text')
  if name=='src/m06-business-candidate-0.1.3.json':
   decision='HOLD_MIXED_CONTAINER_FOR_PUBLIC_SCOPE';reason='8生成载荷与2项operator资格共同冻结；资格须随交付保留历史限定，包含本机绝对路径；不能直接删除或将operator角色等同保密/公开许可。'
  elif name.startswith('src/builtin-skills/') or name in ['src/m06-business-candidate-0.1.2.json','src/m06-business-resources.js','src/m06-workarea-host-013.js','src/m06-workarea-material-packet.js']:
   decision='RETAIN_COMPATIBILITY_CANDIDATE';reason='历史资源或非首发装配分支保留，旧pin不改；首发能力声明不扩大。移除须另核实际引用闭包与兼容。'
  elif name=='lib/client.js.map':
   decision='RETAIN_BUILD_PROVENANCE_CANDIDATE';reason='与既有client构建配对，含自有/第三方源码映射；不把source map当独立用户功能，实际公开随来源和通知范围办理。'
  elif name in ['THIRD-PARTY-NOTICES.md','licenses/cn-patent-drafting-MIT.txt','licenses/zod-4.4.3-MIT.txt']:
   decision='INCLUDE_REQUIRED_NOTICES_CANDIDATE';reason='保留已识别第三方原版权与完整MIT全文；不由社区许可重新许可。'
  elif name=='package.json':
   decision='HOLD_FINAL_METADATA';reason='当前0.0.1/private=true/未声明license；正式版本、采用与发布未定，不静默改字段。'
  else:
   decision='INCLUDE_EXISTING_RUNTIME_SOURCE_CANDIDATE';reason='保留当前已核插件运行/表单/配置闭包，M06首发不承诺全部节点/API或其他分支可用；自有贡献归属与正式社区许可采用仍待核。'
  rows.append({'path':name,'bytes':len(data),'sha256':digest,'prior_role':role,'same_as_prior_131':prior.get(name,{}).get('sha256')==digest,
   'proposed_disposition':decision,'reason':reason,'literal_local_path_occurrences':data.count(b'/Users/')+data.count(b'D:\\\\'),
   'publication_approved':False,'rights_status':'THIRD_PARTY_RETAIN_OWN_TERMS' if decision=='INCLUDE_REQUIRED_NOTICES_CANDIDATE' else 'SELF_OWNERSHIP_OR_SOURCE_SCOPE_AND_FORMAL_ADOPTION_PENDING'})
container=json.loads(next(tfdata for tfdata in [Path(a['unpacked_root'],'src/m06-business-candidate-0.1.3.json').read_bytes()]))
embedded=[]
for collection in ['resources','qualifications']:
 for item in container[collection]:
  embedded.append({'path':item['path'],'bytes':item['bytes'],'sha256':item['sha256'],'role':'generation_payload' if collection=='resources' else item['role'],
   'model_context_allowed':collection=='resources','public_permission_inferred_from_role':False,
   'public_scope':'PAYLOAD_CANDIDATE_PENDING_RIGHTS' if collection=='resources' else 'OPERATOR_HISTORY_MUST_TRAVEL; PUBLIC_POINTER_PRESENTATION_AND_RIGHTS_NOT_CLEARED',
   'local_absolute_path_occurrences':item['content'].count('/Users/')})
report={'time':datetime.datetime.now().astimezone().isoformat(),'status':'EXACT_134_MEMBER_PUBLIC_SCOPE_DRAFT_NOT_RELEASE_APPROVAL','archive':a['archive'],'archiveSHA256':a['sha256'],
 'files':rows,'counts':dict(collections.Counter(r['proposed_disposition'] for r in rows)),'embedded_entries':embedded,
 'not_in_package':['App/vendor runtime/node_modules/Profile/credentials/user-materials/runtime-records/workspace-fixtures','workflow DSL','other projects'],
 'licensing_contact':'TinaD.qd@outlook.com','copyright_display_name':'OasisIntWrite','license_formally_adopted':False,
 'six_carriers':'PENDING_EXCLUDED; not reopened','unresolved':['actual licensor/contribution ownership or valid authority','final release version/coverage/adoption','mixed operator qualification public presentation without losing historical limits','professional/user acceptance and current App runtime acceptance'],
 'no_deletion_or_repin_performed':True}
assert len(rows)==134 and len(embedded)==10
(e/'release-file-disposition.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'members':len(rows),'counts':report['counts'],'local_path_members':[r['path'] for r in rows if r['literal_local_path_occurrences']]},ensure_ascii=False))
