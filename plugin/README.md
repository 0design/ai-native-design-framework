# AINDF plugin

> Not listed in any marketplace yet. To try it, clone this repository and start Claude Code with
> `claude --plugin-dir plugin`.

The plugin gives your agent two things:

- **A skill**, `aindf-screen-author`: how to build a screen only from your design system. The agent writes a
  ScreenSpec (JSON), never HTML, CSS or JSX.
- **A local MCP server**, read-only, for one design system. Your agent looks up what the design system offers and
  validates every screen against it before anything is built.

## Your design system

Set **Design system bundle** (`bundlePath`) to your design system's AINDF bundle, made with `aindf bundle`. A relative
path is resolved against the directory the agent starts the server in, which depends on the client: prefer an
absolute path. Leave it empty to try the demo design system
shipped with the plugin (`demo/aindf-demo.bundle.json`, described in
[`examples/demo-ds`](https://github.com/0design/ai-native-design-framework/tree/main/examples/demo-ds)).

## What the server offers

Seven read-only tools: `get-ds`, `list-by-facet`, `get-component`, `slot-accepts`, `applicable-modifiers`,
`get-preset` and `validate-screen`. The server records nothing: when your design system lacks something, your agent
tells you, and it gives you the validated screen.

## Data

The server runs on your computer and reads only the bundle file. It makes no network requests and has no analytics.
Your agent sees the server's answers like any other tool output.

## Requirements

Node.js 20.10 or newer. Nothing to install: the plugin has no dependencies.

## For maintainers

- `server/kit/`, `skills/aindf-screen-author/SKILL.md`, `demo/aindf-demo.bundle.json` and `LICENSE` are **copies**
  from this repository (`packages/aindf-kit`, `examples/demo-ds`). Change the source, then run
  `node plugin/scripts/sync.mjs`.
- `node plugin/scripts/check.mjs` checks the copies, the manifest, the MCP entry and the server with each kind of
  `bundlePath`. CI runs it, plus `claude plugin validate --strict plugin`.

## License

MIT, see [LICENSE](LICENSE).
