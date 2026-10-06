# AI-Native Design Framework (AINDF) — Specification

**Version:** 0.2.0-draft · **Status:** Draft (the 0.1 sections below are the published draft 0.1; 0.2 is implemented
only as a pilot in [`packages/aindf-kit`](packages/aindf-kit) and may change)

AINDF is a specification for building design systems that an AI agent can
**discover, reason about, generate, and validate** without a human in the
loop — while remaining fully usable by humans.

AINDF is not a design system. It is the portable contract layer that any
design system can conform to. A conformant system ships its own tokens,
components, and brand; AINDF defines only the **shape** of the machine-readable
contracts that make it agent-navigable.

---

## 1. Thesis

> **A design system is AI-Native when it is expressed as a graph of
> machine-readable contracts, derived from a single source, and enforced
> automatically.**

A design system is AI-Native when it has these five properties:

1. **Semantic, role-based naming** — components and tokens are named by intent,
   not appearance (`color-accent`, not `blue-500`). Agents select by meaning.
2. **Machine-readable contracts** — every relationship is declared in a schema
   an agent can read, not inferred from prose or screenshots.
3. **A closed, enumerable choice space** — valid combinations are finite and
   declared, so an agent cannot hallucinate an invalid one.
4. **Single source → generation** — contracts are authored once and all
   downstream artifacts (types, lint rules, agent docs, MCP responses) are
   generated, so they never drift.
5. **Enforced but overridable** — a linter checks conformance; cascade layers
   keep the human's last word.

## 2. The contract graph

A conformant system is a typed graph with four kinds of edges. Each edge is
declared once in a machine-readable source and enforced by the validator.

| Edge | From → To | Source schema |
|---|---|---|
| Token applicability | semantic token → property/context | `tokens` |
| Slot content | slot → layer / contract of content | `slots` |
| Modifier applicability | modifier → component / layer | `applicability` |
| Preset | preset → component + filled slots | `presets` |

The graph is traversable in both directions (a slot's allowed content, and the
slots a component may fill) and is the data an AINDF MCP server exposes.

*0.2 adds two sources and one authored artifact on top of this graph:* closed
**component contracts** (§7.1), named **bindings** (§7.2), and the **ScreenSpec**
(§7.3), the only file a screen author writes.

## 3. Axes

Every component is classified on three orthogonal axes.

### 3.1 `layer` — composition depth *(fixed by AINDF)*

| Layer | Definition | Has slots | Accepts |
|---|---|---|---|
| `atoms` | Indivisible primitive. No slots, no composition, little/no logic. | no | — |
| `elements` | Fixed structure, configured by props. No arbitrary child content. | no | props only |
| `blocks` | Composed brick with slots for elements/atoms. | yes | `elements`, `atoms` |
| `sections` | Full-width region with slots for blocks. | yes | `blocks` |

Rule: a slot on layer *N* accepts content of layer *N−1* and below, as narrowed
by its contract.

### 3.2 `role` — semantic purpose *(vocabulary declared by the system)*

AINDF recommends a base vocabulary — `display`, `interactive`, `form`,
`feedback`, `layout` — but a conformant system MAY declare its own. The role
axis is open.

### 3.3 `renderTarget` — where it materializes *(fixed by AINDF)*

`inline` | `overlay`. Overlay is a **render target, not a layer**: the same
component identity rendered in a portal / top-layer. A component MAY support
both (declared per component); some are overlay-only by nature.

## 4. Token tiers *(fixed by AINDF)*

`foundations` → `semantic` → `component`. Tokens reference downward only;
components consume `semantic` / `component`, never `foundations` directly.
A token's **scope** (the properties it may bind to) is its applicability and is
declared in the `tokens` source.

## 5. Modifiers

Cross-cutting properties attached out-of-band (e.g. `data-{category}="value"`),
orthogonal to the layer hierarchy. AINDF defines the **mechanism and schema** of
modifiers and their applicability; it does **not** mandate a fixed set of
categories — the category vocabulary is declared by the conforming system.

## 6. Presets

A preset is a pre-composed, ready-to-use instance of a block or section whose
slots are already filled with a sensible default arrangement, captured as
machine-readable data plus copy-paste markup. A preset references existing
components; it introduces no new component identity and is valid by
construction.

### 6.1 Patterns

A **pattern** is a parametrized composition recipe: it composes existing
components into a section / block / composite, and exposes **clarifying
parameters** an agent asks before assembly (e.g. "text or icon button?",
"how many grid columns?", "static or clickable card?"). A preset is a pattern
with all parameters bound. Patterns reference only declared components, so
`compose` is valid against `slots` and `applicability` by construction; a
pattern MAY also list `gaps` — components it needs that the design system has
not built yet (patterns therefore drive what to build next). Schema:
`patterns`. The composition stack, in descending determinism:

> **prompt** (intent) → **skill** (procedure) → **pattern** (parametrized
> recipe) → **preset** (bound instance) → **component** (primitive).

## 7. Screens from contracts *(new in 0.2)*

0.1 describes what a design system offers. 0.2 adds how a screen is authored
against it, and why the result can be checked: the author writes data, never
markup, styles or code, and that data is admitted against one exact revision of
the design system.

### 7.1 Component contracts (`components`)

Every component an author may place has a **closed contract**: its export name
in the implementation module, and every prop the author may set with a closed
type — `text`, `enum`, `boolean`, `number`, `textList`, `binding`, `richText` —
plus its limits (`maxLength`, `minItems`/`maxItems`, `minimum`/`maximum`, enum
`values`, allowed `bindings`, rich-text `marks`, `inlineComponents`,
`hrefPattern`). Anything undeclared is rejected: `className`, `style`,
`children`, handlers and markup cannot be declared as author props at all.

A contract MAY also declare: `template` (it can frame a whole screen; the
screen's sections render as its children), `slotProps` (which prop receives
each slot's content), `routeParams` (it reads the parameters of a `[param]`
route), `states`, `accessibility` notes and `examples` (good and bad).

### 7.2 Bindings (`bindings`)

Data and behaviour live in the design system's implementation, never in a
screen. The design system declares named **bindings**, each of one kind:

| Kind | What it is | Where a screen uses it |
|---|---|---|
| `data` | a value the system provides (e.g. metadata text) | `meta.title` / `meta.description` |
| `action` | a side effect behind a component | a `binding` prop, from its allowlist |
| `params` | the static parameters of a `[param]` route | `params.binding` |

A screen refers to a binding by name only. The kind is checked only where a
screen uses it directly: `params.binding` must be a `params` binding and a
`meta` binding must be a `data` binding. A `binding` prop is matched by name
against its allowlist.

### 7.3 ScreenSpec (`screen`)

A ScreenSpec is a JSON document with a `route`, one `template` node and ordered
`sections`. Each node names a component, sets declared props and fills declared
slots with further nodes. It is **pinned** to one design-system revision by
`ds.id`, `ds.version` and `ds.bundleSha256` (§7.4). It contains no markup,
styles, code or undeclared fields.

### 7.4 Bundle and pin

A design system revision is published as an immutable **bundle**: its identity
(`ds`), `conformsTo`, `implementation` and every contract source in one
document, addressed by `bundleSha256` — the sha256 of its canonical JSON
(object keys sorted at every level, no whitespace, a trailing `\n`). Screens pin
it; the MCP server serves it. A bundle whose hash, recomputed from its parsed
JSON, differs from `bundleSha256` is refused. A bundle is only produced from a
design system that passes conformance (§9). The design-system maintainer
produces it (`aindf bundle`) and publishes it wherever its builder and MCP
server read it from; AINDF does not prescribe a registry.

### 7.5 Admission

Admission checks one ScreenSpec against one bundle and returns either `ok` or a
list of errors, each with a stable code and a path, so an agent can repair the
screen without reading source. It refuses, among others: a screen pinned to
another revision; unknown components, props, slots or fields; a non-template in
the template position; a non-`sections` component as a section; slot content the
slot does not accept or outside its cardinality; values outside their type and
limits; a binding prop outside its allowlist; a `params` or `meta` binding that
is unknown or not of kind `params` / `data`; route parameters that do not match
the route. Codes: [`RULES.md`](packages/aindf-kit/RULES.md), `AINDF-SCR-*`.

### 7.6 Build and states

A **trusted builder** — not the author — generates code from admitted screens
and the pinned bundle. Generated files are marked, and the check mode (`aindf build --check`) compares
them with what the screens and the bundle produce:
a hand edit, a stale screen, a changed bundle or an orphan page fails
(`AINDF-BLD-*`). On request (`--receipts`) a build writes a **receipt** per
screen that binds the screen bytes, the bundle and the generated output.

A result passes through states that are never collapsed into one claim:
**built** (the builder wrote the receipt) → **verified** (an independent check
passed) → **accepted** (the design-system owner accepted it) → **released**.
The builder only ever writes `built`; a receipt is not a signature and not
acceptance. *In the pilot, `verified`, `accepted` and `released` are not
recorded by the kit at all*: whoever runs the independent check, the owner and
the release process record them outside AINDF.

Before a build, the MCP server reports its own states to the author: a
submitted screen that fails admission is `rejected`; an admitted one is staged
as a `draft` for the trusted builder; an extension request is `requested`.

The pilot generates Next.js App Router pages (`implementation.framework:
"next-app"`) that import components from one module only,
`implementation.module`, owned by the design system.

### 7.7 Instance on Core

A design system (an **Instance**) may extend another one (a **Core**). It pins
the Core by `ds.core` (`id@version`), `ds.coreBundle` (path to the Core bundle)
and `ds.coreBundleSha256` (its content hash). Screens import only the Instance
module, so the Instance provides every Core role under the same contract name.
Conformance then holds each such contract to the Core one (`AINDF-DS-30`;
the pin itself: `AINDF-DS-29`), so a screen written for the Core admits against
the Instance unchanged **except its `ds` pin**, which names the Core revision
and must be moved to the Instance revision (`aindf repin`; otherwise
`DS_PIN_MISMATCH`). No Core prop, value, limit, slot, component or placement is
narrowed, and anything the Instance adds is optional. Every Core binding must
exist; its kind must stay the same only for `params` and `data` bindings, the
only kinds admission checks. One exception is deliberate: what a slot
*accepts* is decided by the Instance (`AINDF-DS-30`). Without `ds.coreBundle`
none of these Core checks run.

### 7.8 Requests instead of workarounds

When the design system lacks something, the author does not write its own
markup or styles: it asks for an extension (`request-extension`, §9). The
request is recorded for the design-system owner, who decides on it.

## 8. Single source → generation

A conformant system declares its contracts once (the five sources of 0.1,
seven in 0.2 — §9 — plus optional patterns) and
generates every downstream artifact from them: agent docs, type definitions,
lint rules, and MCP responses. Hand-maintaining any generated artifact breaks
conformance, because drift means an agent reads a stale contract.

## 9. Conformance

A design system claims **AINDF 0.1 conformance** when it:

1. publishes the five contract sources, each validating against its schema:
   `tokens`, `taxonomy`, `slots`, `applicability`, `presets`;
2. classifies every component on all three axes (`layer`, `role`,
   `renderTarget`);
3. references tokens downward only (no component → `foundations` binding);
4. ensures every slot target and every modifier target resolves to a declared
   component or layer (no dangling edges);
5. generates its agent docs / types / lint / MCP responses from those sources;
6. exposes the AINDF MCP query surface (`list-by-facet`, `slot-accepts`,
   `applicable-modifiers`, `get-preset`);
7. passes the AINDF conformance validator with no errors.

A design system claims **AINDF 0.2 conformance** (`conformsTo: "aindf@0.2"`,
draft) when, in addition:

8. it publishes an `aindf.config.json` naming its identity, every source, and
   its `implementation` (framework and module);
9. every classified component has a closed contract (`components`) and every
   contract is classified; no contract declares a forbidden prop;
10. every binding a contract refers to is declared (`bindings`) and every
    `binding` prop has an allowlist (bindings a screen's `meta` or `params`
    name are checked at admission, §7.5);
11. it publishes revisions as bundles (§7.4) and admits screens only against a
    pinned bundle (§7.5);
12. its MCP server also exposes `get-ds`, `get-component` and `validate-screen`;
    staging tools (`submit-screen`, `request-extension`) need an author token and
    never build, verify, accept or release;
13. as an Instance on a Core, it passes the Core checks of §7.7.

A broken rule fails with a stable rule ID and code; nothing is ignored, and the
kit never fixes a source or a screen on its own. Two limits of the pilot: a file
that is not valid JSON fails with the parser's error, not a rule code; and
`aindf repin` rewrites the `ds` pin of screens — on explicit request, and only
for screens that admit against the new revision.
The full list: [`packages/aindf-kit/RULES.md`](packages/aindf-kit/RULES.md).
Schemas: 0.1 in [`schemas/`](schemas), 0.2 additions in
[`packages/aindf-kit/schema/0.2`](packages/aindf-kit/schema/0.2).

## 10. Boundary

AINDF is meant to contain **schemas, a validator, an MCP protocol, generators
and an empty reference theme — and nothing else**. Today this repository holds
the spec and the schemas; the validator, the MCP server and one generator
(Next.js pages) exist only as a pilot in `packages/aindf-kit`; there is no
reference theme yet. It carries no palette, no fixed modifier set and no
component library. Conformance test: *could a completely different
design system — its own tokens, components, and modifier vocabulary — be built
using only AINDF?* If yes, the boundary is clean.

## 11. Versioning

AINDF uses semver. A conforming system pins the AINDF version it targets
(`conformsTo: "aindf@0.1"` or, for the 0.2 draft, `"aindf@0.2"`). A screen pins
one exact design-system revision (§7.4); a new revision means re-admitting the
screens against it. The dependency arrow is one-way:
**implementation → design system → framework**, never the reverse.

---

*Draft. 0.1 is the published draft; 0.2 is a draft implemented only as a pilot. The spec may
still change before 1.0. Version 1.0 will come after at least one real design
system has been built on it.*
