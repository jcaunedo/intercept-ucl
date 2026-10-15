---
name: switch-figma-account
description: "Switch the registered Figma MCP server between the 8base and bethere accounts"
inputs:
  account: string # "8base" or "bethere"
outputs:
  status: string
usage:
  - description: "Switch to the bethere Figma account"
    example_input:
      account: "bethere"
    example_output:
      status: "Registered figma-bethere. Run /mcp and authenticate as julio@bethere.group."
  - description: "Switch to the 8base Figma account"
    example_input:
      account: "8base"
    example_output:
      status: "Registered figma-8base. Run /mcp and authenticate as julio.caunedo@8base.com."
---

Only one remote Figma MCP server can be authenticated at a time — both accounts point at the same
`https://mcp.figma.com/mcp` URL, so two entries registered simultaneously collapse into a single
tool namespace and only one account is reachable regardless of how many are registered. Swap the
registered server rather than running both at once.

Accounts:

- `8base` → server name `figma-8base`, login `julio.caunedo@8base.com`
- `bethere` → server name `figma-bethere`, login `julio@bethere.group`

Steps to switch to `$account`:

1. Run `claude mcp list` to see which Figma server is currently registered (`figma-8base` or `figma-bethere`).
2. Remove the currently registered one: `claude mcp remove figma-8base` or `claude mcp remove figma-bethere`.
3. Add the target one: `claude mcp add figma-$account https://mcp.figma.com/mcp --transport http`.
4. If running inside the VSCode extension, tell the user to reload the window first (Cmd+Shift+P →
   "Developer: Reload Window") so the extension picks up the new server registration — this avoids
   having to fully quit and reopen VSCode.
5. Tell the user to run `/mcp`, select `figma-$account`, and complete the OAuth flow logged in as the
   matching email above.
6. Verify with the `whoami` tool once authenticated, or `claude mcp list` for connection status only.
