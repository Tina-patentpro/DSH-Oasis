"""Assemble the exact authorized M06 release candidate; no install/build/network.

The destination must be new. Historical runtime sources, pins and release records
are inputs only. Client build and archive validation are separate recorded steps.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'packages/oasis-professional-service'
REVIEW = ROOT / 'docs/release/m06-first-release-r1'
DESTINATION = ROOT / '.local/m06-public-release-20261107-r1/package'
sha = lambda b: hashlib.sha256(b).hexdigest()


def read_pinned(path, digest):
    data = path.read_bytes()
    if sha(data) != digest:
        raise ValueError(f'Input identity changed: {path.name}')
    return data


def prepare():
    inventory_bytes = read_pinned(REVIEW / 'release-manifest.json',
        '5e067f4344211995803e7154fbde312b31319311e5b1ca157c6abb6f8cd29ab8')
    license_bytes = read_pinned(REVIEW / 'LICENSE-CANDIDATE.zh-CN.md',
        '5127ea772ba201b71404949456ebf43a193f79d1b0161f8e65172873d6ffc1f4')
    adoption = json.loads((ROOT / 'docs/evidence/2026-11-07-m06-license-adoption-r1/authorization.json').read_text())
    if not adoption['formalAdoptionReceived'] or adoption['publicationAuthorized']:
        raise ValueError('Exact unpublished adoption baseline required')
    inventory = json.loads(inventory_bytes)
    selected = [x for x in inventory['files'] if x['disposition'] == 'SELECT_OWN_SOURCE_FOR_FORMAL_SCOPE']
    if len(selected) != 111:
        raise ValueError('Unexpected selected source scope')
    # Validate every input before creating the destination.
    payload = {x['path']: read_pinned(SOURCE / x['path'], x['sha256']) for x in selected}
    for x in inventory['files']:
        if x['disposition'] == 'INCLUDE_ORIGINAL_MIT_NOTICE':
            payload[x['path']] = read_pinned(SOURCE / x['path'], x['sha256'])
    for name in ['m06-public-resources-r1.js', 'm06-public-manifest-r1.json', 'm06-business-public-r1.json']:
        payload['src/' + name] = (SOURCE / 'src' / name).read_bytes()
    derivatives = []
    replacements = {
        'src/v340-native-model.js': (
            "import { loadM06BusinessInstruction013 } from './m06-business-resources-0.1.3.js'",
            "import { loadM06PublicInstruction as loadM06BusinessInstruction013 } from './m06-public-resources-r1.js'"),
        'src/m06-api-contract-adapter.js': (
            "import { M06_BUSINESS_013_RESOURCE_SHA256 } from './m06-business-resources-0.1.3.js'",
            "import { M06_PUBLIC_RESOURCE_SHA256 as M06_BUSINESS_013_RESOURCE_SHA256 } from './m06-public-resources-r1.js'"),
    }
    for path, (before, after) in replacements.items():
        original = payload[path]
        if original.decode().count(before) != 1:
            raise ValueError(f'Expected release adaptation missing: {path}')
        payload[path] = original.decode().replace(before, after).encode()
        derivatives.append({'path': path, 'originalSHA256': sha(original),
            'derivedSHA256': sha(payload[path]), 'change': 'explicit public-resource import only; historical loader/pins unchanged'})
    manifest = json.loads((SOURCE / 'package.json').read_text())
    manifest.update(version='0.1.0-rc.1', private=True,
        description='Oasis M06 public distribution candidate; native and live acceptance pending.',
        license='SEE LICENSE IN LICENSE')
    # Keep the original ordinary and named entry contracts. Approved controlled
    # M06 entry is the only locally verified release route; legacy assets excluded.
    manifest['files'] = ['src', 'lib', 'cordis.patch.yml', 'LICENSE', 'LICENSE-ADOPTION.md',
        'THIRD-PARTY-NOTICES.md', 'licenses', 'PUBLIC-RELEASE.json']
    manifest['oasisRelease'] = {'version': '0.1.0-rc.1', 'resourceVersion': '0.1.3-public.1',
        'publicationAuthorized': False, 'nativeAcceptance': False, 'realGenerationVerified': False,
        'verifiedEntry': './m06-controlled-host-013', 'legacyResourcesIncluded': False}
    # Avoid declaring verification scripts whose tests/config are not in this
    # consumer archive. The source workspace retains the development scripts.
    manifest.pop('scripts', None)
    payload['package.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    payload['LICENSE'] = license_bytes
    payload['LICENSE-ADOPTION.md'] = (
        '# 正式采用记录\n\n2026-11-07，OasisIntWrite／代表人 Tina D 正式采用所附许可及逐件范围，暂不发布。\n'
        '联系：TinaD.qd@outlook.com。LICENSE原字节SHA256：5127ea772ba201b71404949456ebf43a193f79d1b0161f8e65172873d6ffc1f4。\n'
        '许可页首待采用文字为确认前时点，由本记录接续；正文九节不变。仅自有贡献适用，第三方依原许可。\n'
        '独立法律复核未取得。当前包为0.1.0-rc.1本地候选，未完成本包原生安装/启停/真实生成验收；未授权发布。\n').encode()
    # This notice is the previously reviewed portable notice; append the factual
    # adoption and runtime-container location instead of rewriting old notices.
    notice = (REVIEW / 'public-review/THIRD-PARTY-NOTICES.md').read_text()
    notice = notice.replace('skill/THIRD-PARTY-NOTICE.md', 'src/m06-business-public-r1.json')
    payload['THIRD-PARTY-NOTICES.md'] = (notice +
        '\n## 0.1.0-rc.1本地候选接续\n\n自有许可已于2026-11-07正式采用；见LICENSE-ADOPTION.md。'
        '本包资源采用独立0.1.3-public.1容器；operator资料仅供审阅，不进入模型。'
        '所附两份MIT原文保持。未包含宿主、完整依赖树、旧兼容资源或六外部载体正文。\n').encode()
    facts = {'schemaVersion': 1, 'packageVersion': '0.1.0-rc.1', 'resourceVersion': '0.1.3-public.1',
        'originalInternalArchiveSHA256': '5160c4e910018e71cdd3f46452a2cc80b1cab6aab810bd4ae23dc5b5a7a89785',
        'adoptedScopeSHA256': sha(inventory_bytes), 'adoptedLicenseSHA256': sha(license_bytes),
        'derivedSources': derivatives, 'sourceSelectionCount': 111,
        'resourceManifestSHA256': sha(payload['src/m06-public-manifest-r1.json']),
        'resourceContainerSHA256': sha(payload['src/m06-business-public-r1.json']),
        'publicationAuthorized': False, 'nativeAcceptance': False, 'realGenerationVerified': False,
        'excludedCompatibilityResources': True, 'workflowsSelected': [],
        'limit': 'M06 controlled composition only; excluded legacy resources are unavailable, no fallback or inherited acceptance'}
    payload['PUBLIC-RELEASE.json'] = (json.dumps(facts, ensure_ascii=False, indent=2) + '\n').encode()
    DESTINATION.mkdir(parents=True, exist_ok=False)
    for name, data in payload.items():
        target = DESTINATION / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return {'destination': str(DESTINATION), 'preparedFiles': len(payload), 'derivedSources': derivatives}


if __name__ == '__main__':
    print(json.dumps(prepare(), ensure_ascii=False, indent=2))
