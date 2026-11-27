"""Load pinned PREP2 bytes in its recorded runtime, without setup/assemble/commit."""
from pathlib import Path
import hashlib
import importlib.metadata
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
binding = json.loads((ROOT / "docs/evidence/2026-11-05-fast39-mechanism-prep2/invocation-binding-final.json").read_bytes())
loaded = []


def load(name, key):
    ref = binding[key]
    path = Path(ref["path"])
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == ref["sha256"], key
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    # Compile these very bytes, bypassing any pre-existing pyc cache.
    exec(compile(raw, str(path), "exec"), module.__dict__)
    assert path.read_bytes() == raw, "loaded file drift"
    loaded.append({"module_name": name, "path": str(path), "sha256": ref["sha256"], "loader": "compile verified original raw bytes"})
    return module


assert sys.version_info[:3] == (3, 12, 14)
assert importlib.metadata.version("jsonschema") == "4.26.0"
native = load("registry_transaction", "native_tool")
validator = load("validate_workflow_governance", "native_validator")
calls = []


def forbidden(*args, **kwargs):
    calls.append("unexpected source/setup/lock/governance operation")
    raise AssertionError(calls[-1])


native.apply_transaction = forbidden
native.registry_lock = forbidden
validator.validate_workspace = forbidden
module = load("prep2_review_subject", "module")
module._pins()
assert module.P == ROOT
assert module.W == Path(binding["module"]["path"]).parent
assert module.native is native and module.governance is validator
assert not calls
result = {"verdict": "PASS_PINNED_LOAD_ONLY", "python": sys.version, "jsonschema": importlib.metadata.version("jsonschema"), "interpreter": sys.executable, "loaded": loaded, "pins_checked": True, "source_setup_lock_governance_calls": len(calls), "materialize_assemble_commit_called": False, "suite_rerun": False, "scope": "Current review loading identity only, not actual source callsite or source acceptance"}
(OUT / "prep2-load-check.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({k: v for k, v in result.items() if k != "loaded"}, ensure_ascii=False, indent=2))
