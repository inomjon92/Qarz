import { useEffect, useState } from "react";
import { api, type Debtor } from "../lib/api";
import { addDays, money, parseAmount, toInputDate } from "../lib/format";
import { toast, useApp } from "../lib/store";
import { AmountInput, Field, Modal } from "./ui";

export function TxModal({ type, debtor, onClose, onDone }: { type: "DEBT" | "PAYMENT" | null; debtor: Debtor; onClose: () => void; onDone: () => void }) {
  const { shop } = useApp();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (type) {
      setAmount("");
      setNote("");
      setDueDate(toInputDate(debtor.dueDate) || addDays(30));
    }
  }, [type, debtor]);
  const isDebt = type === "DEBT";
  const cur = shop?.currency;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseAmount(amount);
    if (!a) return toast("Summani kiriting", "err");
    setBusy(true);
    try {
      const r = await api(`/shops/${shop!.id}/debtors/${debtor.id}/transactions`, { body: { type, amount: a, note: note || null, dueDate: isDebt ? dueDate || null : null } });
      toast(isDebt ? "Qarz yozildi" : "To'lov qabul qilindi");
      if (r.overLimit) toast(`Diqqat: ${debtor.name} qarz limitidan oshdi!`, "err");
      onDone();
      onClose();
    } catch (err: any) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!type} onClose={onClose} title={isDebt ? "Qarz yozish" : "To'lov qabul qilish"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <span className="text-slate-500">{debtor.name} — hozirgi qarz: </span>
          <b>{money(debtor.balance, cur)}</b>
        </div>
        <Field label="Summa">
          <AmountInput value={amount} onChange={setAmount} autoFocus />
        </Field>
        {!isDebt && debtor.balance > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip border-brand-500 text-brand-700 dark:text-brand-500" onClick={() => setAmount(money(debtor.balance, "").trim())}>
              To'liq: {money(debtor.balance, cur)}
            </button>
            <button type="button" className="chip border-slate-300 dark:border-slate-700" onClick={() => setAmount(money(Math.round(debtor.balance / 2), "").trim())}>
              Yarmi
            </button>
          </div>
        )}
        {isDebt && (
          <Field label="Qaytarish muddati">
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <div className="mt-2 flex gap-2">
              {[7, 15, 30].map((n) => (
                <button key={n} type="button" className="chip border-slate-300 dark:border-slate-700" onClick={() => setDueDate(addDays(n))}>
                  {n} kun
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label={isDebt ? "Nima uchun (mahsulot)" : "Izoh"}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={isDebt ? "Masalan: un, shakar, yog'" : "Naqd / karta"} />
        </Field>
        <button className={`${isDebt ? "btn-danger" : "btn-primary"} w-full py-3`} disabled={busy}>
          {isDebt ? "Qarz yozish" : "To'lovni saqlash"}
        </button>
      </form>
    </Modal>
  );
}
