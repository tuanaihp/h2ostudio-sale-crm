import { GoogleGenAI } from "@google/genai";
import { checkRateLimit, getClientIp, validateExternalUrl, validateSheetId } from './_security';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 30 req/min/IP
  const ip = getClientIp(req);
  if (!checkRateLimit(`chat:${ip}`, 30)) {
    return res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút' });
  }

  try {
    const { messages, systemInstruction, integrationConfig } = req.body;
    let finalInstruction = systemInstruction || "";

    // SSRF guard: validate chatApiUrl trước khi server gọi ra ngoài
    if (integrationConfig?.chatApiEnabled && integrationConfig?.chatApiUrl) {
      const check = validateExternalUrl(integrationConfig.chatApiUrl);
      if (!check.ok) {
        return res.status(400).json({ error: `Chat API URL không hợp lệ: ${check.reason}` });
      }
    }

    // 1. Google Sheet — validate sheetId để tránh path traversal
    if (integrationConfig?.sheetEnabled && integrationConfig?.sheetId) {
      if (!validateSheetId(integrationConfig.sheetId)) {
        return res.status(400).json({ error: 'Sheet ID không hợp lệ' });
      }
      try {
        const sheetId = integrationConfig.sheetId;
        const sheetName = integrationConfig.sheetName || "";
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ""}`;

        const sheetRes = await fetch(sheetUrl);
        if (sheetRes.ok) {
          const csvText = await sheetRes.text();
          const rows = csvText.split("\n").slice(0, 120).join("\n");
          finalInstruction += `\n\n[Dữ liệu FAQ chuyên ngành từ Google Sheet]:\n${rows}`;
        }
      } catch (sheetErr) {
        console.error("Lỗi khi tải Google Sheet FAQs:", sheetErr);
      }
    }

    // 2. Offline script notes
    if (integrationConfig?.scriptNotes) {
      finalInstruction += `\n\n[Kịch bản cưới & FAQs lưu trữ sẵn]:\n${integrationConfig.scriptNotes}`;
    }

    // 3. Custom Chat API
    if (integrationConfig?.chatApiEnabled && integrationConfig?.chatApiUrl) {
      const { chatApiUrl, chatApiKey, chatApiModelName, chatApiHeaders } = integrationConfig;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (chatApiKey) headers["Authorization"] = `Bearer ${chatApiKey}`;

      if (chatApiHeaders) {
        try {
          const parsedHeaders = JSON.parse(chatApiHeaders);
          Object.assign(headers, parsedHeaders);
        } catch (e) {
          console.warn("Could not parse custom headers JSON:", e);
        }
      }

      const openAiMessages = [{ role: "system", content: finalInstruction }];
      for (const msg of messages || []) {
        openAiMessages.push({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.text,
        });
      }

      const proxyRes = await fetch(chatApiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: chatApiModelName || "gpt-3.5-turbo", messages: openAiMessages }),
      });

      if (!proxyRes.ok) {
        console.error(`Custom Chat API responded with ${proxyRes.status}`);
        throw new Error('Custom Chat API lỗi');
      }

      const proxyData: any = await proxyRes.json();
      const outputText = proxyData?.choices?.[0]?.message?.content || JSON.stringify(proxyData);
      return res.status(200).json({ text: outputText });
    }

    // 4. Fallback: Google Gemini
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

    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("AI Chat Error in serverless handler:", error);
    res.status(500).json({ error: "Lỗi khi gọi dịch vụ AI" });
  }
}
