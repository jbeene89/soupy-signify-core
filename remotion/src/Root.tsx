import { Composition } from "remotion";
import { FounderSpot } from "./FounderSpot";

const FPS = 30;
const DURATION = 300; // 10s

export const RemotionRoot = () => (
  <>
    <Composition
      id="spot-square"
      component={FounderSpot}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1080}
    />
    <Composition
      id="spot-vertical"
      component={FounderSpot}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="spot-wide"
      component={FounderSpot}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
