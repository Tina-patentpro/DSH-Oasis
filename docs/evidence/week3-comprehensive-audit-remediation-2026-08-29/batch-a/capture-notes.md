# Evidence Capture Notes

The first attempt to redirect the four RED test outputs used quoted `--test-name-pattern` values that `cmd` escaped into invalid regular expressions. Those commands exited before executing tests. They were immediately retried with simple unquoted regex patterns (`rejects.*persisted`, `dispose.*deadline`, `public.*Better.*Sidebar`, and `workspace.*display.*name`). The four retained `red-*.txt` files are the retry outputs and each contains one executed `not ok` assertion for the audited missing behavior; none contains `ERR_INVALID_ARG_VALUE`.
