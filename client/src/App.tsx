import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import DemoMode from "@/pages/DemoMode";
import { ComplaintsPage, NoticesPage, PaymentsPage, ResidentsPage, RoomsPage, VisitorsPage } from "@/pages/Modules";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

function Protected({ children }: { children: React.ReactNode }) { return <DashboardLayout>{children}</DashboardLayout>; }
function AdminOnly({ children }: { children: React.ReactNode }) { const { user, loading } = useAuth(); const [, setLocation] = useLocation(); useEffect(() => { if (!loading && user?.role === "resident") setLocation("/"); }, [loading, setLocation, user?.role]); if (loading || user?.role !== "admin") return <div className="grid min-h-80 place-items-center text-sm text-muted-foreground">Checking access…</div>; return <>{children}</>; }
function Router() { return <Switch><Route path="/login" component={Login} /><Route path="/demo/:role/:section" component={DemoMode} /><Route path="/demo/:role" component={DemoMode} /><Route path="/" component={() => <Protected><Home /></Protected>} /><Route path="/my-account" component={() => <Protected><Home /></Protected>} /><Route path="/residents" component={() => <Protected><AdminOnly><ResidentsPage /></AdminOnly></Protected>} /><Route path="/rooms" component={() => <Protected><AdminOnly><RoomsPage /></AdminOnly></Protected>} /><Route path="/payments" component={() => <Protected><AdminOnly><PaymentsPage /></AdminOnly></Protected>} /><Route path="/complaints" component={() => <Protected><ComplaintsPage /></Protected>} /><Route path="/visitors" component={() => <Protected><VisitorsPage /></Protected>} /><Route path="/notices" component={() => <Protected><NoticesPage /></Protected>} /><Route component={NotFound} /></Switch>; }
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
