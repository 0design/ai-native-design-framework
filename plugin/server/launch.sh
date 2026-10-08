#!/bin/sh
# Starts the plugin's MCP server (launch.mjs). The first argument is the bundle path from the plugin setting.
exec node "${CLAUDE_PLUGIN_ROOT}/server/launch.mjs" "$@"
