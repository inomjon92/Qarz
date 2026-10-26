import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { getApiBase, getToken } from "../lib/api";
import { isNative, SmsGateway, type GatewayStatus } from "../lib/native";
import { toast, useApp } from "../lib/store";
import { dateTime } from "../lib/format";
import { t } from "../lib/i18n";

// Lets the shop owner turn this Android phone into the SMS sender.
export function GatewayCard() {
  const { isOwner } = useApp();
  const [st, setSt] = useState<GatewayStatus | null>(null);
  useEffect(() => {
    if (isNative()) SmsGateway.status().then(setSt).catch(() => {});
  }, []);

  if (!isNative()) {
    return (
      <div className="card flex gap-3 p-4 text-sm">
        <Smartphone className="shrink-0 text-brand-600" size={22} />
        <div>
          <b>{t("SMS lar Android ilova orqali yuboriladi.")}</b>
          <p className="mt-1 text-slate-500">
            {t("Qarz daftari APK ni do'kon telefoniga o'rnating, egasi hisobi bilan kiring va “SMS yuborish” ni yoqing. Shundan so'ng muddati kelgan qarzdorlarga SMS telefon SIM kartasidan avtomatik ketadi.")}
          </p>
        </div>
      </div>
    );
  }

  const toggle = async () => {
    try {
      if (st?.enabled) return setSt(await SmsGateway.disable());
      const p = await SmsGateway.requestPermission();
      if (!p.granted) return toast(t("SMS yuborishga ruxsat berilmadi"), "err");
      const base = getApiBase();
      if (!base) return toast(t("Avval kirish sahifasida server manzilini kiriting"), "err");
      setSt(await SmsGateway.enable({ apiBase: base, token: getToken()! }));
      toast(t("Bu telefon endi SMS yuboradi"));
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Smartphone className={st?.enabled ? "text-brand-600" : "text-slate-400"} size={24} />
        <div className="flex-1">
          <div className="font-semibold">{t("Bu telefondan SMS yuborish")}</div>
          <div className="text-xs text-slate-500">{st?.enabled ? t("Yoqilgan — har 15 daqiqada navbat tekshiriladi") : t("O'chirilgan")}</div>
        </div>
        <button
          disabled={!isOwner}
          onClick={toggle}
          className={`relative h-7 w-12 rounded-full transition ${st?.enabled ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"}`}
          aria-label="SMS yuborishni yoqish"
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${st?.enabled ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      {st?.enabled && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            {t("Yuborilgan: {n} · Oxirgi tekshiruv: {d}", { n: st.sentTotal, d: st.lastRun ? dateTime(new Date(st.lastRun)) : "—" })}
            {st.lastError && <span className="text-rose-600"> · {st.lastError}</span>}
          </span>
          <button className="font-semibold text-brand-600" onClick={async () => setSt(await SmsGateway.runNow())}>
            {t("Hozir yuborish")}
          </button>
        </div>
      )}
      {!isOwner && <p className="mt-2 text-xs text-slate-500">{t("Faqat do'kon egasi yoqa oladi.")}</p>}
    </div>
  );
}
