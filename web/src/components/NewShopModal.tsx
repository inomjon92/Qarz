import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { Field, Modal } from "./ui";

export function NewShopModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refresh, setShopId } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", address: "", phone: "", currency: "UZS" });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const shop = await api("/shops", { body: f });
      await refresh();
      setShopId(shop.id);
      toast("Do'kon qo'shildi");
      setF({ name: "", address: "", phone: "", currency: "UZS" });
      onClose();
      navigate("/");
    } catch (err: any) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Yangi do'kon">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Do'kon nomi">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus required />
        </Field>
        <Field label="Manzil">
          <input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label="Do'kon telefoni">
          <input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="Valyuta">
          <select className="input" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
            <option value="UZS">So'm (UZS)</option>
            <option value="USD">Dollar (USD)</option>
          </select>
        </Field>
        <button className="btn-primary w-full" disabled={busy}>
          Qo'shish
        </button>
      </form>
    </Modal>
  );
}
