"use client";

import { useEffect, useState } from "react";

function istClock(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Ticking IST HH:MM:SS for the Calendar now-block. Clock only — promise
 * countdowns are day-grained and computed server-side. */
export default function LiveClock() {
  const [t, setT] = useState(istClock());
  useEffect(() => {
    const id = setInterval(() => setT(istClock()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{t}</span>;
}
