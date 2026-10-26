import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { api, type Tx } from "../lib/api";
import { useApp } from "../lib/store";
import { addDays, dateTime, money } from "../lib/format";
import { Empty, PageLoader, Stat } from "../components/ui";

export function HistoryPage() {
  const { shop } = useApp();
  const [from, setFrom] = useState(addDays(-30));
  const [to, setTo] = useState(addDays(0));
  const [type, setType] = useState("");
  const [data, setData] = useState<{ items: Tx[]; debt: number; paid: number } | null>(null);
  useEffect(() => {
    if (shop) api(`/shops/${shop.id}/reports/transactions?` + new URLSearchParams({ from, to, type })).then(setData);
  }, [shop, from, to, type]);
  if (!shop) return <PageLoader />;
  const cur = shop.currency;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tarix va hisobot</h1>
      <div className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <label>
          <span className="label">Dan</span>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span className="label">Gacha</span>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="col-span-2">
          <span className="label">Turi</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Hammasi</option>
            <option value="DEBT">Faqat qarzlar</option>
            <option value="PAYMENT">Faqat to'lovlar</option>
          </select>
        </label>
      </div>
      {!data ? (
        <PageLoader />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Berilgan qarz" value={money(data.debt, cur)} tone="rose" icon={<ArrowUpRight size={16} />} />
            <Stat label="Qaytgan pul" value={money(data.paid, cur)} tone="brand" icon={<ArrowDownLeft size={16} />} />
          </div>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.length === 0 && <Empty icon={<History size={28} />} title="Bu davrda yozuv yo'q" />}
            {data.items.map((t) => (
              <Link key={t.id} to={`/debtors/${t.debtor!.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className={`rounded-xl p-2 ${t.type === "DEBT" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50" : "bg-brand-50 text-brand-600 dark:bg-brand-900/30"}`}>
                  {t.type === "DEBT" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {t.debtor!.name}
                    {t.note && <span className="font-normal text-slate-500"> · {t.note}</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {dateTime(t.createdAt)}
                    {t.createdBy && ` · ${t.createdBy.name}`}
                  </div>
                </div>
                <div className={`font-semibold ${t.type === "DEBT" ? "text-rose-600 dark:text-rose-400" : "text-brand-600"}`}>
                  {t.type === "DEBT" ? "+" : "−"}
                  {money(t.amount, cur)}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
