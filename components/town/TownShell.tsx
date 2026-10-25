"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { hasWebGL } from "@/lib/hooks";
import { readSavedMode } from "@/lib/mode";
import { Chooser } from "@/components/chooser/Chooser";
import { useTown } from "./state";

// The world (three.js, R3F, drei) is code-split and client-only: it's only
// fetched once "free roam" is picked.
const noop = () => () => {};

const Town = dynamic(() => import("./Town"), { ssr: false });

/**
 * Chooses what shows at "/": the mode chooser (first visit), the 3D city
 * ("free roam") or the list view ("normal website"); the agent version lives
 * at /agent. The list is in the server-rendered DOM in every mode (visually
 * hidden unless it's showing) for crawlers and screen readers.
 *
 * Order: ?view=list|city|agent, then "remember my choice", then the
 * fallbacks (reduced motion / no WebGL → the list, with a notice), else the
 * chooser. ?choose=1 always opens the chooser ("switch mode"). A slow device
 * still drops from the city to the list (Town's PerfCheck). The pre-paint
 * script in app/layout.tsx mirrors this, so nothing flashes.
 */
export function TownShell({ list, projectImages }: { list: ReactNode; projectImages: string[] }) {
  const mode = useTown((s) => s.mode);
  const setMode = useTown((s) => s.setMode);
  // false during SSR/hydration, true on the client (no setState-in-effect)
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const checked = useTown((s) => s.checked);
  const decided = hydrated && checked;

  useEffect(() => {
    useTown.setState({ projectImages });
  }, [projectImages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const saved = params.has("choose") ? null : readSavedMode();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const noGL = !hasWebGL();
    const noGLReason = "this browser doesn't support WebGL";
    if (params.has("choose")) setMode("choose");
    else if (view === "agent" || (!view && saved === "agent")) {
      window.location.replace("/agent/");
      return;
    } else if (view === "list" || (!view && saved === "list")) setMode("list");
    else if (view === "city" || (!view && saved === "town")) {
      if (noGL) setMode("list", noGLReason);
      else {
        if (view === "city") useTown.setState({ chosen: true }); // forced: skip the slow-device check
        setMode("town");
      }
    } else if (reduced) setMode("list", "your device asks for reduced motion");
    else if (noGL) setMode("list", noGLReason);
    else setMode("choose");
    useTown.setState({ checked: true });
  }, [setMode]);

  // keep the URL in sync; the city and the chooser are full-screen (no page scroll)
  useEffect(() => {
    if (!decided) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("choose");
    if (mode === "list") url.searchParams.set("view", "list");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
    document.documentElement.style.overflow = mode === "list" ? "" : "hidden";
    if (mode === "list") window.scrollTo(0, 0);
  }, [mode, decided]);

  return (
    <>
      {decided && mode === "town" && <Town />}
      {!decided && <div data-pending-cover className="fixed inset-0 z-40 bg-cream" aria-hidden="true" />}
      {mode === "choose" && <Chooser pending={!decided} />}

      <div
        className={mode === "list" ? "" : "sr-only"}
        data-list-shell
        data-pending={!decided || undefined}
        inert={mode === "choose" && decided ? true : undefined}
      >
        {list}
      </div>
    </>
  );
}
