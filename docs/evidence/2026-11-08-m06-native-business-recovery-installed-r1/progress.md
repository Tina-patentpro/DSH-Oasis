# R5/P3 ledger — exact rc.2 assembly, 2026-11-08 Asia/Shanghai

- Single agent, reuse current checkout; no commit/push/cleanup or native startup.
- Approved V0.1 and latest continuation cover this next local installer step. rc.2 archive remains frozen 836f658e.
- Ruling: a narrow journaled controller handoff is needed because stateFor binds script bytes. It validates both controllers/bundle before writes, retains old bytes/receipt, uses existing installed lease plus JSON ownership, fails closed/rolls back; no manual expected-hash substitution. Existing original rc.1/134/140 roots untouched.
- TDD: next write targeted handoff tests; business code/resources are not being changed or regenerated.
