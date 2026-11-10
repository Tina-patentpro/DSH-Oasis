"""Verify the already acquired PDF parser archive, without installing/extracting it.

The report covers this selected original and notice bytes only. Interpreter,
native dependencies, launcher, aggregate notices and release remain separate.
"""
import argparse
import base64
import csv
import hashlib
import io
import json
import pathlib
import stat
import zipfile

WHEEL_SHA256 = '90005e959e1596c6e6c84c8b0ad383285b3e17011751cedd17f2ce8fcdfc86de'
LICENSE_PATH = 'pypdf-6.10.0.dist-info/licenses/LICENSE'
LICENSE_SHA256 = 'a97ac230e5f33ef10a5367a850eb01f91f1a0b064e34742c7794d2294557f524'
RECORD_PATH = 'pypdf-6.10.0.dist-info/RECORD'

def verify_wheel(path):
    with pathlib.Path(path).open('rb') as source:
        raw = source.read(1048577)
    if len(raw)>1048576 or hashlib.sha256(raw).hexdigest()!=WHEEL_SHA256:
        raise ValueError('PDF_PARSER_ORIGINAL_MISMATCH')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        names=archive.namelist()
        if len(names)!=60 or len(set(names))!=len(names): raise ValueError('PDF_PARSER_MEMBER_MISMATCH')
        total=0
        for info in archive.infolist():
            path=pathlib.PurePosixPath(info.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in info.filename or stat.S_ISLNK(info.external_attr>>16):
                raise ValueError('PDF_PARSER_UNSAFE_MEMBER')
            total+=info.file_size
        if total>2097152: raise ValueError('PDF_PARSER_ARCHIVE_LIMIT')
        records=list(csv.reader(io.StringIO(archive.read(RECORD_PATH).decode('utf-8'))))
        if len(records)!=60 or {row[0] for row in records}!=set(names): raise ValueError('PDF_PARSER_RECORD_COVERAGE')
        members=[]
        for name,digest,size in records:
            body=archive.read(name)
            if name==RECORD_PATH:
                if digest or size: raise ValueError('PDF_PARSER_RECORD_SELF_ENTRY')
            else:
                expected='sha256='+base64.urlsafe_b64encode(hashlib.sha256(body).digest()).decode().rstrip('=')
                if digest!=expected or int(size)!=len(body): raise ValueError('PDF_PARSER_RECORD_MISMATCH')
            members.append({'path':name,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()})
        notice=archive.read(LICENSE_PATH)
        if hashlib.sha256(notice).hexdigest()!=LICENSE_SHA256: raise ValueError('PDF_PARSER_NOTICE_MISMATCH')
    return {'component':'pypdf','version':'6.10.0','originalSHA256':WHEEL_SHA256,'verifiedMembers':len(members),
            'expandedBytes':total,'members':sorted(members,key=lambda item:item['path']),
            'license':{'path':LICENSE_PATH,'sha256':LICENSE_SHA256,'text':notice.decode('utf-8')},
            'scope':'selected parser original and its RECORD/notice bytes; no legal or full runtime closure claim',
            'fullRuntimeDistributionVerified':False,'productActivationAllowed':False}

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('wheel',type=pathlib.Path)
    args=parser.parse_args()
    print(json.dumps(verify_wheel(args.wheel),ensure_ascii=False,indent=2))
