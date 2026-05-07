import React from "react";

export default function BibleLogo({
  className = "w-8 h-8",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
    >
      <defs>
        <linearGradient id="cover-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1f1209" />
          <stop offset="10%" stopColor="#3a2218" />
          <stop offset="100%" stopColor="#25140b" />
        </linearGradient>
        <linearGradient id="cross-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      {/* Book Cover */}
      <rect
        x="80"
        y="48"
        width="352"
        height="416"
        rx="32"
        fill="url(#cover-grad)"
        stroke="#291710"
        strokeWidth="8"
      />

      {/* Cover inner border */}
      <rect
        x="96"
        y="64"
        width="320"
        height="384"
        rx="20"
        fill="none"
        stroke="#3a2218"
        strokeWidth="12"
      />

      {/* Cross */}
      <g style={{ filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.8))" }}>
        <rect
          x="240"
          y="130"
          width="32"
          height="180"
          rx="4"
          fill="url(#cross-grad)"
        />
        <rect
          x="180"
          y="190"
          width="152"
          height="32"
          rx="4"
          fill="url(#cross-grad)"
        />
      </g>

      {/* Title Text */}
      <text
        x="256"
        y="380"
        fontFamily="serif"
        fontWeight="bold"
        fontSize="36"
        fill="#eab308"
        textAnchor="middle"
        letterSpacing="6"
        style={{ filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.8))" }}
      >
        HOLY BIBLE
      </text>
    </svg>
  );
}
