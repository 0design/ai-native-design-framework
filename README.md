"You’re absolutely right, I ignored your design system and hardcoded UI. Again."<br>— Your AI-Agent

<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="https://raw.githubusercontent.com/0design/ai-native-design-framework/main/docs/media/before-after.png">
  <img src="https://raw.githubusercontent.com/0design/ai-native-design-framework/main/docs/media/before-after.gif" width="1200" alt="The same QFactory home page built twice from the same prompt and the same design system. A divider slides between the two. Without AINDF: underline tabs, a plain headline, a plain search field and identical cards. With AINDF: the real QFactory header, the large two-line hero with the violet search composer and the workflow cover tiles.">
</picture>

# Get started

> Add AINDF to my design system and to this project. Read the spec at https://github.com/0design/ai-native-design-framework (SPEC.md and schemas/). Describe my design system as the five AINDF contract sources (tokens, taxonomy, slots, applicability, presets) and check each file against its JSON Schema; the AINDF validator, MCP server and builder are not released yet (v2). Then add a rule to the instructions file your agent reads in this repo: build screens only from these contracts at a pinned version, never hardcode a value the design system does not have, and when something is missing, propose an extension to the design system instead of writing your own CSS. If my design system exposes an MCP server, connect it in your agent's MCP settings so you look up components, slots, modifiers and tokens instead of guessing. Do not change the design system itself without my approval.

## How it works

```
  your prompt
       │
       ▼
  your agent ◀──── MCP ────▶ your design system
       │            asks what it offers: tokens, components, slots
       ▼
  screen config (JSON, pinned to one version of your design system)
       │
       ▼
  check ── refused: "Heading has no prop color" ──▶ your agent asks you
       │                                            to add it to your
       │ passes                                     design system
       ▼
  builder ──▶ a screen built only from your design system
```

Without AINDF your agent writes HTML and CSS itself and can ignore your design system. With AINDF it writes a screen
config, and only what your design system offers passes the check. Change a component once, rebuild, and every screen
that uses it changes.

## What's in this repo

- [`SPEC.md`](SPEC.md): the specification.
- [`packages/aindf-kit`](packages/aindf-kit): the check, the builder and the MCP server.
- [`plugin`](plugin): the plugin for Claude Code.
- [`examples/demo-ds`](examples/demo-ds): a demo design system with three examples you can run.
- [`schemas`](schemas) and [`patterns`](patterns): JSON Schemas and an example pattern.

## Contribute

You can improve the spec, the kit or the plugin, or suggest an idea.

1. Fork the repository and make a branch.
2. Make your change and run the checks: `node --test packages/aindf-kit/test/*.test.mjs` and
   `node examples/demo-ds/examples.mjs`. If you change a schema, update `SPEC.md` and `patterns/starter.json` in the
   same pull request.
3. Open a pull request. The checks run automatically.

Have an idea? [Open an issue](https://github.com/0design/ai-native-design-framework/issues/new) and describe what
result you want.

## Links

- Specification: [SPEC.md](SPEC.md)
- Error codes: [RULES.md](packages/aindf-kit/RULES.md)
- Demo design system: [examples/demo-ds](examples/demo-ds)
- For AI agents: build screens only through the design system's MCP. The rules are in
  [the skill](plugin/skills/aindf-screen-author/SKILL.md).
- License: [MIT](LICENSE)
