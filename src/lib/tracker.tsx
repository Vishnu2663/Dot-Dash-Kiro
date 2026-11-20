import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { BlinkDetector, type BlinkEvent, type Timing } from "./blink";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** score: 0..1 eye closure. t: seconds. */
export type FrameListener = (score: number, t: number) => void;
export type TrackerStatus = "idle" | "loading" | "running" | "error";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

function loadLandmarker(): Promise<FaceLandmarker> {
  landmarkerPromise ??= (async () => {
    const files = await FilesetResolver.forVisionTasks("/mediapipe-wasm");
    const make = (delegate: "GPU" | "CPU") =>
      FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        numFaces: 1,
      });
    try {
      return await make("GPU");
    } catch {
      return await make("CPU");
    }
  })();
  landmarkerPromise.catch(() => {
    landmarkerPromise = null;
  });
  return landmarkerPromise;
}

interface Session {
  stream: MediaStream;
  stop: () => void;
}

/** Opens the camera and calls `onFrame` with eye closure (null when no face is found). */
async function startSession(
  video: HTMLVideoElement,
  onFrame: (score: number | null, t: number) => void,
): Promise<Session> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" },
    audio: false,
  });
  try {
    video.srcObject = stream;
    await video.play();
    const landmarker = await loadLandmarker();
    let raf = 0;
    let stopped = false;
    let lastVideoTime = -1;
    let lastTs = 0;
    const loop = () => {
      if (stopped) return;
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const ts = Math.max(performance.now(), lastTs + 1); // timestamps must increase
        lastTs = ts;
        const cats = landmarker.detectForVideo(video, ts).faceBlendshapes?.[0]?.categories;
        const get = (name: string) => cats?.find((c) => c.categoryName === name)?.score ?? 0;
        onFrame(cats ? (get("eyeBlinkLeft") + get("eyeBlinkRight")) / 2 : null, ts / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return {
      stream,
      stop() {
        stopped = true;
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      },
    };
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
}

interface TrackerValue {
  status: TrackerStatus;
  error: string;
  faceFound: boolean;
  stream: MediaStream | null;
  start: () => Promise<boolean>;
  stop: () => void;
  subscribe: (fn: FrameListener) => () => void;
}

const Ctx = createContext<TrackerValue | null>(null);

export function TrackerProvider({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const session = useRef<Session | null>(null);
  const starting = useRef(false);
  const listeners = useRef(new Set<FrameListener>());
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [error, setError] = useState("");
  const [faceFound, setFaceFound] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (session.current) return true;
    if (!video || starting.current) return false;
    starting.current = true;
    setStatus("loading");
    setError("");
    try {
      session.current = await startSession(video, (score, t) => {
        setFaceFound(score !== null);
        for (const fn of listeners.current) fn(score ?? 0, t);
      });
      setStream(session.current.stream);
      setStatus("running");
      return true;
    } catch (e) {
      session.current = null;
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(
        denied
          ? "Camera access was blocked. Allow the camera in the browser address bar, then try again."
          : e instanceof Error ? e.message : "Could not start the camera",
      );
      setStatus("error");
      return false;
    } finally {
      starting.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    session.current?.stop();
    session.current = null;
    setStream(null);
    setStatus((s) => (s === "error" ? s : "idle"));
  }, []);

  const subscribe = useCallback((fn: FrameListener) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const value = useMemo(
    () => ({ status, error, faceFound, stream, start, stop, subscribe }),
    [status, error, faceFound, stream, start, stop, subscribe],
  );

  return (
    <Ctx.Provider value={value}>
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        style={{ position: "fixed", width: 2, height: 2, opacity: 0, pointerEvents: "none" }}
      />
      {children}
    </Ctx.Provider>
  );
}

export function useTracker() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTracker must be used inside TrackerProvider");
  return v;
}

/**
 * Feeds camera frames into a BlinkDetector. `onEvent` receives blink events,
 * `onFrame` receives every raw frame. Starts the camera automatically.
 */
export function useBlinkInput(
  timing: Timing,
  onEvent: (e: BlinkEvent) => void,
  onFrame?: FrameListener,
) {
  const tracker = useTracker();
  const { subscribe, start, status } = tracker;
  const detector = useRef<BlinkDetector | null>(null);
  const timingRef = useRef(timing);
  const eventRef = useRef(onEvent);
  const frameRef = useRef(onFrame);
  const closedAt = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [closedFor, setClosedFor] = useState(0);

  useEffect(() => {
    timingRef.current = timing;
    if (detector.current) detector.current.timing = timing;
    eventRef.current = onEvent;
    frameRef.current = onFrame;
  });

  useEffect(() => {
    detector.current = new BlinkDetector(timingRef.current);
    closedAt.current = null;
    return subscribe((s, t) => {
      const d = detector.current;
      if (!d) return;
      setScore(s);
      if (s > d.timing.threshold) {
        closedAt.current ??= t;
        setClosedFor(t - closedAt.current);
      } else if (closedAt.current !== null) {
        closedAt.current = null;
        setClosedFor(0);
      }
      frameRef.current?.(s, t);
      for (const ev of d.update(s, t)) eventRef.current(ev);
    });
  }, [subscribe]);

  useEffect(() => {
    if (status === "idle") void start();
  }, [status, start]);

  return { ...tracker, score, closedFor };
}
