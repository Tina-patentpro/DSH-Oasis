## ADDED Requirements

### Requirement: Oasis is a native page, not a synthetic file resource
The pinned Better Sidebar 0.19.1 public registration adapter SHALL project the
Oasis descriptor into DSH native keyed Sidebar tab slots. The business plugin
SHALL retain the public targeted-session open and SHALL NOT use private stores,
DOM or structural single-slot replacement.

#### Scenario: Open Oasis from session A while another session is active
- WHEN the public targeted open is called with the Oasis page kind
- THEN the native surface receives session A and the Oasis kind
- AND it receives no placeholder file path or file resource address.

#### Scenario: Safety capability is absent
- WHEN the fixed host lacks verified inert rich-text/file-preview capabilities
- THEN Oasis renders inert plain text and disables its saved-file open action
- AND this limitation remains explicit, not a completed rich-preview acceptance.
