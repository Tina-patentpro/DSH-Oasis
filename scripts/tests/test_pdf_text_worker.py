"""Existing public fixtures and fixed parser limits; no host/source activation."""
import importlib.util
import pathlib
import unittest
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / '.local/stage5-d0-material-extraction-20261023/fixtures'
SPEC = importlib.util.spec_from_file_location('pdf_worker', ROOT / 'scripts/pdf-text-worker.py')
worker = importlib.util.module_from_spec(SPEC) if SPEC else None
if SPEC and SPEC.loader and pathlib.Path(SPEC.origin).exists():
    SPEC.loader.exec_module(worker)

class PdfTextWorkerTests(unittest.TestCase):
    def test_existing_public_pdf_has_exact_text_hash_and_utf16_locations(self):
        self.assertTrue(hasattr(worker, 'extract_pdf'), 'bounded production parser must exist')
        result = worker.extract_pdf((FIX / 'text-two-pages.pdf').read_bytes())
        self.assertEqual(result['body'], 'D0 public synthetic valve - page 1\n公开合成阀体：壳体与弹簧。')
        self.assertEqual(result['textSHA256'], 'f8d850701bf5e3201bab7c688dea0807f7d341981b29b32dfbe03ffe9e671ecf')
        self.assertEqual([(x['startUTF16'], x['endUTF16']) for x in result['locations']], [(0,34),(35,48)])

    def test_existing_blank_encrypted_and_damaged_originals_never_return_partial_body(self):
        self.assertTrue(hasattr(worker, 'PdfRejected'))
        for name in ['no-text.pdf','encrypted.pdf','damaged.pdf']:
            with self.subTest(name=name), self.assertRaises(worker.PdfRejected):
                worker.extract_pdf((FIX / name).read_bytes())

    def test_flate_limit_is_enforced_during_decode_and_cumulative_budget_is_shared(self):
        self.assertTrue(hasattr(worker, 'DecodeBudget'))
        budget = worker.DecodeBudget()
        self.assertEqual(len(budget.decode(zlib.compress(b'x' * 8388608), ['/FlateDecode'])), 8388608)
        self.assertEqual(len(budget.decode(zlib.compress(b'y' * 8388608), ['/FlateDecode'])), 8388608)
        with self.assertRaises(worker.PdfRejected): budget.decode(zlib.compress(b'z'), ['/FlateDecode'])
        with self.assertRaises(worker.PdfRejected): worker.DecodeBudget().decode(zlib.compress(b'x' * 8388609), ['/FlateDecode'])

    def test_unsupported_filters_and_oversized_raw_source_fail_before_reader(self):
        self.assertTrue(hasattr(worker, 'DecodeBudget'))
        with self.assertRaises(worker.PdfRejected): worker.DecodeBudget().decode(b'x', ['/LZWDecode'])
        with self.assertRaises(worker.PdfRejected): worker.extract_pdf(b'%PDF-' + b'x' * 1048576)

    def test_page_tree_declared_count_mismatch_is_not_accepted_as_complete(self):
        self.assertTrue(hasattr(worker, 'extract_pdf'))
        data=(FIX/'text-two-pages.pdf').read_bytes()
        self.assertIn(b'/Count 2',data)
        with self.assertRaises(worker.PdfRejected): worker.extract_pdf(data.replace(b'/Count 2',b'/Count 3'))

    def test_non_linux_worker_cannot_silently_bypass_kernel_isolation(self):
        self.assertTrue(hasattr(worker, 'restrict_process'))
        import sys
        if sys.platform != 'linux':
            with self.assertRaises(worker.PdfRejected): worker.restrict_process()

if __name__ == '__main__': unittest.main()
