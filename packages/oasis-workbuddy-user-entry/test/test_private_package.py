"""Offline archive boundary tests, not native Skill/model behavior tests."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile


HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
SOURCE = ROOT / 'packages/oasis-professional-service/src/m06-business-candidate-0.1.3.json'
BUILDER = HERE / 'build_private_package.py'


class PrivatePackageTest(unittest.TestCase):
    def build(self, output, source=SOURCE):
        return subprocess.run([sys.executable, '-B', str(BUILDER), '--source', str(source),
                               '--output', str(output)], capture_output=True)

    def test_archive_preserves_eight_payloads_and_excludes_operator(self):
        # Catches copying the whole mixed container, omitting a reference, or rewriting source bytes.
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'candidate.zip'
            result = self.build(output)
            self.assertEqual(result.returncode, 0, result.stderr.decode())
            prefix = 'oasis-m06-claims-draft/'
            names = {
                prefix + 'SKILL.md', prefix + 'SOURCE-MANIFEST.json',
                prefix + 'references/m06-source/SKILL.md',
                prefix + 'references/m06-source/THIRD-PARTY-NOTICE.md',
                prefix + 'references/m06-source/references/01-official-basis.md',
                prefix + 'references/m06-source/references/02-n01-feature-and-independent-claim.md',
                prefix + 'references/m06-source/references/03-n02-claim-graph-and-fallback.md',
                prefix + 'references/m06-source/references/04-n03-support-terms-parameters.md',
                prefix + 'references/m06-source/references/05-source-and-output-contract.md',
                prefix + 'references/m06-source/references/output-schema.json',
            }
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(set(archive.namelist()), names)
                self.assertEqual(len(archive.infolist()), 10)
                for resource in json.loads(SOURCE.read_bytes())['resources']:
                    payload = archive.read(prefix + 'references/m06-source/' + resource['path'])
                    self.assertEqual(hashlib.sha256(payload).hexdigest(), resource['sha256'])
                manifest = json.loads(archive.read(prefix + 'SOURCE-MANIFEST.json'))
                self.assertFalse(manifest['runtime_accepted'])
                self.assertFalse(manifest['public_distribution_approved'])
                self.assertEqual(manifest['source_container_sha256'],
                                 '26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca')

    def test_changed_source_is_refused_before_creating_archive(self):
        # Catches missing fixed-source admission before any output mutation.
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            source = directory / 'changed.json'
            source.write_bytes(SOURCE.read_bytes() + b'\n')
            output = directory / 'candidate.zip'
            result = self.build(output, source)
            self.assertEqual(result.returncode, 1, result.stderr.decode())
            self.assertFalse(output.exists())

    def test_existing_output_remains_unchanged(self):
        # Catches overwrite mode or cleanup that destroys an existing user's artifact.
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'candidate.zip'
            output.write_bytes(b'previous-owner-bytes')
            result = self.build(output)
            self.assertEqual(result.returncode, 1, result.stderr.decode())
            self.assertEqual(output.read_bytes(), b'previous-owner-bytes')

    def test_identical_inputs_produce_identical_archive_bytes(self):
        # Catches nondeterministic manifests, member ordering or injected per-run metadata.
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            first, second = directory / 'first.zip', directory / 'second.zip'
            for output in [first, second]:
                result = self.build(output)
                self.assertEqual(result.returncode, 0, result.stderr.decode())
            self.assertEqual(first.read_bytes(), second.read_bytes())


if __name__ == '__main__':
    unittest.main()
