import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { sceneAt } from "./anim";
import { BoardFrame, ErrorsPanel, Summary, Tooltip, VerifyPanel, Zones } from "./Board";
import { Calculator } from "./Calculator";
import { keyCenter } from "./calc";
import { Chips } from "./Chips";
import { loadFonts } from "./fonts";
import { Callouts, EndCard, Intro, Subtitles, TopBar, Turn, TURNS } from "./Overlays";
import { TL } from "./timeline";
import { COLORS } from "./theme";

loadFonts();

const SCENE_NAMES = ["Cảnh 0 · Mở đầu", "Cảnh 1 · log 6,52", "Cảnh 2 · ln 6,52", "Cảnh 3 · log₁₄17", "Cảnh 4 · Kiểm chứng", "Cảnh 5 · Lỗi hay gặp"];
const VOLUME = { click: 0.7, ting: 0.6, beep: 0.6, whoosh: 0.5 };

export const LogarithmVideo: React.FC = () => {
  const f = useCurrentFrame();
  const scene = sceneAt(f);
  const sd = keyCenter("sd");
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.backdrop,
        backgroundImage: "linear-gradient(rgba(60,80,100,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(60,80,100,.07) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        overflow: "hidden",
      }}
    >
      {/* Mốc cảnh trên timeline của Studio */}
      {TL.scenes.map((s, i) => (
        <Sequence key={i} name={SCENE_NAMES[i]} from={s.start} durationInFrames={Math.max(1, s.end - s.start)} layout="none">
          {null}
        </Sequence>
      ))}

      <TopBar f={f} scene={scene} />
      <BoardFrame f={f} />
      {scene >= 1 && scene <= 3 ? <Zones f={f} scene={scene} /> : null}
      {scene === 4 ? <VerifyPanel f={f} /> : null}
      {scene === 5 ? <ErrorsPanel f={f} /> : null}
      {scene === 5 ? <Summary f={f} /> : null}
      <Calculator />
      {scene === 3 ? <Callouts f={f} /> : null}
      {scene === 4 ? <Tooltip f={f} x={sd.x} y={sd.y} /> : null}
      <Chips f={f} scene={scene} />
      <Intro f={f} />
      <Subtitles f={f} />
      {TURNS.map((t) => (
        <Turn key={t.p} f={f} t={t} />
      ))}
      <EndCard f={f} />

      {TL.sfx.map((s, i) => (
        <Audio key={i} from={s.frame} src={staticFile(`sfx/${s.kind}.wav`)} volume={VOLUME[s.kind]} />
      ))}
    </AbsoluteFill>
  );
};
