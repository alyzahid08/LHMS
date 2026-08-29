import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Building2, CalendarCheck2, CircleHelp, ClipboardList, DoorOpen, LayoutDashboard, LogOut, Megaphone, PanelLeft, ReceiptText, Users, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const administratorItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Residents", path: "/residents" },
  { icon: DoorOpen, label: "Rooms & beds", path: "/rooms" },
  { icon: ReceiptText, label: "Payments", path: "/payments" },
  { icon: CircleHelp, label: "Complaints", path: "/complaints" },
  { icon: UsersRound, label: "Visitors", path: "/visitors" },
  { icon: Megaphone, label: "Notices", path: "/notices" },
];

const residentItems = [
  { icon: LayoutDashboard, label: "My home", path: "/" },
  { icon: ClipboardList, label: "My details", path: "/my-account" },
  { icon: CircleHelp, label: "Complaints", path: "/complaints" },
  { icon: CalendarCheck2, label: "Visitor requests", path: "/visitors" },
  { icon: Megaphone, label: "Notices", path: "/notices" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f7f8f7]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-900/15 border-t-emerald-800" /></div>;
  if (!user) return <LoginPrompt />;

  const items = user.role === "admin" ? administratorItems : residentItems;
  const section = items.find(item => item.path === location)?.label || "Levelose";
  const initials = (user.name || user.username || "L").split(" ").map(value => value[0]).join("").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#113b35] text-[#eaf1eb]">
        <SidebarHeader className="h-[84px] px-3 pt-3">
          <div className="flex h-full items-center gap-2 rounded-2xl bg-white/8 px-2.5">
            <button onClick={() => document.querySelector<HTMLButtonElement>("[data-sidebar='trigger']")?.click()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#d7f163] text-[#123c35] transition-transform active:scale-95" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4" /></button>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-serif text-[17px] font-semibold tracking-tight">Levelose</p>
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-100/55">Management system</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/45 group-data-[collapsible=icon]:hidden">Workspace</p>
          <SidebarMenu className="gap-1">
            {items.map(item => <SidebarMenuItem key={item.path}>
              <SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl px-3 text-emerald-50/75 hover:bg-white/9 hover:text-white data-[active=true]:bg-[#d7f163] data-[active=true]:font-semibold data-[active=true]:text-[#113b35]">
                <item.icon className="h-4 w-4" /><span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="px-3 pb-4">
          <Separator className="mb-3 bg-white/10" />
          <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9 border border-white/15"><AvatarFallback className="bg-emerald-100 text-xs font-bold text-emerald-950">{initials}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user.name || user.username}</p><p className="mt-0.5 text-[11px] capitalize text-emerald-100/60">{user.role} access</p></div>
            <button onClick={() => void logout().then(() => setLocation("/login"))} className="grid h-9 w-9 place-items-center rounded-lg text-emerald-100/70 transition-colors hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-screen bg-[#f7f8f7]">
        <header className="sticky top-0 z-20 flex h-[84px] items-center justify-between border-b border-[#e4e8e4] bg-[#f7f8f7]/85 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3"><SidebarTrigger data-sidebar="trigger" className="rounded-xl border border-[#dce5de] bg-white shadow-sm lg:hidden" /><div><p className="font-serif text-xl font-semibold tracking-tight text-[#173932]">{section}</p><p className="mt-0.5 text-xs text-[#6b7b72]">Levelose Hostel Management</p></div></div>
          <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-[#5c6c63] shadow-sm ring-1 ring-[#e1e9e2] sm:flex"><span className="h-2 w-2 rounded-full bg-[#90b454]" />Secure local workspace</div>
        </header>
        <main className="mx-auto w-full max-w-[1560px] p-5 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function LoginPrompt() {
  const [, setLocation] = useLocation();
  return <div className="grid min-h-screen place-items-center bg-[#f7f8f7] px-5"><div className="w-full max-w-md rounded-[28px] border border-[#e4e9e4] bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,55,45,0.10)]"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#d7f163] text-[#113b35]"><Building2 className="h-6 w-6" /></div><h1 className="mt-6 font-serif text-3xl font-semibold text-[#173932]">Welcome to Levelose</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#6b7b72]">Use your assigned account to access the hostel workspace, or explore the system before connecting a database.</p><Button onClick={() => setLocation("/login")} className="mt-7 h-11 w-full rounded-xl bg-[#173f37] text-white hover:bg-[#0f302a]">Sign in to continue</Button><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setLocation("/demo/admin")} className="rounded-xl border-[#cfdfc8] bg-[#f5faef] text-[#345e3f]">Admin demo</Button><Button variant="outline" onClick={() => setLocation("/demo/resident")} className="rounded-xl border-[#cfdfc8] bg-[#f5faef] text-[#345e3f]">Resident demo</Button></div></div></div>;
}
