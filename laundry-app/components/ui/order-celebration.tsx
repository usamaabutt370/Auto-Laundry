import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ParticleKind = "dot" | "star" | "ribbon" | "spark" | "diamond";

type Particle = {
  id: string;
  kind: ParticleKind;
  color: string;
  size: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rotate: number;
  delay: number;
  duration: number;
  loop?: boolean;
};

const COLORS = [
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F97316",
  "#06B6D4",
  "#EF4444",
  "#A855F7",
  "#22D3EE",
];

function polar(angleDeg: number, distance: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * distance, y: Math.sin(rad) * distance };
}

function buildBurst(): Particle[] {
  const particles: Particle[] = [];
  let id = 0;

  // Wide ribbon streamers
  for (let i = 0; i < 12; i++) {
    const angle = -165 + i * 30;
    const dist = 150 + (i % 3) * 35;
    const p = polar(angle, dist);
    particles.push({
      id: `r${id++}`,
      kind: "ribbon",
      color: COLORS[i % COLORS.length],
      size: 48 + (i % 4) * 8,
      startX: 0,
      startY: 0,
      endX: p.x,
      endY: p.y * 0.85,
      rotate: angle,
      delay: i * 35,
      duration: 2400 + (i % 4) * 200,
    });
  }

  // Big stars shooting far out
  for (let i = 0; i < 14; i++) {
    const angle = -150 + i * (300 / 13);
    const dist = 130 + (i % 5) * 28;
    const p = polar(angle, dist);
    particles.push({
      id: `s${id++}`,
      kind: "star",
      color: COLORS[(i + 2) % COLORS.length],
      size: 16 + (i % 4) * 4,
      startX: 0,
      startY: 0,
      endX: p.x,
      endY: p.y,
      rotate: (i % 2 === 0 ? 1 : -1) * (20 + i * 8),
      delay: 40 + i * 40,
      duration: 2000 + (i % 3) * 250,
    });
  }

  // Confetti dots
  for (let i = 0; i < 18; i++) {
    const angle = i * 20;
    const dist = 100 + (i % 6) * 22;
    const p = polar(angle, dist);
    particles.push({
      id: `d${id++}`,
      kind: "dot",
      color: COLORS[i % COLORS.length],
      size: 5 + (i % 4),
      startX: 0,
      startY: 0,
      endX: p.x,
      endY: p.y,
      rotate: 0,
      delay: i * 28,
      duration: 1700 + (i % 5) * 180,
    });
  }

  // Cross sparkles (extraordinary glitter)
  for (let i = 0; i < 10; i++) {
    const angle = -120 + i * 28;
    const dist = 90 + (i % 4) * 30;
    const p = polar(angle, dist);
    particles.push({
      id: `sp${id++}`,
      kind: "spark",
      color: COLORS[(i + 4) % COLORS.length],
      size: 18 + (i % 3) * 4,
      startX: 0,
      startY: 0,
      endX: p.x,
      endY: p.y,
      rotate: i * 18,
      delay: 60 + i * 45,
      duration: 1900,
    });
  }

  // Diamonds
  for (let i = 0; i < 8; i++) {
    const angle = -135 + i * 40;
    const dist = 115 + (i % 3) * 40;
    const p = polar(angle, dist);
    particles.push({
      id: `dm${id++}`,
      kind: "diamond",
      color: COLORS[(i + 1) % COLORS.length],
      size: 10 + (i % 3) * 3,
      startX: 0,
      startY: 0,
      endX: p.x,
      endY: p.y,
      rotate: 45,
      delay: 80 + i * 50,
      duration: 2100,
    });
  }

  // Second delayed firework wave
  for (let i = 0; i < 10; i++) {
    const angle = i * 36;
    const dist = 160 + (i % 2) * 30;
    const p = polar(angle, dist);
    particles.push({
      id: `fw${id++}`,
      kind: i % 2 === 0 ? "star" : "spark",
      color: COLORS[(i + 3) % COLORS.length],
      size: 14 + (i % 3) * 3,
      startX: 0,
      startY: -8,
      endX: p.x * 0.9,
      endY: p.y * 0.9 - 20,
      rotate: i * 12,
      delay: 700 + i * 40,
      duration: 1800,
    });
  }

  // Lingering orbit sparkles
  const linger = [
    { x: -78, y: -62 },
    { x: 82, y: -58 },
    { x: -96, y: 12 },
    { x: 98, y: 16 },
    { x: -42, y: 72 },
    { x: 44, y: 70 },
    { x: -110, y: -20 },
    { x: 112, y: -18 },
  ];
  linger.forEach((pos, i) => {
    particles.push({
      id: `ls${id++}`,
      kind: i % 2 === 0 ? "star" : "spark",
      color: COLORS[i % COLORS.length],
      size: 10 + (i % 3) * 2,
      startX: pos.x,
      startY: pos.y,
      endX: pos.x + (i % 2 === 0 ? -8 : 8),
      endY: pos.y - 10,
      rotate: 0,
      delay: 1100 + i * 120,
      duration: 1600,
      loop: true,
    });
  });

  return particles;
}

const PARTICLES = buildBurst();

function RibbonShape({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 60 36">
      <Path
        d="M3 18 C12 2, 20 34, 30 16 C40 0, 48 32, 57 14"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.95}
      />
      <Path
        d="M6 22 C14 8, 22 30, 32 18"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
        opacity={0.45}
      />
    </Svg>
  );
}

function SparkShape({ color, size }: { color: string; size: number }) {
  const half = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path
        d={`M${half} 1 L${half + 1.4} ${half - 1.4} L${size - 1} ${half} L${half + 1.4} ${half + 1.4} L${half} ${size - 1} L${half - 1.4} ${half + 1.4} L1 ${half} L${half - 1.4} ${half - 1.4} Z`}
        fill={color}
      />
    </Svg>
  );
}

function CelebrationParticle({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    if (particle.loop) {
      progress.value = withDelay(
        particle.delay,
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: particle.duration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(0, {
              duration: particle.duration,
              easing: Easing.inOut(Easing.sin),
            }),
          ),
          -1,
          false,
        ),
      );
    } else {
      progress.value = withDelay(
        particle.delay,
        withTiming(1, {
          duration: particle.duration,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
    sparkle.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.25, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(sparkle);
    };
  }, [particle.delay, particle.duration, particle.loop, progress, sparkle]);

  const style = useAnimatedStyle(() => {
    "worklet";
    const t = progress.value;
    const driftY =
      Math.sin(t * Math.PI * 2.4) * (particle.kind === "ribbon" ? 18 : 10);
    const scale =
      particle.kind === "star" || particle.kind === "spark"
        ? interpolate(t, [0, 0.12, 0.55, 1], [0.15, 1.35, 1.05, particle.loop ? 0.95 : 0.4]) *
          (0.7 + sparkle.value * 0.55)
        : particle.kind === "ribbon"
          ? interpolate(t, [0, 0.18, 0.7, 1], [0.25, 1.2, 1.05, 0.75])
          : interpolate(t, [0, 0.15, 0.7, 1], [0.15, 1.25, 1, particle.loop ? 0.9 : 0.45]) *
            (0.75 + sparkle.value * 0.4);

    const opacity = particle.loop
      ? interpolate(t, [0, 0.3, 0.7, 1], [0.1, 1, 1, 0.15]) * (0.55 + sparkle.value * 0.45)
      : particle.kind === "star" || particle.kind === "spark"
        ? interpolate(t, [0, 0.08, 0.55, 1], [0, 1, 0.95, 0]) * (0.5 + sparkle.value * 0.5)
        : interpolate(t, [0, 0.1, 0.65, 1], [0, 1, 0.9, 0.05]);

    const spin =
      particle.rotate +
      (particle.kind === "ribbon"
        ? t * 340
        : particle.kind === "star" || particle.kind === "spark"
          ? t * 160
          : t * 70);

    return {
      opacity,
      transform: [
        { translateX: particle.startX + (particle.endX - particle.startX) * t },
        {
          translateY:
            particle.startY + (particle.endY - particle.startY) * t + driftY,
        },
        { rotate: `${spin}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.particle, style]}>
      {particle.kind === "star" ? (
        <MaterialCommunityIcons name="star" size={particle.size} color={particle.color} />
      ) : particle.kind === "ribbon" ? (
        <RibbonShape color={particle.color} size={particle.size} />
      ) : particle.kind === "spark" ? (
        <SparkShape color={particle.color} size={particle.size} />
      ) : particle.kind === "diamond" ? (
        <View
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: [{ rotate: "45deg" }],
            borderRadius: 2,
          }}
        />
      ) : (
        <View
          style={{
            width: particle.size,
            height: particle.size,
            borderRadius: particle.size / 2,
            backgroundColor: particle.color,
          }}
        />
      )}
    </Animated.View>
  );
}

function ShockwaveRing({
  delay,
  color,
  maxScale,
}: {
  delay: number;
  color: string;
  maxScale: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.75, 0]),
      transform: [{ scale: interpolate(progress.value, [0, 1], [0.3, maxScale]) }],
    };
  });

  return <Animated.View style={[styles.shockwave, { borderColor: color }, style]} />;
}

function StarburstRays() {
  const spin = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    fade.value = withSequence(
      withTiming(1, { duration: 280 }),
      withDelay(900, withTiming(0, { duration: 900 })),
    );
    spin.value = withTiming(140, {
      duration: 2200,
      easing: Easing.out(Easing.cubic),
    });
    return () => {
      cancelAnimation(spin);
      cancelAnimation(fade);
    };
  }, [fade, spin]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value * 0.55,
    transform: [{ rotate: `${spin.value}deg` }, { scale: 0.85 + fade.value * 0.35 }],
  }));

  return (
    <Animated.View style={[styles.raysWrap, style]}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.ray,
            {
              backgroundColor: COLORS[i % COLORS.length],
              transform: [{ rotate: `${i * 36}deg` }, { translateY: -58 }],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

function MagicHalo() {
  const pulse = useSharedValue(0);
  const ring = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    ring.value = withDelay(
      100,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(ring);
    };
  }, [pulse, ring]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.18 }],
    opacity: 0.4 + pulse.value * 0.4,
  }));

  const ringProps = useAnimatedProps(() => ({
    r: 34 + ring.value * 22,
    opacity: 0.55 * (1 - (ring.value - 0.4) / 0.9),
  }));

  return (
    <>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Svg width={160} height={160} style={styles.haloSvg}>
        <AnimatedCircle
          cx={80}
          cy={80}
          animatedProps={ringProps}
          stroke="#34D399"
          strokeWidth={3}
          fill="none"
        />
      </Svg>
    </>
  );
}

type OrderCelebrationProps = {
  style?: StyleProp<ViewStyle>;
};

export function OrderCelebration({ style }: OrderCelebrationProps) {
  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <MagicHalo />
      <StarburstRays />
      <ShockwaveRing delay={0} color="#A7F3D0" maxScale={4.2} />
      <ShockwaveRing delay={180} color="#C4B5FD" maxScale={5.2} />
      <ShockwaveRing delay={360} color="#FDE68A" maxScale={6} />
      <ShockwaveRing delay={720} color="#FBCFE8" maxScale={5.5} />
      {PARTICLES.map((particle) => (
        <CelebrationParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  glow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#6EE7B7",
  },
  haloSvg: {
    position: "absolute",
  },
  shockwave: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
  },
  raysWrap: {
    position: "absolute",
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  ray: {
    position: "absolute",
    width: 4,
    height: 42,
    borderRadius: 2,
    opacity: 0.85,
  },
  particle: {
    position: "absolute",
  },
});
