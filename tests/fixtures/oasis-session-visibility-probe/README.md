# Oasis session visibility probe

Task 8 installs this verification-only Host plugin into a newly created temporary
`DSH_HOME`. Its loopback-only route appends one empty completed turn to an explicit
live test session. DSH therefore exposes the session in the native sidebar without
submitting a model prompt, using credentials, creating user or assistant messages,
or calling an external service.

The probe is not a product dependency and is never installed into the user's real
DSH Profile.
