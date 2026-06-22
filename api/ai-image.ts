export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { promoTitle, shortDesc, emoji, color, apiKey, model = 'dall-e-3', quality = 'standard' } = req.body || {};
  if (!apiKey) return res.status(400).json({ error: 'Cần API Key OpenAI để tạo ảnh (DALL-E)' });
  if (!promoTitle) return res.status(400).json({ error: 'Thiếu tiêu đề chương trình KM' });

  // Map hex color to mood
  const colorMood = (() => {
    const c = (color || '#A4756B').toLowerCase();
    if (c.includes('d53f8c') || c.includes('e91e8c') || c.includes('ff69b4')) return 'pink, romantic, love';
    if (c.includes('e53e3e') || c.includes('c0392b') || c.includes('e74c3c')) return 'red, festive, lucky, celebratory';
    if (c.includes('276749') || c.includes('2d6a4f') || c.includes('27ae60')) return 'green, fresh, spring, natural';
    if (c.includes('2b6cb0') || c.includes('2980b9') || c.includes('1a73e8')) return 'blue, elegant, calm, dreamy';
    if (c.includes('7b2d8b') || c.includes('8e44ad') || c.includes('6a0dad')) return 'purple, luxurious, royal, magical';
    if (c.includes('b7791f') || c.includes('f39c12') || c.includes('e67e22')) return 'golden, warm, premium, glowing';
    return 'warm beige, romantic, soft, elegant';
  })();

  const prompt = `A stunning, photorealistic promotional banner image for a premium Vietnamese wedding photography studio.
Theme: "${promoTitle}"${shortDesc ? ` — ${shortDesc}` : ''}
Visual concept: ${emoji || '🎉'} wedding season promotion — capture the essence of romance and celebration
Color palette: ${colorMood} tones, soft bokeh, warm cinematic lighting
Scene elements: delicate florals (roses, peonies, baby's breath), gossamer fabric, golden hour glow, elegant decor
Composition: wide cinematic banner (16:9), abundant negative space on the right third for text overlay
Photography style: editorial wedding photography, shallow depth of field, dreamy atmosphere
Mood: luxurious, heartfelt, aspirational, Vietnamese wedding culture
IMPORTANT: Absolutely NO text, NO letters, NO numbers, NO words in the image. Pure visual only.`;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: model === 'dall-e-3' ? '1792x1024' : '1024x1024',
        quality: model === 'dall-e-3' ? quality : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `OpenAI error ${response.status}`;
      return res.status(200).json({ error: errMsg });
    }

    // Newer API returns URL; older returned b64_json — handle both
    const b64Direct = data?.data?.[0]?.b64_json;
    const imageUrl  = data?.data?.[0]?.url;

    if (b64Direct) {
      return res.status(200).json({ b64: b64Direct, revisedPrompt: data?.data?.[0]?.revised_prompt });
    }

    if (!imageUrl) return res.status(200).json({ error: 'DALL-E không trả về ảnh' });

    // Fetch image from URL and convert to base64 for frontend compatibility
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return res.status(200).json({ error: 'Không tải được ảnh từ OpenAI' });
    const imgBuf = await imgRes.arrayBuffer();
    const b64 = Buffer.from(imgBuf).toString('base64');

    return res.status(200).json({ b64, revisedPrompt: data?.data?.[0]?.revised_prompt });
  } catch (err: any) {
    console.error('ai-image error:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi kết nối OpenAI' });
  }
}
