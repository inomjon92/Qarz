import cron from "node-cron";
import { createApp } from "./app";
import { queueDueReminders } from "./jobs/reminders";
import { sendDailyReports, startTelegramPolling } from "./jobs/telegram";

// Long-running server mode (Docker, VPS, Render).
const app = createApp({ nudge: true });

cron.schedule("0 9,14 * * *", () => queueDueReminders().catch(console.error), { timezone: "Asia/Tashkent" });
cron.schedule("5 9 * * *", () => sendDailyReports().catch(console.error), { timezone: "Asia/Tashkent" });
startTelegramPolling();

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Qarz daftari server: http://localhost:${port}`));
