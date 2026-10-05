"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { hasWebGL } from "@/lib/hooks";
import { useTown } from "./state";

// The world (three.js, R3F, drei) is code-split and client-only.
const noop = () => () => {};

const Town = dynamic(() => import("./Town"), { ssr: false });

/**
 * Chooses between the 3D town and the list view, and keeps the list in the
 * DOM either way: visible in list mode, visually hidden (but readable by
 * screen readers and crawlers) while the town is showing.
 *
 * Defaults to the list for prefers-reduced-motion or no WebGL (and switches
 * to it if the device turns out too slow, see Town's PerfCheck), with a
 * notice and a way into the town anyway. `?view=list` deep-links to the
 * list; `?view=city` forces the city.
 */
export function TownShell({ list }: { list: ReactNode }) {
  const mode = useTown((s) => s.mode);
  const setMode = useTown((s) => s.setMode);
  // false during SSR/hydration, true on the client (no setState-in-effect)
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const checked = useTown((s) => s.checked);
  const decided = hydrated && checked;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "list") setMode("list");
    else if (params.get("view") === "city") useTown.setState({ chosen: true }); // force the city (skips the slow-device check)
    else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setMode("list", "your device asks for reduced motion");
    else if (!hasWebGL()) setMode("list", "this browser doesn't support WebGL");
    useTown.setState({ checked: true });
  }, [setMode]);

  // keep the URL in sync, lock page scroll while in the town
  useEffect(() => {
    if (!decided) return;
    const url = new URL(window.location.href);
    if (mode === "list") url.searchParams.set("view", "list");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
    document.documentElement.style.overflow = mode === "town" ? "hidden" : "";
    if (mode === "list") {
      window.scrollTo(0, 0);
    }
  }, [mode, decided]);

  return (
    <>
      {decided && mode === "town" && <Town />}
      {!decided && <div data-pending-cover className="fixed inset-0 bg-cream" aria-hidden="true" />}

      <div className={mode === "list" ? "" : "sr-only"} data-list-shell data-pending={!decided || undefined} aria-hidden={false}>
        {list}
      </div>
    </>
  );
}
