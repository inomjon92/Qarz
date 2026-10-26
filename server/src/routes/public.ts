import { Router } from "express";
import { prisma } from "../lib/db";
import { asyncH, num } from "../lib/util";

// Read-only page a shop can share with its customer so they can see their own debt.
export const publicRouter = Router();

publicRouter.get(
  "/debtor/:token",
  asyncH(async (req, res) => {
    const d = await prisma.debtor.findUnique({
      where: { publicToken: req.params.token },
      include: { shop: true, transactions: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100 } },
    });
    if (!d || d.deletedAt) return res.status(404).json({ error: "Topilmadi" });
    res.json({
      name: d.name,
      balance: num(d.balance),
      dueDate: d.dueDate,
      shop: { name: d.shop.name, phone: d.shop.phone, address: d.shop.address, currency: d.shop.currency },
      transactions: d.transactions.map((t) => ({ id: t.id, type: t.type, amount: num(t.amount), note: t.note, createdAt: t.createdAt })),
    });
  })
);
