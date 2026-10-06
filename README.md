# AI-Native Design Framework (AINDF)

Make generic UI look consistent. No hardcoding, no ignoring your design system.

AINDF is a spec, not a component library. It describes how to write down your
design system (tokens, components, slots and the rules between them) as JSON
files that an AI agent can read and check its work against. You keep your own
tokens, components and brand.

Website: https://aindf.oleg.design

## What's in this repo

- [`SPEC.md`](SPEC.md): the spec itself.
- [`schemas/`](schemas): JSON Schemas for the files your design system
  publishes: tokens, taxonomy, slots, applicability, presets and patterns.
- [`patterns/starter.json`](patterns/starter.json): an example pattern for a
  newsletter signup section.
- [`packages/aindf-kit`](packages/aindf-kit): a pilot of the v2 tools (validator,
  MCP server, builder). It is not released yet and its API may change. It is not
  published to npm.

The released part is the spec and the schemas: you can check your files against
them today. The v2 tools are described in [Coming in v2](#coming-in-v2).

## Getting started

1. Read [`SPEC.md`](SPEC.md). Sections 3 to 6 cover component layers, tokens,
   modifiers, presets and patterns.
2. Describe your design system in JSON files that follow the schemas.
3. Check each file with any JSON Schema validator that supports draft 2020-12.
   With Node installed, this checks the example pattern:

   ```sh
   npx ajv-cli@5 validate --spec=draft2020 -s schemas/patterns.schema.json -d patterns/starter.json
   ```

   Swap in your own schema and data file.

## Coming in v2

The next release adds three tools that work together:

- **MCP server.** Your AI agent looks up what your design system offers
  (components, slots, variants, tokens) through MCP instead of guessing.
- **Validator.** Checks a screen config before it is built. It rejects unknown
  components, slots or modifiers, one-off styles and code inside the config.
- **Builder.** Builds the screen from that config and a specific version of your
  design system. The agent edits the config, not HTML, CSS or JSX.

If your design system is missing something, the agent asks for it to be added
instead of writing its own CSS.

Why it matters: fix something once in the design system and every screen that
uses it should get the fix.

To hear when v2 is out, watch this repo on GitHub: **Watch → Custom → Releases**.

## Status

Draft 0.1. The spec may still change before 1.0. The v2 tools in
`packages/aindf-kit` are a pilot, not a release.

## Contributing

Open an issue or a pull request. If you change a schema, update `SPEC.md` and
`patterns/starter.json` in the same pull request and run the check above.

## License

MIT, see [LICENSE](LICENSE).
