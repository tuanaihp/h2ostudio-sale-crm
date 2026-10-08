// Dev/preview server — delegate TOÀN BỘ /api/* sang handlers trong api/*.ts
// (cùng code chạy trên Vercel serverless) để không còn bản song song thiếu
// rate-limit/auth/SSRF-guard. Handlers dùng chữ ký (req, res) kiểu Vercel —
// tương thích Express (res.status().json(), res.setHeader(), res.send()...).
import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import liveChatBotHandler from "./api/live-chat-bot";
import embedHandler from "./api/embed";
import vectorSynthesisHandler from "./api/vector-synthesis";
import aiImageHandler from "./api/ai-image";
import aiPromoHandler from "./api/ai-promo";
import notifyHandler from "./api/notify";
import r2UploadHandler from "./api/r2-upload";
import r2DeleteHandler from "./api/r2-delete";
import botHandler from "./api/bot";
import cronHandler from "./api/cron";

type VercelHandler = (req: any, res: any) => any;

const wrap = (handler: VercelHandler) =>
  async (req: express.Request, res: express.Response) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error("[api]", err);
      if (!res.headersSent) res.status(500).json({ error: "Internal error" });
    }
  };

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Base64 image upload cần body lớn (~9MB binary → ~13MB base64)
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // app.use nhận mọi method → handler tự check method + OPTIONS preflight
  app.use("/api/live-chat-bot", wrap(liveChatBotHandler));
  app.use("/api/embed", wrap(embedHandler));
  app.use("/api/vector-synthesis", wrap(vectorSynthesisHandler));
  app.use("/api/ai-image", wrap(aiImageHandler));
  app.use("/api/ai-promo", wrap(aiPromoHandler));
  // Gộp notify + cron để vừa giới hạn 12 functions trên Vercel Hobby.
  // Giữ cả path cũ (inject query param) cho tương thích.
  const notifyAs = (channel: string) =>
    (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      (req as any).query = { ...(req as any).query, channel };
      next();
    };
  const cronAs = (job: string) =>
    (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      (req as any).query = { ...(req as any).query, job };
      next();
    };
  app.use("/api/notify", wrap(notifyHandler));
  app.use("/api/lark-notify", notifyAs("lark"), wrap(notifyHandler));
  app.use("/api/telegram-notify", notifyAs("telegram"), wrap(notifyHandler));
  app.use("/api/r2-upload", wrap(r2UploadHandler));
  app.use("/api/r2-delete", wrap(r2DeleteHandler));
  app.use("/api/bot", wrap(botHandler));
  app.use("/api/cron", wrap(cronHandler));
  app.use("/api/cron-digest", cronAs("digest"), wrap(cronHandler));
  app.use("/api/cron-followup", cronAs("followup"), wrap(cronHandler));
  app.use("/api/cron-shoots", cronAs("shoots"), wrap(cronHandler));
  app.use("/api/cron-stale", cronAs("stale"), wrap(cronHandler));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
