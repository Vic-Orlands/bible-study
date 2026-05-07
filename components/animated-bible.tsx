"use client";

import React, { useEffect, useState } from "react";

const PAGE_COUNT = 30;
const TOTAL_TIME = 16;

export default function AnimatedBible({
  holdOpen = false,
}: {
  holdOpen?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const styles = Array.from({ length: PAGE_COUNT + 1 })
    .map((_, i) => {
      const j = i;
      const isCover = j === 0;

      const startZ = isCover ? PAGE_COUNT + 1 : PAGE_COUNT - j + 1;
      const endZ = isCover ? -0.5 : j;

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

      return `
        ${
          isCover
            ? `
        @keyframes tilt-stand {
          0% {
            transform: translateX(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          100% {
            transform: translateX(12%) rotateX(30deg) rotateY(-20deg) rotateZ(-10deg);
          }
        }
        .book-stand {
          transform: translateX(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          animation: tilt-stand 1.5s ease-in-out forwards;
          animation-delay: 1s;
          transform-origin: 50% 50%;
        }
        `
            : ""
        }
        ${
          holdOpen
            ? `
        @keyframes flap-${j} {
          0%, ${p(openStart)}% {
            transform: rotateY(0deg) translateZ(${startZ}px);
          }
          ${p(openEnd)}%, 100% {
            transform: rotateY(-180deg) translateZ(${-endZ}px);
          }
        }
        `
            : `
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
        `
        }
        .bible-item-${j} {
          animation: flap-${j} ${TOTAL_TIME}s ${holdOpen ? "1" : "infinite"} ease-in-out forwards;
          transform-style: preserve-3d;
        }
      `;
    })
    .join("\n");

  if (!mounted) return null;

  return (
    <div className="relative flex h-full min-h-[100svh] w-full items-center justify-center overflow-hidden bg-[#1f1f1f]">
      <style>{styles}</style>
      <div
        className="relative flex items-center justify-center"
        style={{
          perspective: "2500px",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="book-stand relative h-[min(290px,46svh)] w-[min(202px,31svw)] min-w-[145px]"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="absolute -inset-4 bg-black/40 blur-2xl rounded-[30px]"
            style={{ transform: "translateZ(-20px)" }}
          />

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
            <div className="absolute inset-1.5 ml-3 border border-[#3a2218] bg-[#ebd5b3] opacity-90 rounded-r-xl" />
          </div>

          <div
            className="absolute left-[-10px] top-[-10px] h-[calc(100%+20px)] w-[32px] rounded-l origin-left overflow-hidden flex flex-col justify-between py-6"
            style={{
              background:
                "linear-gradient(to right, #1f1209 0%, #3a2218 50%, #1f1209 100%)",
              transform: "rotateY(-90deg) translateX(-32px)",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="w-full h-[4px] bg-black/60 shadow-[0_1px_2px_rgba(255,255,255,0.1)]"></div>
            <div className="mx-auto w-[60%] text-[#d4af37] text-[10px] font-serif text-center font-bold tracking-widest leading-tight origin-center rotate-90 mt-12 opacity-80">
              HOLY BIBLE
            </div>
            <div className="w-full h-[4px] bg-black/60 shadow-[0_1px_2px_rgba(255,255,255,0.1)] mt-auto mb-10"></div>
            <div className="w-full h-[4px] bg-black/60 shadow-[0_1px_2px_rgba(255,255,255,0.1)]"></div>
            <div className="w-full h-[4px] bg-black/60 shadow-[0_1px_2px_rgba(255,255,255,0.1)] mt-10"></div>
          </div>

          <div
            className="absolute top-[-15px] left-10 w-4 h-[105%] bg-red-800 origin-top shadow-lg z-[-1]"
            style={{
              transform: "translateZ(-0.5px) rotateZ(3deg)",
              background:
                "linear-gradient(to right, #7f1d1d, #991b1b, #7f1d1d)",
            }}
          />

          {Array.from({ length: PAGE_COUNT }).map((_, i) => {
            const j = i + 1;
            const isMidPage = j === Math.floor(PAGE_COUNT / 2);

            return (
              <div
                key={j}
                className={`bible-item-${j} absolute left-0 top-0 w-full h-full origin-left bg-[#fcf6eb] flex items-center justify-center`}
                style={{
                  borderRight: "1px solid #d4af37",
                  borderTop: "0.5px solid #d4af37",
                  borderBottom: "0.5px solid #d4af37",
                  borderRadius: "0 8px 8px 0",
                  boxShadow: "inset -5px 0 10px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#eadecc] to-[#fcf6eb] bg-[#fcf6eb] overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    borderRadius: "0 8px 8px 0",
                  }}
                >
                  <PageContent side="right" />

                  {isMidPage && (
                    <div
                      className="absolute top-0 left-8 w-5 h-full bg-red-800 shadow-md origin-top translate-y-[20%] rotate-[-2deg]"
                      style={{
                        background:
                          "linear-gradient(to right, #7f1d1d, #b91c1c, #7f1d1d)",
                      }}
                    >
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-b from-yellow-600 to-yellow-400"></div>
                    </div>
                  )}
                </div>

                <div
                  className="absolute inset-0 bg-gradient-to-l from-[#eadecc] to-[#fcf6eb] bg-[#fcf6eb] overflow-hidden"
                  style={{
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                    borderRadius: "8px 0 0 8px",
                  }}
                >
                  <PageContent side="left" />
                </div>
              </div>
            );
          })}

          <div
            className={`bible-item-0 absolute left-[-10px] top-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] origin-left rounded-r-2xl border-r border-t border-b border-[#291710]`}
            style={{
              background:
                "linear-gradient(to right, #1f1209 0%, #3a2218 10%, #25140b 100%)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: "hidden",
                borderRadius: "0 16px 16px 0",
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center pb-8 border-[6px] border-[#3a2218] rounded-r-2xl">
                <div className="relative mt-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  <div className="bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 w-2.5 h-[120px] rounded-sm" />
                  <div className="absolute top-[35px] left-1/2 -translate-x-1/2 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 w-[70px] h-2.5 rounded-sm" />
                </div>
                <div className="mt-14 text-yellow-500 font-serif font-bold tracking-[0.2em] text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  HOLY BIBLE
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 rounded-r-2xl pointer-events-none" />
            </div>

            <div
              className="absolute inset-0 bg-[#291710]"
              style={{
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                borderRadius: "16px 0 0 16px",
              }}
            >
              <div className="absolute inset-1.5 mr-3 border border-[#1f1209] bg-[#ebd5b3] opacity-90 rounded-l-xl shadow-inner" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageContent({ side }: { side: "left" | "right" }) {
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
        <div className="w-full h-[30%]" style={textPattern} />
        <div className="w-full h-[40%] mt-4" style={textPattern} />
        <div className="w-[80%] h-[20%] mt-4" style={textPattern} />
      </div>
      <div className="flex-1">
        <div className="w-full h-[50%]" style={textPattern} />
        <div className="w-[90%] h-[40%] mt-4" style={textPattern} />
      </div>
      <div
        className={`absolute bottom-[-30px] ${side === "right" ? "right-0" : "left-0"} text-[8px] font-serif text-[#6c6553]`}
      >
        {side === "right" ? "1,241" : "1,240"}
      </div>
    </div>
  );
}
