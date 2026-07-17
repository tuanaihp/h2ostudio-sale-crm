// Vercel serverless function — Bot V3 Gemini text-embedding-004
import { checkRateLimit, getClientIp } from './_security';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 30 req/min/IP
  const ip = getClientIp(req);
  if (!checkRateLimit(`embed:${ip}`, 30)) {
    return res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút' });
  }

  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Thiếu GEMINI_API_KEY' });
    }

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
      console.error('Gemini Embed error:', response.status);
      return res.status(500).json({ error: 'Lỗi dịch vụ embedding' });
    }

    const data: any = await response.json();
    return res.json({ embedding: data.embedding?.values || [] });
  } catch (err: any) {
    console.error('Embed error:', err);
    return res.status(500).json({ error: 'Lỗi embed' });
  }
}
