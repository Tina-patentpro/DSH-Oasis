import importlib.util
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('pdf_distribution', ROOT/'scripts/verify-pdf-distribution.py')
module = importlib.util.module_from_spec(SPEC) if SPEC else None
if SPEC and SPEC.loader and pathlib.Path(SPEC.origin).exists(): SPEC.loader.exec_module(module)

class PdfDistributionTests(unittest.TestCase):
    def test_selected_original_has_complete_record_and_unmodified_license(self):
        self.assertTrue(hasattr(module,'verify_wheel'))
        result=module.verify_wheel(ROOT/'.local/stage5-d1-acquisition-20261025/originals/pypdf-6.10.0-py3-none-any.whl')
        self.assertEqual(result['verifiedMembers'],60)
        self.assertEqual(result['license']['sha256'],'a97ac230e5f33ef10a5367a850eb01f91f1a0b064e34742c7794d2294557f524')
        self.assertIn('Redistribution',result['license']['text'])
        self.assertFalse(result['fullRuntimeDistributionVerified'])

    def test_modified_archive_never_creates_an_accepted_manifest(self):
        self.assertTrue(hasattr(module,'verify_wheel'))
        with tempfile.TemporaryDirectory() as temp:
            path=pathlib.Path(temp)/'changed.whl';path.write_bytes(b'not the fixed original')
            with self.assertRaises(ValueError): module.verify_wheel(path)

if __name__=='__main__': unittest.main()
