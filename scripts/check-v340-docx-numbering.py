"""Offline D0 numbering-policy candidate. Not a Host input reader or DOCX extractor.

Reads only bounded stdin bytes; never opens a supplied path. An eligible result
means only that this numbering check passed. All D1 deployment/profile/resource
gates remain required, and production does not import or execute this script.
"""
import io
import json
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
RAW_LIMIT, XML_LIMIT, EXPANDED_LIMIT = 1048576, 1048576, 8388608


class InvalidMetadata(Exception):
    pass


class NoDeclarations(ET.TreeBuilder):
    def doctype(self, *unused):
        raise InvalidMetadata()


def result(decision, reason, **details):
    return dict(scope='offline-numbering-policy-only', dispatchEnabled=False,
                decision=decision, reason=reason, **details)


def integer(value, maximum=2147483647):
    if not isinstance(value, str) or not re.fullmatch(r'[0-9]{1,10}', value):
        raise InvalidMetadata()
    number = int(value)
    if number > maximum:
        raise InvalidMetadata()
    return number


def on_off(value):
    """Decode the optional OOXML flag; unknown values are not silently false."""
    if value in ('1', 'true', 'on'):
        return True
    if value is None or value in ('0', 'false', 'off'):
        return False
    raise InvalidMetadata()


def number_property(properties):
    """Return explicit numId (including disabling zero), plus numPr presence."""
    if properties is None:
        return None, False
    groups = properties.findall(W + 'numPr')
    if len(groups) > 1:
        raise InvalidMetadata()
    if not groups:
        return None, False
    ids, levels = groups[0].findall(W + 'numId'), groups[0].findall(W + 'ilvl')
    if len(ids) > 1 or len(levels) > 1:
        raise InvalidMetadata()
    if levels:
        integer(levels[0].get(W + 'val'), 8)
    return (integer(ids[0].get(W + 'val')) if ids else None), True


def xml_part(archive, name, expected_root, required=False):
    try:
        info = archive.getinfo(name)
    except KeyError:
        if required:
            raise InvalidMetadata()
        return None
    if info.file_size > XML_LIMIT:
        raise InvalidMetadata()
    with archive.open(info) as stream:
        data = stream.read(XML_LIMIT + 1)
    if len(data) > XML_LIMIT or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise InvalidMetadata()
    root = ET.fromstring(data, parser=ET.XMLParser(target=NoDeclarations()))
    if root.tag != W + expected_root:
        raise InvalidMetadata()
    return root


def classify(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        names = [entry.filename for entry in entries]
        if len(entries) > 256 or len(set(names)) != len(names):
            raise InvalidMetadata()
        total = 0
        for entry in entries:
            parts = entry.filename.split('/')
            if (entry.filename.startswith('/') or '\\' in entry.filename or '..' in parts
                    or entry.flag_bits & 1 or entry.file_size > XML_LIMIT
                    or entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)
                    or entry.file_size > 100 * max(1, entry.compress_size)):
                raise InvalidMetadata()
            total += entry.file_size
            if total > EXPANDED_LIMIT:
                raise InvalidMetadata()
        document = xml_part(archive, 'word/document.xml', 'document', True)
        styles_root = xml_part(archive, 'word/styles.xml', 'styles')
        numbering = xml_part(archive, 'word/numbering.xml', 'numbering')
    body = document.find(W + 'body')
    if body is None:
        raise InvalidMetadata()
    styles, default_style, defaults = {}, None, (None, False)
    if styles_root is not None:
        defaults = number_property(styles_root.find(W + 'docDefaults/' + W + 'pPrDefault/' + W + 'pPr'))
        for style in styles_root.findall(W + 'style'):
            name = style.get(W + 'styleId')
            if not name or len(name) > 256 or name in styles:
                raise InvalidMetadata()
            styles[name] = style
            if style.get(W + 'type') == 'paragraph' and on_off(style.get(W + 'default')):
                if default_style is not None:
                    raise InvalidMetadata()
                default_style = name

    def inherited(style_id):
        seen, selected, has_group = set(), None, False
        while style_id:
            if style_id in seen or len(seen) >= 128:
                raise InvalidMetadata()
            seen.add(style_id)
            style = styles.get(style_id)
            if style is None or style.get(W + 'type') != 'paragraph':
                raise InvalidMetadata()
            number, group = number_property(style.find(W + 'pPr'))
            has_group |= group
            if selected is None and number is not None:
                selected = number
            bases = style.findall(W + 'basedOn')
            if len(bases) > 1:
                raise InvalidMetadata()
            style_id = bases[0].get(W + 'val') if bases else None
        if selected is None:
            selected = defaults[0]
        return selected, has_group or defaults[1]

    for index, paragraph in enumerate(body.iter(W + 'p'), 1):
        try:
            properties = paragraph.find(W + 'pPr')
            refs = properties.findall(W + 'pStyle') if properties is not None else []
            if len(refs) > 1:
                raise InvalidMetadata()
            parent_id = refs[0].get(W + 'val') if refs else default_style
            if refs and not parent_id:
                raise InvalidMetadata()
            parent, inherited_group = inherited(parent_id)
            direct, direct_group = number_property(properties)
            selected = direct if direct is not None else parent
            if selected is None and (direct_group or inherited_group):
                raise InvalidMetadata()
            if selected:
                if numbering is None:
                    raise InvalidMetadata()
                nums = [n for n in numbering.findall(W + 'num') if n.get(W + 'numId') == str(selected)]
                if len(nums) != 1:
                    raise InvalidMetadata()
                abstract = nums[0].find(W + 'abstractNumId')
                if abstract is None or not any(n.get(W + 'abstractNumId') == abstract.get(W + 'val')
                                               for n in numbering.findall(W + 'abstractNum')):
                    raise InvalidMetadata()
                return result('reject', 'effective-automatic-numbering', paragraph=index, numId=selected)
        except InvalidMetadata:
            return result('reject', 'unresolved-numbering', paragraph=index)
    return result('eligible', 'no-effective-automatic-numbering')


def main():
    data = sys.stdin.buffer.read(RAW_LIMIT + 1)
    if len(data) > RAW_LIMIT:
        print(json.dumps(result('reject', 'input-limit')))
        return 2
    try:
        value = classify(data)
    except Exception:
        print(json.dumps(result('reject', 'invalid-docx-numbering-metadata')))
        return 2
    print(json.dumps(value, separators=(',', ':')))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
