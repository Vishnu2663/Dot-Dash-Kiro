import { useCallback, useEffect, useState } from "react";
import { Shell } from "./components/Shell";
import { loadSettings, type Settings } from "./lib/settings";
import { useTracker } from "./lib/tracker";
import { Home } from "./pages/Home";
import { Morse } from "./pages/Morse";
import { Easy } from "./pages/Easy";
import { Calibrate } from "./pages/Calibrate";
import { SettingsPage } from "./pages/SettingsPage";
import { Caregiver } from "./pages/Caregiver";
import { Guide } from "./pages/Guide";

export type Page = "home" | "talk" | "easy" | "calibrate" | "settings" | "guide" | "caregiver";
const PAGES: Page[] = ["home", "talk", "easy", "calibrate", "settings", "guide", "caregiver"];
/** Pages that need the camera. Leaving them turns it off. */
const CAMERA_PAGES: Page[] = ["talk", "easy", "calibrate"];

const readHash = (): Page => {
  const h = location.hash.replace(/^#\/?/, "") as Page;
  return PAGES.includes(h) ? h : "home";
};

export function App() {
  const [page, setPage] = useState<Page>(readHash);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const { stop } = useTracker();

  useEffect(() => {
    const onNav = () => {
      setPage(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onNav);
    window.addEventListener("popstate", onNav);
    return () => {
      window.removeEventListener("hashchange", onNav);
      window.removeEventListener("popstate", onNav);
    };
  }, []);

  useEffect(() => {
    if (!CAMERA_PAGES.includes(page)) stop();
  }, [page, stop]);

  const go = useCallback((p: Page) => {
    location.hash = p === "home" ? "/" : `/${p}`;
  }, []);
  const home = useCallback(() => go("home"), [go]);

  let view;
  switch (page) {
    case "talk": view = <Morse settings={settings} onHome={home} />; break;
    case "easy": view = <Easy settings={settings} onHome={home} />; break;
    case "calibrate": view = <Calibrate settings={settings} onSaved={setSettings} go={go} />; break;
    case "settings": view = <SettingsPage settings={settings} onChange={setSettings} go={go} />; break;
    case "caregiver": view = <Caregiver settings={settings} onChange={setSettings} />; break;
    case "guide": view = <Guide go={go} />; break;
    default: view = <Home go={go} settings={settings} />;
  }
  return <Shell page={page} go={go}>{view}</Shell>;
}
