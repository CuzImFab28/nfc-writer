import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import type { SessionPhase } from "../nfc/types";

type NfcChipProps = {
  phase: SessionPhase;
};

const phaseColor: Record<SessionPhase, string> = {
  idle: "#5eead4",
  waitingForTag: "#67e8f9",
  tagPresent: "#fbbf24",
  writing: "#38bdf8",
  success: "#34d399",
  error: "#fb7185",
};

export function NfcChip({ phase }: NfcChipProps) {
  const group = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const accent = useMemo(() => phaseColor[phase], [phase]);
  const active = phase === "tagPresent" || phase === "writing" || phase === "success";

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const floatY = Math.sin(t * 1.2) * 0.08;
    const targetScale = active ? 1.08 : 1;
    group.current.position.y += (floatY - group.current.position.y) * 0.08;
    group.current.rotation.y += delta * (phase === "writing" ? 1.4 : 0.25);
    group.current.rotation.x = Math.sin(t * 0.7) * 0.12;
    const s = group.current.scale.x + (targetScale - group.current.scale.x) * 0.08;
    group.current.scale.setScalar(s);

    if (glow.current) {
      const pulse =
        phase === "writing"
          ? 0.35 + Math.sin(t * 8) * 0.2
          : phase === "success"
            ? 0.45
            : 0.18 + Math.sin(t * 2) * 0.05;
      glow.current.scale.setScalar(1.4 + pulse);
      const mat = glow.current.material;
      if (!Array.isArray(mat) && "opacity" in mat) {
        mat.opacity = pulse;
      }
    }
  });

  return (
    <group ref={group}>
      <mesh ref={glow} position={[0, 0, -0.08]}>
        <circleGeometry args={[1.35, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.2} />
      </mesh>

      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.35, 0.08]} />
        <meshStandardMaterial
          color="#d7dee8"
          metalness={0.55}
          roughness={0.28}
          envMapIntensity={1.2}
        />
      </mesh>

      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[2.05, 1.2, 0.01]} />
        <meshStandardMaterial color="#0b1220" metalness={0.2} roughness={0.55} />
      </mesh>

      {[0.28, 0.48, 0.68].map((radius) => (
        <mesh key={radius} position={[0, 0, 0.055]} rotation={[0, 0, 0]}>
          <ringGeometry args={[radius, radius + 0.035, 64]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={phase === "writing" ? 1.4 : 0.55}
            metalness={0.4}
            roughness={0.35}
          />
        </mesh>
      ))}

      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.28, 0.28, 0.04]} />
        <meshStandardMaterial
          color="#111827"
          emissive={accent}
          emissiveIntensity={0.35}
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>

      <mesh position={[0.72, -0.42, 0.055]}>
        <boxGeometry args={[0.42, 0.16, 0.01]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
