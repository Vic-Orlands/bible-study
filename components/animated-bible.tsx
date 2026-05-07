"use client";

import React, { useEffect, useState } from "react";

const PAGE_COUNT = 30; // 30 animated pages makes it look like a real book
const TOTAL_TIME = 16; // Complete animation cycle time in seconds

export default function AnimatedBible() {
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for client-side mounting if desired,
  // but static CSS strings work great if properly structured.
  useEffect(() => setMounted(true), []);

  // Create dynamically generated keyframes for each page to orchestrate flawless opening/closing
  const styles = Array.from({ length: PAGE_COUNT + 1 })
    .map((_, i) => {
      const j = i; // j=0 is front cover, j=1..PAGE_COUNT are pages
      const isCover = j === 0;

      // Z-Index ordering (right stack starts large, left stack ends large)
      const startZ = isCover ? PAGE_COUNT + 1 : PAGE_COUNT - j + 1;
      const endZ = isCover ? -0.5 : j;

      // Staggering the flip:
      // Start opening after 2.5s (to allow tilt animation)
      const delayIn = isCover ? 2.5 : 2.5 + j * (4.0 / PAGE_COUNT);
      const duration = 2.0;
      const delayOut = isCover
        ? 13.0
        : 9.0 + (PAGE_COUNT - j) * (4.0 / PAGE_COUNT);

      const openStart = delayIn;
      const openEnd = delayIn + duration;
      const closeStart = delayOut;
      const closeEnd = delayOut + duration;

      const p = (t: number) => ((t / TOTAL_TIME) * 100).toFixed(2);

      // Using `-endZ` ensures it places precisely on the global Z-axis when rotated 180 degrees.
      return `
        ${
          isCover
            ? `
        @keyframes tilt-stand {
          0% {
            transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(30deg) rotateY(-20deg) rotateZ(-10deg);
          }
        }
        .book-stand {
          transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          animation: tilt-stand 1.5s ease-in-out forwards;
          animation-delay: 1s;
        }
        `
            : ""
        }
        @keyframes flap-${j} {
          0%, ${p(openStart)}% {
            transform: rotateY(0deg) translateZ(${startZ}px);
          }
          ${p(openEnd)}%, ${p(closeStart)}% {
            transform: rotateY(-180deg) translateZ(${-endZ}px);
          }
          ${p(closeEnd)}%, 100% {
            transform: rotateY(0deg) translateZ(${startZ}px);
          }
        }
        .bible-item-${j} {
          animation: flap-${j} ${TOTAL_TIME}s infinite ease-in-out;
          transform-style: preserve-3d;
        }
      `;
    })
    .join("\n");

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <style>{styles}</style>
      {/* 
        Perspective must be applied to the topmost wrapper.
        The wrapper has 'preserve-3d' to allow inner items to maintain their 3D depth relative to this perspective.
      */}
      <div
        className="relative"
        style={{
          perspective: "2500px",
          transformStyle: "preserve-3d",
        }}
      >
        {/*
          The Book Stand (Slanted container)
          We rotate it so it looks like it's resting on a reading stand.
        */}
        <div
          className="relative w-[280px] sm:w-[320px] h-[400px] sm:h-[460px] book-stand"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {/* Shadow dropped onto the imaginary stand */}
          <div
            className="absolute -inset-4 bg-black/40 blur-2xl rounded-[30px]"
            style={{ transform: "translateZ(-20px)" }}
          />

          {/* Back Cover (Static, below everything) */}
          <div
            className="absolute left-[-10px] top-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] rounded-r-2xl border-l-[15px] border-l-[#1f1209]"
            style={{
              background:
                "linear-gradient(to right, #1f1209 0%, #3a2218 10%, #1f1209 100%)",
              transform: "translateZ(-1px)",
              transformStyle: "preserve-3d",
              boxShadow: "10px 10px 20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Inside backing paper of back cover */}
            <div className="absolute inset-1.5 ml-3 border border-[#3a2218] bg-[#ebd5b3] opacity-90 rounded-r-xl" />
          </div>

          {/* Solid Spine */}
          {/* The spine covers the gap between the Front Cover (Z=31) and Back Cover (Z=-1), meaning it is ~32px deep */}
          <div
            className="absolute left-[-10px] top-[-10px] h-[calc(100%+20px)] w-[32px] rounded-l origin-left overflow-hidden flex flex-col justify-between py-6"
            style={{
              background:
                "linear-gradient(to right, #1f1209 0%, #3a2218 50%, #1f1209 100%)",
              transform: "rotateY(-90deg) translateX(-32px)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Ridges on the spine */}
            <div className="w-full h-[4px] bg-black/60 shadow-[0_1px_2px_rgba(255,255,255,0.1)]"></div>
            <div className="mx-auto w-[60%] text-[#d4af37] text-[10px] font-serif text-center font-bold tracking-widest leading-tight origin-center rotate-90 mt-12 opacity-80">
              HOLY BIBLE
            </div>
            <div className="w-full h-[4px] bg-black/60 shadow-[0_1px_2px_rgba(255,255,255,0.1)] mt-auto mb-10"></div>
            <div className="w-full h-[4px] bg-black/60 shadow-[0_1px_2px_rgba(255,255,255,0.1)]"></div>
            <div className="w-full h-[4px] bg-black/60 shadow-[0_1px_2px_rgba(255,255,255,0.1)] mt-10"></div>
          </div>

          {/* Bookmarking Ribbon */}
          {/* Hangs loosely from inside the spine at the back */}
          <div
            className="absolute top-[-15px] left-10 w-4 h-[105%] bg-red-800 origin-top shadow-lg z-[-1]"
            style={{
              transform: "translateZ(-0.5px) rotateZ(3deg)",
              background:
                "linear-gradient(to right, #7f1d1d, #991b1b, #7f1d1d)",
            }}
          />

          {/* 
            Animated Pages 
            We map over PAGE_COUNT and create separate fully animated divs.
          */}
          {Array.from({ length: PAGE_COUNT }).map((_, i) => {
            const j = i + 1; // 1 to PAGE_COUNT
            const isMidPage = j === Math.floor(PAGE_COUNT / 2);

            return (
              <div
                key={j}
                className={`bible-item-${j} absolute left-0 top-0 w-full h-full origin-left bg-[#fcf6eb] flex items-center justify-center`}
                style={{
                  borderRight: "1px solid #d4af37", // Gold page edge highlight
                  borderTop: "0.5px solid #d4af37",
                  borderBottom: "0.5px solid #d4af37",
                  borderRadius: "0 8px 8px 0",
                  // Very subtle inner shadow adds volume to the page
                  boxShadow: "inset -5px 0 10px rgba(0,0,0,0.05)",
                }}
              >
                {/* Front Face (faces right right when closed) */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#eadecc] to-[#fcf6eb] bg-[#fcf6eb] overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    borderRadius: "0 8px 8px 0",
                  }}
                >
                  <PageContent side="right" />

                  {/* Subtle red ribbon hanging within a specific page */}
                  {isMidPage && (
                    <div
                      className="absolute top-0 left-8 w-5 h-full bg-red-800 shadow-md origin-top translate-y-[20%] rotate-[-2deg]"
                      style={{
                        background:
                          "linear-gradient(to right, #7f1d1d, #b91c1c, #7f1d1d)",
                      }}
                    >
                      {/* Golden tassel */}
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-b from-yellow-600 to-yellow-400"></div>
                    </div>
                  )}
                </div>

                {/* Back Face (faces left when flipped open) */}
                <div
                  className="absolute inset-0 bg-gradient-to-l from-[#eadecc] to-[#fcf6eb] bg-[#fcf6eb] overflow-hidden"
                  style={{
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                    borderRadius: "8px 0 0 8px", // Reversing the border radii for the flipped side
                  }}
                >
                  <PageContent side="left" />
                </div>
              </div>
            );
          })}

          {/* Front Cover (Animated) */}
          <div
            className={`bible-item-0 absolute left-[-10px] top-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] origin-left rounded-r-2xl border-r border-t border-b border-[#291710]`}
            style={{
              background:
                "linear-gradient(to right, #1f1209 0%, #3a2218 10%, #25140b 100%)",
            }}
          >
            {/* Front of the Cover */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: "hidden",
                borderRadius: "0 16px 16px 0",
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center pb-8 border-[6px] border-[#3a2218] rounded-r-2xl">
                {/* Gold Cross */}
                <div className="relative mt-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  <div className="bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 w-2.5 h-[120px] rounded-sm" />
                  <div className="absolute top-[35px] left-1/2 -translate-x-1/2 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 w-[70px] h-2.5 rounded-sm" />
                </div>
                {/* Text Title */}
                <div className="mt-14 text-yellow-500 font-serif font-bold tracking-[0.2em] text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  HOLY BIBLE
                </div>
              </div>
              {/* Highlight to simulate glossy leather */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 rounded-r-2xl pointer-events-none" />
            </div>

            {/* Back (Inside) of the Front Cover */}
            <div
              className="absolute inset-0 bg-[#291710]"
              style={{
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                borderRadius: "16px 0 0 16px",
              }}
            >
              {/* Inside paper backing */}
              <div className="absolute inset-1.5 mr-3 border border-[#1f1209] bg-[#ebd5b3] opacity-90 rounded-l-xl shadow-inner" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component to render the text lines and columns on the pages
function PageContent({ side }: { side: "left" | "right" }) {
  // We use repeating linear gradients to quickly and easily render "text"
  // without bogging down the browser's paint performance with thousands of span tags.
  const textPattern = {
    backgroundImage:
      "repeating-linear-gradient(to bottom, transparent, transparent 11px, #827e75 11px, #827e75 12px)",
    backgroundSize: "100% 16px",
  };

  return (
    <div
      className={`absolute top-10 bottom-12 ${side === "right" ? "left-10 right-6" : "left-6 right-10"} flex gap-6 opacity-30`}
    >
      <div className="flex-1 border-r border-[#d4cfc5]/50 pr-4">
        {/* Paragraph 1 */}
        <div className="w-full h-[30%]" style={textPattern} />
        {/* Paragraph 2 */}
        <div className="w-full h-[40%] mt-4" style={textPattern} />
        {/* Paragraph 3 */}
        <div className="w-[80%] h-[20%] mt-4" style={textPattern} />
      </div>
      <div className="flex-1">
        {/* Paragraph 4 */}
        <div className="w-full h-[50%]" style={textPattern} />
        {/* Paragraph 5 */}
        <div className="w-[90%] h-[40%] mt-4" style={textPattern} />
      </div>
      {/* Page Numbers */}
      <div
        className={`absolute bottom-[-30px] ${side === "right" ? "right-0" : "left-0"} text-[8px] font-serif text-[#6c6553]`}
      >
        {side === "right" ? "1,241" : "1,240"}
      </div>
    </div>
  );
}
