# AI-Native Design Framework (AINDF)

A specification for design systems an AI agent can **discover, reason about,
generate, and validate** — without leaving humans behind.

AINDF is **not** a code library. It is a **specification**: the portable
contract layer any design system can conform to. Concrete design systems
(e.g. Malevich) are **implementations** built on top of it that declare
conformance.

> **AI-Native = a design system expressed as a graph of machine-readable
> contracts, derived from a single source, and enforced automatically.**

**Site:** https://aindf.oleg.design

## What's in this repo

```
SPEC.md       — the specification (ten sections, thesis → versioning)
schemas/      — the six normative JSON Schemas (the contract graph)
patterns/     — example conforming data (starter patterns)
```

## The six principles

1. **Semantic, intent-based naming** — name by intent, not appearance.
2. **Machine-readable contracts** — every relationship declared in a schema.
3. **Closed, enforced choice space** — finite, lint-checkable combinations.
4. **Slot + nesting contracts** — what nests where, declared via `accepts`.
5. **One source, many generated outputs** — define once; generate the rest.
6. **Agent-navigable surface + conformance** — MCP queries + a validator.

## The contract graph (four edges)

| Edge | From → To | Schema |
|---|---|---|
| Token applicability | semantic token → property/context | `tokens` |
| Slot content | slot → layer / contract | `slots` |
| Modifier applicability | modifier → component / property (`when`) | `applicability` |
| Preset / Pattern | composition → components + filled slots | `presets` / `patterns` |

## Composition stack

`prompt` (intent) → `skill` (procedure) → `pattern` (parametrized recipe) →
`preset` (bound instance) → `component` (primitive).

## Status

Draft **0.1** — co-evolving with its first reference implementation (Malevich).
1.0 will not be tagged before a real implementation has proven the spec.

## License

MIT — see [LICENSE](LICENSE).
