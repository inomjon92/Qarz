import { useEffect, useState } from "react";
import { Minus, Package, Plus, Search, X } from "lucide-react";
import { api, type Debtor, type Product, type TxItem } from "../lib/api";
import { addDays, money, parseAmount, toInputDate } from "../lib/format";
import { toast, useApp } from "../lib/store";
import { AmountInput, Field, Modal } from "./ui";
import { t } from "../lib/i18n";

// Product picker: tap to add a line, then adjust the quantity.
function ItemsEditor({ items, setItems, cur }: { items: TxItem[]; setItems: (i: TxItem[]) => void; cur: string }) {
  const { shop } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (shop) api<Product[]>(`/shops/${shop.id}/products`).then(setProducts);
  }, [shop]);
  const add = (p: Product) => {
    const i = items.findIndex((x) => x.productId === p.id);
    if (i >= 0) setItems(items.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)));
    else setItems([...items, { productId: p.id, name: p.name, price: p.price, qty: 1, unit: p.unit }]);
    setQ("");
  };
  const setQty = (i: number, qty: number) => setItems(qty <= 0 ? items.filter((_, j) => j !== i) : items.map((x, j) => (j === i ? { ...x, qty } : x)));
  const found = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, q ? 8 : 6);

  if (!products.length) {
    return <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800">{t("Mahsulot ro'yxati bo'sh. Sozlamalar → Mahsulotlar bo'limida qo'shing.")}</p>;
  }
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input className="input pl-9" placeholder={t("Mahsulot qidirish")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {found.map((p) => (
          <button key={p.id} type="button" onClick={() => add(p)} className="chip border-slate-200 bg-white text-left dark:border-slate-700 dark:bg-slate-900">
            {p.name} <span className="text-slate-400">· {money(p.price, cur)}</span>
          </button>
        ))}
      </div>
      {items.length > 0 && (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.name}</div>
                <div className="text-xs text-slate-500">
                  {money(it.price, cur)} × {it.qty} = <b>{money(it.price * it.qty, cur)}</b>
                </div>
              </div>
              <button type="button" className="rounded-lg border border-slate-200 p-1.5 dark:border-slate-700" onClick={() => setQty(i, it.qty - 1)}>
                {it.qty <= 1 ? <X size={14} /> : <Minus size={14} />}
              </button>
              <input
                className="w-14 rounded-lg border border-slate-200 bg-transparent py-1 text-center text-sm dark:border-slate-700"
                inputMode="decimal"
                value={it.qty}
                onChange={(e) => setQty(i, Number(e.target.value.replace(",", ".")) || 0)}
              />
              <button type="button" className="rounded-lg border border-slate-200 p-1.5 dark:border-slate-700" onClick={() => setQty(i, it.qty + 1)}>
                <Plus size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TxModal({ type, debtor, onClose, onDone }: { type: "DEBT" | "PAYMENT" | null; debtor: Debtor; onClose: () => void; onDone: () => void }) {
  const { shop } = useApp();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [useItems, setUseItems] = useState(false);
  const [items, setItems] = useState<TxItem[]>([]);
  const [receipt, setReceipt] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (type) {
      setAmount("");
      setNote("");
      setItems([]);
      setUseItems(false);
      setReceipt(!!shop?.receiptSms);
      setDueDate(toInputDate(debtor.dueDate) || addDays(30));
    }
  }, [type, debtor, shop]);
  const isDebt = type === "DEBT";
  const cur = shop?.currency || "UZS";
  const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const withItems = isDebt && useItems;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = withItems ? itemsTotal : parseAmount(amount);
    if (!a) return toast(withItems ? t("Mahsulot tanlang") : t("Summani kiriting"), "err");
    setBusy(true);
    try {
      const body: any = { type, note: note || null, dueDate: isDebt ? dueDate || null : null, sendReceipt: receipt && !!debtor.phone };
      if (withItems) body.items = items.map(({ productId, name, qty, price, unit }) => ({ productId, name, qty, price, unit }));
      else body.amount = a;
      const r = await api(`/shops/${shop!.id}/debtors/${debtor.id}/transactions`, { body });
      toast(isDebt ? t("Qarz yozildi") : t("To'lov qabul qilindi"));
      if (r.receiptQueued) toast(t("Mijozga SMS chek navbatga qo'yildi"));
      if (r.overLimit) toast(t("Diqqat: {name} qarz limitidan oshdi!", { name: debtor.name }), "err");
      onDone();
      onClose();
    } catch (err: any) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!type} onClose={onClose} title={isDebt ? t("Qarz yozish") : t("To'lov qabul qilish")}>
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <span className="text-slate-500">{t("{name} — hozirgi qarz:", { name: debtor.name })} </span>
          <b>{money(debtor.balance, cur)}</b>
        </div>
        {isDebt && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium dark:bg-slate-800">
            <button type="button" onClick={() => setUseItems(false)} className={`rounded-lg py-2 ${!useItems ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>
              {t("Summa")}
            </button>
            <button type="button" onClick={() => setUseItems(true)} className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${useItems ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>
              <Package size={15} /> {t("Mahsulotlar")}
            </button>
          </div>
        )}
        {withItems ? (
          <>
            <ItemsEditor items={items} setItems={setItems} cur={cur} />
            <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-950/40">
              <span className="text-sm">{t("Jami")}</span>
              <b className="text-lg text-rose-600 dark:text-rose-400">{money(itemsTotal, cur)}</b>
            </div>
          </>
        ) : (
          <Field label={t("Summa")}>
            <AmountInput value={amount} onChange={setAmount} autoFocus />
          </Field>
        )}
        {!isDebt && debtor.balance > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip border-brand-500 text-brand-700 dark:text-brand-500" onClick={() => setAmount(money(debtor.balance, "").trim())}>
              {t("To'liq: {v}", { v: money(debtor.balance, cur) })}
            </button>
            <button type="button" className="chip border-slate-300 dark:border-slate-700" onClick={() => setAmount(money(Math.round(debtor.balance / 2), "").trim())}>
              {t("Yarmi")}
            </button>
          </div>
        )}
        {isDebt && (
          <Field label={t("Qaytarish muddati")}>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <div className="mt-2 flex gap-2">
              {[7, 15, 30].map((n) => (
                <button key={n} type="button" className="chip border-slate-300 dark:border-slate-700" onClick={() => setDueDate(addDays(n))}>
                  {t("{n} kun", { n })}
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label={withItems ? t("Izoh (ixtiyoriy)") : isDebt ? t("Nima uchun (mahsulot)") : t("Izoh")}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={isDebt ? t("Masalan: un, shakar, yog'") : t("Naqd / karta")} />
        </Field>
        {debtor.phone && (
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={receipt} onChange={(e) => setReceipt(e.target.checked)} />
            {t("Mijozga SMS chek yuborish")}
          </label>
        )}
        <button className={`${isDebt ? "btn-danger" : "btn-primary"} w-full py-3`} disabled={busy}>
          {isDebt ? t("Qarz yozish") : t("To'lovni saqlash")}
        </button>
      </form>
    </Modal>
  );
}
