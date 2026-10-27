"""LC-R2: exercise physical tar admission through the actual notice reader."""
from pathlib import Path
import dataclasses
import gzip
import hashlib
import importlib.util
import io
import json
import sys
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).parent / 'fixtures/v340-material-notices'
NAMES = ('LICENSE', 'LICENSE.APACHE', 'LICENSE.BSD')
PREFIXES = ('python/lib/python3.14/site-packages/pip/_vendor/packaging/',
            'python/lib/python3.14/site-packages/pip-26.2.1.dist-info/licenses/src/pip/_vendor/packaging/')


def pax_record(size):
    prefix = str(size) + ' comment='
    return (prefix + 'x' * (size - len(prefix) - 1) + '\n').encode()


def extension_body(kind, size):
    return pax_record(size) if kind in (b'x', b'g') else b'x' * (size - 1) + b'\0'


def add_file(archive, name, body=b'', kind=tarfile.REGTYPE):
    entry = tarfile.TarInfo(name)
    entry.type = kind
    entry.size = len(body)
    archive.addfile(entry, io.BytesIO(body))


def add_notices(archive):
    for prefix in PREFIXES:
        for name in NAMES:
            add_file(archive, prefix + name, (FIXTURES / name).read_bytes())


def extension_archive(kind, size=10174, pairs=1):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode='w', format=tarfile.USTAR_FORMAT) as archive:
        for index in range(pairs):
            add_file(archive, 'extension-' + str(index), extension_body(kind, size), kind)
            add_file(archive, 'ignored-' + str(index))
        add_notices(archive)
    return out.getvalue()


class _ReaderCases:
    def reader(self):
        spec = importlib.util.spec_from_file_location('tar_admission_reader', ROOT / 'scripts/v340-material-notices.py')
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module

    def read_raw(self, module, raw, **limits):
        data = gzip.compress(raw, mtime=0)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'original.tar.gz'
            path.write_bytes(data)
            result = module.read_packaging_notices(
                path, kind='runtime', expected_sha256=hashlib.sha256(data).hexdigest(),
                limits=dataclasses.replace(module.DEFAULT_LIMITS, **limits))
            self.assertEqual(list(Path(directory).iterdir()), [path])
            return result

    def assert_notices(self, records):
        self.assertEqual(set(records), {p + n for p in PREFIXES for n in NAMES})
        for path, record in records.items():
            self.assertEqual(record['body'], (FIXTURES / Path(path).name).read_bytes())


class _ExtensionCases(_ReaderCases):
    # Each case fails if physical metadata is admitted only after stdlib parsing.
    def test_entry_bytes_equal_and_over(self):
        module = self.reader()
        self.assert_notices(self.read_raw(module, extension_archive(self.kind, 10174), tar_entry_bytes=10174))
        with self.assertRaises(module.NoticeError):
            self.read_raw(module, extension_archive(self.kind, 10175), tar_entry_bytes=10174)

    def test_physical_count_equal_and_over(self):
        module = self.reader()
        raw = extension_archive(self.kind)
        self.assert_notices(self.read_raw(module, raw, tar_entries=8))
        with self.assertRaises(module.NoticeError):
            self.read_raw(module, raw, tar_entries=7)

    def test_entry_size_rejected_before_extension_body(self):
        module = self.reader()
        entry = tarfile.TarInfo('oversized-extension')
        entry.type = self.kind
        entry.size = 10175
        # Body is deliberately absent. A late guard would report truncation.
        with self.assertRaisesRegex(module.NoticeError, 'physical entry byte limit'):
            self.read_raw(module, entry.tobuf(format=tarfile.USTAR_FORMAT), tar_entry_bytes=10174)

    def test_count_rejected_before_extension_body(self):
        module = self.reader()
        out = io.BytesIO()
        with tarfile.open(fileobj=out, mode='w', format=tarfile.USTAR_FORMAT) as archive:
            add_notices(archive)
            add_file(archive, 'ignored')
        # Replace the end marker with a claimed metadata entry without its body.
        raw = out.getvalue()
        offset = 0
        while raw[offset:offset + 512].strip(b'\0'):
            size = int(raw[offset + 124:offset + 136].strip(b'\0 ') or b'0', 8)
            offset += 512 + ((size + 511) // 512) * 512
        entry = tarfile.TarInfo('excess-extension')
        entry.type = self.kind
        entry.size = 10174
        with self.assertRaisesRegex(module.NoticeError, 'physical entry count limit'):
            self.read_raw(module, raw[:offset] + entry.tobuf(format=tarfile.USTAR_FORMAT), tar_entries=7)

    def test_total_expansion_equal_and_over(self):
        module = self.reader()
        raw = extension_archive(self.kind)
        self.assert_notices(self.read_raw(module, raw, tar_expanded_bytes=len(raw)))
        with self.assertRaises(module.NoticeError):
            self.read_raw(module, raw, tar_expanded_bytes=len(raw) - 1)


class PaxLocalTests(_ExtensionCases, unittest.TestCase):
    kind = b'x'


class PaxGlobalTests(_ExtensionCases, unittest.TestCase):
    kind = b'g'


class GnuLongNameTests(_ExtensionCases, unittest.TestCase):
    kind = b'L'


class GnuLongLinkTests(_ExtensionCases, unittest.TestCase):
    kind = b'K'


class TarAdmissionTests(_ReaderCases, unittest.TestCase):
    def test_default_20000_physical_entries_equal(self):
        module = self.reader()
        # 9997 extension/file pairs plus 6 notices = exactly 20000 headers.
        self.assert_notices(self.read_raw(module, extension_archive(b'x', 13, 9997)))

    def test_default_20000_physical_entries_over(self):
        module = self.reader()
        # The audit reproduction: 20006 physical / 10006 logical members.
        with self.assertRaises(module.NoticeError):
            self.read_raw(module, extension_archive(b'x', 13, 10000))

    def test_cumulative_metadata_declared_bytes_before_body(self):
        module = self.reader()
        for kind in (b'x', b'g', b'L', b'K'):
            with self.subTest(kind=kind):
                out = io.BytesIO()
                with tarfile.open(fileobj=out, mode='w', format=tarfile.USTAR_FORMAT) as archive:
                    add_file(archive, 'first', extension_body(kind, 16000), kind)
                    add_file(archive, 'ignored')
                raw = out.getvalue()[:17408]  # first metadata/header + padded body + empty file
                entry = tarfile.TarInfo('second')
                entry.type = kind
                entry.size = 16000
                with self.assertRaisesRegex(module.NoticeError, 'physical declared byte limit'):
                    self.read_raw(module, raw + entry.tobuf(format=tarfile.USTAR_FORMAT), tar_expanded_bytes=30720)

    def test_pax_path_still_binds_exact_notice(self):
        module = self.reader()
        out = io.BytesIO()
        with tarfile.open(fileobj=out, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for prefix in PREFIXES:
                for name in NAMES:
                    body = (FIXTURES / name).read_bytes()
                    entry = tarfile.TarInfo('placeholder-' + name)
                    entry.size = len(body)
                    entry.pax_headers = {'path': prefix + name}
                    archive.addfile(entry, io.BytesIO(body))
        self.assert_notices(self.read_raw(module, out.getvalue(), tar_entries=12))

    def test_gnu_longname_still_binds_exact_notice(self):
        module = self.reader()
        out = io.BytesIO()
        with tarfile.open(fileobj=out, mode='w', format=tarfile.GNU_FORMAT) as archive:
            add_notices(archive)
        self.assert_notices(self.read_raw(module, out.getvalue()))

    def test_admission_counters_do_not_leak_between_reads(self):
        module = self.reader()
        raw = extension_archive(b'x')
        for _ in range(2):
            self.assert_notices(self.read_raw(module, raw, tar_entries=8))

    def test_all_27_member_notice_bindings_remain_complete(self):
        candidate = json.loads((ROOT / 'docs/business-baseline/v340-extraction-distribution-candidate.json').read_text())
        vendor = next(v for v in candidate['vendorPackages'] if v['name'] == 'packaging')
        rows = [r for r in candidate['members'] if r.get('vendorComponent') == 'packaging']
        self.assertEqual(len(rows), 27)
        for row in rows:
            self.assertEqual(row['noticeRefs'], vendor['noticeRefs'])
            self.assertEqual(row['noticeCopyGroupRef'], 'vendorPackages.packaging.noticeCopyGroups')

    def test_12_original_positions_remain_distinct_and_hash_bound(self):
        candidate = json.loads((ROOT / 'docs/business-baseline/v340-extraction-distribution-candidate.json').read_text())
        vendor = next(v for v in candidate['vendorPackages'] if v['name'] == 'packaging')
        artifacts = {a['filename']: a['actualSHA256'] for a in candidate['sourceArtifacts']}
        positions = []
        for group in vendor['noticeCopyGroups']:
            self.assertEqual(len(group['copies']), 4)
            for copy in group['copies']:
                self.assertEqual(copy['artifactSHA256'], artifacts[copy['artifactFilename']])
                self.assertEqual(copy['bytes'], group['bytes'])
                self.assertEqual(copy['sha256'], group['sha256'])
                positions.append((copy['artifactFilename'], copy['memberPath']))
        self.assertEqual(len(positions), 12)
        self.assertEqual(len(set(positions)), 12)


if __name__ == '__main__':
    unittest.main(verbosity=2)
