import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireShop, type AuthedRequest } from "../lib/auth";
import { asyncH, logActivity, normalizePhone, num } from "../lib/util";

export const shopsRouter = Router();

const shopSchema = z.object({
  name: z.string().min(2, "Do'kon nomini kiriting"),
  address: z.string().nullish(),
  phone: z.string().nullish(),
  currency: z.string().optional(),
  smsEnabled: z.boolean().optional(),
  smsTemplate: z.string().min(5).optional(),
  remindDaysBefore: z.number().int().min(0).max(30).optional(),
  remindEveryDays: z.number().int().min(1).max(30).optional(),
});

shopsRouter.post(
  "/",
  asyncH(async (req: AuthedRequest, res) => {
    const body = shopSchema.parse(req.body);
    const shop = await prisma.shop.create({
      data: { ...body, members: { create: { userId: req.userId!, role: "OWNER" } } },
    });
    await logActivity(shop.id, req.userId, "Do'kon yaratildi", shop.name);
    res.json(shop);
  })
);

// Totals across every shop the user belongs to.
shopsRouter.get(
  "/summary",
  asyncH(async (req: AuthedRequest, res) => {
    const ms = await prisma.membership.findMany({ where: { userId: req.userId }, include: { shop: true } });
    const ids = ms.map((m) => m.shopId);
    const per = await prisma.debtor.groupBy({
      by: ["shopId"],
      where: { shopId: { in: ids }, deletedAt: null, balance: { gt: 0 } },
      _sum: { balance: true },
      _count: true,
    });
    const shops = ms.map((m) => {
      const r = per.find((p) => p.shopId === m.shopId);
      return { id: m.shopId, name: m.shop.name, currency: m.shop.currency, total: num(r?._sum.balance), debtors: r?._count || 0 };
    });
    res.json({ shops, total: shops.reduce((s, x) => s + x.total, 0) });
  })
);

shopsRouter.put(
  "/:shopId",
  requireShop("OWNER"),
  asyncH(async (req: AuthedRequest, res) => {
    const body = shopSchema.partial().parse(req.body);
    const shop = await prisma.shop.update({ where: { id: req.shopId }, data: body });
    await logActivity(shop.id, req.userId, "Do'kon sozlamalari o'zgartirildi");
    res.json(shop);
  })
);

shopsRouter.delete(
  "/:shopId",
  requireShop("OWNER"),
  asyncH(async (req: AuthedRequest, res) => {
    await prisma.shop.delete({ where: { id: req.shopId } });
    res.json({ ok: true });
  })
);

shopsRouter.get(
  "/:shopId/members",
  requireShop(),
  asyncH(async (req: AuthedRequest, res) => {
    const ms = await prisma.membership.findMany({ where: { shopId: req.shopId }, include: { user: true }, orderBy: { createdAt: "asc" } });
    res.json(ms.map((m) => ({ id: m.id, role: m.role, userId: m.userId, name: m.user.name, phone: m.user.phone })));
  })
);

shopsRouter.post(
  "/:shopId/members",
  requireShop("OWNER"),
  asyncH(async (req: AuthedRequest, res) => {
    const body = z
      .object({ name: z.string().min(2, "Ismni kiriting"), phone: z.string().min(9, "Telefon noto'g'ri"), password: z.string().min(6, "Parol kamida 6 belgi").optional(), role: z.enum(["OWNER", "SELLER"]) })
      .parse(req.body);
    const phone = normalizePhone(body.phone)!;
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      if (!body.password) return res.status(400).json({ error: "Yangi xodim uchun parol kiriting" });
      user = await prisma.user.create({ data: { name: body.name, phone, passwordHash: await bcrypt.hash(body.password, 10) } });
    }
    const m = await prisma.membership.upsert({
      where: { userId_shopId: { userId: user.id, shopId: req.shopId! } },
      create: { userId: user.id, shopId: req.shopId!, role: body.role },
      update: { role: body.role },
    });
    await logActivity(req.shopId!, req.userId, "Xodim qo'shildi", `${user.name} (${body.role === "OWNER" ? "egasi" : "sotuvchi"})`);
    res.json(m);
  })
);

shopsRouter.delete(
  "/:shopId/members/:memberId",
  requireShop("OWNER"),
  asyncH(async (req: AuthedRequest, res) => {
    const m = await prisma.membership.findFirst({ where: { id: req.params.memberId, shopId: req.shopId }, include: { user: true } });
    if (!m) return res.status(404).json({ error: "Topilmadi" });
    if (m.userId === req.userId) return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
    await prisma.membership.delete({ where: { id: m.id } });
    await logActivity(req.shopId!, req.userId, "Xodim o'chirildi", m.user.name);
    res.json({ ok: true });
  })
);

shopsRouter.get(
  "/:shopId/activity",
  requireShop("OWNER"),
  asyncH(async (req: AuthedRequest, res) => {
    const items = await prisma.activity.findMany({
      where: { shopId: req.shopId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(items);
  })
);
