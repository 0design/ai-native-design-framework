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
`get-component`, `validate-screen`, `submit-screen` and `request-extension`. The last two are offered only by an
endpoint with staging (e.g. a hosted DS-MCP), need an author token and only stage unaccepted drafts; a read-only
endpoint such as `aindf mcp` lists 7 tools, and an agent reports the need or the validated ScreenSpec to the user.
Every tool carries a `title` and MCP hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`).

The kit contains no design system (test: no QFactory strings in `src/`; `test/fixtures/tiny-ds` is a second DS).
Limits: a builder receipt is not a signature; verified/accepted/released are never written by the kit; isolation of
the author principal comes from deployment rights, not from this package.

Clean install: `node scripts/clean-install.mjs` packs this package, installs the tarball into an empty project and uses
it only as a consumer would — the `aindf` bin (check, bundle, build, `--check`), the package exports and the MCP over
stdio — each step with a negative. CI runs it on Node 20 and 22 and prints the tarball sha256 and kit version it checked.

## Instance on Core (`ds.core` + `ds.coreBundle` + `ds.coreBundleSha256`, 0.2.0-pilot.7)

An Instance that extends a Core pins it in `aindf.config.json` three ways: `ds.core` (`id@version`), `ds.coreBundle`
(path to that Core's AINDF bundle) and `ds.coreBundleSha256` (the bundle's content hash; a self-consistent bundle with the
same `id@version` but other contracts is refused). Generated screens import from one module only — the Instance's
`implementation.module` — so a Core role a screen needs (Input, DialogPanel …) is provided by the Instance under the same
contract name, implemented with the Instance's look. `aindf check` then holds that contract to the Core one: it must
accept every prop value the Core contract accepts —

- every Core prop stays, with its type, required exactly where Core requires it;
- every enum value, allowed binding, rich-text mark and inline component stays (the Instance may add more);
- limits are no tighter: `maxLength`, `minItems`/`maxItems`, `minimum`/`maximum`; the link pattern is the Core one;
- every Core slot prop stays; props the Core role does not have are optional;
- the role keeps its place in a screen: a Core template stays a template, `routeParams` is not added, the taxonomy layer
  is the Core one, every Core slot exists with a cardinality no tighter; slots the Core role does not have are optional
  (min 0);
- every Core component exists in the Instance (contract and taxonomy), every Core binding by name; a `params` or `data`
  binding keeps its kind (a screen uses it as `$.params` / `$.meta`), an `action` binding may change kind (props name it).

What this guarantees: a screen written for Core — its components, props, where they stand, which slots they fill and how
many children, its bindings — admits against the Instance unchanged, with one exception on purpose: what a slot
*accepts* is judged by the Instance's own slotsets (their accepted components are Instance components), so a narrower
`accepts` can still reject a Core screen with `SLOT_REJECTS`. That is not checked here.

`coreConformance(config, components, core, { taxonomy, slots, bindings })`: props, `slotProps`, `template`, `routeParams` and
the Core component list are checked from `components` alone; the taxonomy layer and presence, slots and bindings only when
that source is passed. `checkDs` passes all of them.

Codes: `CORE_PIN` (AINDF-DS-29) when the bundle is not the pinned one; `CORE_CONFORMANCE` (AINDF-DS-30) per narrowed prop,
moved role, narrowed or new required slot, missing component or binding. Without `ds.coreBundle` nothing changes.
