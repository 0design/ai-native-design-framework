# @aindf/kit — AINDF v2 pilot kit

One dependency-free package for any design system that conforms to AINDF (`conformsTo: "aindf@0.2"`):

| Command | Role | What it does |
|---|---|---|
| `aindf check <aindf.config.json>` | DS maintainer | Conformance: sources validate against the pinned AINDF 0.1 schemas (`schema/0.1`, SHA256SUMS) and the v0.2 additions (`schema/0.2`), no dangling slot/modifier/preset edges, layer rule, downward-only tokens, closed props (no className/style/children/handlers), bindings resolve. |
| `aindf bundle <config> --out <file>` | DS maintainer | Immutable, content-addressed DS revision (`bundleSha256`). Screens pin it; the MCP serves it. |
| `aindf build <config> --screens <dir> --app <dir> [--check]` | trusted builder | Admits every `*.screen.json`, generates Next.js App Router pages (`// @generated`), `--check` fails on manual edits, stale specs, DS changes and orphans; writes `built` receipts only. |
| `aindf mcp <bundle.json>` | screen author | stdio MCP; `createDsMcp` + `mcpFetchHandler` run the same server on an edge runtime. |

v0.2 additions to the public AINDF 0.1 contract graph: `components` (closed prop/slot/state contracts, templates),
`bindings` (named data/action adapters implemented by the DS), `screen` (the only author artifact), `receipt`, `config`.
MCP surface: AINDF 0.1 `list-by-facet`, `slot-accepts`, `applicable-modifiers`, `get-preset` plus `get-ds`,
`get-component`, `validate-screen`, `submit-screen` and `request-extension` (the last two need an author token and
only stage unaccepted drafts).

The kit contains no design system (test: no QFactory strings in `src/`; `test/fixtures/tiny-ds` is a second DS).
Limits: a builder receipt is not a signature; verified/accepted/released are never written by the kit; isolation of
the author principal comes from deployment rights, not from this package.

## Instance on Core (`ds.core` + `ds.coreBundle` + `ds.coreBundleSha256`, 0.2.0-pilot.2)

An Instance that extends a Core pins it in `aindf.config.json` three ways: `ds.core` (`id@version`), `ds.coreBundle`
(path to that Core's AINDF bundle) and `ds.coreBundleSha256` (the bundle's content hash; a self-consistent bundle with the
same `id@version` but other contracts is refused). Generated screens import from one module only — the Instance's
`implementation.module` — so a Core role a screen needs (Input, DialogPanel …) is provided by the Instance under the same
contract name, implemented with the Instance's look. `aindf check` then holds that contract to the Core one: it must
accept every prop value the Core contract accepts —

- every Core prop stays, with its type, required exactly where Core requires it;
- every enum value, allowed binding, rich-text mark and inline component stays (the Instance may add more);
- limits are no tighter: `maxLength`, `minItems`/`maxItems`, `minimum`/`maximum`; the link pattern is the Core one;
- every Core slot prop stays; props the Core role does not have are optional.

What this guarantees: the **props** a screen sets for a Core role admit against the Instance unchanged. What fills a slot
is judged by the Instance's own slotsets (its accepted components are Instance components).

Codes: `CORE_PIN` (AINDF-DS-29) when the bundle is not the pinned one; `CORE_CONFORMANCE` (AINDF-DS-30) per narrowed prop
or dropped slot. Without `ds.coreBundle` nothing changes.
