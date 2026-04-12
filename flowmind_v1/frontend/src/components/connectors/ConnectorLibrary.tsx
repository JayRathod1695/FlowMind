import { ConnectorCard, type ConnectionStatus } from "./ConnectorCard";
import { GitPullRequest, Kanban, MessageSquare, Database, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

const MOCK_CONNECTORS = [
  {
    name: "Jira",
    icon: <Kanban className="w-6 h-6" />,
    status: "connected" as ConnectionStatus,
    accountLabel: "john@acme.atlassian.net",
  },
  {
    name: "GitHub",
    icon: <GitPullRequest className="w-6 h-6" />,
    status: "disconnected" as ConnectionStatus,
  },
  {
    name: "Slack",
    icon: <MessageSquare className="w-6 h-6" />,
    status: "connected" as ConnectionStatus,
    accountLabel: "@john-acme",
  },
  {
    name: "Google Sheets",
    icon: <Database className="w-6 h-6" />,
    status: "error" as ConnectionStatus,
    errorMessage: "Token expired",
  },
  {
    name: "Gmail",
    icon: <Mail className="w-6 h-6" />,
    status: "disconnected" as ConnectionStatus,
  },
];

export function ConnectorLibrary() {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-border pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Connections</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Connect your accounts to let FlowMind act on your behalf.
          </p>
        </div>
        <Button
          className="border-2 border-border shadow-sm"
          onClick={() => navigate("/app/dag")}
        >
          Continue to Workflow
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_CONNECTORS.map((c, i) => (
          <ConnectorCard
            key={i}
            name={c.name}
            icon={c.icon}
            status={c.status}
            accountLabel={c.accountLabel}
            errorMessage={c.errorMessage}
            onConnect={() => console.log("Connecting", c.name)}
            onDisconnect={() => console.log("Disconnecting", c.name)}
          />
        ))}
      </div>
    </div>
  );
}
