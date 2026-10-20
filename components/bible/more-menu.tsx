"use client";

import Link from "next/link";
import { useAppearance } from "@/components/appearance-provider";

export function MoreMenu({ onClose }: { onClose: () => void }) {
  const appearance = useAppearance();
  const go = (name: string) => {
    window.dispatchEvent(new Event(name));
    onClose();
  };
  return (
    <div className="more">
      <Link href="/reading-plan" onClick={onClose}>
        Today
      </Link>
      <Link href="/notes" onClick={onClose}>
        Notes
      </Link>
      <Link href="/groups" onClick={onClose}>
        Groups
      </Link>
      <button
        onClick={() => {
          appearance.setDirection(appearance.direction === "canon" ? "thread" : "canon");
          onClose();
        }}
        type="button"
      >
        {appearance.direction === "canon" ? "Thread" : "Canon"}
      </button>
      <button
        onClick={() => {
          appearance.setScheme(appearance.scheme === "light" ? "dark" : "light");
          onClose();
        }}
        type="button"
      >
        {appearance.scheme === "light" ? "Dark" : "Light"}
      </button>
      <button onClick={() => go("bible-search")} type="button">
        Search
      </button>
      <button onClick={() => go("bible-settings")} type="button">
        Settings
      </button>
    </div>
  );
}
