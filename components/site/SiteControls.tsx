"use client";

import { useTown } from "@/components/town/state";
import { cityAudio } from "@/components/town/audio/engine";

/**
 * The normal website's client bits: the fallback notice (reduced motion /
 * no WebGL / a slow device) with "enter anyway", and "switch mode" (back to
 * the chooser). The 3D city bundle is only fetched once free roam is chosen.
 */
export function FallbackNotice() {
  const reason = useTown((s) => s.listReason);
  const mode = useTown((s) => s.mode);
  const setMode = useTown((s) => s.setMode);
  if (!reason || mode !== "list") return null;
  return (
    <p role="status" className="sv-notice">
      Showing the normal website because {reason}.{" "}
      <button
        type="button"
        className="sv-link-btn"
        onClick={() => {
          useTown.setState({ chosen: true }); // they asked for it: skip the slow-device check
          cityAudio.startFromGesture(); // this click is the gesture: the music starts as the world loads
          useTown.setState({ sound: true, muted: false });
          setMode("town");
        }}
      >
        enter anyway <span aria-hidden="true">→</span>
      </button>
    </p>
  );
}

export function SwitchModeButton() {
  const setMode = useTown((s) => s.setMode);
  return (
    <button type="button" onClick={() => setMode("choose")} className="sv-switch">
      switch mode
    </button>
  );
}
