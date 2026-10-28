"use client";

import { useEffect } from "react";
import { setCitySection, track } from "@/lib/analytics";
import { TOWERS } from "./interior/floors";
import { useTown } from "./state";

/**
 * City analytics (a no-op wherever GA isn't running, see lib/analytics.ts):
 * `section_view` each time he goes into a building, `experience_view` per
 * Experience Tower floor shown, `project_view` per project picked in the gallery.
 */
export function useCityAnalytics() {
  useEffect(() => {
    let interior: string | null | undefined;
    let floor = -1;
    let item: string | null = null;
    const report = (s: ReturnType<typeof useTown.getState>) => {
      if (s.mode !== "town") return;
      if (s.interior !== interior) {
        interior = s.interior;
        floor = -1;
        item = null;
        setCitySection(interior ?? "outdoors");
        if (interior) track("section_view", { section: interior });
      }
      if (interior === "experience" && s.floor !== floor) {
        floor = s.floor;
        const id = TOWERS.experience.floors[floor]?.id;
        if (id) track("experience_view", { experience_id: id });
      }
      if (interior === "projects" && s.item !== item) {
        item = s.item;
        if (item) track("project_view", { project_slug: item });
      }
    };
    report(useTown.getState());
    return useTown.subscribe(report);
  }, []);
}
