import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bodyOf, kvDel, kvGet, kvSet, requirePost, storeKind, str } from "./_lib.js";

const KEY = "dotdash:question";
const TTL_S = 60 * 60; // an unanswered question expires after an hour

interface Question {
  id: string;
  text: string;
  askedAt: number;
  answer: "yes" | "no" | null;
  answeredAt?: number;
}

const read = async (): Promise<Question | null> => {
  const raw = await kvGet(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Question;
  } catch {
    return null;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requirePost(req, res, { auth: true })) return;
  const body = bodyOf(req);
  const store = storeKind();
  try {
    switch (body.action) {
      case "get":
        return res.status(200).json({ question: await read(), store });

      case "ask": {
        const text = str(body.text, 120);
        if (!text) return res.status(400).json({ error: "text required" });
        const q: Question = { id: randomUUID(), text, askedAt: Date.now(), answer: null };
        await kvSet(KEY, JSON.stringify(q), TTL_S);
        return res.status(200).json({ question: q, store });
      }

      case "answer": {
        const current = await read();
        const answer = body.answer === "yes" || body.answer === "no" ? body.answer : null;
        if (!current || !answer || body.id !== current.id) return res.status(409).json({ error: "no matching question" });
        if (current.answer !== null) return res.status(200).json({ question: current, store }); // first answer wins
        const updated: Question = { ...current, answer, answeredAt: Date.now() };
        await kvSet(KEY, JSON.stringify(updated), TTL_S);
        return res.status(200).json({ question: updated, store });
      }

      case "clear":
        await kvDel(KEY);
        return res.status(200).json({ question: null, store });

      default:
        return res.status(400).json({ error: "unknown action" });
    }
  } catch {
    return res.status(502).json({ error: "store unavailable" });
  }
}
