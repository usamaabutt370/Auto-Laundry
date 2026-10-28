import { Image } from "expo-image";

type Props = {
  source: number;
  tall?: boolean;
};

/** Web soft left-arc frame matching the partner CTA mock. */
export function LandingPartnerCurve({ source, tall }: Props) {
  return (
    <div
      className="landing-partner-curve"
      style={{
        width: "100%",
        maxWidth: tall ? 300 : 280,
        height: tall ? 240 : 220,
        overflow: "hidden",
        background: "#FFFFFF",
        alignSelf: "center",
      }}
    >
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        contentPosition="top"
      />
    </div>
  );
}
