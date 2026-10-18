import { Composition } from "remotion";
import { LogarithmVideo } from "./LogarithmVideo";
import { FPS, TL } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TinhLogarit"
      component={LogarithmVideo}
      durationInFrames={TL.duration}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
