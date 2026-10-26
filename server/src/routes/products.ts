import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import type { AuthedRequest } from "../lib/auth";
import { asyncH, logActivity, num } from "../lib/util";

export const productsRouter = Router({ mergeParams: true });

const serialize = (p: any) => ({ ...p, price: num(p.price) });
const schema = z.object({ name: z.string().min(1, "Nomini kiriting"), price: z.number().nonnegative("Narx noto'g'ri"), unit: z.string().min(1).max(20).optional() });

productsRouter.get(
  "/",
  asyncH(async (req: AuthedRequest, res) => {
    const items = await prisma.product.findMany({ where: { shopId: req.shopId, deletedAt: null }, orderBy: { name: "asc" } });
    res.json(items.map(serialize));
  })
);

productsRouter.post(
  "/",
  asyncH(async (req: AuthedRequest, res) => {
    const body = schema.parse(req.body);
    const p = await prisma.product.create({ data: { ...body, shopId: req.shopId! } });
    await logActivity(req.shopId!, req.userId, "Mahsulot qo'shildi", `${p.name} — ${body.price}`);
    res.json(serialize(p));
  })
);

productsRouter.put(
  "/:id",
  asyncH(async (req: AuthedRequest, res) => {
    const p = await prisma.product.findFirst({ where: { id: req.params.id, shopId: req.shopId, deletedAt: null } });
    if (!p) return res.status(404).json({ error: "Mahsulot topilmadi" });
    const upd = await prisma.product.update({ where: { id: p.id }, data: schema.partial().parse(req.body) });
    res.json(serialize(upd));
  })
);

productsRouter.delete(
  "/:id",
  asyncH(async (req: AuthedRequest, res) => {
    if (req.role !== "OWNER") return res.status(403).json({ error: "Faqat do'kon egasi bajara oladi" });
    const p = await prisma.product.findFirst({ where: { id: req.params.id, shopId: req.shopId, deletedAt: null } });
    if (!p) return res.status(404).json({ error: "Mahsulot topilmadi" });
    await prisma.product.update({ where: { id: p.id }, data: { deletedAt: new Date() } });
    await logActivity(req.shopId!, req.userId, "Mahsulot o'chirildi", p.name);
    res.json({ ok: true });
  })
);
