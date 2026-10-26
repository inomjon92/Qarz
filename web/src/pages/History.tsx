import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, FileText, History } from "lucide-react";
import { api, download, type Tx } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { addDays, dateTime, money } from "../lib/format";
import { Empty, PageLoader, Stat } from "../components/ui";
import { t } from "../lib/i18n";

export function HistoryPage() {
  const { shop } = useApp();
  const [from, setFrom] = useState(addDays(-30));
  const [to, setTo] = useState(addDays(0));
  const [type, setType] = useState("");
  const [month, setMonth] = useState(addDays(0).slice(0, 7));
  const [data, setData] = useState<{ items: Tx[]; debt: number; paid: number } | null>(null);
  useEffect(() => {
    if (shop) api(`/shops/${shop.id}/reports/transactions?` + new URLSearchParams({ from, to, type })).then(setData);
  }, [shop, from, to, type]);
  if (!shop) return <PageLoader />;
  const cur = shop.currency;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("Tarix va hisobot")}</h1>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="flex-1">
          <span className="label">{t("Oylik PDF hisobot")}</span>
          <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button
          className="btn-primary"
          onClick={() => download(`/shops/${shop.id}/reports/monthly.pdf?month=${month}`, `hisobot-${month}.pdf`).catch((e) => toast(e.message, "err"))}
        >
          <FileText size={18} /> {t("PDF yuklab olish")}
        </button>
      </div>
      <div className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <label>
          <span className="label">{t("Dan")}</span>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span className="label">{t("Gacha")}</span>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="col-span-2">
          <span className="label">{t("Turi")}</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t("Hammasi")}</option>
            <option value="DEBT">{t("Faqat qarzlar")}</option>
            <option value="PAYMENT">{t("Faqat to'lovlar")}</option>
          </select>
        </label>
      </div>
      {!data ? (
        <PageLoader />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("Berilgan qarz")} value={money(data.debt, cur)} tone="rose" icon={<ArrowUpRight size={16} />} />
            <Stat label={t("Qaytgan pul")} value={money(data.paid, cur)} tone="brand" icon={<ArrowDownLeft size={16} />} />
          </div>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.length === 0 && <Empty icon={<History size={28} />} title={t("Bu davrda yozuv yo'q")} />}
            {data.items.map((tx) => (
              <Link key={tx.id} to={`/debtors/${tx.debtor!.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className={`rounded-xl p-2 ${tx.type === "DEBT" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50" : "bg-brand-50 text-brand-600 dark:bg-brand-900/30"}`}>
                  {tx.type === "DEBT" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {tx.debtor!.name}
                    {tx.note && <span className="font-normal text-slate-500"> · {tx.note}</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {dateTime(tx.createdAt)}
                    {tx.createdBy && ` · ${tx.createdBy.name}`}
                  </div>
                </div>
                <div className={`font-semibold ${tx.type === "DEBT" ? "text-rose-600 dark:text-rose-400" : "text-brand-600"}`}>
                  {tx.type === "DEBT" ? "+" : "−"}
                  {money(tx.amount, cur)}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
