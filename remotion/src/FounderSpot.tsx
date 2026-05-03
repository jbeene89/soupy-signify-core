import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: serif } = loadFraunces("normal", {
  weights: ["400", "600", "900"],
});
const { fontFamily: mono } = loadMono("normal", { weights: ["400", "500"] });

const CREAM = "#f5f1e8";
const BG = "#0a0a0a";
const CYAN = "#4cd4d4";
const RED = "#e63946";
const RULE = "#2a2a2a";

// scene durations (sum = 300)
const S1 = 60;   // 0-2s    "I'm one guy. In Florida."
const S2 = 90;   // 2-5s    "I pay for every coding tool"
const S3 = 90;   // 5-8s    "Then I make them fight."
const S4 = 60;   // 8-10s   logo / url

export const FounderSpot: React.FC = () => {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 100; // responsive unit

  return (
    <AbsoluteFill style={{ backgroundColor: BG, color: CREAM, overflow: "hidden" }}>
      <Grain u={u} />
      <ScanRule u={u} width={width} />
      <CornerMarks u={u} width={width} height={height} />

      <Sequence durationInFrames={S1}>
        <SceneOne u={u} />
      </Sequence>
      <Sequence from={S1} durationInFrames={S2}>
        <SceneTwo u={u} />
      </Sequence>
      <Sequence from={S1 + S2} durationInFrames={S3}>
        <SceneThree u={u} />
      </Sequence>
      <Sequence from={S1 + S2 + S3} durationInFrames={S4}>
        <SceneFour u={u} />
      </Sequence>

      <TopChrome u={u} />
    </AbsoluteFill>
  );
};

/* ---------- chrome ---------- */

const TopChrome: React.FC<{ u: number }> = ({ u }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: u * 4,
        left: u * 4,
        right: u * 4,
        display: "flex",
        justifyContent: "space-between",
        fontFamily: mono,
        fontSize: u * 1.4,
        color: CREAM,
        opacity: o * 0.7,
        letterSpacing: u * 0.08,
        textTransform: "uppercase",
      }}
    >
      <span>SOUPY · TRANSMISSION 001</span>
      <span style={{ color: CYAN }}>● LIVE</span>
    </div>
  );
};

const ScanRule: React.FC<{ u: number; width: number }> = ({ u, width }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 300], [-width, width]);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "50%",
        height: 1,
        background: RULE,
        opacity: 0.4,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -u * 0.15,
          left: x,
          width: u * 12,
          height: u * 0.3,
          background: CYAN,
          filter: `blur(${u * 0.2}px)`,
        }}
      />
    </div>
  );
};

const CornerMarks: React.FC<{ u: number; width: number; height: number }> = ({ u }) => {
  const c: React.CSSProperties = {
    position: "absolute",
    width: u * 2.5,
    height: u * 2.5,
    borderColor: CREAM,
    opacity: 0.5,
  };
  const m = u * 4;
  return (
    <>
      <div style={{ ...c, top: m, left: m, borderTop: "1px solid", borderLeft: "1px solid" }} />
      <div style={{ ...c, top: m, right: m, borderTop: "1px solid", borderRight: "1px solid" }} />
      <div style={{ ...c, bottom: m, left: m, borderBottom: "1px solid", borderLeft: "1px solid" }} />
      <div style={{ ...c, bottom: m, right: m, borderBottom: "1px solid", borderRight: "1px solid" }} />
    </>
  );
};

const Grain: React.FC<{ u: number }> = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.06,
        mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        transform: `translate(${(frame % 7) - 3}px, ${(frame % 5) - 2}px)`,
      }}
    />
  );
};

/* ---------- scenes ---------- */

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "8%" }}>
    {children}
  </AbsoluteFill>
);

const SceneOne: React.FC<{ u: number }> = ({ u }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const b = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 120 } });
  return (
    <Center>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: mono,
            fontSize: u * 1.6,
            color: CYAN,
            letterSpacing: u * 0.15,
            opacity: a,
            transform: `translateY(${(1 - a) * u * 1.5}px)`,
            marginBottom: u * 3,
          }}
        >
          § 01 · WHO
        </div>
        <div
          style={{
            fontFamily: serif,
            fontWeight: 900,
            fontSize: u * 9,
            lineHeight: 0.95,
            opacity: a,
            transform: `translateY(${(1 - a) * u * 2}px)`,
            letterSpacing: -u * 0.15,
          }}
        >
          One guy.
        </div>
        <div
          style={{
            fontFamily: serif,
            fontStyle: "italic",
            fontSize: u * 4.5,
            color: CREAM,
            opacity: b * 0.85,
            transform: `translateY(${(1 - b) * u * 1.5}px)`,
            marginTop: u * 2,
          }}
        >
          In Florida.
        </div>
      </div>
    </Center>
  );
};

const SceneTwo: React.FC<{ u: number }> = ({ u }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 20, stiffness: 140 } });
  const tools = ["Claude", "GPT-5", "Gemini", "Cursor", "Lovable", "Codex"];
  return (
    <Center>
      <div style={{ textAlign: "center", maxWidth: "90%" }}>
        <div
          style={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: u * 6,
            lineHeight: 1.05,
            letterSpacing: -u * 0.08,
            opacity: a,
            transform: `translateY(${(1 - a) * u * 2}px)`,
          }}
        >
          I pay for <span style={{ color: CYAN }}>every</span> coding tool
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: u * 1.2,
            marginTop: u * 4,
          }}
        >
          {tools.map((t, i) => {
            const tA = spring({
              frame: frame - 18 - i * 4,
              fps,
              config: { damping: 14, stiffness: 180 },
            });
            return (
              <div
                key={t}
                style={{
                  fontFamily: mono,
                  fontSize: u * 1.6,
                  padding: `${u * 0.6}px ${u * 1.2}px`,
                  border: `1px solid ${RULE}`,
                  color: CREAM,
                  opacity: tA,
                  transform: `translateY(${(1 - tA) * u}px)`,
                  letterSpacing: u * 0.05,
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: u * 1.4,
            color: CREAM,
            opacity: interpolate(frame, [60, 75], [0, 0.6], { extrapolateRight: "clamp" }),
            marginTop: u * 3,
            letterSpacing: u * 0.1,
            textTransform: "uppercase",
          }}
        >
          so you don't have to
        </div>
      </div>
    </Center>
  );
};

const SceneThree: React.FC<{ u: number }> = ({ u }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 16, stiffness: 130 } });
  const flash = interpolate(frame, [40, 44, 48], [0, 0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shake = Math.sin(frame * 0.8) * (frame > 40 && frame < 55 ? u * 0.3 : 0);
  return (
    <Center>
      <div
        style={{
          textAlign: "center",
          transform: `translateX(${shake}px)`,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: u * 1.6,
            color: RED,
            letterSpacing: u * 0.15,
            opacity: a,
            marginBottom: u * 3,
          }}
        >
          § 02 · METHOD
        </div>
        <div
          style={{
            fontFamily: serif,
            fontWeight: 900,
            fontSize: u * 8.5,
            lineHeight: 0.95,
            opacity: a,
            transform: `translateY(${(1 - a) * u * 2}px)`,
            letterSpacing: -u * 0.15,
          }}
        >
          Then I make them
        </div>
        <div
          style={{
            fontFamily: serif,
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: u * 12,
            color: RED,
            lineHeight: 1,
            marginTop: u * 1.5,
            opacity: interpolate(frame, [20, 38], [0, 1], { extrapolateRight: "clamp" }),
            transform: `scale(${interpolate(frame, [20, 38], [0.85, 1], {
              extrapolateRight: "clamp",
            })})`,
          }}
        >
          fight.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: CREAM,
          opacity: flash,
          pointerEvents: "none",
        }}
      />
    </Center>
  );
};

const SceneFour: React.FC<{ u: number }> = ({ u }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const b = spring({ frame: frame - 12, fps, config: { damping: 22, stiffness: 140 } });
  return (
    <Center>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: serif,
            fontWeight: 900,
            fontSize: u * 10,
            letterSpacing: -u * 0.2,
            opacity: a,
            transform: `translateY(${(1 - a) * u * 1.5}px)`,
            lineHeight: 1,
          }}
        >
          soupy<span style={{ color: CYAN }}>.</span>
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: u * 1.8,
            color: CREAM,
            opacity: b * 0.85,
            letterSpacing: u * 0.2,
            marginTop: u * 3,
            textTransform: "uppercase",
          }}
        >
          soupytogether.com
        </div>
        <div
          style={{
            width: u * 8,
            height: 1,
            background: CYAN,
            margin: `${u * 3}px auto 0`,
            opacity: b,
          }}
        />
        <div
          style={{
            fontFamily: mono,
            fontSize: u * 1.2,
            color: CREAM,
            opacity: b * 0.5,
            marginTop: u * 2,
            letterSpacing: u * 0.1,
          }}
        >
          receipts &gt; vibes
        </div>
      </div>
    </Center>
  );
};
