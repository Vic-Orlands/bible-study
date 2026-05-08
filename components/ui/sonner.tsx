"use client";

import * as React from "react";
import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

function LoadingSpinner() {
  return (
    <svg
      aria-hidden="true"
      className="animate-spin"
      fill="none"
      height="18"
      viewBox="0 0 18 18"
      width="18"
    >
      <circle cx="9" cy="9" r="7" stroke="#f1e8df" strokeWidth="2" />
      <path
        d="M9 2a7 7 0 0 1 7 7"
        stroke="#f6823c"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      gap={8}
      icons={{ loading: <LoadingSpinner /> }}
      offset={20}
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[340px] items-start gap-3 border border-[#e5d6c9] border-l-[3px] !border-l-[#f6823c] bg-white px-4 py-3 shadow-[0_18px_44px_rgba(31,18,9,0.12)]",
          title: "text-[13px] font-semibold text-[#25140b]",
          description:
            "mt-0.5 text-[12px] font-medium leading-snug text-[#7a6758]",
          actionButton:
            "cta-button border border-[#e5d6c9] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#3a2218] transition-colors hover:border-[#f6823c] hover:bg-[#fbf7f2]",
          cancelButton:
            "text-[11px] font-medium text-[#7a6758] transition-colors hover:text-[#3a2218]",
          closeButton:
            "text-[#7a6758] transition-colors hover:text-[#3a2218]",
          success:
            "border-l-[3px] !border-l-[#2e6b3d] [&_[data-icon]]:text-[#2e6b3d]",
          info: "border-l-[3px] !border-l-[#f6823c] [&_[data-icon]]:text-[#f6823c]",
          error:
            "border-l-[3px] !border-l-[#b42318] [&_[data-icon]]:text-[#b42318]",
          loading:
            "border-l-[3px] !border-l-[#f6823c] [&_[data-icon]]:text-[#f6823c]",
        },
      }}
      visibleToasts={5}
      {...props}
    />
  );
}
