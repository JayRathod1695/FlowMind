agent: agent

# Phase F8 — ConnectorsPage (OAuth UI)

Use @frontend-agent for this phase.
Reference Report 1 Section 11 for all specs.

## Goal
Build the Connections page with the full ConnectorCard grid, OAuth popup flow,
loading states, error Dialog, and all 4 connector states.

## Deliverables

### `src/components/connectors/ConnectorCard.tsx` (max 120 lines):
Props: `{ connector: AvailableConnector, connection: ConnectorConnection | undefined, userId: string }`

4 states from Report 1 Section 11F:
| State | Button | Status |
|---|---|---|
| Disconnected | "Connect" (blue outlined) | Grey dot + "Not connected" |
| Connecting | "Connecting..." (disabled, spinner) | Grey dot |
| Connected | "Disconnect" (red outlined) | Green dot + account_label |
| Error | "Reconnect" (orange outlined) | Red dot + error_message |

### `src/components/connectors/ConnectorCard.sub.tsx` (max 80 lines):
Button logic: uses useConnectorOAuth() hook
Shows shadcn Dialog when error !== null (OAuth failed or popup blocked)
Dialog content: error message + retry button

### `src/components/connectors/ConnectorLibrary.tsx` (max 100 lines):
```tsx
// Fetches available connectors on mount (connector.service.getAvailableConnectors)
// Fetches connection status on mount (useConnectorStatus hook)
// Renders grid of ConnectorCard
// Pass userId from local state (hackathon: use "default-user" hardcoded)
```

### `src/pages/ConnectorsPage.tsx`:
Page header with back-to-home link
Subtitle: "Connect your accounts to let FlowMind act on your behalf."
ConnectorLibrary grid

## ⚠️ MANUAL VERIFICATION REQUIRED
Full OAuth flow requires:
1. OAuth apps registered at each provider (see Report 2 Section 10E)
2. CLIENT_ID, CLIENT_SECRET in backend .env
3. Backend running with Phase B8 complete
Manual test: click Connect on any connector, verify popup opens.