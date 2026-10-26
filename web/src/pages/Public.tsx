import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { api } from "../lib/api";
import { date, dateTime, money } from "../lib/format";
import { PageLoader } from "../components/ui";

// Customer-facing read-only page: /p/:token
export function PublicDebtorPage() {
  const { token } = useParams();
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api(`/public/debtor/${token}`).then(setD).catch((e) => setErr(e.message));
  }, [token]);
  if (err) return <div className="p-10 text-center text-slate-500">{err}</div>;
  if (!d) return <PageLoader />;
  const cur = d.shop.currency;
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div className="flex items-center gap-2 text-brand-700 dark:text-brand-500">
        <BookOpen size={20} /> <b>{d.shop.name}</b>
      </div>
      <div className="card p-5">
        <div className="text-sm text-slate-500">Hurmatli {d.name}, sizning qarzingiz:</div>
        <div className={`mt-1 text-3xl font-bold ${d.balance > 0 ? "text-rose-600" : "text-brand-600"}`}>{d.balance > 0 ? money(d.balance, cur) : "Qarzingiz yo'q ✅"}</div>
        {d.dueDate && d.balance > 0 && <div className="mt-1 text-sm text-slate-500">Qaytarish muddati: {date(d.dueDate)}</div>}
        {d.shop.phone && (
          <a href={`tel:${d.shop.phone}`} className="btn-ghost mt-4">
            Do'konga qo'ng'iroq: {d.shop.phone}
          </a>
        )}
      </div>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {d.transactions.map((t: any) => (
          <div key={t.id} className="flex justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{t.type === "DEBT" ? "Qarz" : "To'lov"}{t.note && <span className="font-normal text-slate-500"> · {t.note}</span>}</div>
              <div className="text-xs text-slate-500">{dateTime(t.createdAt)}</div>
            </div>
            <div className={`font-semibold ${t.type === "DEBT" ? "text-rose-600" : "text-brand-600"}`}>
              {t.type === "DEBT" ? "+" : "−"}
              {money(t.amount, cur)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
