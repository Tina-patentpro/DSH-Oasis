"""Read-only identity/content checks for this review; no Host or source writes."""
from pathlib import Path
import ast
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def identity(path):
    path = Path(path)
    raw = path.read_bytes()
    return {"path": str(path), "sha256": digest(raw), "bytes": len(raw)}


def packet(path):
    text = Path(path).read_text(encoding="utf-8")
    return json.loads(re.search(r"```oasis-v340\n(.*?)\n```", text, re.S).group(1))


def main():
    source_ids = json.loads((ROOT / "docs/business-baseline/fast39-c4-limited-adoption-20261105/source-identities.json").read_bytes())
    original = ROOT / ".local/m06-public-r2-newcall-20261031/generated-v1.md"
    manuscript = ROOT / ".dsh-test/m06-live-20261030-r2/workspace-a/claims_20261031132202_9a439835.md"
    snapshot = manuscript.with_suffix(".oasis.json")
    input_path = ROOT / "docs/evidence/2026-10-29-m06-public-calibration-input-r2.json"
    inp = json.loads(input_path.read_bytes())
    p0, p1 = packet(original), packet(manuscript)
    snap = json.loads(snapshot.read_bytes())
    bundle_path = Path(source_ids["consumer_bundle"]["path"])
    bundle = json.loads(bundle_path.read_bytes())
    checked_members = []
    for item in source_ids["skill_members"]:
        actual = identity(item["absolute_path"])
        checked_members.append({**actual, "role": item["class"], "matches": actual["sha256"] == item["sha256"] and actual["bytes"] == item["bytes"]})
    sources = []
    for item in inp["files"]:
        actual = identity(item["path"])
        sources.append({**actual, "input_id": item["inputId"], "matches": actual["sha256"] == item["sha256"] and actual["bytes"] == item["bytes"]})
    payload_checks = []
    for item in bundle["resources"]:
        raw = item["content"].encode("utf-8")
        origin = next(x for x in source_ids["skill_members"] if x["path"] == "business-skill/" + item["path"])
        payload_checks.append({"path": item["path"], "matches": digest(raw) == item["sha256"] == origin["sha256"] and len(raw) == item["bytes"]})
    claim = next(x for x in p1["contents"] if x["content_id"] == "m06-claims-draft-001")
    original_claim = next(x for x in p0["contents"] if x["content_id"] == "m06-claims-draft-001")
    old_core = p0["current_result"]["core_result_markdown"]
    new_core = p1["current_result"]["core_result_markdown"]
    old_ids = {x["warning_id"] for x in p0["warnings"]}
    new_ids = {x["warning_id"] for x in p1["warnings"]}
    host_inputs = [x for x in p1["contents"] if "/input-" in x["content_id"]]
    recorded_values = inp["prepared"]["values"]
    input_preservation = []
    for item in host_inputs:
        expected = recorded_values[item["source_input_id"]]
        expected = expected["body"] if isinstance(expected, dict) else expected
        input_preservation.append({"input_id": item["source_input_id"], "matches_original_text": item["content_markdown"] == expected, "matches_hash": digest(expected.encode("utf-8")) == item["source_hash"]})
    checks = {
        "original_hash_matches_receipt": identity(original)["sha256"] == "2b9a1183e04c16a9737a181f10ed30774a8f9494d509d0273f493f1d489ab9a1",
        "revision_hash_matches_receipt": identity(manuscript)["sha256"] == "e0fb29d388c9bae19be253e7bd048c31ed8ba40987adf3cdddc8d1bd354ff815",
        "snapshot_hash_matches_receipt": identity(snapshot)["sha256"] == "8c6c8a3006f79f1a769bda75abe722fa4c41d2014f501ee510e3a259bf3fe89e",
        "snapshot_artifact_matches_revision": snap["artifact"]["sha256"] == identity(manuscript)["sha256"],
        "claims_unchanged_from_original": claim["content_markdown"] == original_claim["content_markdown"],
        "tables_unchanged_from_original": p0["tables"] == p1["tables"],
        "original_core_preserved_as_suffix": new_core.endswith(old_core),
        "all_original_warnings_retained": old_ids.issubset(new_ids),
        "all_warnings_still_open": all(x["status"] == "open" for x in p1["warnings"]),
        "all_7_inputs_preserved": len(input_preservation) == 7 and all(x["matches_original_text"] and x["matches_hash"] for x in input_preservation),
        "all_3_input_files_match": all(x["matches"] for x in sources),
        "all_30_producer_members_match": len(checked_members) == 30 and all(x["matches"] for x in checked_members),
        "all_8_payloads_match": len(payload_checks) == 8 and all(x["matches"] for x in payload_checks),
        "bundle_matches_recorded_identity": identity(bundle_path)["sha256"] == source_ids["consumer_bundle"]["sha256"],
        "qualifications_remain_operator_only": len(bundle["qualifications"]) == 2 and all(x["role"] == "operator-only-not-generation" for x in bundle["qualifications"]),
    }
    report = {
        "scope": "M06 raw identity and exact textual preservation; semantic decisions are in m06-content-review.md",
        "checks": checks,
        "verdict": "PASS_IDENTITY_AND_PRESERVATION" if all(checks.values()) else "FAIL",
        "subject": [identity(original), identity(manuscript), identity(snapshot), identity(input_path), identity(bundle_path), identity(source_ids["skill_manifest"]["path"])],
        "input_files": sources,
        "input_preservation": input_preservation,
        "producer_members": checked_members,
        "payloads": payload_checks,
        "warnings_original": len(old_ids), "warnings_revision": len(new_ids),
        "warning_ids": sorted(new_ids),
        "claim_block_provenance": {k: claim[k] for k in ["source_input_id", "source_locator", "source_hash", "trust_status"]},
        "candidate_status": {k: bundle[k] for k in ["skillId", "skillVersion", "frontmatterVersion", "candidateOnly", "producerManifestSHA256"]},
        "professional_signature": None, "user_acceptance": None, "release": False,
    }
    (OUT / "m06-checks.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    freeze_path = ROOT / "docs/evidence/2026-11-05-fast39-mechanism-prep2/PREPARATION-FREEZE.json"
    freeze = json.loads(freeze_path.read_bytes())
    frozen = [{**identity(x["path"]), "matches": identity(x["path"])["sha256"] == x["sha256"]} for x in freeze["files"]]
    binding_path = ROOT / "docs/evidence/2026-11-05-fast39-mechanism-prep2/invocation-binding-final.json"
    binding = json.loads(binding_path.read_bytes())
    pinned = [{"name": k, **identity(binding[k]["path"]), "matches": identity(binding[k]["path"])["sha256"] == binding[k]["sha256"]} for k in ["module", "template", "original_fixture", "R3", "native_tool", "native_validator"]]
    module = Path(binding["module"]["path"])
    tree = ast.parse(module.read_bytes(), filename=str(module))
    selected = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name in ["_real", "_registry_bytes", "assemble", "commit", "_write_new", "_f1", "_verify_setup"]:
            selected[node.name] = {"start": node.lineno, "end": node.end_lineno}
    test_tree = ast.parse(Path(next(x["path"] for x in freeze["files"] if x["path"].endswith("test_revision.py"))).read_bytes())
    names = [n.name for n in ast.walk(test_tree) if isinstance(n, ast.FunctionDef) and n.name.startswith("test_MR")]
    prior_results = ROOT / "docs/evidence/2026-11-05-fast39-mechanism-prep2/test-results-final.json"
    source_root = Path(binding["native_tool"]["path"]).parent.parent
    source_protected = [identity(source_root / rel) for rel in ["AGENTS.md", "README.md", "tools/registry_transaction.py", "tools/validate_workflow_governance.py", "continuous-improvement/weekly-review-workflow-design-latest.md", "continuous-improvement/pending-review.json"]]
    prep = {"scope": "PREP2 final identity and static structure, not actual source execution", "freeze": identity(freeze_path), "freeze_members": frozen, "binding": identity(binding_path), "pins": pinned, "function_locations": selected, "14_regression_names": names, "prior_34_test_result": identity(prior_results), "live_source_files_readonly_baseline": source_protected, "source_mode_executed": False, "test_suite_rerun": False, "verdict": "PASS_IDENTITIES_AND_PARSE" if all(x["matches"] for x in frozen + pinned) and len(names) == 14 else "FAIL"}
    (OUT / "prep2-static-checks.json").write_text(json.dumps(prep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"m06": report["verdict"], "m06_checks": len(checks), "m06_failures": [k for k,v in checks.items() if not v], "PREP2": prep["verdict"], "frozen_members": len(frozen), "pinned_dependencies": len(pinned), "source_calls": 0}, indent=2))
    if not all(checks.values()) or prep["verdict"].startswith("FAIL"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
