import { prisma } from "../lib/db";
import { formatDate, formatMoney, num, renderTemplate } from "../lib/util";

// Queues automatic SMS reminders for debtors whose due date is near or past.
export async function queueDueReminders() {
  const shops = await prisma.shop.findMany({ where: { smsEnabled: true } });
  let queued = 0;
  for (const shop of shops) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + (shop.remindDaysBefore + 1) * 86400000);
    const quietSince = new Date(Date.now() - shop.remindEveryDays * 86400000 + 3600000);
    const debtors = await prisma.debtor.findMany({
      where: {
        shopId: shop.id,
        deletedAt: null,
        balance: { gt: 0 },
        phone: { not: null },
        dueDate: { lt: horizon },
        OR: [{ lastSmsAt: null }, { lastSmsAt: { lt: quietSince } }],
      },
    });
    for (const d of debtors) {
      const text = renderTemplate(shop.smsTemplate, {
        ism: d.name,
        summa: formatMoney(num(d.balance), shop.currency),
        muddat: formatDate(d.dueDate),
        dokon: shop.name,
      });
      await prisma.$transaction([
        prisma.smsMessage.create({ data: { shopId: shop.id, debtorId: d.id, phone: d.phone!, text, auto: true } }),
        prisma.debtor.update({ where: { id: d.id }, data: { lastSmsAt: new Date() } }),
      ]);
      queued++;
    }
  }
  if (queued) console.log(`[reminders] ${queued} ta SMS navbatga qo'yildi`);
  return queued;
}
