"use client";

import { useTown } from "@/components/town/state";
import { cityAudio } from "@/components/town/audio/engine";

/**
 * The normal website's client bits: the fallback notice (reduced motion /
 * no WebGL / slow device), "switch mode" (back to the chooser), and the
 * free-roam button. The 3D bundle is only fetched once free roam is chosen.
 */
export function FallbackNotice() {
  const reason = useTown((s) => s.listReason);
  const mode = useTown((s) => s.mode);
  if (!reason || mode !== "list") return null;
  return (
    <p role="status" className="lv-card lv-notice">
      Showing the normal website because {reason}.
    </p>
  );
}

export function SwitchModeButton({ className = "" }: { className?: string }) {
  const setMode = useTown((s) => s.setMode);
  return (
    <button type="button" onClick={() => setMode("choose")} className={`lv-btn-ghost ${className}`}>
      switch mode
    </button>
  );
}

export function FreeRoamButton() {
  const setMode = useTown((s) => s.setMode);
  const reason = useTown((s) => s.listReason);
  return (
    <button
      type="button"
      onClick={() => {
        if (reason) useTown.setState({ chosen: true }); // they asked for it: skip the slow-device check
        cityAudio.startFromGesture(); // this click is the gesture: the music starts as the world loads
        useTown.setState({ sound: true, muted: false });
        setMode("town");
      }}
      className="lv-btn"
    >
      {reason ? "enter anyway" : "explore in 3D"} <span aria-hidden="true">→</span>
    </button>
  );
}
