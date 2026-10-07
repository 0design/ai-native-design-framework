# AINDF remote demo MCP

> **Test only, not released.** A read-only MCP server for the [demo design system](../examples/demo-ds) over
> Streamable HTTP, for clients that cannot run a local server. It lives on a `workers.dev` test address until the
> AINDF v2 release; it is not announced.

- `POST /mcp`: MCP JSON-RPC. The seven read-only tools; `submit-screen` and `request-extension` answer `READ_ONLY`.
- `GET /health`: status, the served design-system pin and the kit version.

It keeps nothing: no storage, no bindings, no logging in the code, and Cloudflare observability (Workers Logs) is
turned off in `wrangler.jsonc`. It serves only the committed demo bundle. What Cloudflare itself keeps as the hosting
provider depends on the account's settings, not on this code.

Run the checks with `node --test remote-demo/*.test.mjs`.

## Deploying (owner only)

Deploying is manual: the `demo-mcp deploy` workflow, from `main`. Its job runs in the GitHub Environment `demo-mcp`,
so the secrets are available only there.

> **Set the Environment up before the first run.** If the workflow runs while `demo-mcp` does not exist, GitHub
> creates the Environment itself, without any branch policy or reviewer.

One-time setup by the repository owner:

1. Settings → Environments → **New environment** `demo-mcp`.
2. **Deployment branches and tags**: selected branches, only `main`.
3. **Required reviewers**: the owner, so every deploy waits for an approval. Leave **Allow administrators to bypass
   configured protection rules** off, otherwise an admin run skips the approval.
4. **Environment secrets**: `CLOUDFLARE_API_TOKEN` — a token with only **Account → Workers Scripts → Edit**, for one
   account; `CLOUDFLARE_ACCOUNT_ID` — that account's ID. Do not add them as repository secrets.

Then Actions → `demo-mcp deploy` → Run workflow (branch `main`) → approve. The workflow prints the `workers.dev`
address.
