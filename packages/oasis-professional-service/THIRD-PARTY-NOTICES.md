# Third-Party Notices

This file records the third-party material identified below in this local candidate. It does not grant rights in other components, establish a complete dependency or source-rights inventory, or announce a public release. Each third-party component retains its own license and copyright notices.

## Zod 4.4.3

Copyright (c) 2025 Colin McDonnell.

License: MIT. The complete license text is included in [licenses/zod-4.4.3-MIT.txt](licenses/zod-4.4.3-MIT.txt).

The existing browser build `lib/client.js` includes Zod code, with 17 Zod source members identified in `lib/client.js.map`. Host-side source also imports Zod. This notice applies to the Zod material; it does not change the terms applicable to project-owned code or other dependencies.

## cn-patent-drafting: named drafting-method fragments

Copyright (c) 2026 Huang Xinzhe.

Recorded source commit: `9be95a93c096d682f1a72613725cda990c2ef594`.

License: MIT. The complete license text is included in [licenses/cn-patent-drafting-MIT.txt](licenses/cn-patent-drafting-MIT.txt), preserving the original 1090 bytes, including line endings.

The M06 business candidate uses the following seven named method fragments through adapted drafting instructions:

| Fragment | Recorded source | Recorded lines | Purpose and limit |
|---|---|---|---|
| CAND-CNWRITE-01 | references/disclosure-and-application.md | 94–116 | Claim/document outline scaffold; does not establish substantive independent/dependent claim boundaries |
| CAND-CNWRITE-02 | references/disclosure-and-application.md | 117–138 | Description/support-anchor structure; does not establish a support conclusion |
| CAND-CNWRITE-03 | references/disclosure-and-application.md | 162–168 | Drafting style; description wording must not be treated as an unrestricted claim rule |
| CAND-CNWRITE-04 | references/disclosure-and-application.md | 39–43 | Missing-figure and unsupported-structure handling; placeholders are not final deliverables |
| CAND-CNWRITE-05 | references/intake-and-scan.md | 41–47 | Problem–means–effect recording; does not establish patentability |
| CAND-CNWRITE-06 | references/intake-and-scan.md | 28–39 | Feature/evidence/gap table fields; risk fields are not legal conclusions |
| CAND-CNWRITE-07 | references/intake-and-scan.md | 14–24 | Evidence-anchor ordering; does not expand the permitted generation inputs |

The full original fragment hashes, adoption positions and conditions remain in the `THIRD-PARTY-NOTICE.md` resource embedded in [src/m06-business-candidate-0.1.3.json](src/m06-business-candidate-0.1.3.json). Its complete MIT text and scope statements remain intact. This package-level notice supplements that resource notice rather than replacing it or broadening its coverage.

## Scope that remains separate

The MIT notices above do not grant rights in host software, other libraries, trademarks, official/reference materials, customer inputs, evaluation materials or inventions described in any document. Previously excluded source carriers remain excluded. Existing source/history qualifications, candidate status and professional/user acceptance limits remain applicable.

The proposed OasisIntWrite Community License 1.0 is maintained separately as a draft. This notice does not adopt it, relicense the MIT material, or change the package's existing private/version configuration. Final release composition and remaining third-party rights must be reviewed against the actual distribution.
