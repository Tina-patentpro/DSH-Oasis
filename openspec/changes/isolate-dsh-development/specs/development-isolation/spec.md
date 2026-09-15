## ADDED Requirements

### Requirement: Private development ownership
The development launcher SHALL use a private application and data roots and SHALL NOT reuse daily credentials, profiles or workspaces.

#### Scenario: Daily application is already open
- **WHEN** the user opens the private development entry
- **THEN** the development application uses its own executable, Home, Profile and userData
- **AND** the daily process and protected configuration remain unaffected

### Requirement: Single development writer
The development entry SHALL reject overlapping launches targeting the same development storage and retain the native application single-instance protection.

#### Scenario: Development application is running
- **WHEN** the entry is launched again
- **THEN** it does not create a second development Host writer

### Requirement: Evidence-gated adaptation
Product adaptation SHALL remain gated until the scoped dual-instance, file writeback and lifecycle evidence is complete.

#### Scenario: UI evidence is missing
- **WHEN** static checks pass but the user has not verified the required UI operation
- **THEN** the stage remains incomplete and higher-layer acceptance is not claimed
