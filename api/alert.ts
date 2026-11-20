import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bodyOf, kvClaim, requirePost, str } from "./_lib";

const SOS_COOLDOWN_S = 30;
const TELEGRAM = "https://api.telegram.org";

/** Chat id from the environment, or the chat that most recently sent /start to the bot. */
async function resolveChatId(token: string): Promise<string | null> {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  const res = await fetch(`${TELEGRAM}/bot${token}/getUpdates`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: { message?: { chat?: { id?: number } } }[] };
  const last = [...(data.result ?? [])].reverse().find((u) => u.message?.chat?.id);
  return last?.message?.chat?.id ? String(last.message.chat.id) : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res, { auth: true })) return;
  const body = bodyOf(req);
  const type = body.type === "SOS" ? "SOS" : "message";
  const text = str(body.text, 300);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(503).json({ error: "telegram is not configured" });

  try {
    if (type === "SOS" && !(await kvClaim("dotdash:sos-cooldown", SOS_COOLDOWN_S))) {
      return res.status(429).json({ error: "cooldown" });
    }
    const chatId = await resolveChatId(token);
    if (!chatId) return res.status(409).json({ error: "no chat: press Start in the Telegram bot first" });

    const message = type === "SOS" ? "🚨 Dot-Dash: the patient needs help now." : `Dot-Dash: ${text || "message"}`;
    const sent = await fetch(`${TELEGRAM}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
      signal: AbortSignal.timeout(6000),
    });
    if (!sent.ok) return res.status(502).json({ error: "telegram rejected the message" });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: "alert failed" });
  }
}
