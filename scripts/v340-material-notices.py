"""Bounded offline packaging-notice reader. Not shipped or wired to Host.

Reads only six exact notice paths from a hash-bound immutable archive snapshot.
It never extracts an archive, imports its code, or writes an output file.
"""
from dataclasses import dataclass,fields
from pathlib import PurePosixPath
import gzip,hashlib,io,tarfile,zipfile

POLICY_VERSION='v340-packaging-notice-2'
NOTICE_NAMES=('LICENSE','LICENSE.APACHE','LICENSE.BSD')
_LOCATIONS=('pip/_vendor/packaging/','pip-26.2.1.dist-info/licenses/src/pip/_vendor/packaging/')

class NoticeError(ValueError):
    pass

@dataclass(frozen=True)
class Limits:
    raw_bytes:int=96*1024*1024
    notice_bytes:int=8*1024*1024
    total_notice_bytes:int=32*1024*1024
    tar_entries:int=20000
    tar_entry_bytes:int=512*1024*1024
    tar_expanded_bytes:int=2*1024*1024*1024
    wheel_entries:int=512
    wheel_entry_bytes:int=64*1024*1024
    wheel_expanded_bytes:int=128*1024*1024

DEFAULT_LIMITS=Limits()

def _safe(name):
    p=PurePosixPath(name)
    if not name or p.is_absolute() or '..' in p.parts or '\\' in name or '\0' in name:
        raise NoticeError('unsafe archive name')
    return name

def _paths(kind):
    if kind not in ('runtime','pip-wheel'):
        raise NoticeError('unsupported fixed artifact role')
    prefix='python/lib/python3.14/site-packages/' if kind=='runtime' else ''
    return {prefix+p+n for p in _LOCATIONS for n in NOTICE_NAMES}

def is_packaging_notice(name,kind):
    try:
        _safe(name)
    except NoticeError:
        return False
    return name in _paths(kind)

def _limits(limits):
    for field in fields(DEFAULT_LIMITS):
        value=getattr(limits,field.name)
        if type(value) is not int or not 0<value<=getattr(DEFAULT_LIMITS,field.name):
            raise NoticeError('material capacity cannot be raised or disabled')

def _snapshot(path,expected,limits):
    if not isinstance(expected,str) or len(expected)!=64 or any(c not in '0123456789abcdef' for c in expected):
        raise NoticeError('invalid expected original digest')
    chunks=[];length=0
    with open(path,'rb') as source:
        while chunk:=source.read(min(65536,limits.raw_bytes-length+1)):
            length+=len(chunk)
            if length>limits.raw_bytes:
                raise NoticeError('raw original byte limit')
            chunks.append(chunk)
    raw=b''.join(chunks)
    if hashlib.sha256(raw).hexdigest()!=expected:
        raise NoticeError('original digest mismatch')
    return raw

def _body(stream,declared,limits):
    if declared>limits.notice_bytes:
        raise NoticeError('notice entry byte limit')
    parts=[];length=0
    while chunk:=stream.read(65536):
        length+=len(chunk)
        if length>limits.notice_bytes or length>declared:
            raise NoticeError('actual notice byte limit')
        parts.append(chunk)
    if length!=declared:
        raise NoticeError('short notice read')
    body=b''.join(parts)
    try:
        text=body.decode('utf-8')
    except UnicodeDecodeError as error:
        raise NoticeError('notice must be UTF-8 text') from error
    if '\0' in text:
        raise NoticeError('binary notice rejected')
    return body

class _Expanded:
    def __init__(self,stream,limit):
        self.stream=stream;self.limit=limit;self.count=0
    def read(self,size=-1):
        chunk=self.stream.read(min(size,65536) if size>=0 else 65536)
        self.count+=len(chunk)
        if self.count>self.limit:
            raise NoticeError('actual tar expansion limit')
        return chunk

def _bounded_tarinfo(limits):
    # TarInfo dispatches PAX/GNU processing before yielding logical members.
    # Use one subclass/counter closure per read, including the first header and
    # recursive extension headers, before stdlib consumes their body.
    physical_count=physical_total=0
    class BoundedTarInfo(tarfile.TarInfo):
        def _proc_member(self,archive):
            nonlocal physical_count,physical_total
            if physical_count>=limits.tar_entries:
                raise NoticeError('tar physical entry count limit')
            if self.size<0 or self.size>limits.tar_entry_bytes:
                raise NoticeError('tar physical entry byte limit')
            if physical_total+self.size>limits.tar_expanded_bytes:
                raise NoticeError('tar physical declared byte limit')
            physical_count+=1;physical_total+=self.size
            return super()._proc_member(archive)
    return BoundedTarInfo

def read_packaging_notices(path,*,kind,expected_sha256,limits=DEFAULT_LIMITS):
    """Return all six validated body/hash records, or fail without publishing any."""
    _limits(limits);wanted=_paths(kind);raw=_snapshot(path,expected_sha256,limits)
    records={};seen=set();declared_total=notice_total=0
    def accept(name,declared,stream):
        nonlocal notice_total
        if declared>limits.notice_bytes or notice_total+declared>limits.total_notice_bytes:
            raise NoticeError('notice total/entry limit')
        body=_body(stream,declared,limits);notice_total+=len(body)
        records[name]={'memberPath':name,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'body':body,'kind':kind,'originalSHA256':expected_sha256}
    try:
        if kind=='runtime':
            with gzip.GzipFile(fileobj=io.BytesIO(raw)) as gz:
                source=_Expanded(gz,limits.tar_expanded_bytes)
                with tarfile.open(fileobj=source,mode='r|',tarinfo=_bounded_tarinfo(limits)) as archive:
                    for entry in archive:
                        name=_safe(entry.name)
                        if name in seen or len(seen)>=limits.tar_entries:
                            raise NoticeError('duplicate or excess tar entries')
                        seen.add(name);declared_total+=entry.size
                        if entry.size>limits.tar_entry_bytes or declared_total>limits.tar_expanded_bytes:
                            raise NoticeError('tar declared byte limit')
                        if name in wanted:
                            if not entry.isfile():
                                raise NoticeError('notice cannot be a link or special entry')
                            with archive.extractfile(entry) as stream:
                                accept(name,entry.size,stream)
                # Verify the remaining gzip stream/CRC and include padding in expansion.
                while source.read(65536):
                    pass
        else:
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                entries=archive.infolist()
                if len(entries)>limits.wheel_entries:
                    raise NoticeError('wheel entry count limit')
                for entry in entries:
                    _safe(entry.orig_filename)
                    name=_safe(entry.filename)
                    if name in seen:
                        raise NoticeError('duplicate wheel entry')
                    seen.add(name);declared_total+=entry.file_size
                    if entry.flag_bits&1 or entry.file_size>limits.wheel_entry_bytes or declared_total>limits.wheel_expanded_bytes:
                        raise NoticeError('wheel encrypted/declared byte limit')
                    if name in wanted:
                        if entry.is_dir() or (entry.external_attr>>16)&0o170000==0o120000:
                            raise NoticeError('notice cannot be a link or directory')
                        with archive.open(entry) as stream:
                            accept(name,entry.file_size,stream)
    except (OSError,EOFError,tarfile.TarError,zipfile.BadZipFile,RuntimeError) as error:
        raise NoticeError('invalid or incomplete notice archive') from error
    if set(records)!=wanted:
        raise NoticeError('required wrapper/companion copy missing')
    for name in NOTICE_NAMES:
        copies=[x for p,x in records.items() if PurePosixPath(p).name==name]
        if len(copies)!=2 or len({x['sha256'] for x in copies})!=1 or len({x['body'] for x in copies})!=1:
            raise NoticeError('notice copies differ')
    wrapper=next(x['body'].decode() for p,x in records.items() if p.endswith('/LICENSE'))
    if 'LICENSE.APACHE' not in wrapper or 'LICENSE.BSD' not in wrapper:
        raise NoticeError('wrapper companion references missing')
    return records

def bind_packaging_copies(artifacts):
    """Bind runtime and pip original positions without dropping duplicate provenance."""
    if len(artifacts)!=2:
        raise NoticeError('both original artifacts required')
    kinds=[];groups=[]
    for records in artifacts.values():
        if not records:
            raise NoticeError('empty original records')
        kind=next(iter(records.values()))['kind'];kinds.append(kind)
        if set(records)!=_paths(kind) or any(x['kind']!=kind for x in records.values()):
            raise NoticeError('incomplete or mixed original records')
    if set(kinds)!={'runtime','pip-wheel'}:
        raise NoticeError('one runtime and one pip original required')
    for name in NOTICE_NAMES:
        copies=[];bodies=[]
        for artifact,records in artifacts.items():
            for path,x in records.items():
                if PurePosixPath(path).name==name:
                    if x['bytes']!=len(x['body']) or x['sha256']!=hashlib.sha256(x['body']).hexdigest():
                        raise NoticeError('record byte/hash mismatch')
                    copies.append({'artifactFilename':artifact,'artifactSHA256':x['originalSHA256'],'memberPath':path,'bytes':x['bytes'],'sha256':x['sha256']});bodies.append(x['body'])
        if len(copies)!=4 or any(b!=bodies[0] for b in bodies):
            raise NoticeError('original archive notice copies differ')
        groups.append({'name':name,'bytes':len(bodies[0]),'sha256':hashlib.sha256(bodies[0]).hexdigest(),'copies':copies})
    return groups
