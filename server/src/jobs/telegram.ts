import { prisma } from "../lib/db";
import { formatDate, formatMoney, num } from "../lib/util";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const api = (method: string, body?: unknown) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  }).then((r) => r.json() as Promise<any>);

export const telegramEnabled = () => !!TOKEN;

export function sendTelegram(chatId: string, text: string) {
  return api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" }).catch((e) => console.error("[telegram]", e.message));
}

// Long-polls the bot for "/start CODE" messages and links the chat to the matching user.
export async function startTelegramPolling() {
  if (!TOKEN) return;
  let offset = 0;
  console.log("[telegram] bot ishga tushdi");
  for (;;) {
    try {
      const r = await api("getUpdates", { offset, timeout: 50 });
      for (const u of r.result || []) {
        offset = u.update_id + 1;
        const msg = u.message;
        if (!msg?.text) continue;
        const chatId = String(msg.chat.id);
        const m = msg.text.match(/^\/start\s+(\w+)/);
        if (m) {
          const user = await prisma.user.findUnique({ where: { telegramCode: m[1] } });
          if (user) {
            await prisma.user.update({ where: { id: user.id }, data: { telegramChatId: chatId, telegramCode: null } });
            await sendTelegram(chatId, `✅ ${user.name}, Qarz daftari ulandi! Har kuni ertalab hisobot olasiz.\n/hisobot — hozirgi holat`);
          } else {
            await sendTelegram(chatId, "Kod noto'g'ri yoki eskirgan. Saytdagi Sozlamalar → Telegram bo'limidan yangi kod oling.");
          }
        } else if (msg.text.startsWith("/hisobot")) {
          const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } });
          if (user) await sendTelegram(chatId, await buildReport(user.id));
        } else {
          await sendTelegram(chatId, "Qarz daftari boti. /hisobot — joriy holat.");
        }
      }
    } catch (e: any) {
      console.error("[telegram]", e.message);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

export async function buildReport(userId: string) {
  const ms = await prisma.membership.findMany({ where: { userId }, include: { shop: true } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const lines: string[] = [`📒 <b>Qarz daftari — ${formatDate(today)}</b>`];
  for (const m of ms) {
    const live = { shopId: m.shopId, deletedAt: null, balance: { gt: 0 } };
    const [agg, overdue, dueToday] = await Promise.all([
      prisma.debtor.aggregate({ where: live, _sum: { balance: true }, _count: true }),
      prisma.debtor.findMany({ where: { ...live, dueDate: { lt: today } }, orderBy: { balance: "desc" }, take: 10 }),
      prisma.debtor.findMany({ where: { ...live, dueDate: { gte: today, lt: tomorrow } } }),
    ]);
    const cur = m.shop.currency;
    lines.push(
      "",
      `🏪 <b>${m.shop.name}</b>`,
      `Jami qarz: <b>${formatMoney(num(agg._sum.balance), cur)}</b> (${agg._count} kishi)`
    );
    if (dueToday.length) lines.push(`⏰ Bugun muddati: ` + dueToday.map((d) => `${d.name} (${formatMoney(num(d.balance), cur)})`).join(", "));
    if (overdue.length) {
      lines.push(`🔴 Muddati o'tganlar:`);
      overdue.forEach((d) => lines.push(`  • ${d.name} — ${formatMoney(num(d.balance), cur)} (${formatDate(d.dueDate)})`));
    }
  }
  return lines.join("\n");
}

export async function sendDailyReports() {
  if (!TOKEN) return;
  const users = await prisma.user.findMany({ where: { telegramChatId: { not: null } } });
  for (const u of users) await sendTelegram(u.telegramChatId!, await buildReport(u.id));
}
