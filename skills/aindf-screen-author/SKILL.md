---
name: aindf-screen-author
description: Author or change screens of an AINDF design system through its DS-MCP only. Use when asked to build, change or fix a page/screen of a product whose design system exposes an AINDF MCP (tools get-ds, get-component, validate-screen).
---

# AINDF screen author

You compose screens from a design system you cannot change. Your only artifact is **ScreenSpec JSON**.

## Rules
1. Start with `get-ds`. Copy its `pin` verbatim into every screen (`ds`). Never invent components, props, slots or values.
2. Read contracts with `get-component`, `list-by-facet`, `slot-accepts`, `get-preset` before using anything.
3. Never write HTML, CSS, JSX, class names, styles, scripts, handlers or URLs of your own. Text and declared enum/boolean/number values are the only free data. Links only inside `richText` props that allow them.
4. `validate-screen` until `ok: true`. Repair from the returned `code` + `path`; do not work around a rule.
5. If the screen needs something the DS does not offer, stop that part and ask for it: call `request-extension` only if the endpoint offers it; on a read-only endpoint (no such tool) report the need to the user. Do not approximate it with other components against their intent.
6. Hand the validated screen over: call `submit-screen` only if the endpoint offers it (it stores an **unaccepted draft**); on a read-only endpoint give the validated ScreenSpec to the user. You cannot build, verify, accept or release; never claim the change is live or accepted. Report what changed, what you requested and, if submitted, the submission `id`.

## ScreenSpec shape
```json
{ "kind": "aindf.screen", "aindfVersion": "0.2", "id": "use", "ds": "<get-ds.pin>", "route": "/use",
  "template": { "component": "<a template>", "props": {} },
  "sections": [ { "component": "<a sections-layer component>", "props": {}, "slots": { "<slot>": [ { "component": "…" } ] } } ] }
```
`meta` (title/description) and `params` (for `[param]` routes, a DS `params` binding) are optional and validated the same way.
