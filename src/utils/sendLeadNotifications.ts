/** Gửi thông báo Lark + Telegram cho mọi điểm đăng ký (chat form, PhoneGate, consultation). */
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
    larkWebhookUrl?: string;
    telegramNotificationEnabled?: boolean;
    telegramBotToken?: string;
    telegramChatId?: string;
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
        webhookUrl: settings?.larkWebhookUrl || undefined,
      }),
    }).catch(() => {});
  }

  if (settings?.telegramNotificationEnabled && settings?.telegramBotToken && settings?.telegramChatId) {
    fetch('/api/telegram-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, source, luckyGift,
        albums: albums ?? [],
        botToken: settings.telegramBotToken,
        chatId: settings.telegramChatId,
      }),
    }).catch(() => {});
  }
}
