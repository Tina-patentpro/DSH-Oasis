import argparse
import ast
import asyncio
import copy
import hashlib
import json
from pathlib import Path

FLOWS = (("Flow-1-5", "brief_summary", 3), ("Flow-5-13", "review", 1))


def bind_output_assembly(path, candidate):
    source = path.read_bytes()
    tree = ast.parse(source)
    original = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef)
                    and node.name == "run_dify_deduct")
    block = next(node for node in ast.walk(original) if isinstance(node, ast.If)
                 and any(isinstance(child, ast.Assign) and any(
                     isinstance(target, ast.Name) and target.id == "file_url" for target in child.targets
                 ) for child in node.orelse))
    branch = copy.deepcopy(block.orelse[1:])
    if candidate:
        loop = next(node for node in branch if isinstance(node, ast.For))
        file_branch = loop.body[0]
        append_at = file_branch.body[0].body[-1]
        assert ast.unparse(append_at) == "file_url.append(item_url)"
        replacement = ast.parse(
            "field = item['en_name']\n"
            "attachments = outputs.get(field)\n"
            "if not isinstance(attachments, list) or not attachments:\n"
            "    missing.append({'field': field, 'index': None})\n"
            "else:\n"
            "    for index, attachment in enumerate(attachments):\n"
            "        item_url = await handle_file_outputnew([attachment]) if isinstance(attachment, dict) else None\n"
            "        if isinstance(item_url, str) and item_url.strip():\n"
            "            file_url.append(item_url)\n"
            "        else:\n"
            "            missing.append({'field': field, 'index': index})\n"
        )
        file_branch.body = replacement.body
        branch.insert(0, ast.parse("missing = []").body[0])
    signature = "async def assemble(result, api_info, handle_file_outputnew):\n    pass\n"
    module = ast.parse(signature)
    module.body[0].body = branch + ast.parse(
        "return answer_text, file_urlstr, " + ("missing" if candidate else "[]")
    ).body
    namespace = {"print": lambda *_args, **_options: None}
    exec(compile(ast.fix_missing_locations(module), str(path), "exec"), namespace)
    return namespace["assemble"], hashlib.sha256(source).hexdigest()


class Schema:
    def __init__(self, body_key):
        self.output_schema = [
            {"type": "text", "en_name": body_key, "cn_name": "正文"},
            {"type": "file", "en_name": "file_output", "cn_name": "附件"},
        ]


async def replay(source, phase):
    from urllib.parse import urlsplit

    assemble, sha = bind_output_assembly(source, candidate=phase == "candidate")
    reads, writes = [], []
    rows = []
    for index, (flow, field, count) in enumerate(FLOWS):
        request_key = f"offline-{flow}"
        account, workspace = "fixture-account", "fixture-workspace"
        document = f"{flow} 公开合成回放正文"
        staged = {}

        async def resolve_attachment(files):
            for file in files:
                link = file.get("url")
                if not isinstance(link, str):
                    continue
                parsed = urlsplit(link)
                if (parsed.scheme, parsed.netloc) == ("https", "files.example.invalid"):
                    return link
            return None

        async def run(files):
            response = {"data": {"status": "succeeded", "outputs": {
                field: document,
                "file_output": files,
            }}}
            return await assemble(response, Schema(field), resolve_attachment)

        def read_job(key, identity):
            reads.append(key)
            return staged.get((key, *identity))

        files = [{"url": None} for _ in range(count)]
        if phase == "original":
            try:
                await run(files)
            except TypeError as error:
                assert "NoneType" in str(error), error
                rows.append({"flow": flow, "items": count, "bodyField": field,
                             "failure": str(error), "saveReached": False})
            else:
                raise AssertionError(f"{flow}: expected the original TypeError")
            continue

        body, links, missing = await run(files)
        assert body == "正文: " + document and links == ""
        assert missing == [{"field": "file_output", "index": i} for i in range(count)]
        staged[(request_key, account, workspace)] = {
            "body": body, "links": links, "missing": missing,
            "state": "partial-fixture", "ledgerDebit": "0.00",
        }
        record = read_job(request_key, (account, workspace))
        assert record["body"] == body and record["ledgerDebit"] == "0.00"
        assert read_job(request_key, ("other-account", workspace)) is None
        assert read_job(request_key, (account, "other-workspace")) is None

        link = f"https://files.example.invalid/{index}.docx"
        other = f"https://files.example.invalid/{index}.pdf"
        mixed = await run([{"url": None}, {"url": "https://other.example.invalid/ref.docx"},
                           {"url": link}, {"url": other}])
        assert mixed == (body, f"{link},{other}", [{"field": "file_output", "index": i} for i in range(2)])
        rows.append({"flow": flow, "items": count, "bodyField": field, "bodyReadable": True,
                     "missingAttachments": missing, "validFixtureLinksRetained": 2,
                     "foreignReadsDenied": True, "fixtureDebitCny": "0.00"})

    print(json.dumps({"phase": phase, "historicalSource": str(source), "historicalSourceSha256": sha,
                      "rows": rows, "mockReads": len(reads), "remoteCreates": len(writes),
                      "productionWrites": 0, "chargedCny": "0.00",
                      "limits": "Candidate isolates response assembly. The partial state, authorization and ledger are test doubles, not backend implementation."},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("phase", choices=["original", "candidate"])
    args = parser.parse_args()
    asyncio.run(replay(args.source.resolve(), args.phase))
