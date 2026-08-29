import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowUpRight, BedDouble, CircleHelp, CreditCard, DoorOpen, Plus, Users } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocation } from "wouter";

const statDefinitions = [
  { key: "residents", label: "Active residents", icon: Users, tone: "bg-[#e9f0dd] text-[#466631]" },
  { key: "rooms", label: "Total rooms", icon: DoorOpen, tone: "bg-[#ddecf0] text-[#2c6370]" },
  { key: "occupiedBeds", label: "Occupied beds", icon: BedDouble, tone: "bg-[#f6e9dc] text-[#9a5d2e]" },
  { key: "pendingPayments", label: "Pending payments", icon: CreditCard, tone: "bg-[#f6e0e0] text-[#a24a4a]" },
] as const;

export default function Home() {
  const { user } = useAuth();
  return user?.role === "resident" ? <ResidentHome /> : <AdminDashboard />;
}

function AdminDashboard() {
  const [, setLocation] = useLocation();
  const summary = trpc.levelose.dashboard.summary.useQuery(undefined, { retry: false });
  const data = summary.data;
  const occupancy = [{ label: "Occupied", value: data?.occupiedBeds ?? 0, fill: "#577d45" }, { label: "Available", value: data?.availableBeds ?? 0, fill: "#b7d47b" }];
  return <div className="space-y-7">
    <section className="flex flex-col justify-between gap-4 rounded-[26px] bg-[#173f37] p-6 text-white shadow-[0_18px_40px_rgba(19,63,55,.15)] sm:flex-row sm:items-end lg:p-8"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#d9edca]">Overview</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">A clear view of your hostel.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75">Keep an eye on capacity, finance, and resident care from one private workspace.</p></div><Button onClick={() => setLocation("/residents")} className="h-10 rounded-xl bg-[#d7f163] px-4 text-[#173f37] hover:bg-[#e1f58b]"><Plus className="mr-2 h-4 w-4" />Add resident</Button></section>
    {summary.error ? <DatabaseNotice message={summary.error.message} /> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statDefinitions.map(item => { const Icon = item.icon; return <Card key={item.key} className="border-0 bg-white shadow-[0_3px_16px_rgba(27,49,41,.05)]"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-[#75827b]">{item.label}</p>{summary.isLoading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-2 font-serif text-3xl font-semibold text-[#173932]">{data?.[item.key] ?? 0}</p>}</div><span className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone}`}><Icon className="h-5 w-5" /></span></div></CardContent></Card>; })}</section>
      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="border-0 bg-white shadow-[0_3px_16px_rgba(27,49,41,.05)]"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#829087]">Capacity</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#173932]">Bed occupancy</h2></div><Badge className="border-0 bg-[#edf5e5] font-medium text-[#5f7d46]">Live record</Badge></div><div className="mt-6 flex items-end justify-between"><p className="font-serif text-5xl font-semibold tracking-tight text-[#173932]">{data?.occupiedBeds ?? 0}<span className="text-2xl text-[#9aa69f]"> / {data?.totalBeds ?? 0}</span></p><p className="text-sm text-[#6d7d74]">{data?.availableBeds ?? 0} available</p></div><div className="mt-4 h-40 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={occupancy} layout="vertical" margin={{ left: 0, right: 10 }}><XAxis type="number" hide /><YAxis dataKey="label" type="category" width={70} tick={{ fill: "#74837a", fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f4f7f2" }} contentStyle={{ borderRadius: 12, border: "1px solid #e1e8e1", fontSize: 12 }} /><Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26}>{occupancy.map(entry => <Cell key={entry.label} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-4 grid grid-cols-2 border-t border-[#ecf0ec] pt-5 text-sm"><div><p className="text-[#829087]">Total beds</p><p className="mt-1 text-lg font-semibold text-[#173932]">{data?.totalBeds ?? 0}</p></div><div><p className="text-[#829087]">Available beds</p><p className="mt-1 text-lg font-semibold text-[#173932]">{data?.availableBeds ?? 0}</p></div></div></CardContent></Card>
        <Card className="border-0 bg-[#eaf2e2] shadow-[0_3px_16px_rgba(27,49,41,.05)]"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#6f8958]">Attention needed</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#173932]">Today’s follow-up</h2></div><CircleHelp className="h-5 w-5 text-[#6f8958]" /></div><div className="mt-7 space-y-3"><div className="rounded-2xl bg-white/80 p-4"><p className="text-3xl font-semibold text-[#173932]">{data?.pendingPayments ?? 0}</p><p className="mt-1 text-sm text-[#647564]">Residents with rent outstanding</p></div><div className="rounded-2xl bg-white/80 p-4"><p className="text-3xl font-semibold text-[#173932]">{data?.pendingComplaints ?? 0}</p><p className="mt-1 text-sm text-[#647564]">Open maintenance requests</p></div></div></CardContent></Card>
      </section>
      <Card className="border-0 bg-white shadow-[0_3px_16px_rgba(27,49,41,.05)]"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#829087]">Audit trail</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#173932]">Recent activity</h2></div><Button onClick={() => setLocation("/residents")} variant="ghost" className="rounded-xl text-[#356d60]">Manage residents <ArrowUpRight className="ml-1 h-4 w-4" /></Button></div>{data?.recent.length ? <div className="mt-5 divide-y divide-[#edf0ed]">{data.recent.map(item => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><p className="text-sm text-[#42574f]">{item.summary}</p><p className="shrink-0 text-xs text-[#8b9790]">{new Date(item.createdAt).toLocaleDateString()}</p></div>)}</div> : <EmptyCopy title="No activity yet" description="Actions such as new resident records and visitor decisions will appear here." />}</CardContent></Card>
    </>}
  </div>;
}

function ResidentHome() {
  const info = trpc.levelose.residentPortal.overview.useQuery(undefined, { retry: false });
  const [, setLocation] = useLocation();
  if (info.error) return <DatabaseNotice message={info.error.message} />;
  const data = info.data;
  return <div className="space-y-6"><section className="rounded-[26px] bg-[#173f37] p-7 text-white"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#d9edca]">Resident portal</p><h1 className="mt-2 font-serif text-3xl font-semibold">Welcome back, {data?.profile.fullName?.split(" ")[0] || "resident"}.</h1><p className="mt-3 text-sm text-emerald-50/75">Your private room, rent, notice, and request information is shown here.</p></section><div className="grid gap-4 md:grid-cols-3"><MiniInfo label="Room" value={data?.roomNumber || "Not assigned"} /><MiniInfo label="Bed" value={data?.bedNumber || "—"} /><MiniInfo label="Rent balance" value={data ? `PKR ${data.remainingBalance.toLocaleString()}` : "—"} /></div><Card className="border-0 bg-white shadow-[0_3px_16px_rgba(27,49,41,.05)]"><CardContent className="p-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#829087]">Rent status · {data?.rentalMonth}</p><div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="font-serif text-2xl font-semibold text-[#173932]">{data?.paymentStatus === "paid" ? "Your rent is settled" : "Your rent balance"}</h2><p className="mt-1 text-sm text-[#76847c]">Paid this month: PKR {data?.paid.toLocaleString() || 0}</p></div><Button onClick={() => setLocation("/visitors")} className="rounded-xl bg-[#173f37]">Request a visitor</Button></div></CardContent></Card></div>;
}

export function DatabaseNotice({ message }: { message: string }) { return <div className="rounded-[22px] border border-[#f0d6b1] bg-[#fffaf0] p-6"><div className="flex gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#a96226]" /><div><p className="font-semibold text-[#6f3c17]">Database setup is needed</p><p className="mt-1 text-sm leading-6 text-[#83502b]">{message}</p><p className="mt-3 text-sm leading-6 text-[#83502b]">Follow the local setup guide in this project to connect PostgreSQL, run the migration, and create the first administrator account.</p></div></div></div>; }
export function EmptyCopy({ title, description }: { title: string; description: string }) { return <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-[#dce5de] bg-[#fafcf9] p-6 text-center"><div><p className="font-serif text-xl font-semibold text-[#284a42]">{title}</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#78877f]">{description}</p></div></div>; }
function MiniInfo({ label, value }: { label: string; value: string }) { return <Card className="border-0 bg-white shadow-[0_3px_16px_rgba(27,49,41,.05)]"><CardContent className="p-5"><p className="text-sm text-[#819087]">{label}</p><p className="mt-1 font-serif text-2xl font-semibold text-[#173932]">{value}</p></CardContent></Card>; }
