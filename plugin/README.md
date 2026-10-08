# AINDF plugin

> Install from this repository, which is also its marketplace:
>
> ```sh
> claude plugin marketplace add 0design/ai-native-design-framework
> claude plugin install aindf@aindf
> ```
>
> Or try it from a clone: `claude --plugin-dir plugin`.

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

## Examples

Each prompt below works with the demo design system (leave **Design system bundle** empty). The same three run in CI through the same server code.

1. **"Build a start page from this design system: a hero with a sign-up button, three benefits and a contact form."** The agent reads the design system with `get-ds`, writes a screen from `Hero`, `FeatureList` and `ContactForm`, and `validate-screen` accepts it.
2. **"Make the headline violet and bigger."** `Heading` has only `text`, so `validate-screen` refuses `color` and `size` with `UNKNOWN_PROP`. The agent does not style the headline by hand; it tells you the design system lacks them.
3. **"What can I use for a contact form?"** `list-by-facet` with role `form` returns `ContactForm` and `Field`, and `slot-accepts` shows that the form's `fields` slot takes `Field`.

## What the server offers

Seven read-only tools: `get-ds`, `list-by-facet`, `get-component`, `slot-accepts`, `applicable-modifiers`,
`get-preset` and `validate-screen`. The server records nothing: when your design system lacks something, your agent
tells you, and it gives you the validated screen.

## Data

The server runs on your computer and reads only the bundle file. It makes no network requests and has no analytics.
Your agent sees the server's answers like any other tool output.

## Requirements

Node.js 20.10 or newer and a POSIX shell (`sh`). Nothing to install: the plugin has no dependencies.

The server runs on your machine over stdio, so the plugin works in Claude Code and Cowork. It does not run on claude.ai in the browser, which cannot start local servers.

## For maintainers

- `server/kit/`, `skills/aindf-screen-author/SKILL.md`, `demo/aindf-demo.bundle.json` and `LICENSE` are **copies**
  from this repository (`packages/aindf-kit`, `examples/demo-ds`). Change the source, then run
  `node plugin/scripts/sync.mjs`.
- `node plugin/scripts/check.mjs` checks the copies, the manifest, the MCP entry and the server with each kind of
  `bundlePath`. CI runs it, plus `claude plugin validate --strict plugin`.

## License

MIT, see [LICENSE](LICENSE).
