import { useEffect, useState } from "react";
import { api, type Debtor } from "../lib/api";
import { addDays, groupDigits, parseAmount, toInputDate } from "../lib/format";
import { toast, useApp } from "../lib/store";
import { AmountInput, Field, Modal } from "./ui";
import { t } from "../lib/i18n";

export function DebtorForm({ open, onClose, debtor, onSaved }: { open: boolean; onClose: () => void; debtor?: Debtor | null; onSaved: (d: Debtor) => void }) {
  const { shop } = useApp();
  const empty = { name: "", phone: "", address: "", note: "", creditLimit: "", amount: "", txNote: "", dueDate: addDays(30) };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(
      debtor
        ? {
            ...empty,
            name: debtor.name,
            phone: debtor.phone || "",
            address: debtor.address || "",
            note: debtor.note || "",
            creditLimit: debtor.creditLimit ? groupDigits(String(debtor.creditLimit)) : "",
            dueDate: toInputDate(debtor.dueDate),
          }
        : empty
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debtor]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body: any = {
        name: f.name.trim(),
        phone: f.phone || null,
        address: f.address || null,
        note: f.note || null,
        creditLimit: f.creditLimit ? parseAmount(f.creditLimit) : null,
        dueDate: f.dueDate || null,
      };
      if (!debtor && f.amount) {
        body.amount = parseAmount(f.amount);
        body.txNote = f.txNote || undefined;
      }
      const saved = debtor
        ? await api(`/shops/${shop!.id}/debtors/${debtor.id}`, { method: "PUT", body })
        : await api(`/shops/${shop!.id}/debtors`, { body });
      toast(debtor ? t("Saqlandi") : t("Qarzdor qo'shildi"));
      onSaved(saved);
      onClose();
    } catch (err: any) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={debtor ? t("Qarzdorni tahrirlash") : t("Yangi qarzdor")}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t("Ism familiya")}>
          <input className="input" value={f.name} onChange={set("name")} required autoFocus />
        </Field>
        <Field label={t("Telefon raqam")} hint={t("SMS eslatma shu raqamga yuboriladi")}>
          <input className="input" inputMode="tel" placeholder="+998 90 123 45 67" value={f.phone} onChange={set("phone")} />
        </Field>
        {!debtor && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Qarz summasi")}>
              <AmountInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} />
            </Field>
            <Field label={t("Qaytarish muddati")}>
              <input className="input" type="date" value={f.dueDate} onChange={set("dueDate")} />
            </Field>
          </div>
        )}
        {!debtor && f.amount && (
          <Field label={t("Nima uchun (mahsulot)")}>
            <input className="input" value={f.txNote} onChange={set("txNote")} placeholder={t("Masalan: un 2 qop, yog'")} />
          </Field>
        )}
        {debtor && (
          <Field label={t("Qaytarish muddati")}>
            <input className="input" type="date" value={f.dueDate} onChange={set("dueDate")} />
          </Field>
        )}
        <Field label={t("Manzil")}>
          <input className="input" value={f.address} onChange={set("address")} />
        </Field>
        <Field label={t("Qarz limiti ({c})", { c: shop?.currency === "USD" ? "$" : t("so'm") })} hint={t("Limitdan oshsa ogohlantiramiz")}>
          <AmountInput value={f.creditLimit} onChange={(v) => setF({ ...f, creditLimit: v })} />
        </Field>
        <Field label={t("Izoh")}>
          <textarea className="input" rows={2} value={f.note} onChange={set("note")} />
        </Field>
        <button className="btn-primary w-full py-3" disabled={busy}>
          {t("Saqlash")}
        </button>
      </form>
    </Modal>
  );
}
