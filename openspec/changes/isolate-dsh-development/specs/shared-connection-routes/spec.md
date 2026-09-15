## ADDED Requirements

### Requirement: Owned routes on the target shared Connection
The isolated DSH 0.1.5-rc.1 candidate SHALL register only exact POST routes in
/api/oasis-workbench/ using the public connection.fetch.register API.
The Client SHALL call /api with oasis-workbench-prefixed methods. The existing
business handler SHALL retain payload validation, ownership checks and result schemas.

#### Scenario: Caller lacks webServer injection
- WHEN Oasis registers its routes through its Connection dependency
- THEN registration succeeds without reading webServer from the Oasis context
- AND disposing the caller removes only its own routes.

#### Scenario: Malformed or mismatched transport
- WHEN a request has invalid JSON, media type, correlation or method/path pairing
- THEN it is rejected before business dispatch
- AND no automatic replay or real-service fallback occurs.

The shared Host/Origin and browser-authentication fence remains the Host's owner.
In-memory dispatch evidence does not establish a real HTTP authentication result.
