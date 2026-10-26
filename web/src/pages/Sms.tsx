import { useCallback, useEffect, useState } from "react";
import { MessageSquare, RotateCcw } from "lucide-react";
import { api, type Sms } from "../lib/api";
import { toast, useApp } from "../lib/store";
import { dateTime, phone } from "../lib/format";
import { GatewayCard } from "../components/GatewayCard";
import { Empty, PageLoader } from "../components/ui";
import { t } from "../lib/i18n";

const statusUi = {
  PENDING: [t("Navbatda"), "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"],
  SENDING: [t("Yuborilmoqda"), "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"],
  SENT: [t("Yuborildi"), "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-500"],
  FAILED: [t("Xato"), "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"],
};

export function SmsPage() {
  const { shop } = useApp();
  const [items, setItems] = useState<Sms[] | null>(null);
  const load = useCallback(() => {
    if (shop) api<Sms[]>(`/shops/${shop.id}/reports/sms`).then(setItems);
  }, [shop]);
  useEffect(load, [load]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("SMS xabarlar")}</h1>
      <GatewayCard />
      {shop && (
        <p className="text-sm text-slate-500">
          {shop.smsEnabled
            ? t("Avtomatik eslatma: muddatdan {a} kun oldin, so'ng har {b} kunda (soat 9:00 va 14:00)", { a: shop.remindDaysBefore, b: shop.remindEveryDays })
            : t("Avtomatik eslatma: o'chirilgan")}{" "}
          {t("Sozlamalardan o'zgartirish mumkin.")}
        </p>
      )}
      {!items ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <div className="card">
          <Empty icon={<MessageSquare size={28} />} title={t("Hali SMS yuborilmagan")} text={t("Muddati kelgan qarzdorlarga SMS avtomatik navbatga qo'yiladi")} />
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((s) => {
            const [label, cls] = statusUi[s.status];
            return (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">
                    {s.debtor?.name || phone(s.phone)} <span className="font-normal text-slate-500">{phone(s.phone)}</span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.text}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {dateTime(s.createdAt)} · {s.auto ? t("avtomatik") : t("qo'lda")}
                    {s.error && <span className="text-rose-600"> · {s.error}</span>}
                  </span>
                  {s.status === "FAILED" && (
                    <button
                      className="flex items-center gap-1 font-semibold text-brand-600"
                      onClick={() => api(`/sms/${s.id}/retry`, { method: "POST" }).then(() => (toast(t("Qayta navbatga qo'yildi")), load()))}
                    >
                      <RotateCcw size={13} /> {t("Qayta")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
