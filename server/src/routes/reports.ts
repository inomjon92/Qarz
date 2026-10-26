import { Router } from "express";
import { prisma } from "../lib/db";
import type { AuthedRequest } from "../lib/auth";
import { asyncH, dayKey, num, startOfMonth, startOfToday } from "../lib/util";
import { monthlyPdf } from "../lib/pdf";

export const reportsRouter = Router({ mergeParams: true });


reportsRouter.get(
  "/dashboard",
  asyncH(async (req: AuthedRequest, res) => {
    const shopId = req.shopId!;
    const days = Math.min(Number(req.query.days) || 30, 365);
    const today = startOfToday();
    const from = new Date(today.getTime() - (days - 1) * 86400000);
    const monthStart = startOfMonth();
    const soon = new Date(today.getTime() + 3 * 86400000);
    const live = { shopId, deletedAt: null };

    const [total, overdue, dueSoon, top, txs, pendingSms] = await Promise.all([
      prisma.debtor.aggregate({ where: { ...live, balance: { gt: 0 } }, _sum: { balance: true }, _count: true }),
      prisma.debtor.aggregate({ where: { ...live, balance: { gt: 0 }, dueDate: { lt: today } }, _sum: { balance: true }, _count: true }),
      prisma.debtor.findMany({ where: { ...live, balance: { gt: 0 }, dueDate: { gte: today, lt: soon } }, orderBy: { dueDate: "asc" }, take: 10 }),
      prisma.debtor.findMany({ where: { ...live, balance: { gt: 0 } }, orderBy: { balance: "desc" }, take: 5 }),
      prisma.transaction.findMany({ where: { shopId, deletedAt: null, createdAt: { gte: from < monthStart ? from : monthStart } }, select: { type: true, amount: true, createdAt: true } }),
      prisma.smsMessage.count({ where: { shopId, status: { in: ["PENDING", "SENDING"] } } }),
    ]);

    const series: Record<string, { date: string; debt: number; paid: number }> = {};
    for (let i = 0; i < days; i++) {
      const k = dayKey(new Date(from.getTime() + i * 86400000));
      series[k] = { date: k, debt: 0, paid: 0 };
    }
    const sums = { todayDebt: 0, todayPaid: 0, monthDebt: 0, monthPaid: 0 };
    for (const t of txs) {
      const a = num(t.amount);
      const s = series[dayKey(t.createdAt)];
      if (s) t.type === "DEBT" ? (s.debt += a) : (s.paid += a);
      if (t.createdAt >= monthStart) t.type === "DEBT" ? (sums.monthDebt += a) : (sums.monthPaid += a);
      if (t.createdAt >= today) t.type === "DEBT" ? (sums.todayDebt += a) : (sums.todayPaid += a);
    }
    const ser = (d: any) => ({ id: d.id, name: d.name, phone: d.phone, balance: num(d.balance), dueDate: d.dueDate });
    res.json({
      totalDebt: num(total._sum.balance),
      debtorsWithDebt: total._count,
      overdueAmount: num(overdue._sum.balance),
      overdueCount: overdue._count,
      ...sums,
      pendingSms,
      dueSoon: dueSoon.map(ser),
      top: top.map(ser),
      series: Object.values(series),
    });
  })
);

reportsRouter.get(
  "/transactions",
  asyncH(async (req: AuthedRequest, res) => {
    const { from, to, type } = req.query as Record<string, string>;
    const where: any = { shopId: req.shopId, deletedAt: null };
    if (type === "DEBT" || type === "PAYMENT") where.type = type;
    if (from || to) where.createdAt = { ...(from && { gte: new Date(`${from}T00:00:00+05:00`) }), ...(to && { lt: new Date(new Date(`${to}T00:00:00+05:00`).getTime() + 86400000) }) };
    const items = await prisma.transaction.findMany({
      where,
      include: { debtor: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const out = items.map((t) => ({ ...t, amount: num(t.amount) }));
    res.json({
      items: out,
      debt: out.filter((t) => t.type === "DEBT").reduce((s, t) => s + t.amount, 0),
      paid: out.filter((t) => t.type === "PAYMENT").reduce((s, t) => s + t.amount, 0),
    });
  })
);

reportsRouter.get(
  "/monthly.pdf",
  asyncH(async (req: AuthedRequest, res) => {
    const month = String(req.query.month || "");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: "Oy noto'g'ri" });
    await monthlyPdf(req.shopId!, month, res);
  })
);

reportsRouter.get(
  "/sms",
  asyncH(async (req: AuthedRequest, res) => {
    const items = await prisma.smsMessage.findMany({
      where: { shopId: req.shopId },
      include: { debtor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    res.json(items);
  })
);
