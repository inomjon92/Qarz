import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock, MessageSquare, Users, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { daysLeft, money } from "../lib/format";
import { Avatar, DueBadge, PageLoader, Stat } from "../components/ui";
import { t } from "../lib/i18n";

interface Dash {
  totalDebt: number;
  debtorsWithDebt: number;
  overdueAmount: number;
  overdueCount: number;
  todayDebt: number;
  todayPaid: number;
  monthDebt: number;
  monthPaid: number;
  pendingSms: number;
  dueSoon: { id: string; name: string; balance: number; dueDate: string }[];
  top: { id: string; name: string; balance: number; dueDate: string | null }[];
  series: { date: string; debt: number; paid: number }[];
}

const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v));

export function DashboardPage() {
  const { shop } = useApp();
  const [d, setD] = useState<Dash | null>(null);
  const [days, setDays] = useState(30);
  useEffect(() => {
    if (shop) api<Dash>(`/shops/${shop.id}/reports/dashboard?days=${days}`).then(setD);
  }, [shop, days]);
  if (!d || !shop) return <PageLoader />;
  const cur = shop.currency;
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden bg-gradient-to-br from-brand-600 to-emerald-700 p-5 text-white dark:from-brand-700 dark:to-emerald-900">
        <div className="text-sm text-white/80">{t("Jami qarz")}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{money(d.totalDebt, cur)}</div>
        <div className="mt-2 text-sm text-white/80">{t("{n} ta qarzdor", { n: d.debtorsWithDebt })}</div>
        <div className="mt-4 flex gap-2">
          <Link to="/debtors?new=1" className="btn bg-white/15 text-white hover:bg-white/25">
            {t("+ Yangi qarzdor")}
          </Link>
          <Link to="/debtors" className="btn bg-white/15 text-white hover:bg-white/25">
            {t("Ro'yxat")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Muddati o'tgan")} value={money(d.overdueAmount, cur)} sub={t("{n} kishi", { n: d.overdueCount })} tone="rose" icon={<AlertTriangle size={16} />} />
        <Stat label={t("Bugun berildi")} value={money(d.todayDebt, cur)} tone="amber" icon={<ArrowUpRight size={16} />} />
        <Stat label={t("Bugun qaytdi")} value={money(d.todayPaid, cur)} tone="brand" icon={<ArrowDownLeft size={16} />} />
        <Stat label={t("Shu oy qaytdi")} value={money(d.monthPaid, cur)} sub={t("Berildi: {v}", { v: money(d.monthDebt, cur) })} icon={<Wallet size={16} />} />
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("Qarz va to'lovlar")}</h2>
          <select className="input w-auto py-1.5" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>{t("7 kun")}</option>
            <option value={30}>{t("30 kun")}</option>
            <option value={90}>{t("90 kun")}</option>
          </select>
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={d.series} margin={{ left: -10, right: 8 }}>
              <defs>
                <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(8) + "." + v.slice(5, 7)} fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis tickFormatter={short} fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any, n: any) => [money(Number(v), cur), n === "debt" ? t("Berilgan qarz") : t("Qaytgan pul")]} labelFormatter={(l) => String(l).split("-").reverse().join(".")} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
              <Area type="monotone" dataKey="debt" stroke="#f59e0b" strokeWidth={2} fill="url(#gd)" />
              <Area type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2} fill="url(#gp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {t("Berilgan qarz")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> {t("Qaytgan pul")}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DebtorList title={t("Muddati yaqinlashganlar")} icon={<CalendarClock size={18} />} items={d.dueSoon} cur={cur} empty={t("Yaqin 3 kunda muddati keladigan qarz yo'q")} />
        <DebtorList title={t("Eng katta qarzdorlar")} icon={<Users size={18} />} items={d.top} cur={cur} empty={t("Hozircha qarzdor yo'q")} />
      </div>

      {d.pendingSms > 0 && (
        <Link to="/sms" className="card flex items-center gap-3 p-4 text-sm hover:border-brand-500">
          <MessageSquare className="text-brand-600" size={20} />
          <span>
            {t("{n} ta SMS yuborilishini kutmoqda. Android ilovada SMS yuborish yoqilganini tekshiring.", { n: d.pendingSms })}
          </span>
        </Link>
      )}
    </div>
  );
}

function DebtorList({ title, icon, items, cur, empty }: { title: string; icon: React.ReactNode; items: Dash["top"]; cur: string; empty: string }) {
  return (
    <div className="card p-4">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <span className="text-brand-600">{icon}</span> {title}
      </h2>
      {items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">{empty}</p>}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((x) => (
          <Link key={x.id} to={`/debtors/${x.id}`} className="flex items-center gap-3 py-2.5">
            <Avatar name={x.name} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{x.name}</div>
              <DueBadge days={daysLeft(x.dueDate)} />
            </div>
            <div className="font-semibold">{money(x.balance, cur)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
