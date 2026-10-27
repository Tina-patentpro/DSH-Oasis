"""Offline material regressions; no .local, installed parser or network dependency."""
from pathlib import Path
import dataclasses,gzip,hashlib,importlib.util,io,json,struct,sys,tarfile,tempfile,unittest,warnings,zipfile

ROOT=Path(__file__).resolve().parents[2]
FIXTURES=Path(__file__).parent/'fixtures/v340-material-notices'
NAMES=('LICENSE','LICENSE.APACHE','LICENSE.BSD')
PREFIXES=('pip/_vendor/packaging/','pip-26.2.1.dist-info/licenses/src/pip/_vendor/packaging/')
GOLD={'LICENSE':'cad1ef5bd340d73e074ba614d26f7deaca5c7940c3d8c34852e65c4909686c48','LICENSE.APACHE':'0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594','LICENSE.BSD':'b70e7e9b742f1cc6f948b34c16aa39ffece94196364bc88ff0d2180f0028fac5'}
def sha(b):return hashlib.sha256(b).hexdigest()
def fixture_entries(kind='runtime'):
 base='python/lib/python3.14/site-packages/' if kind=='runtime' else ''
 return [(base+p+n,(FIXTURES/n).read_bytes()) for p in PREFIXES for n in NAMES]
def archive(entries,kind='runtime'):
 out=io.BytesIO()
 if kind=='runtime':
  # Keep the physical-count fixture explicit; PAX defaults add hidden headers.
  with tarfile.open(fileobj=out,mode='w',format=tarfile.USTAR_FORMAT) as t:
   for name,body in entries:
    ti=tarfile.TarInfo(name);ti.size=len(body);t.addfile(ti,io.BytesIO(body))
  return gzip.compress(out.getvalue(),mtime=0)
 with warnings.catch_warnings():
  warnings.simplefilter('ignore',UserWarning)
  with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as z:
   for name,body in entries:z.writestr(name,body)
 return out.getvalue()

class MaterialNoticeTests(unittest.TestCase):
 def reader(self):
  path=ROOT/'scripts/v340-material-notices.py'
  self.assertTrue(path.is_file(),'bounded packaging notice reader has not been implemented')
  name='v340_material_notices_test';spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);sys.modules[name]=m;spec.loader.exec_module(m);return m
 def read(self,m,data,kind='runtime',**kw):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/('original.tar.gz' if kind=='runtime' else 'original.whl');p.write_bytes(data)
   result=m.read_packaging_notices(p,kind=kind,expected_sha256=sha(data),**kw)
   self.assertEqual(list(Path(d).iterdir()),[p], 'reader must not materialize files')
   return result
 def test_fixture_identity(self):
  for n in NAMES:self.assertEqual(sha((FIXTURES/n).read_bytes()),GOLD[n])
 def test_current_vendor_mapping_contains_both_companions_and_copies(self):
  c=json.loads((ROOT/'docs/business-baseline/v340-extraction-distribution-candidate.json').read_text());v=next(x for x in c['vendorPackages'] if x['name']=='packaging')
  rt=next(a['filename'] for a in c['sourceArtifacts'] if 'install_only_stripped' in a['filename'])
  expected={rt+'::'+p for p,_ in fixture_entries()}
  self.assertTrue(expected.issubset(v['noticeRefs']),'LC-R1: wrapper and companion texts in both runtime locations must be mapped')
 def test_current_copy_groups_bind_all_four_original_locations(self):
  c=json.loads((ROOT/'docs/business-baseline/v340-extraction-distribution-candidate.json').read_text());v=next(x for x in c['vendorPackages'] if x['name']=='packaging')
  groups=v.get('noticeCopyGroups',[]);self.assertEqual({g['name'] for g in groups},set(NAMES),'LC-R1: persisted copy groups missing')
  for g in groups:self.assertEqual(g['sha256'],GOLD[g['name']]);self.assertEqual(len(g['copies']),4)
  self.assertEqual(c['formatGates'],{'PDF':'BLOCKED','DOCX':'BLOCKED','READY_FOR_OFFLINE_PROOF':False,'U1Executed':False,'D1Integrated':False})
 def test_runtime_reader_reads_six_exact_notice_bodies(self):
  m=self.reader();r=self.read(m,archive(fixture_entries()));self.assertEqual(set(r),{p for p,_ in fixture_entries()})
  for p,x in r.items():self.assertEqual(x['sha256'],GOLD[Path(p).name]);self.assertEqual(x['body'],(FIXTURES/Path(p).name).read_bytes());self.assertEqual(x['bytes'],len(x['body']))
 def test_wheel_reader_reads_six_exact_notice_bodies(self):
  m=self.reader();r=self.read(m,archive(fixture_entries('pip-wheel'),'pip-wheel'),'pip-wheel');self.assertEqual(len(r),6)
  for p,x in r.items():self.assertEqual(x['sha256'],GOLD[Path(p).name])
 def test_four_copy_groups_are_byte_and_hash_bound(self):
  m=self.reader();r=self.read(m,archive(fixture_entries()));w=self.read(m,archive(fixture_entries('pip-wheel'),'pip-wheel'),'pip-wheel');g=m.bind_packaging_copies({'runtime.tar.gz':r,'pip.whl':w})
  self.assertEqual(len(g),3)
  for x in g:self.assertEqual(x['sha256'],GOLD[x['name']]);self.assertEqual(len(x['copies']),4)
 def test_exact_names_do_not_admit_source_or_binaries(self):
  m=self.reader();base=PREFIXES[0]
  for n in NAMES:self.assertTrue(m.is_packaging_notice(base+n,'pip-wheel'))
  for n in ['__init__.py','_spdx.py','LICENSE.APACHE.py','LICENSE.BSD.js','LICENSE.so','COPYING.c','notes.txt','LICENSE.BSD/evil.py']:
   self.assertFalse(m.is_packaging_notice(base+n,'pip-wheel'),n)
 def test_arbitrary_code_beneath_licenses_is_never_returned(self):
  m=self.reader();entries=fixture_entries()+[('python/lib/python3.14/site-packages/pip-26.2.1.dist-info/licenses/src/pip/_vendor/packaging/'+n,b'NEVER_COPY_SOURCE') for n in ['__init__.py','_spdx.py','LICENSE.APACHE.py','payload.so','fake.txt']]
  r=self.read(m,archive(entries));self.assertEqual(len(r),6);self.assertFalse(any(b'NEVER_COPY_SOURCE' in x['body'] for x in r.values()))
 def test_original_hash_mismatch_rejected(self):
  m=self.reader();data=archive(fixture_entries())
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'x.gz';p.write_bytes(data)
   with self.assertRaises(m.NoticeError):m.read_packaging_notices(p,kind='runtime',expected_sha256='0'*64)
 def test_raw_input_cap_equality_and_overflow(self):
  m=self.reader();data=archive(fixture_entries())
  self.assertEqual(len(self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,raw_bytes=len(data)))),6)
  with self.assertRaises(m.NoticeError):self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,raw_bytes=len(data)-1))
 def test_notice_entry_cap_equality_and_overflow(self):
  m=self.reader();data=archive(fixture_entries());largest=max(len((FIXTURES/n).read_bytes()) for n in NAMES)
  self.assertEqual(len(self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,notice_bytes=largest))),6)
  with self.assertRaises(m.NoticeError):self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,notice_bytes=largest-1))
 def test_total_notice_cap_equality_and_overflow(self):
  m=self.reader();data=archive(fixture_entries());total=sum(len(b) for _,b in fixture_entries())
  self.assertEqual(len(self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,total_notice_bytes=total))),6)
  with self.assertRaises(m.NoticeError):self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,total_notice_bytes=total-1))
 def test_ignored_entries_still_count_towards_entry_cap(self):
  m=self.reader();entries=fixture_entries()+[('unselected.py',b'print(1)')];data=archive(entries)
  self.assertEqual(len(self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,tar_entries=7))),6)
  with self.assertRaises(m.NoticeError):self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,tar_entries=6))
 def test_actual_gzip_expansion_cap_includes_padding(self):
  m=self.reader();data=archive(fixture_entries());expanded=len(gzip.decompress(data))
  self.assertEqual(len(self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,tar_expanded_bytes=expanded))),6)
  with self.assertRaises(m.NoticeError):self.read(m,data,limits=dataclasses.replace(m.DEFAULT_LIMITS,tar_expanded_bytes=expanded-1))
 def test_wheel_expanded_and_entry_caps_are_preserved(self):
  m=self.reader();entries=fixture_entries('pip-wheel');data=archive(entries,'pip-wheel');size=sum(len(b) for _,b in entries)
  self.assertEqual(len(self.read(m,data,'pip-wheel',limits=dataclasses.replace(m.DEFAULT_LIMITS,wheel_entries=6,wheel_expanded_bytes=size))),6)
  for lim in [dataclasses.replace(m.DEFAULT_LIMITS,wheel_entries=5),dataclasses.replace(m.DEFAULT_LIMITS,wheel_expanded_bytes=size-1)]:
   with self.assertRaises(m.NoticeError):self.read(m,data,'pip-wheel',limits=lim)
 def test_capacity_limits_cannot_be_raised(self):
  m=self.reader()
  for name in ['raw_bytes','notice_bytes','total_notice_bytes','tar_entries','tar_entry_bytes','tar_expanded_bytes','wheel_entries','wheel_entry_bytes','wheel_expanded_bytes']:
   with self.assertRaises(m.NoticeError):self.read(m,archive(fixture_entries()),limits=dataclasses.replace(m.DEFAULT_LIMITS,**{name:getattr(m.DEFAULT_LIMITS,name)+1}))
 def test_missing_required_copy_rejected_without_partial_result(self):
  m=self.reader()
  with self.assertRaises(m.NoticeError):self.read(m,archive(fixture_entries()[:-1]))
 def test_duplicate_target_rejected_in_tar_and_zip(self):
  m=self.reader()
  for kind in ['runtime','pip-wheel']:
   e=fixture_entries(kind)
   with self.assertRaises(m.NoticeError):self.read(m,archive(e+[e[0]],kind),kind)
 def test_mismatching_copy_rejected_in_one_archive(self):
  m=self.reader();e=fixture_entries();e[-1]=(e[-1][0],e[-1][1]+b'changed')
  with self.assertRaises(m.NoticeError):self.read(m,archive(e))
 def test_mismatching_originals_rejected_by_copy_binding(self):
  m=self.reader();r=self.read(m,archive(fixture_entries()));e=fixture_entries('pip-wheel');e=[(n,b+b'changed' if n.endswith('LICENSE.BSD') else b) for n,b in e];w=self.read(m,archive(e,'pip-wheel'),'pip-wheel')
  with self.assertRaises(m.NoticeError):m.bind_packaging_copies({'runtime.tar.gz':r,'pip.whl':w})
 def test_unsafe_names_rejected_even_when_not_selected(self):
  m=self.reader()
  for n in ['../outside.py','/absolute.py','dir\\evil.py']:
   with self.assertRaises(m.NoticeError):self.read(m,archive(fixture_entries()+[(n,b'x')]))
 def test_target_symlink_is_not_followed(self):
  m=self.reader();out=io.BytesIO()
  with tarfile.open(fileobj=out,mode='w') as t:
   for n,b in fixture_entries():
    ti=tarfile.TarInfo(n)
    if n.endswith('LICENSE.APACHE'):ti.type=tarfile.SYMTYPE;ti.linkname='/outside'
    else:ti.size=len(b)
    t.addfile(ti,io.BytesIO(b) if ti.isfile() else None)
  with self.assertRaises(m.NoticeError):self.read(m,gzip.compress(out.getvalue(),mtime=0))
 def test_binary_notice_is_rejected(self):
  m=self.reader();e=[(n,b'\0not text' if n.endswith('LICENSE.BSD') else b) for n,b in fixture_entries()]
  with self.assertRaises(m.NoticeError):self.read(m,archive(e))
 def test_selected_zip_crc_failure_is_rejected(self):
  m=self.reader();data=archive(fixture_entries('pip-wheel'),'pip-wheel');z=zipfile.ZipFile(io.BytesIO(data));info=z.getinfo(PREFIXES[0]+'LICENSE.APACHE');z.close();offset=info.header_offset+30+len(info.filename.encode())+len(info.extra);bad=bytearray(data);bad[offset]^=1
  with self.assertRaises(m.NoticeError):self.read(m,bytes(bad),'pip-wheel')
 def test_zip_nul_alias_is_not_treated_as_exact_notice_name(self):
  m=self.reader();e=fixture_entries('pip-wheel');target=PREFIXES[0]+'LICENSE.BSD';alias=target+'Xpy';e=[(alias if n==target else n,b) for n,b in e];raw=archive(e,'pip-wheel').replace(alias.encode(),(target+'\0py').encode())
  with self.assertRaises(m.NoticeError):self.read(m,raw,'pip-wheel')
 def test_selected_zip_symlink_is_not_followed(self):
  m=self.reader();out=io.BytesIO()
  with zipfile.ZipFile(out,'w') as z:
   for n,b in fixture_entries('pip-wheel'):
    info=zipfile.ZipInfo(n);info.create_system=3;info.external_attr=(0o120777<<16) if n==PREFIXES[0]+'LICENSE.BSD' else (0o100644<<16);z.writestr(info,b)
  with self.assertRaises(m.NoticeError):self.read(m,out.getvalue(),'pip-wheel')

if __name__=='__main__':unittest.main(verbosity=2)
