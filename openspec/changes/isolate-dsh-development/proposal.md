# Change: Isolate the DSH development upgrade

## Why
The previously tested development copy has no dual-instance isolation acceptance. Daily use must remain unchanged while testing the pinned upgraded combination.

## What Changes
- Create a new private development application, runtime, profile and synthetic workspaces.
- Freeze source and dependency evidence; retain the old development copy.
- Gate product adaptation on dual-instance identity, writeback and lifecycle acceptance.

## Impact
- Local-only candidate under .dsh-test/isolated-dev-20260913; no daily/global upgrade.
- No credentials, real model/API calls, user materials, publication or remote changes.
- Implementation and acceptance follow docs/plans/2026-09-13-dsh-isolated-development-upgrade-v2.md.
