# -*- coding: utf-8 -*-
"""One-off local release review material assembly; never changes runtime inputs."""
from pathlib import Path
import json, hashlib, re, tarfile, shutil, difflib
from collections import Counter

repo = Path(__file__).resolve().parents[3]
evidence = Path(__file__).resolve().parent
out = repo/'docs/release/m06-first-release-r1'
assert not out.exists()
out.mkdir(parents=True)
public = out/'public-review'
public.mkdir()
sha = lambda data: hashlib.sha256(data).hexdigest()
def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as f:
        f.write(data if isinstance(data, bytes) else (data.encode() if isinstance(data, str) else (json.dumps(data, ensure_ascii=False, indent=2)+'\n').encode()))

prior = json.loads((repo/'docs/evidence/2026-11-07-m06-zero-preview-r1/package-member-inspection.json').read_text())
archive = Path(prior['archive'])
assert sha(archive.read_bytes()) == prior['sha256'] == '5160c4e910018e71cdd3f46452a2cc80b1cab6aab810bd4ae23dc5b5a7a89785'
members = {}
with tarfile.open(archive) as tf:
    for m in tf.getmembers():
        assert m.isfile() and m.name.startswith('package/')
        key = m.name.removeprefix('package/')
        assert '..' not in Path(key).parts and key not in members
        members[key] = tf.extractfile(m).read()
assert len(members) == 140

draft_path = repo/'docs/business-baseline/oasisintwrite-community-license-1.0-draft-r1/LICENSE-DRAFT.zh-CN.md'
draft = draft_path.read_text()
body = draft[draft.index('## 1. 定义与适用范围'):draft.index('\n---\n\n## 草案采用说明')]
candidate = '''# OasisIntWrite Community License 1.0

中文名称：OasisIntWrite 社区许可证 1.0

**采用定稿候选 R1，2026-11-07；待权利方对本文件及覆盖清单正式确认。尚未向公众许可或发布，也不替换历史包许可。**

许可人／自有贡献来源声明：OasisIntWrite；代表人：Tina D。该名称按用户声明登记，不推定公司登记或独立法律复核。

本批自有贡献及整理的版权通知：Copyright (c) 2026 OasisIntWrite。第三方原版权年度及通知保留，历史版本不追溯重写。

商业授权联系：TinaD.qd@outlook.com。该地址仅登记为授权联系，不凭邮箱推定通知送达或已订立商业合同。

本候选拟采用日期：2026-11-07；实际采用以具名确认回执为准。覆盖以同版清单逐件指定的自有贡献为限，代码、Skill和工作流适用同一条款；第三方、历史安装、其他项目和未选文件不自动改许。

'''+body+'\n'
save(out/'LICENSE-CANDIDATE.zh-CN.md', candidate)
save(public/'LICENSE-CANDIDATE.zh-CN.md', candidate)
save(evidence/'license-vs-draft.diff', ''.join(difflib.unified_diff(draft.splitlines(True), candidate.splitlines(True), fromfile='original-draft', tofile='adoption-candidate')))

paths = {}
changes = []
def portable(match):
    original = match.group(0)
    token = 'oiw-source:'+sha(original.encode())[:20]
    if token in paths: assert paths[token] == original
    paths[token] = original
    return token
patterns = [r'(?<=`)/Users/[^`\r\n]+(?=`)', r'(?<=\]\()/Users/[^)\r\n]+(?=\))', r'(?<=")/Users/[^"\r\n]+(?=")']
container = json.loads(members['src/m06-business-candidate-0.1.3.json'])
projection = []
for group in ['resources', 'qualifications']:
    for row in container[group]:
        raw = row['content'].encode()
        assert len(raw) == row['bytes'] and sha(raw) == row['sha256']
        text = row['content']
        for pattern in patterns: text = re.sub(pattern, portable, text)
        assert not re.search(r'/Users/|/Volumes/|[A-Za-z]:\\', text), row['path']
        for marker in ['HISTORY_LIMITED','PENDING_EXCLUDED']:
            assert row['content'].count(marker) == text.count(marker), (row['path'], marker)
        if row['path'].endswith('.json'): json.loads(text)
        target = 'skill/'+row['path']
        save(public/target, text)
        projection.append({'path':target, 'originalEmbeddedPath':row['path'], 'originalSHA256':row['sha256'], 'projectedSHA256':sha(text.encode()), 'bytes':len(text.encode()), 'role':'generation-payload-review' if group=='resources' else 'operator-only-not-generation', 'changed':raw!=text.encode(), 'changeType':'only portable source locators' if raw!=text.encode() else 'byte-identical', 'runtime_adopted':False, 'professional_or_user_acceptance_inferred':False, 'license':'OIW own contributions; identified cn-patent-drafting fragments retain MIT'})
        if raw!=text.encode(): changes.append({'path':row['path'], 'diff':''.join(difflib.unified_diff(row['content'].splitlines(True),text.splitlines(True)))})
save(evidence/'projection-path-map.private.json', paths)
save(evidence/'projection-diff.private.json', changes)
save(public/'PROJECTION-MAP.json', {'projectionVersion':'m06-0.1.3-public-review.1', 'sourceContainerSHA256':sha(members['src/m06-business-candidate-0.1.3.json']), 'resources':projection, 'portableSourceIds':sorted(paths), 'runtimeAdopted':False, 'scope':'review documents only; not the pinned runtime container, not a WorkBuddy import package'})

for key in ['licenses/zod-4.4.3-MIT.txt','licenses/cn-patent-drafting-MIT.txt']:
    save(public/key, members[key])
notice = members['THIRD-PARTY-NOTICES.md'].decode()
old = 'The proposed OasisIntWrite Community License 1.0 is maintained separately as a draft. This notice does not adopt it, relicense the MIT material, or change the package\'s existing private/version configuration. Final release composition and remaining third-party rights must be reviewed against the actual distribution.'
assert old in notice
notice = notice.replace(old, 'The OasisIntWrite Community License 1.0 adoption candidate is included in this local review set. Formal adoption of the exact text and scope remains a rights-holder decision. These notices and the MIT material retain their original terms. The verified runtime archive remains private and unchanged; this review set is not that runtime archive or an installation package.')
notice = notice.replace('The full original fragment hashes, adoption positions and conditions remain in the `THIRD-PARTY-NOTICE.md` resource embedded in [src/m06-business-candidate-0.1.3.json](src/m06-business-candidate-0.1.3.json). Its complete MIT text and scope statements remain intact. This package-level notice supplements that resource notice rather than replacing it or broadening its coverage.', 'The original fragment hashes, adoption positions and conditions remain bound to the unchanged private runtime container. The [resource notice review projection](skill/THIRD-PARTY-NOTICE.md) retains those facts and the complete MIT text; only local source locators have portable review identifiers. This notice supplements the original resource notice without replacing its scope or broadening its coverage.')
save(public/'THIRD-PARTY-NOTICES.md', notice)

demo = repo/'docs/evidence/2026-11-06-m06-release-scope-r1/demo-inputs-draft'
demo_rows = []
for name in ['public-disclosure.md','public-drawing-description.md','public-requirements.md','text-inputs.json']:
    data = (demo/name).read_bytes()
    save(public/'examples'/name,data)
    demo_rows.append({'path':'examples/'+name,'sha256':sha(data),'original':str((demo/name).relative_to(repo))})
save(public/'examples/README.md', '''# 公开自编示例输入审阅件

这四件输入复用已用于开发与审阅的公开自编R2材料，没有新调用、模型输出、评分答案、客户材料、账户或运行回执。它们不是独立盲测，也不是可直接提交的申请文件。

前序累计文稿未提供；锁止结构、尺寸、驱动及实验等缺项不补造，附图说明仅为文字。本包没有选入原18250e4c固定输出，不能据输入存在宣传生成质量、专利支持充分或完整申请已交付。原固定稿的四项受限接受及15条警示保持在内部证据中。

本目录仅随本地公开审阅件准备，不授权模型/API调用或发布。
''')

old_inventory = json.loads((repo/'docs/evidence/2026-11-06-m06-p4-installed-update-r1/release-file-disposition.json').read_text())
old_by = {x['path']:x for x in old_inventory['files']}
inventory = []
for key,data in members.items():
    if key in ['src/m06-business-candidate-0.1.2.json','src/m06-business-candidate-0.1.3.json']:
        disposition,scope = 'EXCLUDE_RAW_MIXED_CONTAINER','internal pinned original; current 0.1.3 has separate review projection; do not publish original local paths or silently repin'
    elif key.startswith(('src/builtin-skills/','src/public-claims-v2/')):
        disposition,scope = 'RETAIN_PRIVATE_COMPATIBILITY','preserve original static dependency; not selected as a first release capability or public resource'
    elif key.startswith('lib/'):
        disposition,scope = 'RETAIN_PRIVATE_VERIFIED_BUILD','exact internal runtime evidence only; no public binary/map in this review set'
    elif key=='package.json':
        disposition,scope = 'RETAIN_PRIVATE_RUNTIME_METADATA','0.0.1/private unchanged; no formal product version applied'
    elif key=='docs/api/oasis-professional-service-baseline.json':
        disposition,scope = 'RETAIN_PRIVATE_API_BASELINE','paid API binding not part of local M06 public input/resource review'
    elif key.startswith('licenses/'):
        disposition,scope = 'INCLUDE_ORIGINAL_MIT_NOTICE','original MIT bytes and copyright; never relabeled as OIW'
    elif key=='THIRD-PARTY-NOTICES.md':
        disposition,scope = 'INCLUDE_DERIVED_NOTICE','public review copy updates only draft-status paragraph; original runtime copy unchanged'
    else:
        assert key.endswith('.js') or key in ['src/v340-contracts.json','cordis.patch.yml'],key
        assert not re.search(rb'/Users/|/Volumes/|[A-Za-z]:\\\\',data),key
        disposition,scope = 'SELECT_OWN_SOURCE_FOR_FORMAL_SCOPE','unmodified source eligible under exact OIW adoption decision; not copied into document-only review set or a ready public runtime archive'
    prior_row = old_by.get(key)
    inventory.append({'path':key,'bytes':len(data),'sha256':sha(data),'disposition':disposition,'scope':scope,'license':'MIT original' if key.startswith('licenses/') else 'separate own contribution / third-party scope; see adoption candidate', 'same_as_original_134':prior_row is not None and prior_row['sha256']==sha(data),'original134_disposition':prior_row.get('proposed_disposition') if prior_row else None,'publication_authorized':False})

counts = dict(Counter(row['disposition'] for row in inventory))
manifest = {'releaseSetId':'M06-FIRST-RELEASE-R1','status':'EXACT_SCOPE_AND_LICENSE_ADOPTION_CANDIDATE_NOT_PUBLISHED','licenseName':'OasisIntWrite Community License 1.0','licenseCandidateSHA256':sha(candidate.encode()),'licensorDeclaration':'OasisIntWrite','representative':'Tina D','commercialContact':'TinaD.qd@outlook.com','copyrightYearForThisOwnContributionSnapshot':2026,'proposedAdoptionDate':'2026-11-07','formalAdoptionReceived':False,'legalProfessionalReviewReceived':False,'publicationAuthorized':False,'actualRuntime':{'package':'oasis-professional-service','version':'0.0.1','private':True,'archiveSHA256':prior['sha256'],'installedBundleSHA256':'7aca55e9d5ccf7be21d20a3a33a7a02cbac256b7e725e69bca913ae03d624af5','memberCount':len(inventory),'publiclyDistributableAsIs':False},'projectionVersion':'m06-0.1.3-public-review.1','projectionIsRunnableOrRuntimeAdopted':False,'fileDispositionCounts':counts,'files':inventory,'projectedEmbeddedResources':projection,'publicExampleInputs':demo_rows,'workflowFilesSelected':[],'uniformWorkflowLicenseRule':'same OIW terms for explicitly designated own workflows; no workflow silently selected from another project','sixExternalCarriers':'PENDING_EXCLUDED; no source-carrier bodies read or copied','excludedCategories':['Host/App/runtime binaries','node_modules and dependency trees','Profiles/auth/credentials','customer inputs','evaluation-only answers and scoring','run logs, UNKNOWN fixture and full internal evidence','original fixed output manuscript','other projects and historical versions'],'requiredNextDecisions':['rights-holder exact text and file-scope adoption','runtime public-resource integration/version/build/install acceptance if making a runnable distribution','publication remains separately unauthorized']}
save(out/'release-manifest.json',manifest)
save(evidence/'assembly-summary.json',{'output':str(out),'archiveSHA256':prior['sha256'],'licenseCandidateSHA256':manifest['licenseCandidateSHA256'],'inventoryCount':len(inventory),'dispositions':counts,'projectedResources':len(projection),'pathTokens':len(paths),'changedProjectedResources':len(changes),'publicExampleInputs':len(demo_rows),'originalRuntimeMutated':False})
print(json.dumps({'inventory':len(inventory),'counts':counts,'projection':len(projection),'tokens':len(paths),'licenseSHA256':manifest['licenseCandidateSHA256']},ensure_ascii=False))
