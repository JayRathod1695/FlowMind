import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ConnectorsPage from "./pages/ConnectorsPage";
import DAGPage from "./pages/DAGPage";
import ExecutionPage from "./pages/ExecutionPage";
import StatusPage from "./pages/StatusPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { TooltipProvider } from "./components/ui/tooltip";
import { LayoutGrid, Network, Activity, ScrollText, Home, ChevronLeft, ChevronRight } from "lucide-react";
import HomePage from "./pages/HomePage";
import { ThemeToggle } from "./components/shared/ThemeToggle";
import { useState } from "react";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: "/app", icon: <Home className="w-[18px] h-[18px]" />, label: "Overview" },
    { to: "/app/dag", icon: <Network className="w-[18px] h-[18px]" />, label: "Workflow" },
    { to: "/app/execution", icon: <ScrollText className="w-[18px] h-[18px]" />, label: "Executions" },
    { to: "/app/status", icon: <Activity className="w-[18px] h-[18px]" />, label: "Status" },
    { to: "/app/connectors", icon: <LayoutGrid className="w-[18px] h-[18px]" />, label: "Integrations" },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[72px]' : 'w-[260px]'} border-r-2 border-border bg-sidebar flex flex-col py-6 transition-all duration-300 shrink-0 relative`}>
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
                <span className="text-[13px] font-semibold truncate">Arthur Hayes</span>
                <span className="text-[11px] text-muted-foreground">Free Plan</span>
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
      <TooltipProvider delayDuration={0}>
        <Routes>
          {/* Public pages - no sidebar */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Dashboard routes - with sidebar */}
          <Route path="/app" element={<DashboardLayout><HomePage /></DashboardLayout>} />
          <Route path="/app/connectors" element={<DashboardLayout><ConnectorsPage /></DashboardLayout>} />
          <Route path="/app/dag" element={<DashboardLayout><DAGPage /></DashboardLayout>} />
          <Route path="/app/execution" element={<DashboardLayout><ExecutionPage /></DashboardLayout>} />
          <Route path="/app/status" element={<DashboardLayout><StatusPage /></DashboardLayout>} />
        </Routes>
      </TooltipProvider>
    </Router>
  );
}

export default App;
