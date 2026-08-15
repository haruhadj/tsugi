export function buildXShareUrl(url: string, text?: string): string {
  const params = new URLSearchParams();
  if (text) params.set("text", text);
  params.set("url", url);
  return `https://x.com/intent/post?${params.toString()}`;
}

export function buildWhatsAppShareUrl(url: string, text?: string): string {
  const combined = text ? `${text} ${url}` : url;
  const params = new URLSearchParams({ text: combined });
  return `https://wa.me/?${params.toString()}`;
}

export function buildDiscordMessage(url: string, text?: string): string {
  return text ? `${text} ${url}` : url;
}
