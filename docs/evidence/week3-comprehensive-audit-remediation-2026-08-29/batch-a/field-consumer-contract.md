# Stored Field Consumer Contract

| Producer field | Consumer | Mutable? | Required integrity source |
| --- | --- | --- | --- |
| `run.mockVersion` | local-mock replay and writeback metadata | No | Supported version registry |
| workflow identity + input snapshot | replay, preview context, artifact generation | No | Versioned canonical input SHA-256 |
| `result.contentStatus` | approval and writeback blocking | No | Complete deterministic result replay |
| `result.sections` | result preview | No | Complete deterministic result replay |
| `result.risks` | result preview and human review | No | Complete deterministic result replay |
| `result.questions` | result preview and blocking questions | No | Complete deterministic result replay |
| `result.disclaimer` | professional-boundary preview | No | Complete deterministic result replay |
| artifact metadata/body | preview and writeback | No | Complete deterministic result replay plus content SHA-256 |
| `review` | review workflow and writeback prerequisite | Yes | Schema invariants, service transition validation, repository revision CAS |
| `writebacks` | history and artifact ownership | Yes | Schema invariants, two-phase service transition, repository revision CAS |

The remediation is accidental-corruption fail-closed behavior, not a keyed tamper-proof security system.
