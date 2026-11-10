"""Bounded PDF-only worker candidate. Not enabled by the product Host.

The CLI requires Linux/aarch64 seccomp; hard memory/time/output/process cleanup
must additionally be enforced by the qualified external launcher. Imports of
extract_pdf are for component tests, not a bypass for product execution.
"""
import base64
import codecs
import ctypes
import hashlib
import io
import json
import logging
import os
import platform
import re
import signal
import sys
import zlib

import pypdf
from pypdf import PdfReader
from pypdf import filters
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject, NullObject, StreamObject

class PdfRejected(Exception):
    def __init__(self, code='V340_EXTRACTION_UNSUPPORTED_PROFILE'):
        super().__init__(code)
        self.code = code

def reject(code='V340_EXTRACTION_UNSUPPORTED_PROFILE'):
    raise PdfRejected(code)

class DecodeBudget:
    """Count every filter stage before retaining it, across all document streams."""
    def __init__(self):
        self.total = 0

    def decode(self, data, names):
        if len(names) > 2: reject()
        for name in names or [None]:
            remaining = min(8388608, 16777216 - self.total)
            if name == '/FlateDecode':
                decoder = zlib.decompressobj()
                data = decoder.decompress(data, remaining + 1)
                if len(data) > remaining or decoder.unconsumed_tail:
                    reject('V340_EXTRACTION_LIMIT')
                if not decoder.eof or decoder.unused_data: reject()
            elif name == '/ASCII85Decode':
                # Encoded input comes from the <=1MiB raw document, not a prior
                # expanded stage; unsupported order is refused before decoding.
                if len(data) > 1048576: reject('V340_EXTRACTION_LIMIT')
                try: data = base64.a85decode(data, adobe=data.rstrip().endswith(b'~>'))
                except (ValueError, OverflowError): reject()
            elif name is not None: reject()
            if len(data) > remaining: reject('V340_EXTRACTION_LIMIT')
            self.total += len(data)
        return data

def _xref_preflight(data):
    # This implementation candidate deliberately rejects stream/hybrid xrefs
    # and incremental updates; it never asks pypdf to repair an unknown layout.
    tail = re.search(rb'startxref\s+(\d{1,10})\s+%%EOF\s*$', data)
    if not tail: reject()
    offset = int(tail[1])
    if not 0 <= offset < tail.start() or not data[offset:].startswith(b'xref'): reject()
    stream = io.BytesIO(data[offset:tail.start()])
    if stream.readline().strip() != b'xref': reject()
    count = 0
    seen = set()
    while True:
        line = stream.readline().strip()
        if line == b'trailer': break
        header = re.fullmatch(rb'(\d{1,10})\s+(\d{1,10})', line)
        if not header: reject()
        first, size = map(int, header.groups())
        count += size
        if count > 10000 or first + size > 10000: reject('V340_EXTRACTION_LIMIT')
        for ident in range(first, first + size):
            entry = re.fullmatch(rb'(\d{10}) (\d{5}) ([nf])\s*', stream.readline())
            if not entry or ident in seen: reject()
            seen.add(ident)
            position, generation = int(entry[1]), int(entry[2])
            if entry[3] == b'n' and (position >= offset or not re.match(
                    str(ident).encode() + rb'\s+' + str(generation).encode() + rb'\s+obj\b', data[position:position+48])): reject()
    trailer = stream.read()
    if re.search(rb'/(?:Prev|XRefStm|Encrypt)\b', trailer): reject()
    size = re.search(rb'/Size\s+(\d{1,10})\b',trailer)
    if not size or int(size[1]) > 10000: reject('V340_EXTRACTION_LIMIT')
    return count

def _check_page_tree(reader):
    visited = set()
    def walk(ref, depth=0):
        if depth > 100: reject('V340_EXTRACTION_LIMIT')
        identity = (ref.idnum,ref.generation) if isinstance(ref,IndirectObject) else id(ref)
        if identity in visited: reject()
        visited.add(identity)
        node = ref.get_object()
        if node.get('/Type') == '/Page': return 1
        if node.get('/Type') != '/Pages': reject()
        count = node.get('/Count')
        if not isinstance(count,int) or count < 1: reject()
        if count > 100: reject('V340_EXTRACTION_LIMIT')
        children = node.get('/Kids')
        if not isinstance(children,ArrayObject) or len(children) > 100: reject()
        actual = 0
        for child in children:
            actual += walk(child,depth+1)
            if actual > 100: reject('V340_EXTRACTION_LIMIT')
        if actual != count: reject()
        return actual
    return walk(reader.trailer['/Root'].raw_get('/Pages'))

def _check_dictionary(obj):
    if not isinstance(obj, DictionaryObject): return
    forbidden = {'/AcroForm','/Annots','/OpenAction','/AA','/A','/JS','/JavaScript',
                 '/EmbeddedFiles','/EF','/Names','/OCProperties','/Collection','/RichMediaContent'}
    if forbidden.intersection(obj): reject()
    if obj.get('/Subtype') in ['/Image','/Form','/Widget','/3D','/RichMedia']: reject()
    if obj.get('/Type') in ['/ObjStm','/XRef','/Filespec']: reject()
    for value in obj.values():
        if isinstance(value, DictionaryObject): _check_dictionary(value)
        elif isinstance(value, ArrayObject):
            for child in value:
                if isinstance(child, DictionaryObject): _check_dictionary(child)

def _check_page(page):
    resources = page.get('/Resources', {})
    if resources.get('/XObject') or resources.get('/Shading') or resources.get('/Pattern'): reject()
    for ref in resources.get('/Font', {}).values():
        font = ref.get_object()
        kind = font.get('/Subtype')
        if kind == '/Type0':
            if font.get('/BaseFont') != '/STSong-Light' or font.get('/Encoding') != '/UniGB-UCS2-H': reject()
        elif kind == '/Type1':
            if font.get('/BaseFont') not in ['/Helvetica','/Times-Roman','/Courier'] or font.get('/Encoding') not in [None,'/WinAnsiEncoding','/MacRomanEncoding']: reject()
        else: reject()
    content = page.get_contents()
    if content is None: reject()
    allowed = {b'q',b'Q',b'cm',b'BT',b'ET',b'Tf',b'TL',b'Td',b'TD',b'Tm',b'T*',b'Tj',b'TJ',b"'",b'"',b'Tc',b'Tw',b'Tz',b'Tr',b'Ts'}
    shown = False
    for operands, operator in content.operations:
        if operator not in allowed: reject()
        if operator == b'Tf' and (len(operands) != 2 or operands[0] not in resources.get('/Font',{})): reject()
        if operator in [b'cm',b'Tm']:
            if len(operands) != 6 or operands[1] != 0 or operands[2] != 0 or operands[0] <= 0 or operands[3] <= 0: reject()
            if shown: reject()  # No independently positioned second column/block.
        if operator in [b'Td',b'TD'] and shown and (operands[0] != 0 or operands[1] >= 0): reject()
        if operator == b'Tr' and operands != [0]: reject()
        if operator == b'Ts' and operands != [0]: reject()
        if operator == b'TJ' and any(isinstance(x,(int,float)) and abs(x) > 1000 for x in operands[0]): reject()
        if operator in [b'Tj',b'TJ',b"'",b'"']: shown = True

def extract_pdf(data):
    if pypdf.__version__ != '6.10.0': reject('V340_EXTRACTION_UNAVAILABLE')
    if len(data) > 1048576: reject('V340_EXTRACTION_LIMIT')
    if not data.startswith(b'%PDF-'): reject()
    object_count = _xref_preflight(data)
    budget = DecodeBudget()
    original = filters.decode_stream_data
    counted = set()
    def decode(stream):
        names = stream.get('/Filter', [])
        if not isinstance(names, (list, ArrayObject)): names = [names]
        if any(isinstance(name, IndirectObject) for name in names): reject()
        names = list(map(str, names))
        if names not in [[],['/FlateDecode'],['/ASCII85Decode'],['/ASCII85Decode','/FlateDecode']]: reject()
        params = stream.get('/DecodeParms')
        if params is not None and not isinstance(params, NullObject) and not (
                isinstance(params, ArrayObject) and all(isinstance(x, NullObject) for x in params)): reject()
        return budget.decode(stream._data, names)
    filters.decode_stream_data = decode
    try:
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted or reader.xref_objStm: reject()
        _check_page_tree(reader)
        if len(reader.pages) > 100: reject('V340_EXTRACTION_LIMIT')
        for generation, entries in reader.xref.items():
            if generation == 65535: continue
            for ident in entries:
                if ident == 0: continue
                obj = reader.get_object(IndirectObject(ident,generation,reader))
                _check_dictionary(obj)
                if isinstance(obj, StreamObject):
                    decoded = obj.get_data()
                    if not obj.get('/Filter') and id(obj) not in counted:
                        budget.decode(decoded, [])
                    counted.add(id(obj))
        segments = []
        for page in reader.pages:
            _check_page(page)
            text = page.extract_text().replace('\r\n','\n').replace('\r','\n').rstrip('\n')
            if not text.strip() or '\0' in text or '\ufffd' in text: reject()
            text.encode('utf-8', errors='strict')
            segments.append(text)
        body = '\n'.join(segments)
        if len(body.encode('utf-16-le'))//2 > 300000 or len(body.encode()) > 1048576: reject('V340_EXTRACTION_LIMIT')
        positions = []; offset = 0
        for i, text in enumerate(segments):
            size = len(text.encode('utf-16-le'))//2
            positions.append({'locator':{'kind':'pdf-page','page':i+1},'startUTF16':offset,'endUTF16':offset+size})
            offset += size + 1
        if len(json.dumps(positions,separators=(',',':')).encode()) > 65536: reject('V340_EXTRACTION_LIMIT')
        return {'body':body,'rawSHA256':hashlib.sha256(data).hexdigest(),'textSHA256':hashlib.sha256(body.encode()).hexdigest(),
                'locations':positions,'pages':len(segments),'objects':object_count,'decodedBytes':budget.total,'parser':'pypdf/6.10.0'}
    except PdfRejected: raise
    except Exception: reject('V340_EXTRACTION_FAILED')
    finally: filters.decode_stream_data = original

def restrict_process():
    """After trusted imports, allow only existing-fd I/O, memory, signal and clock calls.

    Deny-by-default includes open/openat, socket/connect, exec/fork/clone/ptrace.
    Linux/aarch64 only, the existing selected container target; never best-effort.
    https://docs.kernel.org/userspace-api/seccomp_filter.html
    """
    if sys.platform != 'linux' or platform.machine() != 'aarch64': reject('V340_EXTRACTION_UNAVAILABLE')
    # Require the existing fixed cgroup-v2 envelope; a standalone Linux process
    # without hard whole-container memory/pid limits must not parse materials.
    for name, expected in [('memory.max',268435456),('memory.swap.max',0),('pids.max',1)]:
        try:
            with open('/sys/fs/cgroup/'+name,'rb') as current: actual = int(current.read(32).strip())
        except (OSError,ValueError): reject('V340_EXTRACTION_UNAVAILABLE')
        if actual != expected: reject('V340_EXTRACTION_UNAVAILABLE')
    for encoding in ['utf-8','utf-16-le','utf-16-be','latin1','gbk','gb18030','big5','shift_jis','cp949','cp1252']:
        codecs.lookup(encoding)
    # Kernel default termination, not a Python timeout callback. The filter below
    # denies handler/mask/timer changes after this point, and denies descendants.
    signal.signal(signal.SIGALRM,signal.SIG_DFL)
    signal.pthread_sigmask(signal.SIG_UNBLOCK,{signal.SIGALRM})
    signal.setitimer(signal.ITIMER_REAL,5)
    libc = ctypes.CDLL(None,use_errno=True)
    class Instruction(ctypes.Structure):
        _fields_ = [('code',ctypes.c_ushort),('jt',ctypes.c_ubyte),('jf',ctypes.c_ubyte),('k',ctypes.c_uint)]
    class Program(ctypes.Structure):
        _fields_ = [('len',ctypes.c_ushort),('filter',ctypes.POINTER(Instruction))]
    ops = [(0x20,0,0,4),(0x15,1,0,0xc00000b7),(0x06,0,0,0x80000000),(0x20,0,0,0)]
    for number in [25,57,62,63,64,65,66,80,93,94,98,113,139,165,172,178,214,215,216,222,226,233,278]:
        ops += [(0x15,0,1,number),(0x06,0,0,0x7fff0000)]
    ops += [(0x06,0,0,0x00050001)]  # EPERM, including unknown future syscalls.
    instructions = (Instruction*len(ops))(*(Instruction(*op) for op in ops))
    program = Program(len(ops),instructions)
    os.closerange(3,65536)
    if libc.prctl(38,1,0,0,0) != 0 or libc.prctl(22,2,ctypes.byref(program),0,0) != 0: reject('V340_EXTRACTION_UNAVAILABLE')
    # Exact syscall results prove our added filter, beyond the container's flags.
    for number, args in [(56,(-100,ctypes.c_char_p(b'/etc/os-release'),0,0)),(198,(2,1,0)),(221,(0,0,0)),(220,(0,0,0,0,0))]:
        ctypes.set_errno(0)
        result = libc.syscall(number,*args)
        if result != -1 or ctypes.get_errno() != 1: reject('V340_EXTRACTION_UNAVAILABLE')
    return {'mechanism':'seccomp-bpf-aarch64-v1','open':'EPERM','socket':'EPERM','exec':'EPERM','clone':'EPERM',
            'memoryMax':268435456,'memorySwapMax':0,'pidsMax':1,'kernelAlarmSeconds':5}

def main():
    logging.getLogger('pypdf').handlers = [logging.NullHandler()]
    logging.getLogger('pypdf').propagate = False
    try:
        isolation = restrict_process()
        result = extract_pdf(sys.stdin.buffer.read(1048577))
        result['isolation'] = isolation
        encoded = json.dumps(result,ensure_ascii=False,separators=(',',':')).encode()
        if len(encoded) > 2097152: reject('V340_EXTRACTION_LIMIT')
        sys.stdout.buffer.write(encoded+b'\n')
        return 0
    except Exception as error:
        code = error.code if isinstance(error,PdfRejected) else 'V340_EXTRACTION_FAILED'
        sys.stdout.write(json.dumps({'error':code})+'\n')
        return 2

if __name__ == '__main__': sys.exit(main())
