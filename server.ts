import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// In-memory cache for Google Sheet CSV content
const sheetCache = new Map<string, { data: string; expiresAt: number }>();
const SHEET_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchSheetCsv(sheetId: string, sheetName: string): Promise<string | null> {
  const cacheKey = `${sheetId}::${sheetName}`;
  const cached = sheetCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ""}`;
  const sheetRes = await fetch(sheetUrl);
  if (!sheetRes.ok) return null;

  const csvText = await sheetRes.text();
  const rows = csvText.split("\n").slice(0, 120).join("\n");
  sheetCache.set(cacheKey, { data: rows, expiresAt: Date.now() + SHEET_CACHE_TTL_MS });
  return rows;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, systemInstruction, integrationConfig } = req.body;
      let finalInstruction = systemInstruction || "";

      // 1. Append Google Sheet FAQ data (cached)
      if (integrationConfig?.sheetEnabled && integrationConfig?.sheetId) {
        try {
          const rows = await fetchSheetCsv(integrationConfig.sheetId, integrationConfig.sheetName || "");
          if (rows) {
            finalInstruction += `\n\n[Dữ liệu FAQ chuyên ngành từ Google Sheet]:\n${rows}`;
          }
        } catch (sheetErr) {
          console.error("Lỗi khi tải Google Sheet FAQs:", sheetErr);
        }
      }

      // 2. Append offline script notes
      if (integrationConfig?.scriptNotes) {
        finalInstruction += `\n\n[Kịch bản cưới & FAQs lưu trữ sẵn]:\n${integrationConfig.scriptNotes}`;
      }

      // 3. Forward to custom chat API if configured
      if (integrationConfig?.chatApiEnabled && integrationConfig?.chatApiUrl) {
        const { chatApiUrl, chatApiKey, chatApiModelName, chatApiHeaders } = integrationConfig;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (chatApiKey) headers["Authorization"] = `Bearer ${chatApiKey}`;
        if (chatApiHeaders) {
          try {
            Object.assign(headers, JSON.parse(chatApiHeaders));
          } catch {
            // ignore malformed headers
          }
        }

        const openAiMessages = [{ role: "system", content: finalInstruction }];
        for (const msg of messages || []) {
          openAiMessages.push({
            role: msg.role === "model" ? "assistant" : "user",
            content: msg.text
          });
        }

        const proxyRes = await fetch(chatApiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ model: chatApiModelName || "gpt-3.5-turbo", messages: openAiMessages })
        });

        if (!proxyRes.ok) {
          const errorText = await proxyRes.text();
          throw new Error(`Custom Chat API responded with ${proxyRes.status}: ${errorText}`);
        }

        const proxyData: any = await proxyRes.json();
        return res.json({ text: proxyData?.choices?.[0]?.message?.content || JSON.stringify(proxyData) });
      }

      // 4. Default: Google Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Thiếu API Key Gemini. Vui lòng thiết lập trong Settings." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const formatedContents = (messages || []).map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formatedContents,
        config: { systemInstruction: finalInstruction },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: error?.message || "Lỗi khi gọi AI" });
    }
  });

  // ── Bot tư vấn AI cho Live Chat ──────────────────────────────────────────
  app.post("/api/live-chat-bot", async (req, res) => {
    try {
      const { message, stage, scripts, history, integrationConfig, sessionId } = req.body;

      // Build system prompt từ kịch bản kho
      const scriptsText = (scripts || []).slice(0, 12).map((s: any) =>
        `## ${s.title} [${s.phase}]\n${s.content}`
      ).join('\n\n---\n\n');

      const systemInstruction = `Bạn là tư vấn viên của H2O Studio, chuyên tư vấn chụp ảnh cưới.
Giai đoạn hiện tại: ${stage || 'new'}

KỊCH BẢN TƯ VẤN:
${scriptsText || 'Chào khách, hỏi nhu cầu và tư vấn nhiệt tình.'}

QUY TẮC QUAN TRỌNG:
- Xưng "em", gọi khách là "anh/chị"
- Trả lời ngắn gọn, tự nhiên (2-3 câu), tránh rườm rà
- Bám sát nội dung kịch bản, không bịa giá hoặc thông tin ngoài kịch bản
- Nếu khách hỏi ngoài phạm vi, mời để lại SĐT: "Anh/chị để lại SĐT để tư vấn viên gọi lại chi tiết hơn nhé ạ"
- Không nhắc bạn là AI hay bot`;

      const convMessages = [
        ...(history || []).slice(-8).map((m: any) => ({
          role: m.sender === 'customer' ? 'user' : 'model',
          text: m.content
        })),
        { role: 'user' as const, text: message }
      ];

      // Dùng custom API nếu được cấu hình
      if (integrationConfig?.chatApiEnabled && integrationConfig?.chatApiUrl) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (integrationConfig.chatApiKey) headers['Authorization'] = `Bearer ${integrationConfig.chatApiKey}`;
        if (sessionId) headers['X-Session-Id'] = sessionId;
        const openAiMessages = [
          { role: 'system', content: systemInstruction },
          ...convMessages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }))
        ];
        const proxyRes = await fetch(integrationConfig.chatApiUrl, {
          method: 'POST', headers,
          body: JSON.stringify({ model: integrationConfig.chatApiModelName || 'gpt-3.5-turbo', messages: openAiMessages })
        });
        const proxyData: any = await proxyRes.json();
        return res.json({ text: proxyData?.choices?.[0]?.message?.content || '' });
      }

      // Mặc định: Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Thiếu GEMINI_API_KEY' });

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: convMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        config: { systemInstruction },
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Bot error:', err);
      res.status(500).json({ error: err?.message || 'Bot lỗi' });
    }
  });

  // ── Bot V3: Gemini text-embedding-004 ────────────────────────────────────
  app.post("/api/embed", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Missing text' });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Thiếu GEMINI_API_KEY' });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: text.substring(0, 2000) }] },
          }),
        }
      );
      if (!response.ok) {
        const errText = await response.text();
        return res.status(500).json({ error: `Gemini Embed error: ${errText}` });
      }
      const data: any = await response.json();
      return res.json({ embedding: data.embedding?.values || [] });
    } catch (err: any) {
      console.error('Embed error:', err);
      return res.status(500).json({ error: err?.message || 'Lỗi embed' });
    }
  });

  // ── Bot V3: Gemini tổng hợp câu trả lời từ top FAQs ──────────────────────
  app.post("/api/vector-synthesis", async (req, res) => {
    try {
      const { question, faqs, studioInfo, knowledgeContext } = req.body;
      if (!question || !Array.isArray(faqs) || !faqs.length) {
        return res.status(400).json({ error: 'Missing question or faqs' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Thiếu GEMINI_API_KEY' });

      const context = faqs.slice(0, 5).map((f: any, i: number) =>
        `[${i + 1}] Câu hỏi: ${f.question}\n    Trả lời: ${f.answer}`
      ).join('\n\n');

      const systemInstruction = `Bạn là tư vấn viên của H2O Studio — studio chụp ảnh cưới chuyên nghiệp.
Xưng "em", gọi khách là "anh/chị". Trả lời tự nhiên, thân thiện, ngắn gọn (2–4 câu).
Chỉ dùng thông tin từ tài liệu đã cho, không bịa đặt giá hoặc thông tin chưa có.
Nếu câu hỏi hoàn toàn ngoài phạm vi: "Anh/chị để lại SĐT để tư vấn viên gọi lại chi tiết nhé ạ".
Không nhắc bạn là AI hay bot.${studioInfo ? `\n\nThông tin studio:\n${studioInfo}` : ''}${knowledgeContext ? `\n\n${knowledgeContext}` : ''}`;

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: `Tài liệu tham khảo:\n${context}\n\nCâu hỏi của khách: ${question}` }] }],
        config: { systemInstruction, temperature: 0.3, maxOutputTokens: 400 },
      });
      return res.json({ text: response.text || '' });
    } catch (err: any) {
      console.error('Vector synthesis error:', err);
      return res.status(500).json({ error: err?.message || 'Lỗi synthesis' });
    }
  });

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
