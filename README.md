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

The conformance validator and MCP server described in `SPEC.md` are not in this
repo yet. For now you can check your files against the schemas.

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

## Status

Draft 0.1. The spec may still change before 1.0.

## Contributing

Open an issue or a pull request. If you change a schema, update `SPEC.md` and
`patterns/starter.json` in the same pull request and run the check above.

## License

MIT, see [LICENSE](LICENSE).
