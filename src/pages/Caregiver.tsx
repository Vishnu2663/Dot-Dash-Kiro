import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, inputClass, PageTitle } from "../components/ui";
import { askApi, type Question } from "../lib/api";
import { CAREGIVER_QUESTIONS } from "../lib/phrases";
import { saveSettings, type Settings } from "../lib/settings";

const POLL_MS = 3000;

export function Caregiver({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const passcode = settings.passcode;
  const [question, setQuestion] = useState<Question | null>(null);
  const [history, setHistory] = useState<Question[]>([]);
  const [custom, setCustom] = useState("");
  const [store, setStore] = useState<"redis" | "memory" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const logged = useRef(new Set<string>());

  const update = useCallback((q: Question | null) => {
    setQuestion(q);
    if (q?.answer && !logged.current.has(q.id)) {
      logged.current.add(q.id);
      setHistory((h) => [q, ...h].slice(0, 20));
    }
  }, []);

  const waiting = !!question && question.answer === null;

  // While a question is open, poll for the patient's answer.
  useEffect(() => {
    if (!passcode || !waiting) return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (document.hidden) return;
      const r = await askApi(passcode, "get");
      if (!cancelled && r.status === "ok") update(r.question);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [passcode, waiting, update]);

  const ask = async (text: string) => {
    setBusy(true);
    setError("");
    const r = await askApi(passcode, "ask", { text });
    setBusy(false);
    if (r.status === "ok") {
      update(r.question);
      setStore(r.store);
      setCustom("");
    } else {
      setError(r.status === "unauthorized" ? "Wrong or missing passcode." : "Could not send. Check the connection and the server keys.");
    }
  };

  const cancel = async () => {
    if ((await askApi(passcode, "clear")).status === "ok") setQuestion(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="Caregiver" subtitle="Ask the patient a yes/no question. They answer with one blink: short for yes, long for no." />

      {!passcode && (
        <Card className="space-y-3">
          <h2 className="text-xl font-bold">Enter the caregiver passcode</h2>
          <p className="text-muted">It is the ALERT_PASSCODE set on the server. It is kept only on this device.</p>
          <input
            className={inputClass}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="Passcode"
            aria-label="Caregiver passcode"
            onChange={(e) => {
              const next = { ...settings, passcode: e.target.value.trim() };
              saveSettings(next);
              onChange(next);
            }}
          />
        </Card>
      )}

      {passcode && (
        <>
          <Card className="space-y-4">
            <h2 className="text-xl font-bold">Ask a question</h2>
            <div className="flex flex-wrap gap-2">
              {CAREGIVER_QUESTIONS.map((q) => (
                <Button key={q} disabled={busy || waiting} onClick={() => void ask(q)}>{q}</Button>
              ))}
            </div>
            <form
              className="flex flex-wrap gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) void ask(custom);
              }}
            >
              <input
                className={`${inputClass} flex-1`}
                maxLength={120}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Or type your own yes/no question"
                aria-label="Your question"
              />
              <Button type="submit" variant="primary" disabled={busy || waiting || !custom.trim()}>Ask</Button>
            </form>
            {error && <p role="alert" className="font-semibold text-danger">{error}</p>}
            {store === "memory" && (
              <p role="status" className="rounded-xl border border-dash/40 bg-dash/10 p-3 text-dash">
                The server has no shared store (Upstash Redis) set up, so this only works reliably when you run it on one computer. Add the Redis variables before using it between two devices.
              </p>
            )}
          </Card>

          {question && (
            <Card className="space-y-3" >
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">Current question</p>
              <p className="text-3xl font-bold" aria-live="polite">{question.text}</p>
              {question.answer === null ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="warn">Waiting for the patient…</Badge>
                  <Button variant="ghost" onClick={() => void cancel()}>Cancel question</Button>
                </div>
              ) : (
                <p className={`text-4xl font-extrabold ${question.answer === "yes" ? "text-ok" : "text-danger"}`}>
                  {question.answer === "yes" ? "YES" : "NO"}
                  <span className="ml-3 text-base font-normal text-muted">
                    {question.answeredAt ? `answered at ${new Date(question.answeredAt).toLocaleTimeString()}` : ""}
                  </span>
                </p>
              )}
            </Card>
          )}

          {history.length > 0 && (
            <Card className="space-y-2">
              <h2 className="text-xl font-bold">This visit</h2>
              <ul className="divide-y divide-line">
                {history.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-4 py-2 text-lg">
                    <span>{q.text}</span>
                    <b className={q.answer === "yes" ? "text-ok" : "text-danger"}>{q.answer === "yes" ? "YES" : "NO"}</b>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
