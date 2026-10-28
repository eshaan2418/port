"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/** GA4, where it's allowed without consent (see lib/analytics.ts). Renders nothing. */
export function Analytics() {
  useEffect(() => {
    void initAnalytics();
  }, []);
  return null;
}
