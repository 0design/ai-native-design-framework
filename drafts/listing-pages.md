# AINDF listing pages: privacy, support, docs (drafts)

**Draft. Not approved, not published.** Texts for the pages a plugin listing needs (plugin packaging plan, step A6).
The owner approves every text and decides where these pages live: the URL paths are not set here.

Every block ends with its sources: `file:line` at AINDF commit `c0effe6e`. W = `0design/Oleg.Design_Website` @
`405dbc3b` (branch `claude/unslop-legal-drafts`, the UNSLOP pages these follow). A block without a code source states
a plan or a limit and says so. Not covered: the `plugin/` folder (plan steps A2/A3) does not exist yet. Every
statement about "the plugin" below describes the local MCP server the plugin will run, `aindf mcp`, and must be
re-checked against `plugin/` before submission.

---

## Privacy

> This page covers the AINDF plugin: its skill and the local MCP server it runs (`aindf mcp`). It does not cover a
> design system's own hosted MCP server, or the oleg.design website.

*Sources: plan step A6; `packages/aindf-kit/src/cli.mjs:26-32`.*

> The MCP server runs on your computer, started by your agent. It reads one file: the design-system bundle it is
> given. It answers your agent over standard input and output and opens no network connection.

*Sources: `packages/aindf-kit/src/cli.mjs:26-32` (reads the bundle, answers on stdout); network check below.*

> The AINDF code makes no network requests. It has no analytics or telemetry and reads no environment variables.

*Sources: grep over `packages/aindf-kit/src/*.mjs` at `c0effe6e` for `fetch(`, `node:http`, `node:https`, `node:net`,
`node:tls`, `node:dgram`, `WebSocket`, `XMLHttpRequest`, `child_process` and dynamic `import(`: 0 matches; positive
control `readFileSync` in `load.mjs`: 4 matches. grep for `process.env`, `posthog`, `analytics`, `telemetry`: 0
matches. `mcpFetchHandler` (`mcp.mjs:122`) only answers incoming requests when a design system hosts the kit
itself; the plugin does not use it.*

> The local server stores nothing. The two tools that would record a screen draft or an extension request are not
> offered by it, and a direct call to them is refused (`READ_ONLY`).

*Sources: `packages/aindf-kit/src/mcp.mjs:39` (no storage unless the host passes one), `:56` (`READ_ONLY`), `:85`
(not offered without storage); `cli.mjs:27` (the local server is created without storage).*

> The AINDF schemas are part of the plugin; nothing is downloaded to check a design system or a screen. AINDF has no
> dependencies to install.

*Sources: `packages/aindf-kit/src/schemas.mjs:1-8` (schemas as module imports); `packages/aindf-kit/package.json`
(no `dependencies` field).*

> Your agent and its provider see what your agent reads and sends, including the answers of this server. That is
> governed by your agent's own terms, not by AINDF.

*Source: none in code. A limit, not a claim about AINDF.*

**Owner decision:** whether a Terms page is needed as for UNSLOP. Its facts would be the MIT License
(`LICENSE:1,5-21`, `packages/aindf-kit/package.json:7`, "as is", without warranty) and the read-only local server
(above).

---

## Support

> For help with AINDF, email [banana@oleg.design](mailto:banana@oleg.design).

*Sources: W `data/site.ts:7`; same contact as the UNSLOP support page (W `app/unslop/[doc]/docs.ts`, `support`).*

> Questions and bug reports can also go to the GitHub issues of
> [0design/ai-native-design-framework](https://github.com/0design/ai-native-design-framework/issues).

*Source: `README.md` "Contributing" (open an issue or a pull request). Owner decision: keep or drop this line.*

> To check that the server works, ask your agent to call `get-ds`: it returns the design system's id, version and
> the pin your screens copy.

*Sources: `packages/aindf-kit/src/mcp.mjs` tool `get-ds`; `examples/demo-ds/examples.mjs` (example 1 checks the pin
`get-ds` returns).*

> Placeholder until the plugin exists: how to see that the plugin's server is connected (for example `claude mcp
> list`) depends on the plugin manifest and is filled in after plan steps A2/A3.

*Source: none yet. Plan.*

---

## Docs

> AINDF (AI-Native Design Framework) describes your design system as files an AI agent can read and check its work
> against. The plugin gives your agent a skill and a local MCP server for one design system: the agent looks up
> what the design system offers and validates screens against it before they are built.

*Sources: `README.md` (introduction); `packages/aindf-kit/skill/SKILL.md`; `packages/aindf-kit/src/mcp.mjs`
(tools).*

> Status: the v2 tools are a pilot and not released yet.

*Sources: `README.md` "Status"; `packages/aindf-kit/package.json:4` (`private`). Re-check at release: this line
changes with the release (plan R1–R4).*

> What the server offers: `get-ds`, `list-by-facet`, `get-component`, `slot-accepts`, `applicable-modifiers`,
> `get-preset` and `validate-screen`. All are read-only.

*Sources: `packages/aindf-kit/src/mcp.mjs:85` and its tool annotations (7 read-only tools without storage).*

> Try it with the demo design system: three example prompts and what the agent does for each.

*Sources: `examples/demo-ds/README.md:13` ("Three examples"), `:19` (command); `examples/demo-ds/examples.mjs` (run
in CI as `demo-examples`).*

> Requirements: Node.js 20 or newer.

*Source: `packages/aindf-kit/package.json:10` (`engines`).*

> License: MIT.

*Sources: `LICENSE:1`; `packages/aindf-kit/package.json:7`.*

**Owner decision:** install steps are left out on purpose. They depend on the plugin and on where it is listed (plan
steps A2/A3 and R1–R4).
