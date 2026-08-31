import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #22a355 0%, #146c33 100%)",
          borderRadius: 40,
        }}
      >
        <svg width="110" height="110" viewBox="0 0 512 512">
          <g transform="translate(256,300)">
            <path d="M -8,-30 A 78,78 0 0 1 -96,-96 A 78,78 0 0 1 -8,-30 Z" fill="#ffffff" />
            <path d="M 6,-46 A 66,66 0 0 1 92,-104 A 66,66 0 0 1 6,-46 Z" fill="#d9f2c4" />
            <path
              d="M -2,-20 C -2,20 2,55 2,80"
              stroke="#ffffff"
              strokeWidth="18"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="2" cy="104" r="24" fill="#ffd23f" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}
