export function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const name = part.slice(0, i).trim();
    try {
      cookies[name] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      // ignore malformed values
    }
  }
  return cookies;
}

const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|embed|curl|wget|python|headless/i;

// Link-preview fetchers (WhatsApp, Telegram…) shouldn't count as a relative opening the page.
export const isBot = (userAgent) => !userAgent || BOTS.test(userAgent);
