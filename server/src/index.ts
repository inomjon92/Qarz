import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import cron from "node-cron";
import rateLimit from "express-rate-limit";
import { requireAuth, requireShop } from "./lib/auth";
import { errorHandler } from "./lib/util";
import { authRouter } from "./routes/auth";
import { shopsRouter } from "./routes/shops";
import { debtorsRouter } from "./routes/debtors";
import { reportsRouter } from "./routes/reports";
import { smsRouter } from "./routes/sms";
import { publicRouter } from "./routes/public";
import { queueDueReminders } from "./jobs/reminders";
import { sendDailyReports, startTelegramPolling } from "./jobs/telegram";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date() }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60000, limit: 50 }), authRouter);
app.use("/api/public", publicRouter);
app.use("/api/shops", requireAuth, shopsRouter);
app.use("/api/shops/:shopId/debtors", requireAuth, requireShop(), debtorsRouter);
app.use("/api/shops/:shopId/reports", requireAuth, requireShop(), reportsRouter);
app.use("/api/sms", requireAuth, smsRouter);
app.use("/api", (_req, res) => res.status(404).json({ error: "Topilmadi" }));
app.use(errorHandler);

// Serve the built web app from the same server.
const webDir = path.resolve(process.env.WEB_DIR || path.join(__dirname, "../../web/dist"));
if (fs.existsSync(webDir)) {
  app.use(express.static(webDir, { index: false }));
  app.get("*", (_req, res) => res.sendFile(path.join(webDir, "index.html")));
}

const tz = process.env.TZ || "Asia/Tashkent";
cron.schedule("0 9,14 * * *", () => queueDueReminders().catch(console.error), { timezone: tz });
cron.schedule("5 9 * * *", () => sendDailyReports().catch(console.error), { timezone: tz });
startTelegramPolling();

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Qarz daftari server: http://localhost:${port}`));
