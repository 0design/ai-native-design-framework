# AI-Native Design Framework (AINDF) — Specification

**Version:** 0.1.0 · **Status:** Draft

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

## 7. Single source → generation

A conformant system declares its contracts once (the five sources of §8) and
generates every downstream artifact from them: agent docs, type definitions,
lint rules, and MCP responses. Hand-maintaining any generated artifact breaks
conformance, because drift means an agent reads a stale contract.

## 8. Conformance

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

## 9. Boundary

AINDF contains **schemas, validator, MCP protocol, generators, and an empty
reference theme — and nothing else**. It carries no palette, no fixed modifier
set, and no component library. Conformance test: *could a completely different
design system — its own tokens, components, and modifier vocabulary — be built
using only AINDF?* If yes, the boundary is clean.

## 10. Versioning

AINDF uses semver. A conforming system pins the AINDF version it targets
(`conformsTo: "aindf@0.1"`). The dependency arrow is one-way:
**implementation → design system → framework**, never the reverse.

---

*Draft 0.1. The spec may still change before 1.0. Version 1.0 will come
after at least one real design system has been built on it.*
