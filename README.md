"You’re absolutely right, I ignored your design system and hardcoded UI. Again."<br>— Your AI-Agent

<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="https://raw.githubusercontent.com/0design/ai-native-design-framework/main/docs/media/before-after.png">
  <img src="https://raw.githubusercontent.com/0design/ai-native-design-framework/main/docs/media/before-after.gif" width="1200" alt="Before/after slider over the QFactory home page. Left, an illustration of the deviations an agent makes when it bypasses the design system: underline tabs, a plain headline, a plain search field and identical cards. Right, the qfactory.io home page built from QFactory's design system.">
</picture>

# Get started

> Add AINDF to my design system and this project. AINDF is at https://github.com/0design/ai-native-design-framework; version 0.2 runs from a clone. Clone it to `<dir>` (an absolute path). In my design system's folder, write my design system down like `examples/demo-ds`: the seven 0.2 sources (`tokens`, `taxonomy`, `slots`, `applicability`, `presets`, `components`, `bindings`) plus `aindf.config.json`, which lists them (schemas: 0.1 in `schemas/`, 0.2 in `packages/aindf-kit/schema/0.2`). From that folder run `node <dir>/packages/aindf-kit/src/cli.mjs check aindf.config.json` until it passes, then `node <dir>/packages/aindf-kit/src/cli.mjs bundle aindf.config.json --out aindf.bundle.json`. Connect the bundle to your agent's MCP settings; in Claude Code run `claude mcp add aindf -- node <dir>/packages/aindf-kit/src/cli.mjs mcp <absolute path>/aindf.bundle.json` (or start Claude Code with `--plugin-dir <dir>/plugin` and set its bundle path); any other agent runs the same `node … mcp …` command as a stdio server in its MCP settings. From then on, write screens only as screen configs pinned to that bundle: look up components, slots, modifiers and presets, and call `validate-screen` until it passes. Never hardcode a value my design system does not have; when something is missing, tell me instead of writing your own CSS. Do not change the design system without my approval.

## Install

The kit is on npm, so no clone is needed. You need Node.js 20.10 or newer. From your design system's folder:

```sh
npx -y @ai-native-design-framework/kit check aindf.config.json
npx -y @ai-native-design-framework/kit bundle aindf.config.json --out aindf.bundle.json
claude mcp add aindf -- npx -y @ai-native-design-framework/kit mcp /absolute/path/to/aindf.bundle.json
```

The first command checks your design system, the second makes the bundle (one file per version), the third connects it to Claude Code. Any other agent runs the last command as a stdio MCP server.

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

Without AINDF your agent writes HTML and CSS itself and can ignore your design system. With AINDF the screen is a
config, and the check passes only what your design system offers. Fix how a component looks or works in your design
system once, and every screen built from it gets the fix on the next build, once the screens are moved to the new version (`aindf repin`).

## What's in this repo

- [`SPEC.md`](SPEC.md): the specification.
- [`packages/aindf-kit`](packages/aindf-kit): the check, the builder and the MCP server.
- [`plugin`](plugin): the plugin for Claude Code.
- [`examples/demo-ds`](examples/demo-ds): a demo design system with three examples you can run.
- [`schemas`](schemas) and [`patterns`](patterns): the JSON Schemas of version 0.1 and an example pattern. The 0.2
  schemas are in [`packages/aindf-kit/schema/0.2`](packages/aindf-kit/schema/0.2).

## Contribute

You can improve the spec, the kit or the plugin, or suggest an idea.

1. Fork the repository and make a branch.
2. Make your change and run the checks: `node --test packages/aindf-kit/test/*.test.mjs` and
   `node examples/demo-ds/examples.mjs`. If you change a schema, update `SPEC.md` and `patterns/starter.json` in the
   same pull request.
3. Open a pull request. Changes to the kit, the plugin and the examples are checked automatically.

Have an idea? [Open an issue](https://github.com/0design/ai-native-design-framework/issues/new) and describe what
result you want.

## Links

- Specification: [SPEC.md](SPEC.md)
- Error codes: [RULES.md](packages/aindf-kit/RULES.md)
- Demo design system: [examples/demo-ds](examples/demo-ds)
- For AI agents: build screens only through the design system's MCP. The rules are in
  [the skill](plugin/skills/aindf-screen-author/SKILL.md).
- License: [MIT](LICENSE)
