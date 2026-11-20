import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Coach, Notice } from "../components/ui";
import { Sidebar } from "../components/panels";
import { MorseChart } from "../components/MorseChart";
import { Composer, QuestionCard, Suggestions } from "../components/MorseParts";
import type { BlinkEvent } from "../lib/blink";
import { ALERT_MESSAGES, fetchSuggestions, sendAlert } from "../lib/api";
import { playCue } from "../lib/audio";
import { answerFor, applyDecoded, decode, endsWithHelp } from "../lib/morse";
import { matchQuickPhrase } from "../lib/phrases";
import { FALLBACK_NOTE, builtInSuggestions, improveSuggestions, type Suggestion } from "../lib/suggest";
import { loadRecent, pushRecent, type Settings } from "../lib/settings";
import { speak, YES_NO } from "../lib/speech";
import { useBlinkInput } from "../lib/tracker";
import { useQuestion } from "../lib/useQuestion";

const MAX_SUGGESTIONS = 6;

export function Morse({ settings, onHome }: { settings: Settings; onHome: () => void }) {
  const [text, setText] = useState("");
  const [code, setCode] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [fallbackNote, setFallbackNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  // Refs mirror state so blink callbacks always see the latest values.
  const textRef = useRef("");
  const codeRef = useRef("");
  const suggestionsRef = useRef<Suggestion[]>([]);
  const requestId = useRef(0); // ignores late suggestion responses

  const question = useQuestion(settings.passcode);
  const openQuestionRef = useRef(question.open);
  useEffect(() => {
    openQuestionRef.current = question.open;
  }, [question.open]);

  const setTextBoth = (v: string) => { textRef.current = v; setText(v); };
  const setCodeBoth = (v: string) => { codeRef.current = v; setCode(v); };
  const setSuggestionsBoth = (v: Suggestion[]) => { suggestionsRef.current = v; setSuggestions(v); };
  const cancelSuggestions = () => { requestId.current++; setLoading(false); setFallbackNote(""); setSuggestionsBoth([]); };

  const say = useCallback((s: string) => speak(s, settings.lang), [settings.lang]);

  /** Show built-in matches at once, then let cloud AI improve them (if allowed). Falls back after 9 s. */
  const refreshSuggestions = useCallback(async (typed: string) => {
    const id = ++requestId.current;
    setFallbackNote("");
    setSuggestionsBoth(builtInSuggestions(typed, MAX_SUGGESTIONS));
    if (!settings.cloudAi) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await improveSuggestions({
      typed,
      n: MAX_SUGGESTIONS,
      fetchRemote: (signal) => fetchSuggestions(typed, loadRecent(), settings.lang, MAX_SUGGESTIONS, signal),
    });
    if (id !== requestId.current) return;
    setLoading(false);
    setSuggestionsBoth(result.suggestions);
    setFallbackNote(result.outcome === "fallback" ? FALLBACK_NOTE : "");
  }, [settings.lang, settings.cloudAi]);
  const speakChoice = useCallback((sentence: string) => {
    requestId.current++;
    setLoading(false);
    setMessage("");
    setTextBoth(sentence);
    setSuggestionsBoth([]);
    pushRecent(sentence);
    playCue("select", settings.sound);
    say(sentence);
  }, [say, settings.sound]);

  const raiseAlert = useCallback(async () => {
    playCue("alert", settings.sound);
    say("I need help");
    setNotice({ text: "Sending alert…", ok: true });
    const r = await sendAlert("SOS");
    setNotice({ text: ALERT_MESSAGES[r], ok: r === "sent" || r === "cooldown" });
  }, [say, settings.sound]);

  const submitAnswer = useCallback(async (a: "yes" | "no") => {
    playCue("select", settings.sound);
    if (await question.answer(a)) {
      say(YES_NO[a][settings.lang]);
      setNotice({ text: `You answered ${a === "yes" ? "YES" : "NO"}. Your caregiver can see it.`, ok: true });
    } else setNotice({ text: "The answer could not be sent. Blink again to retry.", ok: false });
  }, [question, say, settings.lang, settings.sound]);

  /** Called when a letter ends: interpret the dots and dashes blinked so far. */
  const finishCode = useCallback(() => {
    const c = codeRef.current;
    if (!c) return;

    if (openQuestionRef.current) {
      setCodeBoth("");
      const a = answerFor(c);
      if (a) void submitAnswer(a);
      else setMessage("A question is waiting. Blink once short (•) for YES or once long (—) for NO.");
      return;
    }

    const quick = matchQuickPhrase(c);
    if (quick) {
      cancelSuggestions();
      setCodeBoth("");
      setMessage("");
      setTextBoth(quick.say);
      pushRecent(quick.say);
      playCue("select", settings.sound);
      say(quick.say);
      return;
    }

    const d = decode(c);
    setCodeBoth("");
    if (d.kind === "send") {
      const t = textRef.current.trim();
      if (t) { pushRecent(t); say(t); }
      return;
    }
    // A digit chooses the numbered suggestion when suggestions are showing.
    if (d.kind === "char" && /^[1-9]$/.test(d.value) && suggestionsRef.current.length) {
      const pick = suggestionsRef.current[Number(d.value) - 1];
      if (pick) speakChoice(pick.text);
      else setMessage(`There is no sentence ${d.value}. Choose a number from 1 to ${suggestionsRef.current.length}.`);
      return;
    }
    setMessage("");
    const next = applyDecoded(textRef.current, d);
    setTextBoth(next);
    playCue("letter", settings.sound);
    if (endsWithHelp(next)) {
      setTextBoth("");
      cancelSuggestions();
      void raiseAlert();
    } else if ((d.kind === "char" || d.kind === "delete") && next.trim().length >= 2) {
      void refreshSuggestions(next.trim());
    } else cancelSuggestions();
  }, [raiseAlert, refreshSuggestions, say, settings.sound, speakChoice, submitAnswer]);

  const onEvent = useCallback((e: BlinkEvent) => {
    switch (e.type) {
      case "symbol":
        playCue(e.symbol === "." ? "dot" : "dash", settings.sound);
        setCodeBoth(codeRef.current + e.symbol);
        break;
      case "letter-end":
        finishCode();
        break;
      case "word-end":
        finishCode();
        if (textRef.current && !textRef.current.endsWith(" ")) setTextBoth(textRef.current + " ");
        break;
      case "sos":
        void raiseAlert();
        break;
    }
  }, [finishCode, raiseAlert, settings.sound]);

  const input = useBlinkInput(settings.timing, onEvent);

  // Announce a new caregiver question aloud.
  const qId = question.open?.id;
  const qText = question.open?.text;
  useEffect(() => {
    if (qId && qText) {
      playCue("alert", settings.sound);
      speak(qText, settings.lang);
    }
  }, [qId, qText, settings.lang, settings.sound]);

  let coach = "Blink short (•) or long (—) to spell. Example: the letter E is one short blink.";
  let tone: "info" | "warn" = "info";
  if (input.status !== "running") {
    coach = "Turn on the camera so Dot-Dash can see your eyes.";
    tone = "warn";
  } else if (!input.faceFound) {
    coach = "I can't see your face. Move closer, face the camera and add some light.";
    tone = "warn";
  } else if (question.open) {
    coach = "Your caregiver asked a question. Blink once short (•) for YES, or once long (—) for NO.";
    tone = "warn";
  } else if (message) {
    coach = message;
    tone = "warn";
  } else if (code) {
    coach = "Open your eyes and wait 1.5 seconds to finish this letter. Keep blinking to add more dots and dashes.";
  } else if (!text && !suggestions.length) {
    coach = "Blink short (•) or long (—) to spell. Quick phrases are at the top of the chart: for example 4 long blinks (— — — —) means Toilet.";
  } else if (suggestions.length) {
    coach = "To choose a sentence, blink its number in Morse (shown on the tile). Or keep spelling to narrow the list.";
  } else if (text) {
    coach = "Keep spelling, or pause 3 seconds to start a new word. Blink • • — — to delete, • — • — to speak.";
  }

  const deleteLetter = () => {
    const next = textRef.current.slice(0, -1);
    setTextBoth(next);
    if (next.trim().length >= 2) void refreshSuggestions(next.trim());
    else cancelSuggestions();
  };
  const clearAll = () => {
    cancelSuggestions();
    setTextBoth("");
    setCodeBoth("");
    setMessage("");
  };

  return (
    <div className="space-y-6">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <QuestionCard question={question.open} onAnswer={(a) => void submitAnswer(a)} onHide={question.hide} />

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr] xl:grid-cols-[17rem_1fr_21rem]">
        <div className="order-3 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1 xl:row-span-1">
          <MorseChart code={code} />
        </div>

        <aside className="order-1 space-y-4 lg:order-none lg:col-start-2 lg:row-start-1 xl:col-start-3">
          <Sidebar tracker={input} score={input.score} closedFor={input.closedFor} timing={settings.timing} />
        </aside>

        <div className="order-2 space-y-6 lg:order-none lg:col-start-2 lg:row-start-2 xl:row-start-1">
          <Coach text={coach} tone={tone} />
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your message</h2>
            <Composer code={code} text={text} />
            <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
              <Button variant="primary" onClick={() => say(text)} disabled={!text.trim()}>🔊 Speak</Button>
              <Button onClick={deleteLetter} disabled={!text}>⌫ Delete letter</Button>
              <Button onClick={clearAll} disabled={!text && !code}>Clear</Button>
              <Button variant="ghost" className="ml-auto" onClick={onHome}>← Home</Button>
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Sentences starting with “{text.trim() || "…"}”
            </h2>
            <Suggestions suggestions={suggestions} loading={loading} note={fallbackNote} code={code} typed={text} onPick={speakChoice} />
          </Card>
        </div>
      </div>
    </div>
  );
}
