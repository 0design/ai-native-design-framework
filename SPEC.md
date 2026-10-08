# AI-Native Design Framework (AINDF) — Specification

Version 0.2.0 · Draft

## Why I created AI-Native Design Framework?

| My pain | How I solved it |
|---|---|
| “You’re absolutely right, I ignored your design system and hardcoded UI. Again.” | I solved it by taking the screen-author agent’s access to code away. Instead of full freedom it has a limited set of tools: look at what the design system has, assemble a screen as a config from its components, and check it. Every component has a contract: a closed list of settings, with no `className` or `style`. The agent cannot hardcode because it has no way to. The code is written by a separate builder that the agent does not control. What the agent may touch is set by the access I give it; AINDF supplies the contracts, the tools and the check. |
| “It’s one thing that AI uses the design system, and quite another how it uses it and what comes out.” | I solved it by mapping components along three axes: depth (atom → element → block → section), role, and where it lives (inline or overlay). The mapping is the decision algorithm: the agent picks a section, sees what its slots accept, and goes down to the atoms. Where the design system defines a pattern, it lists the clarifying questions to ask before assembling. The agent walks the tree instead of guessing. |
| “I asked you to get rid of this slop everywhere.” | I solved it by pinning every screen to one version of the design system. A fix is made once in the design system, and every screen that passes against the new version, once it is moved there with `aindf repin`, gets it with the next build. |
| “Only the on-page nav. No extra text. And mark it as slop: you made texts I didn’t ask for.” | I solved it by giving the agent only places that exist. A screen is built from the components, slots and settings the design system declares. Anything the contracts have no place for, such as an unknown component, slot, setting or field, or more items than a slot allows, is refused with a code and a path in the config. Text I did not ask for can still go into a text setting the design system declares, so that stays my review. If the agent thinks something is missing, it asks me instead of adding it. |
| “Monospace fonts are not slop by themselves, but AI abuses them badly.” | I solved it by taking fonts away from the agent. Unless the design system declares a font setting, a screen has none. Typography lives in the design system’s tokens and components, so where a monospace font appears is decided once, by me, in the design system. The agent cannot spread it around because there is nothing to set. |
| “Instead of the purple background, use the same background color as the header tabs.” | I solved it by closing colors off from the agent. Unless the design system declares a color setting, a screen has none. Which token a component uses is decided in the design system, not by the screen, so “the same background as the header tabs” is a token the design system already has, not a value the agent picks. AINDF checks the token tiers, not the component’s CSS. |
| “And bring back the approved covers and the masonry grid.” | I solved it by making a design-system version immutable. A version is one bundle addressed by its hash, and a screen is pinned to it. A change to what I approved is a new version, not an edit in place, so if I keep the old design-system sources, the approved version is still there and I can point the screens back at it with `repin`. |
| “This is slop! It must not appear on stage or on prod. If I miss it on stage, you can push it to prod.” | I solved it by making the gates mechanical instead of relying on my attention. The check runs when the agent checks a screen and again inside every build, and a generated page that was edited by hand or went stale fails the build check. The builder only ever marks a result as built; accepting and releasing are my steps, and the plugin and the CLI give the agent no tool for them (who may do them is set by the access I give). |
| “Needs to be implemented on mine, just crookedly.” | I solved it by letting the agent assemble screens only from the real components of my design system. It does not redraw a button or a card; it picks from what the design system offers, and the check refuses a component the design system does not have. |
| When something is missing, the agent writes its own CSS. | I solved it by giving the agent a way to ask instead of work around. If the design system lacks something, the agent records an extension request where the server can record it, or tells me, and I decide whether the design system grows. Until then the screen stays as it is, because a screen config cannot carry CSS. |

## Separate zones of responsibility

AINDF is a way to write your design system down so that an AI agent builds screens only from it. Your tokens, components, slots (the places inside a component that hold other components) and the rules between them become one machine-readable model. The agent reads that model, writes a screen as a config (a JSON file that lists the components and their settings), and a check refuses anything your design system does not have. You keep your own tokens, components and brand.

| Who | Responsible for | So that |
|---|---|---|
| Design-system owner (a person or a separate agent) | the contracts, the design-system versions, accepting results | the rules are changed by a separate role, not by the screen author in the middle of a task |
| The agent, the screen author | assembles screens from what exists; asks for what is missing | it cannot “temporarily” add its own CSS |
| The check | refuses with a code and a place in the config | the agent fixes the screen from the answer, not from a person’s explanation |
| The builder | generates code only from checked configs | a hand edit or a stale generated page fails `aindf build --check` |

The check runs when your agent calls `validate-screen` (the design system's MCP tool for it) and again inside every build. You or your CI (the checks that run on every pull request) run the build (`aindf build`); it writes the pages into your app. A screen config cannot carry HTML, CSS or code: the check refuses it. Who may change the design system, the checks or the built pages is set by the access each party has, not by AINDF.

## How it works

```
  your prompt
       │
       ▼
  your agent ◀──── MCP ────▶ your design system
       │            asks what it offers: components, slots, modifiers, presets
       ▼
  screen config (JSON, pinned to one version of your design system)
       │
       ▼
  check ── refused: "Heading has no prop color; …" ──▶ your agent asks you
       │                                               to add it to your
       │ passes                                        design system
       ▼
  builder ──▶ a screen built only from your design system
```

## An example: one refusal

You ask your agent: *"Make the headline violet and bigger."* The demo design system in [`examples/demo-ds`](examples/demo-ds) has a `Heading` whose only prop (a setting a screen may set) is `text`. Your agent writes this screen config. It names the design-system version it is written for (`ds`), with a hash — a fingerprint of that version's bundle, the one file that holds the version. It also names the page address (`route`), the page frame (`template`) and the sections inside it:

```json
{
  "kind": "aindf.screen",
  "aindfVersion": "0.2",
  "ds": { "id": "aindf-demo", "version": "0.1.0", "bundleSha256": "5d99ff815ead205a4f78870f4fa3ff5803fae858a5e1015df0e140219efd538a" },
  "route": "/pricing",
  "template": { "component": "Page", "props": { "title": "Pricing" } },
  "sections": [
    {
      "component": "Hero",
      "props": { "tone": "bold" },
      "slots": {
        "title": [
          { "component": "Heading", "props": { "text": "Pricing", "color": "violet", "size": "xl" } }
        ]
      }
    }
  ]
}
```

The check answers:

```json
{
  "ok": false,
  "errors": [
    { "code": "UNKNOWN_PROP", "path": "$.sections[0].slots.title[0].props.color", "message": "Heading has no prop color; allowed: text" },
    { "code": "UNKNOWN_PROP", "path": "$.sections[0].slots.title[0].props.size", "message": "Heading has no prop size; allowed: text" }
  ]
}
```

Your agent does not style the headline by hand. It tells you that the design system has no color or size for `Heading`, and you decide whether to add them. To see this answer yourself, clone this repository, start Claude Code with the plugin from the clone (`claude --plugin-dir plugin`), leave its design-system bundle setting empty so it serves the demo, and ask your agent to call `validate-screen` with this config.

## Glossary

| Term | Meaning |
|---|---|
| Design system | Your tokens, components and the rules between them, written as AINDF contract sources. |
| Contract source | One JSON file of the design system: `tokens`, `taxonomy`, `slots`, `applicability`, `presets`, `components`, `bindings` (§2, §7). |
| Component contract | The closed list of props a screen may set on one component, with their types and limits (§7.1). |
| Slot | A named place inside a component that holds other components (§3.1). |
| Token tier | `foundations`, `semantic` or `component`: raw values, values by meaning, values for one component (§4). |
| Modifier | A setting that can apply to many components, such as `emphasis` in the demo, kept apart from their props (§5). |
| Prop | One setting of a component that a screen config may set, such as a heading's `text` (§7.1). |
| MCP | Model Context Protocol: the way an agent asks a tool for data. The design system's MCP server answers what the design system offers and checks screen configs (§9). |
| Preset | A ready-made component with its slots already filled (§6). |
| Binding | A named data value or action that the design system implements; a screen refers to it by name (§7.2). |
| Screen config (ScreenSpec) | The only file your agent writes: a route, a template and sections built from components (§7.3). |
| Bundle | One immutable version of the design system, addressed by its content hash (§7.4). |
| Pin | The design-system id, version and bundle hash a screen config is written for (§7.3). |
| Screen check (admission) | The step that accepts a screen config against one bundle or refuses it with codes (§7.5). Your agent runs it with `validate-screen`. |
| Design-system check (conformance) | The step that checks the design system itself (§9). For 0.2, `aindf check`. |
| Screen author | Whoever writes screen configs; usually your agent (§7). |
| Builder | The step you trust to build pages from screen configs that passed the check (§7.6). |
| Extension request | Your agent's request to add something the design system lacks (§7.8). |
| Core and Instance | A shared design system (Core) and a project design system that extends it (Instance) (§7.7). |
| Conformant | A design system that passes the design-system check (§9). |

---

## 1. Thesis

> **A design system is AI-Native when it is expressed as a graph of machine-readable contracts, derived from a single source, and enforced automatically.**

A design system is AI-Native when it has these five properties:

1. **Semantic, role-based naming**: components and tokens are named by intent, not appearance (`color-accent`, not `blue-500`). Agents select by meaning.
2. **Machine-readable contracts**: every relationship is declared in a schema an agent can read, not inferred from prose or screenshots.
3. **A closed, enumerable choice space**: valid combinations are finite and declared, so an agent cannot hallucinate an invalid one.
4. **Single source → generation**: contracts are authored once and all downstream artifacts (types, lint rules, agent docs, MCP responses) are generated, so they never drift.
5. **Enforced, with people deciding**: checks refuse what the contracts do not allow. The design-system owner changes the contracts and accepts results.

## 2. The contract graph

A conformant system is a typed graph with four kinds of edges. Each edge is declared once in a machine-readable source and enforced by the design-system check.

| Edge | From → To | Source schema |
|---|---|---|
| Token applicability | semantic token → property/context | `tokens` |
| Slot content | slot → layer / contract of content | `slots` |
| Modifier applicability | modifier → component / layer | `applicability` |
| Preset | preset → component + filled slots | `presets` |

The graph is traversable in both directions (a slot's allowed content, and the slots a component may fill); the MCP server answers the first direction: what a slot accepts.

Version 0.2 adds two sources and one authored artifact on top of this graph: closed **component contracts** (§7.1), named **bindings** (§7.2), and the **ScreenSpec** (§7.3), the only file a screen author writes.

## 3. Axes

Every component is classified on three orthogonal axes.

### 3.1 `layer`: composition depth *(fixed by AINDF)*

| Layer | Definition | Has slots | Accepts |
|---|---|---|---|
| `atoms` | Indivisible primitive. No slots, no composition, little/no logic. | no | — |
| `elements` | Fixed structure, configured by props. No arbitrary child content. | no | props only |
| `blocks` | Composed brick with slots for elements/atoms. | yes | `elements`, `atoms` |
| `sections` | Full-width region with slots for blocks. | yes | `blocks` |

Rule: a slot on layer *N* accepts content of layer *N−1* and below, as narrowed by its contract.

### 3.2 `role`: semantic purpose *(vocabulary declared by the system)*

AINDF recommends a base vocabulary (`display`, `interactive`, `form`, `feedback`, `layout`), but a conformant system MAY declare its own. The role axis is open.

### 3.3 `renderTarget`: where it materializes *(fixed by AINDF)*

`inline` | `overlay`. Overlay is a **render target, not a layer**: the same component identity rendered in a portal or top layer. A component MAY support both (declared per component); some are overlay-only by nature.

## 4. Token tiers *(fixed by AINDF)*

`foundations` → `semantic` → `component`. Tokens reference downward only; components consume `semantic` / `component`, never `foundations` directly. A token's **scope** (the properties it may bind to) is its applicability and is declared in the `tokens` source.

## 5. Modifiers

Cross-cutting properties attached out of band (e.g. `data-{category}="value"`), orthogonal to the layer hierarchy. AINDF defines the **mechanism and schema** of modifiers and their applicability; it does **not** mandate a fixed set of categories. The category vocabulary is declared by the conforming system.

## 6. Presets

A preset is a pre-composed, ready-to-use instance of a block or section whose slots are already filled with a sensible default arrangement, captured as machine-readable data plus copy-paste markup. A preset references existing components; it introduces no new component identity and is valid by construction.

### 6.1 Patterns

A **pattern** is a parametrized composition recipe: it composes existing components into a section, block or composite, and exposes **clarifying parameters** an agent asks before assembly (e.g. "text or icon button?", "how many grid columns?", "static or clickable card?"). A preset is a pattern with all parameters bound. Patterns reference only declared components, so `compose` is valid against `slots` and `applicability` by construction; a pattern MAY also list `gaps`: components it needs that the design system has not built yet (patterns therefore drive what to build next). Schema: `patterns`. The composition stack, in descending determinism:

> **prompt** (intent) → **skill** (procedure) → **pattern** (parametrized recipe) → **preset** (bound instance) → **component** (primitive).

## 7. Screens from contracts

Sections 1–6 describe what a design system offers. This section describes how a screen is authored against it, and why the result can be checked: the author writes data, never markup, styles or code, and that data is admitted against one exact version of the design system.

### 7.1 Component contracts (`components`)

Every component an author may place has a **closed contract**: its export name in the implementation module, and every prop the author may set with a closed type (`text`, `enum`, `boolean`, `number`, `textList`, `binding`, `richText`) plus its limits (`maxLength`, `minItems`/`maxItems`, `minimum`/`maximum`, enum `values`, allowed `bindings`, rich-text `marks`, `inlineComponents`, `hrefPattern`). Anything undeclared is rejected: `className`, `style`, `children`, handlers and markup cannot be declared as author props at all.

A contract MAY also declare:

- `template`: it can frame a whole screen; the screen's sections render as its children;
- `slotProps`: which prop receives each slot's content;
- `routeParams`: it reads the parameters of a `[param]` route;
- `states` and `accessibility` notes;
- `examples`, good and bad. Each example is the props of one node of that component, as a screen would set them, with no component name, slots or route. A good one must be admitted and a bad one refused. A bad one may add `$expect`, an admission code that must be among its refusal codes. `$expect` is not a prop: in a good example it is refused like any unknown prop.

### 7.2 Bindings (`bindings`)

Data and behavior live in the design system's implementation, never in a screen. The design system declares named
**bindings**, each of one kind:

| Kind | What it is | Where a screen uses it |
|---|---|---|
| `data` | a value the system provides (e.g. metadata text) | `meta.title` / `meta.description` |
| `action` | a side effect behind a component | a `binding` prop, from its allowlist |
| `params` | the static parameters of a `[param]` route | `params.binding` |

A screen refers to a binding by name only. The kind is checked only where a screen uses it directly: `params.binding` must be a `params` binding and a `meta` binding must be a `data` binding. A `binding` prop is matched by name against its allowlist.

### 7.3 ScreenSpec (`screen`)

A ScreenSpec is a JSON document with a `route`, one `template` node and ordered `sections`. Each node names a component, sets declared props and fills declared slots with further nodes. It is **pinned** to one design-system version by `ds.id`, `ds.version` and `ds.bundleSha256` (§7.4). It contains no markup, styles, code or undeclared fields.

### 7.4 Bundle and pin

A design-system version is published as an immutable **bundle**: its identity (`ds`), `conformsTo`, `implementation` and every contract source in one document with `kind: "aindf.ds-bundle"`, addressed by `bundleSha256`, the sha256 of the bundle in canonical JSON (Appendix A). Screens pin it; the MCP server serves it (`aindf mcp <bundle>`). A bundle whose `kind` is not `aindf.ds-bundle`, or whose recomputed hash differs from `bundleSha256`, is refused (`BUNDLE_INTEGRITY`). A bundle is only produced from a design system that passes conformance (§9). The design-system owner produces it (`aindf bundle`) and publishes it wherever the builder and the MCP server read it from; AINDF does not prescribe a registry.

### 7.5 Admission

Admission checks one ScreenSpec against one bundle and returns either `ok` or a list of errors, each with a stable code and a path, so an agent can repair the screen without reading source. It refuses, among others:

- a screen pinned to another version;
- unknown components, props, slots or fields;
- a non-template in the template position, or a non-`sections` component as a section;
- slot content the slot does not accept or outside its cardinality;
- values outside their type and limits;
- a binding prop outside its allowlist;
- a `params` or `meta` binding that is unknown or not of kind `params` / `data`;
- route parameters that do not match the route.

Codes: [`RULES.md`](packages/aindf-kit/RULES.md), `AINDF-SCR-*`, and `UNKNOWN_BINDING` (`AINDF-DS-14`) for bindings.

### 7.6 Build and states

A **trusted builder**, not the author, generates code from admitted screens and the pinned bundle. `aindf build` writes Next.js App Router pages (`implementation.framework: "next-app"`) that import components from one module only, `implementation.module`, owned by the design system. Generated files are marked, and `aindf build --check` compares them with what the screens and the bundle produce: a hand edit, a stale screen, a changed bundle or an orphan page fails (`AINDF-BLD-*`). `aindf build --receipts` writes a **receipt** per screen that binds the screen bytes, the bundle and the generated output.

A result passes through states that are never collapsed into one claim: **built** (the builder wrote the receipt) →
**verified** (an independent check passed) → **accepted** (the design-system owner accepted it) → **released**. The builder only ever writes `built`; a receipt is not a signature and not acceptance.

Before a build, an MCP server that can record drafts and requests reports its own states to the author: a submitted screen that fails admission is `rejected`; an admitted one is staged as a `draft` for the trusted builder; an extension request is `requested`.

### 7.7 Instance on Core

A design system (an **Instance**) may extend another one (a **Core**). It pins the Core by `ds.core` (`id@version`), `ds.coreBundle` (path to the Core bundle) and `ds.coreBundleSha256` (its content hash). Screens import only the Instance module, so the Instance provides every Core role under the same contract name.

**Rule.** Conformance holds each such contract to the Core one (`AINDF-DS-30`; the pin itself: `AINDF-DS-29`). No Core prop, value, limit, slot, component or placement is narrowed, and anything the Instance adds is optional. Every Core binding must exist.

**Result.** A screen written for the Core admits against the Instance unchanged, except its `ds` pin, which names the Core version and must be moved to the Instance version (`aindf repin`, which moves only the screens that admit against the new bundle; otherwise `DS_PIN_MISMATCH`).

**Exceptions.**

- A binding's kind must stay the same only for `params` and `data` bindings, the only kinds admission checks.
- What a slot *accepts* is decided by the Instance.
- Without `ds.coreBundle` none of these Core checks run.

### 7.8 Requests instead of workarounds

When the design system lacks something, the author does not write its own markup or styles. It asks for an extension: through `request-extension` where the MCP server can record it, or by telling the design-system owner. The owner decides on it.

## 8. Single source → generation

A conformant system declares its contracts once (the five sources of 0.1, seven in 0.2 — §9 — plus optional patterns) and generates every downstream artifact from them: agent docs, type definitions, lint rules and MCP responses. Hand-maintaining any generated artifact breaks conformance, because drift means an agent reads a stale contract.

## 9. Conformance

A design system claims **AINDF 0.1 conformance** when it:

1. publishes the five contract sources, each validating against its schema: `tokens`, `taxonomy`, `slots`, `applicability`, `presets`;
2. classifies every component on all three axes (`layer`, `role`, `renderTarget`);
3. references tokens downward only (no component → `foundations` binding);
4. ensures every slot target and every modifier target resolves to a declared component or layer (no dangling edges);
5. generates its agent docs / types / lint / MCP responses from those sources;
6. exposes the AINDF MCP query surface (`list-by-facet`, `slot-accepts`, `applicable-modifiers`, `get-preset`);
7. passes a conformance check of these sources with no errors.

A design system claims **AINDF 0.2 conformance** (`conformsTo: "aindf@0.2"`) when, in addition:

8. it publishes an `aindf.config.json` naming its identity, every source, and its `implementation` (framework and module);
9. every classified component has a closed contract (`components`) and every contract is classified; no contract declares a forbidden prop;
10. every binding a contract refers to is declared (`bindings`) and every `binding` prop has an allowlist (bindings a screen's `meta` or `params` name are checked at admission, §7.5);
11. it publishes versions as bundles (§7.4) and admits screens only against a pinned bundle (§7.5);
12. its MCP server also exposes `get-ds`, `get-component` and `validate-screen`; the tools that record a screen draft or an extension request (`submit-screen`, `request-extension`) are offered only where the server can record them, need an author token, and never build, verify, accept or release;
13. as an Instance on a Core, it passes the Core checks of §7.7.

For 0.2, `aindf check` runs this check; it accepts only `conformsTo: "aindf@0.2"`. Every rule it checks fails with a stable rule ID and code; nothing it checks is ignored, and nothing fixes a source or a screen on its own. Items 5, 6 and 12 (generation and the MCP surface) are not checked by the kit. The full list: [`packages/aindf-kit/RULES.md`](packages/aindf-kit/RULES.md). Schemas: 0.1 in [`schemas/`](schemas), 0.2 additions in [`packages/aindf-kit/schema/0.2`](packages/aindf-kit/schema/0.2).

## 10. Boundary

AINDF contains schemas, the checks, an MCP protocol and generators, and nothing else. It carries no palette, no fixed modifier set and no component library. Conformance test: *could a completely different design system, with its own tokens, components and modifier vocabulary, be built using only AINDF?* If yes, the boundary is clean.

## 11. Versioning

AINDF uses semver. A conforming system pins the AINDF version it targets (`conformsTo: "aindf@0.1"` or `"aindf@0.2"`). A screen pins one exact design-system version (§7.4); a new version means re-admitting the screens against it. The dependency arrow is one way: **implementation → design system → framework**, never the reverse.

---

## Appendix A. Canonical JSON and the bundle hash

To compute `bundleSha256`: take the parsed bundle without its `bundleSha256` field, serialize it with the JSON Canonicalization Scheme ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)) and append one `\n`; the hash is the sha256 of those UTF-8 bytes, in lowercase hex.

In RFC 8785 terms:

- object keys are sorted at every level by their UTF-16 code units (so `"😀"` comes before `"ﬀ"` and `"10"` before `"9"`); array order is kept; there is no whitespace;
- strings are written as UTF-8, not escaped, except `"`, `\` and U+0000–U+001F (`\b` `\f` `\n` `\r` `\t`, others as lowercase `\u00xx`); U+007F and above are written as they are;
- numbers are in the ECMAScript shortest form (`2`, `1.5`, `1e-7`; `-0` as `0`).

A bundle must fit the **AINDF profile** of I-JSON ([RFC 7493](https://www.rfc-editor.org/rfc/rfc7493)): a lone surrogate, a non-finite number, or any number with |x| > 2^53−1 is refused (`NOT_I_JSON`) rather than hashed. The number rule is stricter than I-JSON and JCS: every such double is an integer (`1e21`, `1.5e300`).

A test vector with a fixed hash (`a937eb5e…`): `packages/aindf-kit/test/canonical.test.mjs`.
