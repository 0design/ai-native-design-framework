# AINDF demo design system

A small design system written down as AINDF 0.2 contracts. It exists to show the AINDF tools working. It is not a
product, and it has no implementation: `@aindf-demo/ds` is a placeholder module name.

It runs on the unreleased v2 pilot kit in [`packages/aindf-kit`](../../packages/aindf-kit), not on an installable
tool (see [What's in this repo](../../README.md#whats-in-this-repo)).

- Components: `Page` (template), `Hero`, `FeatureList`, `ContactForm` (sections); `Heading`, `Button`, `Field` (elements).
- Bindings: `signup`, `sendContact` (actions).
- Bundle: [`aindf-demo.bundle.json`](aindf-demo.bundle.json), built by `aindf bundle` from these sources.

## Three examples

Each prompt is what you would ask your agent. The steps are what the agent does through the design system's MCP. From
the repository root, that MCP runs with:

```sh
node packages/aindf-kit/src/cli.mjs mcp examples/demo-ds/aindf-demo.bundle.json
```

1. **“Build a start page from this design system: a hero with a sign-up button, three benefits and a contact form.”**
   The agent reads `get-ds` and writes a screen from `Hero`, `FeatureList` and `ContactForm`. `validate-screen`
   accepts it.
2. **“Make the headline violet and bigger.”** `Heading` has only `text`, so `validate-screen` refuses `color` and
   `size` with `UNKNOWN_PROP`. The agent does not style it by hand. This local server records nothing, so a
   `request-extension` call is refused with `READ_ONLY`. Recording such requests for the design system's owner is
   planned for v2.
3. **“What can I use for a contact form?”** `list-by-facet` with role `form` returns `ContactForm` and `Field`.
   `slot-accepts` shows that the form's `fields` slot takes `Field`, and `get-component` lists the field kinds.

Run all three from the repository root, plus a check that the bundle is exactly what these sources build:

```sh
node examples/demo-ds/examples.mjs
```

After changing a source, rebuild the bundle with `node examples/demo-ds/examples.mjs --write`.
