# AINDF remote demo MCP

> **Test only, not released.** A read-only MCP server for the [demo design system](../examples/demo-ds) over
> Streamable HTTP, for clients that cannot run a local server. It lives on a `workers.dev` test address until the
> AINDF v2 release; it is not announced.

- `POST /mcp`: MCP JSON-RPC. The seven read-only tools; `submit-screen` and `request-extension` answer `READ_ONLY`.
- `GET /health`: status, the served design-system pin and the kit version.

It keeps nothing: no storage, no bindings, no logging in the code. It serves only the committed demo bundle.

Run the checks with `node --test remote-demo/*.test.mjs`. Deploying is manual: the `demo-mcp deploy` workflow, from
`main`, with the owner's Cloudflare secrets.
