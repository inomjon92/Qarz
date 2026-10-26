import path from "path";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import { prisma } from "./db";
import { formatDate, formatDateTime, formatMoney, num, startOfToday } from "./util";

const FONTS = path.join(__dirname, "../../assets/fonts");
const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const GREEN = "#059669";

type Col = { title: string; width: number; align?: "left" | "right" };

function table(doc: PDFKit.PDFDocument, cols: Col[], rows: string[][]) {
  const x0 = doc.page.margins.left;
  const rowH = 18;
  const header = () => {
    let x = x0;
    doc.font("bold").fontSize(9).fillColor("#ffffff");
    doc.rect(x0, doc.y, cols.reduce((s, c) => s + c.width, 0), rowH).fill(GREEN);
    const y = doc.y + 5;
    cols.forEach((c) => {
      doc.fillColor("#ffffff").text(c.title, x + 4, y, { width: c.width - 8, align: c.align || "left", lineBreak: false });
      x += c.width;
    });
    doc.y = y - 5 + rowH;
  };
  header();
  rows.forEach((r, i) => {
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      header();
    }
    const y = doc.y;
    if (i % 2) doc.rect(x0, y, cols.reduce((s, c) => s + c.width, 0), rowH).fill("#f1f5f9");
    let x = x0;
    doc.font("regular").fontSize(9).fillColor("#0f172a");
    cols.forEach((c, j) => {
      doc.text(r[j] ?? "", x + 4, y + 5, { width: c.width - 8, align: c.align || "left", lineBreak: false, ellipsis: true });
      x += c.width;
    });
    doc.y = y + rowH;
  });
  doc.x = x0;
  doc.moveDown();
}

// Monthly report for one shop; month is "YYYY-MM" in Tashkent time.
export async function monthlyPdf(shopId: string, month: string, res: Response) {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(`${month}-01T00:00:00+05:00`);
  const to = new Date(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00+05:00`);
  const shop = await prisma.shop.findUniqueOrThrow({ where: { id: shopId } });
  const cur = shop.currency;
  const [txs, debtors] = await Promise.all([
    prisma.transaction.findMany({ where: { shopId, deletedAt: null, createdAt: { gte: from, lt: to } }, include: { debtor: true }, orderBy: { createdAt: "asc" } }),
    prisma.debtor.findMany({ where: { shopId, deletedAt: null }, orderBy: { balance: "desc" } }),
  ]);

  const per = new Map<string, { debt: number; paid: number }>();
  let given = 0;
  let paid = 0;
  for (const t of txs) {
    const a = num(t.amount);
    const p = per.get(t.debtorId) || { debt: 0, paid: 0 };
    if (t.type === "DEBT") (p.debt += a), (given += a);
    else (p.paid += a), (paid += a);
    per.set(t.debtorId, p);
  }
  const today = startOfToday();
  const withDebt = debtors.filter((d) => num(d.balance) > 0);
  const overdue = withDebt.filter((d) => d.dueDate && d.dueDate < today);
  const total = withDebt.reduce((s, d) => s + num(d.balance), 0);

  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `${shop.name} — ${MONTHS[m - 1]} ${y}` } });
  doc.registerFont("regular", path.join(FONTS, "DejaVuSans.ttf"));
  doc.registerFont("bold", path.join(FONTS, "DejaVuSans-Bold.ttf"));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="hisobot-${month}.pdf"`);
  doc.pipe(res);

  doc.font("bold").fontSize(20).fillColor(GREEN).text(shop.name);
  doc.font("regular").fontSize(12).fillColor("#475569").text(`Oylik hisobot: ${MONTHS[m - 1]} ${y}`);
  doc.fontSize(8).text(`Tayyorlandi: ${formatDateTime(new Date())}`);
  doc.moveDown();

  const stats: [string, string][] = [
    ["Oy davomida berilgan qarz", formatMoney(given, cur)],
    ["Oy davomida qaytgan pul", formatMoney(paid, cur)],
    ["Hozirgi jami qarz", formatMoney(total, cur)],
    ["Qarzdorlar soni", String(withDebt.length)],
    ["Muddati o'tganlar", `${overdue.length} kishi, ${formatMoney(overdue.reduce((s, d) => s + num(d.balance), 0), cur)}`],
  ];
  stats.forEach(([k, v]) => {
    const yy = doc.y;
    doc.font("regular").fontSize(11).fillColor("#334155").text(k, 40, yy);
    doc.font("bold").fillColor("#0f172a").text(v, 300, yy, { width: 255, align: "right" });
    doc.moveDown(0.25);
  });
  doc.moveDown(1.5);

  doc.font("bold").fontSize(13).fillColor("#0f172a").text("Qarzdorlar", 40);
  doc.moveDown(0.4);
  const rows = debtors
    .filter((d) => num(d.balance) > 0 || per.has(d.id))
    .map((d) => {
      const p = per.get(d.id) || { debt: 0, paid: 0 };
      return [d.name, d.phone || "", formatMoney(p.debt, cur), formatMoney(p.paid, cur), formatMoney(num(d.balance), cur), formatDate(d.dueDate)];
    });
  table(
    doc,
    [
      { title: "Ism", width: 130 },
      { title: "Telefon", width: 85 },
      { title: "Berildi", width: 80, align: "right" },
      { title: "To'ladi", width: 80, align: "right" },
      { title: "Qarz", width: 80, align: "right" },
      { title: "Muddat", width: 60 },
    ],
    rows.length ? rows : [["Ma'lumot yo'q"]]
  );

  doc.font("bold").fontSize(13).fillColor("#0f172a").text("Oy davomidagi yozuvlar", 40);
  doc.moveDown(0.4);
  table(
    doc,
    [
      { title: "Sana", width: 100 },
      { title: "Qarzdor", width: 115 },
      { title: "Turi", width: 55 },
      { title: "Summa", width: 85, align: "right" },
      { title: "Izoh", width: 160 },
    ],
    txs.length
      ? txs.map((t) => [formatDateTime(t.createdAt), t.debtor.name, t.type === "DEBT" ? "Qarz" : "To'lov", formatMoney(num(t.amount), cur), t.note || ""])
      : [["Bu oyda yozuv yo'q"]]
  );
  doc.end();
}
