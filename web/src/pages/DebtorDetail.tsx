import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Link2, MapPin, MessageSquare, Pencil, Phone, RotateCcw, Trash2 } from "lucide-react";
import { api, getApiBase, type Debtor, type Sms, type Tx } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { date, dateTime, daysLeft, money, phone } from "../lib/format";
import { DebtorForm } from "../components/DebtorForm";
import { TxModal } from "../components/TxModal";
import { Avatar, DueBadge, Modal, PageLoader } from "../components/ui";
import { t } from "../lib/i18n";

type Full = Debtor & { transactions: Tx[]; smsMessages: Sms[] };

export function DebtorDetailPage() {
  const { id } = useParams();
  const { shop, isOwner } = useApp();
  const navigate = useNavigate();
  const [d, setD] = useState<Full | null>(null);
  const [tx, setTx] = useState<"DEBT" | "PAYMENT" | null>(null);
  const [editing, setEditing] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsText, setSmsText] = useState("");

  const load = useCallback(() => {
    if (shop) api<Full>(`/shops/${shop.id}/debtors/${id}`).then(setD).catch((e) => toast(e.message, "err"));
  }, [shop, id]);
  useEffect(load, [load]);

  if (!d || !shop) return <PageLoader />;
  const cur = shop.currency;
  const base = `/shops/${shop.id}/debtors/${d.id}`;
  const publicUrl = `${getApiBase() || location.origin}/p/${d.publicToken}`;

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast(msg);
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  const openSms = () => {
    const vars: Record<string, string> = { ism: d.name, summa: money(d.balance, cur), muddat: date(d.dueDate), dokon: shop.name };
    setSmsText(shop.smsTemplate.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m));
    setSmsOpen(true);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <ArrowLeft size={16} /> {t("Orqaga")}
      </button>

      {d.deletedAt && (
        <div className="card flex items-center justify-between border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {t("Bu qarzdor o'chirilgan")}
          <button className="btn-ghost py-1.5" onClick={() => act(() => api(`${base}/restore`, { method: "POST" }), t("Tiklandi"))}>
            <RotateCcw size={16} /> {t("Tiklash")}
          </button>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-start gap-3">
          <Avatar name={d.name} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{d.name}</h1>
            <div className="mt-1 space-y-0.5 text-sm text-slate-500">
              {d.phone && (
                <a href={`tel:${d.phone}`} className="flex items-center gap-1.5 hover:text-brand-600">
                  <Phone size={14} /> {phone(d.phone)}
                </a>
              )}
              {d.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} /> {d.address}
                </div>
              )}
              {d.note && <div className="italic">{d.note}</div>}
            </div>
          </div>
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setEditing(true)} title="Tahrirlash">
            <Pencil size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <div className="text-sm text-slate-500">{t("Qarz")}</div>
          <div className={`text-3xl font-bold ${d.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-brand-600"}`}>
            {d.balance >= 0 ? money(d.balance, cur) : `+${money(-d.balance, cur)} ${t("(ortiqcha)")}`}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {d.dueDate && d.balance > 0 && (
              <>
                {t("Muddat:")} <b className="text-slate-700 dark:text-slate-200">{date(d.dueDate)}</b> <DueBadge days={daysLeft(d.dueDate)} />
              </>
            )}
            {d.creditLimit != null && <span>· {t("Limit: {v}", { v: money(d.creditLimit, cur) })}</span>}
          </div>
          {d.creditLimit != null && d.creditLimit > 0 && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className={`h-full ${d.balance > d.creditLimit ? "bg-rose-500" : "bg-brand-500"}`} style={{ width: `${Math.min(100, (d.balance / d.creditLimit) * 100)}%` }} />
            </div>
          )}
        </div>

        {!d.deletedAt && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-danger py-3" onClick={() => setTx("DEBT")}>
              <ArrowUpRight size={18} /> {t("Qarz yozish")}
            </button>
            <button className="btn-primary py-3" onClick={() => setTx("PAYMENT")}>
              <ArrowDownLeft size={18} /> {t("To'lov olish")}
            </button>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {d.phone && (
            <button className="btn-ghost flex-1" onClick={openSms}>
              <MessageSquare size={16} /> SMS
            </button>
          )}
          <button
            className="btn-ghost flex-1"
            onClick={() => {
              navigator.clipboard?.writeText(publicUrl);
              toast(t("Mijoz uchun havola nusxalandi"));
            }}
          >
            <Link2 size={16} /> {t("Havola")}
          </button>
          {isOwner && !d.deletedAt && (
            <button
              className="btn-ghost text-rose-600"
              onClick={() => confirm(`${d.name} o'chirilsinmi? (keyin tiklash mumkin)`) && act(() => api(base, { method: "DELETE" }), t("O'chirildi"))}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="border-b border-slate-100 px-4 py-3 font-semibold dark:border-slate-800">{t("Tarix")}</h2>
        {d.transactions.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{t("Hali yozuv yo'q")}</p>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {d.transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`rounded-xl p-2 ${tx.type === "DEBT" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50" : "bg-brand-50 text-brand-600 dark:bg-brand-900/30"}`}>
                {tx.type === "DEBT" ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{tx.type === "DEBT" ? t("Qarz berildi") : t("To'lov")}{tx.note && <span className="font-normal text-slate-500"> · {tx.note}</span>}</div>
                <div className="text-xs text-slate-500">
                  {dateTime(tx.createdAt)}
                  {tx.createdBy && ` · ${tx.createdBy.name}`}
                  {tx.dueDate && ` · ${t("muddat {d}", { d: date(tx.dueDate) })}`}
                </div>
              </div>
              <div className={`font-semibold ${tx.type === "DEBT" ? "text-rose-600 dark:text-rose-400" : "text-brand-600"}`}>
                {tx.type === "DEBT" ? "+" : "−"}
                {money(tx.amount, cur)}
              </div>
              {isOwner && (
                <button
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-600 dark:hover:bg-rose-950"
                  title={t("Yozuvni o'chirish")}
                  onClick={() => confirm(t("Bu yozuv o'chirilsinmi?")) && act(() => api(`${base}/transactions/${tx.id}`, { method: "DELETE" }), t("Yozuv o'chirildi"))}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {d.smsMessages.length > 0 && (
        <div className="card">
          <h2 className="border-b border-slate-100 px-4 py-3 font-semibold dark:border-slate-800">{t("Yuborilgan SMS")}</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {d.smsMessages.map((s) => (
              <div key={s.id} className="px-4 py-3 text-sm">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{dateTime(s.createdAt)} {s.auto ? `· ${t("avtomatik")}` : ""}</span>
                  <span className={s.status === "SENT" ? "text-brand-600" : s.status === "FAILED" ? "text-rose-600" : "text-amber-600"}>
                    {{ PENDING: t("Navbatda"), SENDING: t("Yuborilmoqda"), SENT: t("Yuborildi"), FAILED: t("Xato") }[s.status]}
                  </span>
                </div>
                <div className="mt-1">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TxModal type={tx} debtor={d} onClose={() => setTx(null)} onDone={load} />
      <DebtorForm open={editing} onClose={() => setEditing(false)} debtor={d} onSaved={load} />
      <Modal open={smsOpen} onClose={() => setSmsOpen(false)} title={t("SMS yuborish")}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {t("{p} raqamiga. Xabar Android ilova o'rnatilgan telefon SIM kartasidan yuboriladi.", { p: phone(d.phone) })}
          </p>
          <textarea className="input" rows={5} value={smsText} onChange={(e) => setSmsText(e.target.value)} />
          <div className="text-right text-xs text-slate-500">{smsText.length} belgi</div>
          <button
            className="btn-primary w-full py-3"
            onClick={() => {
              setSmsOpen(false);
              act(() => api(`${base}/sms`, { body: { text: smsText } }), t("SMS navbatga qo'yildi"));
            }}
          >
            <MessageSquare size={18} /> {t("Yuborish")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
