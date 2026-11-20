import { useState, type ReactNode } from "react";
import { Button, Card, PageTitle } from "../components/ui";
import { sendAlert, type AlertResult } from "../lib/api";
import { DEFAULT_SETTINGS, saveSettings, type Lang, type Settings } from "../lib/settings";
import { speak } from "../lib/speech";
import type { Page } from "../App";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="text-xl font-bold">{title}</h2>
      {hint && <p className="mt-1 text-base text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

const field = "w-full rounded-xl border border-line bg-bg px-4 py-3 text-lg";

export function SettingsPage({ settings, onChange, go }: { settings: Settings; onChange: (s: Settings) => void; go: (p: Page) => void }) {
  const [testResult, setTestResult] = useState<{ text: string; ok: boolean } | null>(null);
  const [showCode, setShowCode] = useState(false);

  const set = (next: Settings) => {
    saveSettings(next);
    onChange(next);
  };

  const sendTest = async () => {
    const r = await sendAlert("message", "Test message from Dot-Dash");
    const messages: Record<AlertResult, string> = {
      sent: "✓ Test message sent to Telegram",
      unauthorized: "Wrong passcode. It must match ALERT_PASSCODE on the server exactly.",
      cooldown: "Please wait a few seconds and try again",
      "not-configured": "TELEGRAM_BOT_TOKEN is missing on the server. Add it in Vercel and redeploy.",
      "no-chat": "No Telegram chat found. Open your bot in Telegram and press Start, or set TELEGRAM_CHAT_ID.",
      rejected: "Telegram rejected the message. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID, and that you pressed Start in the bot.",
      failed: "Could not reach the server. Check your connection and try again.",
    };
    setTestResult({ text: messages[r], ok: r === "sent" });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Settings" subtitle="Caregivers can tune Dot-Dash here. Changes save automatically on this device." />
      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Blink sensitivity" hint="Lower is more sensitive (dim light, glasses, small eyes). Higher gives fewer false blinks.">
          <div className="flex items-center gap-4">
            <input
              type="range" min={0.15} max={0.85} step={0.01} className="w-full accent-white" aria-label="Eye-closed threshold"
              value={settings.timing.threshold}
              onChange={(e) => set({ ...settings, timing: { ...settings.timing, threshold: Number(e.target.value) } })}
            />
            <span className="w-16 shrink-0 text-right font-mono text-xl font-bold">{settings.timing.threshold.toFixed(2)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <span>More sensitive</span><span>Fewer false blinks</span>
          </div>
          <Button className="mt-4" onClick={() => go("calibrate")}>Run calibration instead</Button>
        </Section>

        <Section title="Easy mode scanning speed" hint="In Easy mode a highlight moves across the options and you blink to choose. This sets how long each option stays highlighted. Slower is easier to time.">
          <div className="flex items-center gap-4">
            <input
              type="range" min={1500} max={4000} step={250} className="w-full accent-white" aria-label="Seconds per highlight"
              value={settings.scanMs}
              onChange={(e) => set({ ...settings, scanMs: Number(e.target.value) })}
            />
            <span className="w-20 shrink-0 whitespace-nowrap text-right font-mono text-xl font-bold">{(settings.scanMs / 1000).toFixed(1)} s</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-muted">
            <span>Faster</span><span>Slower</span>
          </div>
        </Section>

        <Section title="Voice and language" hint="Sets the spoken voice and the language of suggestions. Letters are still spelled in Latin Morse.">
          <select className={field} value={settings.lang} aria-label="Language" onChange={(e) => set({ ...settings, lang: e.target.value as Lang })}>
            <option value="en">English</option>
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="kn">Kannada (ಕನ್ನಡ)</option>
          </select>
          <Button className="mt-4" onClick={() => speak("Testing the voice. Can you hear me?", settings.lang)}>🔊 Test voice</Button>
        </Section>

        <Section title="Sound cues" hint="Short beeps when a dot, dash or letter is recognised, so you know a blink was counted.">
          <label className="flex cursor-pointer items-center gap-4 text-lg font-semibold">
            <input type="checkbox" className="size-6 accent-white" checked={settings.sound} onChange={(e) => set({ ...settings, sound: e.target.checked })} />
            {settings.sound ? "Sounds on" : "Sounds off"}
          </label>
        </Section>

        <div className="md:col-span-2">
          <Section title="Cloud AI for suggestions" hint="Sentence suggestions can come from cloud AI. When this is off, only the built-in phrases are used and nothing is sent for suggestions.">
            <label className="flex cursor-pointer items-center gap-4 text-lg font-semibold">
              <input type="checkbox" className="size-6 accent-white" checked={settings.cloudAi} onChange={(e) => set({ ...settings, cloudAi: e.target.checked })} />
              Use cloud AI for suggestions: {settings.cloudAi ? "On" : "Off"}
            </label>
            <section aria-labelledby="cloud-sent" className="mt-5 rounded-2xl border border-line bg-bg p-4 text-base">
              <h3 id="cloud-sent" className="text-lg font-bold">What is sent to the cloud</h3>
              {settings.cloudAi ? (
                <>
                  <p className="mt-2"><b>For suggestions</b>, each time your message changes in Morse mode and has 2 or more letters, Dot-Dash sends:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-6">
                    <li>The letters typed so far, exactly as typed (up to 60 characters).</li>
                    <li>Up to 5 sentences recently said in Morse mode: a picked suggestion, a quick phrase, or a message spoken with • — • —.</li>
                    <li>The language (English, Hindi or Kannada) and how many suggestions to return.</li>
                  </ul>
                  <p className="mt-3"><b>Never sent for suggestions:</b> video, camera images, audio (the microphone is never opened), the alert passcode or your settings. Dot-Dash has no name or profile field. If you spell a name, those letters are sent like any others.</p>
                  <p className="mt-3"><b>Where it goes:</b> to this app's own server, which asks <b>Groq</b> first. It asks <b>Google Gemini</b> only if Groq is not set up, fails, or gives no usable answer. If neither answers within 9 seconds, Dot-Dash keeps the built-in phrases. Each suggestion is labelled "AI" or "Built-in".</p>
                  <p className="mt-3">On Google's free tier, Google may use content sent to Gemini to improve its products. <span className="text-muted">(Source: <a className="underline" href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer">Google's Gemini API pricing page</a>.)</span></p>
                </>
              ) : (
                <p className="mt-2"><b>Nothing is sent for suggestions.</b> Cloud AI is off, so suggestions come only from the built-in phrases on this device, labelled "Built-in".</p>
              )}
              <h4 className="mt-4 font-bold">Other connections, whatever this setting says</h4>
              <ul className="mt-1 list-disc space-y-1 pl-6 text-muted">
                <li>When the camera starts, the browser downloads the face-tracking model from Google's storage servers. Nothing is uploaded with it.</li>
                <li>Alerts and test messages go through this app's server to Telegram. The emergency alert text is fixed: "the patient needs help now".</li>
                <li>Caregiver yes/no questions and answers go through this app's server, and its Upstash Redis store if one is set up.</li>
                <li>Depending on your browser and the voice you choose, spoken text may be processed by an online voice service. Choose an offline voice in your system settings if you want to avoid that.</li>
              </ul>
            </section>
          </Section>
        </div>
        <div className="md:col-span-2">
          <Section title="Caregiver alerts" hint="Enter the alert passcode set on the server (ALERT_PASSCODE). It is stored only on this device. Alerts are sent when eyes stay closed for 3 seconds or HELP is spelled.">
            <div className="flex flex-wrap gap-3">
              <input
                type={showCode ? "text" : "password"} autoComplete="off" spellCheck={false}
                placeholder="Alert passcode" aria-label="Alert passcode" className={`${field} max-w-sm`}
                value={settings.passcode}
                onChange={(e) => set({ ...settings, passcode: e.target.value.trim() })}
              />
              <Button onClick={() => setShowCode(!showCode)}>{showCode ? "Hide" : "Show"}</Button>
              <Button variant="primary" onClick={sendTest}>Send test message</Button>
            </div>
            {testResult && (
              <p role="status" className={`mt-3 text-lg font-semibold ${testResult.ok ? "text-ok" : "text-danger"}`}>{testResult.text}</p>
            )}
          </Section>
        </div>

        <div className="md:col-span-2">
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Reset</h2>
              <p className="text-base text-muted">Restore default timing and settings. The alert passcode is kept.</p>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Reset all settings to defaults?")) set({ ...DEFAULT_SETTINGS, passcode: settings.passcode });
              }}
            >
              Reset to defaults
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
