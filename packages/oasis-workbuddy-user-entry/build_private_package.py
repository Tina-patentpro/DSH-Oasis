"""Build one private offline candidate. Never install, import or invoke a host/model."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile


HERE = Path(__file__).resolve().parent
SOURCE_SHA256 = '26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca'
RESOURCE_PATHS = frozenset([
    'SKILL.md', 'THIRD-PARTY-NOTICE.md',
    'references/01-official-basis.md',
    'references/02-n01-feature-and-independent-claim.md',
    'references/03-n02-claim-graph-and-fallback.md',
    'references/04-n03-support-terms-parameters.md',
    'references/05-source-and-output-contract.md',
    'references/output-schema.json',
])
PREFIX = 'oasis-m06-claims-draft/'


def package_members(source_bytes, entry_bytes):
    if hashlib.sha256(source_bytes).hexdigest() != SOURCE_SHA256:
        raise ValueError('fixed source container identity mismatch')
    source = json.loads(source_bytes)
    resources = source['resources']
    if len(resources) != 8 or {r['path'] for r in resources} != RESOURCE_PATHS:
        raise ValueError('fixed generation payload set mismatch')
    members = {PREFIX + 'SKILL.md': entry_bytes}
    manifest_resources = []
    for resource in resources:
        payload = resource['content'].encode('utf-8')
        if (len(payload) != resource['bytes'] or
                hashlib.sha256(payload).hexdigest() != resource['sha256']):
            raise ValueError('source payload identity mismatch')
        target = 'references/m06-source/' + resource['path']
        members[PREFIX + target] = payload
        manifest_resources.append({'source_path': resource['path'], 'target_path': target,
                                   'sha256': resource['sha256'], 'bytes': resource['bytes']})
    entry = entry_bytes.decode('utf-8', errors='strict')
    if not entry.startswith('---\n') or '\n---\n' not in entry[4:]:
        raise ValueError('missing native frontmatter')
    header = entry[4:].split('\n---\n', 1)[0]
    required = ['name', 'display_name', 'display_name_en', 'description',
                'description_zh', 'description_en', 'version', 'author']
    for key in required:
        matches = re.findall(r'^' + re.escape(key) + r':\s*(\S.*)$', header, re.MULTILINE)
        if len(matches) != 1:
            raise ValueError('missing or duplicate native metadata: ' + key)
    if not re.search(r'^name: oasis-m06-claims-draft$', header, re.MULTILINE):
        raise ValueError('unexpected native skill identity')
    for target in re.findall(r'@([^\s]+)', entry):
        if PREFIX + target not in members:
            raise ValueError('unresolved explicit reference')
    manifest = {
        'kind': 'PRIVATE_STATIC_ADAPTER_CANDIDATE_NOT_HOST_ACCEPTED',
        'adapter_version': '0.1.0-prep.1',
        'source_container_sha256': SOURCE_SHA256,
        'source_skill_id': source['skillId'], 'source_skill_version': source['skillVersion'],
        'source_candidate_only': True,
        'entry_sha256': hashlib.sha256(entry_bytes).hexdigest(),
        'generation_payloads': manifest_resources,
        'runtime_accepted': False, 'professional_accepted': False,
        'user_accepted': False, 'public_distribution_approved': False,
        'license_adopted': False,
        'excluded': ['operator qualifications', 'evaluation-only material',
                     'runtime/profile/customer material', 'executables and connectors'],
    }
    members[PREFIX + 'SOURCE-MANIFEST.json'] = (
        json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode('utf-8')
    return members


def build(source, output):
    # Validate every input before creating output. Exclusive creation preserves existing artifacts.
    members = package_members(source.read_bytes(), (HERE / 'candidate/SKILL.md').read_bytes())
    with output.open('xb') as handle:
        with zipfile.ZipFile(handle, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for name, payload in sorted(members.items()):
                info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, payload)
    return {'output': str(output), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
            'members': len(members), 'private_candidate': True, 'imported': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=HERE.parent / 'oasis-professional-service/src/m06-business-candidate-0.1.3.json')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = build(args.source, args.output)
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
        # A partial archive on an I/O error is retained, never automatically retried/removed.
        print('PRIVATE_PACKAGE_REFUSED_OR_INCOMPLETE: ' + str(error), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
