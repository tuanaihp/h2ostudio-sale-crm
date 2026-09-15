/** Gửi thông báo Lark + Telegram cho mọi điểm đăng ký (chat form, PhoneGate, consultation).
 *  Credentials (botToken/chatId/webhook) nằm ở ENV server-side — client KHÔNG gửi,
 *  chỉ gửi dữ liệu lead. Gate chỉ dựa trên flag bật/tắt (không nhạy cảm). */
export async function sendLeadNotifications({
  name, phone, source, albums, luckyGift, settings,
}: {
  name: string;
  phone: string;
  source?: string;
  albums?: Array<{ title: string; url: string; styleName?: string }>;
  luckyGift?: string;
  settings?: {
    larkNotificationEnabled?: boolean;
    telegramNotificationEnabled?: boolean;
  } | null;
}) {
  if (settings?.larkNotificationEnabled !== false) {
    fetch('/api/lark-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, source, luckyGift,
        favoriteCount: albums?.length ?? 0,
        albums: albums ?? [],
      }),
    }).catch(() => {});
  }

  if (settings?.telegramNotificationEnabled) {
    fetch('/api/telegram-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, source, luckyGift,
        albums: albums ?? [],
      }),
    }).catch(() => {});
  }
}
