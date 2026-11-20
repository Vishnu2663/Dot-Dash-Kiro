import { useCallback, useEffect, useRef, useState } from "react";
import { askApi, type Question } from "./api";

const POLL_MS = 5000;

/** Polls for a caregiver question and lets the patient answer or hide it. */
export function useQuestion(passcode: string) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<{ id: string; answer: "yes" | "no" } | null>(null);
  const [failed, setFailed] = useState(false);
  const latest = useRef<Question | null>(null);
  const key = useRef(passcode);

  useEffect(() => {
    key.current = passcode;
  }, [passcode]);

  useEffect(() => {
    if (!passcode) return;
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      const r = await askApi(key.current, "get");
      if (cancelled) return;
      if (r.status === "ok") {
        setFailed(false);
        latest.current = r.question;
        setQuestion(r.question);
      } else setFailed(true);
    };
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [passcode]);

  const open =
    question && question.answer === null && hiddenId !== question.id && answered?.id !== question.id ? question : null;

  /** Returns true when the server accepted the answer. */
  const answer = useCallback(async (value: "yes" | "no") => {
    const q = latest.current;
    if (!q || q.answer !== null) return false;
    setAnswered({ id: q.id, answer: value });
    const r = await askApi(key.current, "answer", { id: q.id, answer: value });
    if (r.status === "ok") {
      latest.current = r.question;
      setQuestion(r.question);
      return true;
    }
    setAnswered(null); // let the patient retry
    return false;
  }, []);

  const hide = useCallback(() => {
    if (latest.current) setHiddenId(latest.current.id);
  }, []);

  return { open, failed, answer, hide };
}
