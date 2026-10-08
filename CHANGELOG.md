# Changelog

## 0.2.1

The kit package is no longer marked private, so it can be published to npm as `@ai-native-design-framework/kit`. No change to what the kit does.

## 0.2.0

Screens from contracts: your agent writes a screen as a config, and a check refuses anything your design system does
not have.

**Spec**

- Component contracts, bindings and the screen config (ScreenSpec), pinned to one version of the design system.
- Bundles: one immutable file per design-system version, addressed by a hash of its canonical JSON.
- The screen check, with a stable code and path for every refusal, and the builder.
- Instance on Core: a project design system that extends a shared one keeps every Core contract.

**Kit** (`packages/aindf-kit`)

- `aindf check`, `bundle`, `build`, `repin` and `mcp`, with no dependencies, on Node.js 20.10 or newer.
- An MCP server with seven read-only tools; the tools that record drafts appear only where the server can record them.
- Checks that every default, every example and every Core contract fits the design system.

**Plugin** (`plugin`)

- A read-only plugin for Claude Code: the screen-author skill and a local MCP server for one design system bundle,
  with a demo bundle when none is set.

**Examples**

- `examples/demo-ds`: a demo design system with three examples that run in CI.

## 0.1.0

The first published draft of the spec and its JSON Schemas.
