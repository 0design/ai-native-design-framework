# AI-Native Design Framework (AINDF)

> **Draft README for v2: not approved and not released.** Status markers below:
> **Available** = published and usable today; **Pilot, not released** = in this repo, being tried on QFactory first;
> **Soon** = part of v2, which is not released yet. Sentences marked *[new copy]* are not on the AINDF landing yet and
> need the owner's decision.

**Stop slop-factory: upgrade your design system with the AI-Native Design Framework.**

*“You’re absolutely right, I ignored your design system and hardcoded UI. Again.”*
AINDF is for design-system owners and the teams whose agents build screens from it, so that this answer stops
being normal. *[new copy]*

AINDF is a spec, not a component library. You keep your own tokens, components and brand.

Website: https://aindf.oleg.design

## What you get

| Status | What |
|---|---|
| **Available** | **Your design system stays the single source.** AINDF describes your design system as one model your agent reads: tokens, components, slots and the rules between them, written down as JSON files. |
| **Soon** | **Your agent looks up what your design system offers instead of guessing.** |
| **Soon** | **No more “You’re absolutely right… hardcoded again”.** Hardcoded styles are refused when the screen is built, not by one more instruction your agent can ignore. The aim: you explain and fix less. |
| **Soon** | **Consistent UI at any scale.** The fiftieth screen is built from the same parts as the first. |
| **Soon** | **One fix updates every matching screen.** Fix a shared piece once and every screen that uses it gets the fix, instead of patching screens one by one. |

## How it works

*Soon:* your request goes through your design system’s tokens and components to the screen. A hardcoded value is
refused and becomes an extension request that waits for you.

1. **Your agent works with your design system, not around it.** It sees what your design system can do and
   arranges screens from it. It doesn’t hand-write the page’s code, and it can’t change your design system. *Soon*
2. **Anything your design system doesn’t know is refused.** Screens are built from a fixed version of your design
   system. Styles, parts or code it doesn’t contain are refused before they ship. Your text and data stay yours to
   change. *Soon*
3. **New needs become proposals.** When your design system can’t do something, the agent asks for an extension
   instead of styling it by hand. It can’t add its own styles or change the checks. *Soon*
4. **Rules are enforced, not requested.** Your agent can’t skip a requirement or call work ready without proof:
   the build stops it, not one more instruction. Done, checked and approved are different steps, and approval is
   yours. *Soon*

## What is in this repo today

| Part | Status | What it is |
|---|---|---|
| [`SPEC.md`](SPEC.md) | Available (draft 0.1) | The spec: component layers, tokens, modifiers, presets and patterns. |
| [`schemas/`](schemas) | Available | JSON Schemas for the files your design system publishes: tokens, taxonomy, slots, applicability, presets and patterns. |
| [`patterns/starter.json`](patterns/starter.json) | Available | An example pattern for a newsletter signup section. |
| [`packages/aindf-kit`](packages/aindf-kit) | Pilot, not released | The v2 tools: validator, MCP server and builder. AINDF is piloted on QFactory first. The API may change, and the kit is not published to npm. *[new copy]* |

## Getting started

1. Read [`SPEC.md`](SPEC.md). Sections 3 to 6 cover component layers, tokens, modifiers, presets and patterns.
2. Describe your design system in JSON files that follow the schemas.
3. Check each file with any JSON Schema validator that supports draft 2020-12. With Node installed, this checks the
   example pattern:

   ```sh
   npx ajv-cli@5 validate --spec=draft2020 -s schemas/patterns.schema.json -d patterns/starter.json
   ```

   Swap in your own schema and data file.

To hear when v2 is out, watch this repo on GitHub: **Watch → Custom → Releases**.

## Boundaries of the promise

- AINDF v2 aims to give your agent firm rules and checks; it is not yet a proven guarantee against slop.
- Approval stays with the owner of the design system.
- Use beyond QFactory and the gains in speed are still being proven.

## For engineers

AINDF is piloted on QFactory first. The contract schemas, the MCP query surface a conforming design system exposes and
the conformance rules are in the spec on GitHub: [`SPEC.md`](SPEC.md) and [`schemas/`](schemas).

## Status

Draft 0.1. The spec may still change before 1.0. The v2 tools in `packages/aindf-kit` are a pilot, not a release.

## Contributing

Open an issue or a pull request. If you change a schema, update `SPEC.md` and `patterns/starter.json` in the same
pull request and run the check above.

## License

MIT, see [LICENSE](LICENSE).
