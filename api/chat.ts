import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, systemInstruction, integrationConfig } = req.body;
    let finalInstruction = systemInstruction || "";

    // 1. If Google Sheet is enabled, fetch contents dynamically as CSV
    if (integrationConfig?.sheetEnabled && integrationConfig?.sheetId) {
      try {
        const sheetId = integrationConfig.sheetId;
        const sheetName = integrationConfig.sheetName || "";
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ""}`;
        
        const sheetRes = await fetch(sheetUrl);
        if (sheetRes.ok) {
          const csvText = await sheetRes.text();
          // Restrict lines if too long to prevent blowing context limits (first 120 lines is great)
          const rows = csvText.split("\n").slice(0, 120).join("\n");
          finalInstruction += `\n\n[Dữ liệu FAQ chuyên ngành từ Google Sheet]:\n${rows}`;
          console.log("Successfully loaded Google Sheet FAQs payload in serverless handler.");
        }
      } catch (sheetErr) {
        console.error("Lỗi khi tải Google Sheet FAQs:", sheetErr);
      }
    }

    // 2. If Offline script notes exist, let's append
    if (integrationConfig?.scriptNotes) {
      finalInstruction += `\n\n[Kịch bản cưới & FAQs lưu trữ sẵn]:\n${integrationConfig.scriptNotes}`;
    }

    // 3. If Custom Chat API is enabled, call that endpoint instead of Google Gemini
    if (integrationConfig?.chatApiEnabled && integrationConfig?.chatApiUrl) {
      const { chatApiUrl, chatApiKey, chatApiModelName, chatApiHeaders } = integrationConfig;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (chatApiKey) {
        headers["Authorization"] = `Bearer ${chatApiKey}`;
      }

      if (chatApiHeaders) {
        try {
          const parsedHeaders = JSON.parse(chatApiHeaders);
          Object.assign(headers, parsedHeaders);
        } catch (e) {
          console.warn("Could not parse custom headers JSON:", e);
        }
      }

      const openAiMessages = [
        { role: "system", content: finalInstruction }
      ];

      for (const msg of messages || []) {
        openAiMessages.push({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.text
        });
      }

      console.log(`Forwarding serverless chat to Custom API: ${chatApiUrl}`);
      const proxyRes = await fetch(chatApiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: chatApiModelName || "gpt-3.5-turbo",
          messages: openAiMessages
        })
      });

      if (!proxyRes.ok) {
        const errorText = await proxyRes.text();
        throw new Error(`Custom Chat API responded with ${proxyRes.status}: ${errorText}`);
      }

      const proxyData: any = await proxyRes.json();
      const outputText = proxyData?.choices?.[0]?.message?.content || JSON.stringify(proxyData);
      return res.status(200).json({ text: outputText });
    }

    // 4. Fallback default: Use Google GenAI SDK (Gemini)
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
      config: {
        systemInstruction: finalInstruction,
      },
    });

    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("AI Chat Error in serverless handler:", error);
    res.status(500).json({ error: error?.message || "Lỗi khi gọi AI" });
  }
}
