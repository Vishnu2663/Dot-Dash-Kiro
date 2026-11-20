import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { TrackerProvider } from "./lib/tracker";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TrackerProvider>
      <App />
    </TrackerProvider>
  </StrictMode>,
);
