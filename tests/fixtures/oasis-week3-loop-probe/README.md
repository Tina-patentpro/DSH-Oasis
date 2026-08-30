# Oasis Week 3 local-loop probe

This directory is copied into fresh temporary Workspace A and Workspace B roots.

- `materials/technical.md` is registered by the technical R&D workflow.
- `materials/patent-disclosure.txt` is registered by the Chinese invention patent workflow.
- The verification harness records lstat, length, and SHA-256 for every existing file before Host1 starts.
- The fixture files must remain byte-for-byte unchanged. Only explicitly prepared no-overwrite writeback files may be added.

The material service records metadata and SHA-256 only. The local mock must not read or expose the file body.
