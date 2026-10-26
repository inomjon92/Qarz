import { Router } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import type { AuthedRequest } from "../lib/auth";
import { asyncH, formatDate, formatDateTime, formatMoney, logActivity, normalizePhone, num, recalcDebtor, renderTemplate, startOfToday } from "../lib/util";

export const debtorsRouter = Router({ mergeParams: true });

const ownerOnly = (req: AuthedRequest, res: any) => {
  if (req.role !== "OWNER") {
    res.status(403).json({ error: "Faqat do'kon egasi bajara oladi" });
    return false;
  }
  return true;
};


const serialize = (d: any) => ({ ...d, balance: num(d.balance), creditLimit: d.creditLimit == null ? null : num(d.creditLimit) });

function listWhere(shopId: string, q?: string, filter?: string): Prisma.DebtorWhereInput {
  const where: Prisma.DebtorWhereInput = { shopId, deletedAt: filter === "deleted" ? { not: null } : null };
  const today = startOfToday();
  const soon = new Date(today.getTime() + 3 * 86400000);
  if (filter === "debt") where.balance = { gt: 0 };
  if (filter === "paid") where.balance = { lte: 0 };
  if (filter === "overdue") Object.assign(where, { balance: { gt: 0 }, dueDate: { lt: today } });
  if (filter === "soon") Object.assign(where, { balance: { gt: 0 }, dueDate: { gte: today, lt: soon } });
  if (q) {
    const digits = q.replace(/\D/g, "");
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ];
  }
  return where;
}

const sortMap: Record<string, Prisma.DebtorOrderByWithRelationInput> = {
  balance: { balance: "desc" },
  name: { name: "asc" },
  due: { dueDate: { sort: "asc", nulls: "last" } },
  recent: { updatedAt: "desc" },
};

debtorsRouter.get(
  "/",
  asyncH(async (req: AuthedRequest, res) => {
    const { q, filter, sort } = req.query as Record<string, string>;
    const where = listWhere(req.shopId!, q, filter);
    const [items, agg] = await Promise.all([
      prisma.debtor.findMany({ where, orderBy: sortMap[sort] || sortMap.recent, take: 1000 }),
      prisma.debtor.aggregate({ where: { ...where, balance: { gt: 0 } }, _sum: { balance: true }, _count: true }),
    ]);
    res.json({ items: items.map(serialize), total: num(agg._sum.balance), withDebt: agg._count });
  })
);

debtorsRouter.get(
  "/export.xlsx",
  asyncH(async (req: AuthedRequest, res) => {
    const shop = await prisma.shop.findUniqueOrThrow({ where: { id: req.shopId } });
    const debtors = await prisma.debtor.findMany({ where: { shopId: req.shopId, deletedAt: null }, orderBy: { name: "asc" } });
    const txs = await prisma.transaction.findMany({
      where: { shopId: req.shopId, deletedAt: null },
      include: { debtor: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    const wb = new ExcelJS.Workbook();
    const s1 = wb.addWorksheet("Qarzdorlar");
    s1.columns = [
      { header: "Ism", key: "name", width: 28 },
      { header: "Telefon", key: "phone", width: 16 },
      { header: "Manzil", key: "address", width: 24 },
      { header: "Qarz", key: "balance", width: 16 },
      { header: "Muddat", key: "due", width: 12 },
      { header: "Izoh", key: "note", width: 30 },
    ];
    debtors.forEach((d) => s1.addRow({ name: d.name, phone: d.phone, address: d.address, balance: num(d.balance), due: formatDate(d.dueDate), note: d.note }));
    s1.addRow({});
    s1.addRow({ name: "JAMI", balance: debtors.reduce((s, d) => s + Math.max(0, num(d.balance)), 0) });
    const s2 = wb.addWorksheet("Tarix");
    s2.columns = [
      { header: "Sana", key: "date", width: 18 },
      { header: "Qarzdor", key: "debtor", width: 28 },
      { header: "Turi", key: "type", width: 10 },
      { header: "Summa", key: "amount", width: 16 },
      { header: "Izoh", key: "note", width: 30 },
      { header: "Kim yozdi", key: "by", width: 18 },
    ];
    txs.forEach((t) =>
      s2.addRow({ date: formatDateTime(t.createdAt), debtor: t.debtor.name, type: t.type === "DEBT" ? "Qarz" : "To'lov", amount: num(t.amount), note: t.note, by: t.createdBy?.name })
    );
    [s1, s2].forEach((s) => (s.getRow(1).font = { bold: true }));
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="qarzdorlar-${shop.name.replace(/[^\w-]/g, "_")}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  })
);

const debtorSchema = z.object({
  name: z.string().min(2, "Ismni kiriting"),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  note: z.string().nullish(),
  creditLimit: z.number().nonnegative().nullish(),
  dueDate: z.coerce.date().nullish(),
});

debtorsRouter.post(
  "/",
  asyncH(async (req: AuthedRequest, res) => {
    const body = debtorSchema.extend({ amount: z.number().positive().optional(), txNote: z.string().optional() }).parse(req.body);
    const { amount, txNote, ...data } = body;
    const debtor = await prisma.debtor.create({ data: { ...data, phone: normalizePhone(data.phone), shopId: req.shopId! } });
    if (amount) {
      await prisma.transaction.create({ data: { shopId: req.shopId!, debtorId: debtor.id, type: "DEBT", amount, note: txNote, dueDate: data.dueDate, createdById: req.userId } });
      await recalcDebtor(debtor.id);
    }
    await logActivity(req.shopId!, req.userId, "Qarzdor qo'shildi", debtor.name + (amount ? `, ${amount}` : ""));
    res.json(serialize(await prisma.debtor.findUniqueOrThrow({ where: { id: debtor.id } })));
  })
);

async function findDebtor(req: AuthedRequest) {
  return prisma.debtor.findFirst({ where: { id: req.params.id, shopId: req.shopId } });
}

debtorsRouter.get(
  "/:id",
  asyncH(async (req: AuthedRequest, res) => {
    const d = await prisma.debtor.findFirst({
      where: { id: req.params.id, shopId: req.shopId },
      include: {
        transactions: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
        smsMessages: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    if (!d) return res.status(404).json({ error: "Qarzdor topilmadi" });
    res.json({ ...serialize(d), transactions: d.transactions.map((t) => ({ ...t, amount: num(t.amount) })) });
  })
);

debtorsRouter.put(
  "/:id",
  asyncH(async (req: AuthedRequest, res) => {
    const d = await findDebtor(req);
    if (!d) return res.status(404).json({ error: "Qarzdor topilmadi" });
    const body = debtorSchema.partial().parse(req.body);
    if (body.phone !== undefined) body.phone = normalizePhone(body.phone);
    const upd = await prisma.debtor.update({ where: { id: d.id }, data: body });
    await logActivity(req.shopId!, req.userId, "Qarzdor tahrirlandi", upd.name);
    res.json(serialize(upd));
  })
);

debtorsRouter.delete(
  "/:id",
  asyncH(async (req: AuthedRequest, res) => {
    if (!ownerOnly(req, res)) return;
    const d = await findDebtor(req);
    if (!d) return res.status(404).json({ error: "Qarzdor topilmadi" });
    await prisma.debtor.update({ where: { id: d.id }, data: { deletedAt: new Date() } });
    await logActivity(req.shopId!, req.userId, "Qarzdor o'chirildi", d.name);
    res.json({ ok: true });
  })
);

debtorsRouter.post(
  "/:id/restore",
  asyncH(async (req: AuthedRequest, res) => {
    if (!ownerOnly(req, res)) return;
    const d = await findDebtor(req);
    if (!d) return res.status(404).json({ error: "Qarzdor topilmadi" });
    await prisma.debtor.update({ where: { id: d.id }, data: { deletedAt: null } });
    await logActivity(req.shopId!, req.userId, "Qarzdor tiklandi", d.name);
    res.json({ ok: true });
  })
);

debtorsRouter.post(
  "/:id/transactions",
  asyncH(async (req: AuthedRequest, res) => {
    const d = await findDebtor(req);
    if (!d || d.deletedAt) return res.status(404).json({ error: "Qarzdor topilmadi" });
    const item = z.object({ productId: z.string().nullish(), name: z.string().min(1), qty: z.number().positive("Soni noto'g'ri"), price: z.number().nonnegative(), unit: z.string().nullish() });
    const { items, sendReceipt, ...body } = z
      .object({
        type: z.enum(["DEBT", "PAYMENT"]),
        amount: z.number().positive("Summa 0 dan katta bo'lsin").optional(),
        note: z.string().nullish(),
        dueDate: z.coerce.date().nullish(),
        items: z.array(item).max(100).optional(),
        sendReceipt: z.boolean().optional(),
      })
      .parse(req.body);
    // With line items the total is computed here so the client cannot send a mismatched sum.
    const lines = items?.length ? items.map((i) => ({ ...i, total: Math.round(i.qty * i.price * 100) / 100 })) : undefined;
    const amount = lines ? lines.reduce((s, i) => s + i.total, 0) : body.amount;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Summa 0 dan katta bo'lsin" });
    const note = body.note || (lines ? lines.map((i) => `${i.name} ×${i.qty}`).join(", ") : null);
    await prisma.transaction.create({
      data: { type: body.type, amount, note, dueDate: body.dueDate, items: lines, shopId: req.shopId!, debtorId: d.id, createdById: req.userId },
    });
    if (body.type === "DEBT" && body.dueDate) await prisma.debtor.update({ where: { id: d.id }, data: { dueDate: body.dueDate } });
    const upd = await recalcDebtor(d.id);
    await logActivity(req.shopId!, req.userId, body.type === "DEBT" ? "Qarz yozildi" : "To'lov qabul qilindi", `${d.name}: ${amount}`);
    const shop = await prisma.shop.findUniqueOrThrow({ where: { id: d.shopId } });
    let receiptQueued = false;
    if ((sendReceipt ?? shop.receiptSms) && d.phone) {
      const text = renderTemplate(shop.receiptTemplate, {
        ism: d.name,
        dokon: shop.name,
        amal: body.type === "DEBT" ? "qarz yozildi" : "to'lov qabul qilindi",
        summa: formatMoney(amount, shop.currency),
        qarz: formatMoney(Math.max(0, num(upd.balance)), shop.currency),
        muddat: formatDate(upd.dueDate),
      });
      await prisma.smsMessage.create({ data: { shopId: d.shopId, debtorId: d.id, phone: d.phone, text } });
      receiptQueued = true;
    }
    const overLimit = d.creditLimit != null && num(upd.balance) > num(d.creditLimit);
    res.json({ debtor: serialize(upd), overLimit, receiptQueued });
  })
);

debtorsRouter.delete(
  "/:id/transactions/:txId",
  asyncH(async (req: AuthedRequest, res) => {
    if (!ownerOnly(req, res)) return;
    const t = await prisma.transaction.findFirst({ where: { id: req.params.txId, debtorId: req.params.id, shopId: req.shopId, deletedAt: null }, include: { debtor: true } });
    if (!t) return res.status(404).json({ error: "Yozuv topilmadi" });
    await prisma.transaction.update({ where: { id: t.id }, data: { deletedAt: new Date() } });
    await recalcDebtor(t.debtorId);
    await logActivity(req.shopId!, req.userId, "Yozuv o'chirildi", `${t.debtor.name}: ${t.type === "DEBT" ? "qarz" : "to'lov"} ${num(t.amount)}`);
    res.json({ ok: true });
  })
);

// Queues a manual SMS; the shop's Android phone picks it up and sends it.
debtorsRouter.post(
  "/:id/sms",
  asyncH(async (req: AuthedRequest, res) => {
    const d = await prisma.debtor.findFirst({ where: { id: req.params.id, shopId: req.shopId }, include: { shop: true } });
    if (!d) return res.status(404).json({ error: "Qarzdor topilmadi" });
    if (!d.phone) return res.status(400).json({ error: "Qarzdorning telefon raqami yo'q" });
    const body = z.object({ text: z.string().min(3).optional() }).parse(req.body || {});
    const text =
      body.text ||
      renderTemplate(d.shop.smsTemplate, { ism: d.name, summa: formatMoney(num(d.balance), d.shop.currency), muddat: formatDate(d.dueDate), dokon: d.shop.name });
    const sms = await prisma.smsMessage.create({ data: { shopId: d.shopId, debtorId: d.id, phone: d.phone, text } });
    await prisma.debtor.update({ where: { id: d.id }, data: { lastSmsAt: new Date() } });
    await logActivity(req.shopId!, req.userId, "SMS navbatga qo'yildi", d.name);
    res.json(sms);
  })
);
