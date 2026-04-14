import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import StatusPage from "./pages/StatusPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import PlanPage from "./pages/PlanPage";
import ConversationPage from "./pages/ConversationPage";
import ChatHistoryPage from "./pages/ChatHistoryPage";
import HooksPage from "./pages/HooksPage";
import { TooltipProvider } from "./components/ui/tooltip";
import { Network, Activity, Bot, ChevronLeft, ChevronRight, History, Webhook } from "lucide-react";
import { ThemeToggle } from "./components/shared/ThemeToggle";
import { useState } from "react";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: "/app", icon: <Bot className="w-4.5 h-4.5" />, label: "Conversation" },
    { to: "/app/history", icon: <History className="w-4.5 h-4.5" />, label: "Chat History" },
    { to: "/app/hooks", icon: <Webhook className="w-4.5 h-4.5" />, label: "Hooks" },
    { to: "/app/status", icon: <Activity className="w-4.5 h-4.5" />, label: "Status" },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-18' : 'w-65'} border-r-2 border-border bg-sidebar flex flex-col py-6 transition-all duration-300 shrink-0 relative`}>
        {/* Logo */}
        <div className={`${collapsed ? 'px-4' : 'px-6'} mb-8 flex items-center gap-3`}>
          <div className="w-9 h-9 bg-primary flex items-center justify-center shrink-0 shadow-sm border-2 border-border">
            <Network className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-xl tracking-tight">FlowMind</span>}
        </div>

        {/* Nav */}
        <nav className={`flex-1 w-full flex flex-col gap-1 ${collapsed ? 'px-2' : 'px-4'}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 border-2 transition-all group ${
                  isActive
                    ? "bg-primary text-primary-foreground border-border shadow-sm font-semibold"
                    : "text-muted-foreground border-transparent hover:bg-muted hover:border-border hover:shadow-xs"
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
                {!collapsed && <span className="text-[14px]">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className={`${collapsed ? 'px-2' : 'px-4'} w-full flex flex-col gap-3 mt-auto`}>
          {!collapsed && (
            <div className="w-full flex items-center gap-3 px-2">
              <div className="w-9 h-9 bg-muted shrink-0 overflow-hidden flex items-center justify-center text-muted-foreground text-xs font-bold border-2 border-border">U</div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-[13px] font-semibold truncate">User</span>
                <span className="text-[11px] text-muted-foreground">FlowMind</span>
              </div>
            </div>
          )}

          <div className={`flex ${collapsed ? 'justify-center' : 'px-2'}`}>
            <ThemeToggle />
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-card border-2 border-border shadow-xs flex items-center justify-center hover:bg-muted transition-colors z-20"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 h-full overflow-hidden relative flex flex-col bg-background">
        {children}
      </main>
    </div>
  );
}

export function App() {
  return (
    <Router>
      <TooltipProvider>
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Dashboard routes */}
          <Route path="/app" element={<DashboardLayout><ConversationPage /></DashboardLayout>} />
          <Route path="/app/history" element={<DashboardLayout><ChatHistoryPage /></DashboardLayout>} />
          <Route path="/app/hooks" element={<DashboardLayout><HooksPage /></DashboardLayout>} />
          <Route path="/app/status" element={<DashboardLayout><StatusPage /></DashboardLayout>} />
          <Route path="/app/plan/:planId" element={<DashboardLayout><PlanPage /></DashboardLayout>} />
        </Routes>
      </TooltipProvider>
    </Router>
  );
}

export default App;
