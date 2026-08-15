import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshBasicMaterial } from "three";

const ACC = 0x8b5cf6;
const ACC_GLOW = 0xc4b5fd;
const AMBER = 0xf0b429;

type ScannerMeshProps = {
  chipPresent: boolean;
  writing?: boolean;
};

export function ScannerMesh({ chipPresent, writing = false }: ScannerMeshProps) {
  const shell = useRef<Mesh>(null);
  const coil = useRef<Mesh>(null);
  const coil2 = useRef<Mesh>(null);
  const chip = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  const glow = useRef(chipPresent ? 1 : 0.3);

  useFrame((_, delta) => {
    const target = writing ? 1.85 : chipPresent ? 1 : 0.3;
    glow.current += (target - glow.current) * Math.min(1, delta * (writing ? 8 : 3.6));
    const speed = writing ? 14 : chipPresent ? 2.4 : 1;
    const g = glow.current;
    const t = performance.now();

    if (shell.current) {
      shell.current.rotation.y += 0.0025 * speed;
      shell.current.rotation.x += 0.001 * speed * (writing ? 2.2 : 1);
      shell.current.rotation.z += writing ? delta * 1.8 : 0;
      const mat = shell.current.material as MeshBasicMaterial;
      mat.color.setHex(writing ? AMBER : ACC);
      mat.opacity = Math.min(0.95, 0.25 + g * 0.35);
      const shellPulse = writing ? 1 + Math.sin(t * 0.02) * 0.12 : 1;
      shell.current.scale.setScalar(shellPulse);
    }

    if (coil.current) {
      coil.current.rotation.z += 0.006 * speed;
      coil.current.rotation.x = writing ? Math.sin(t * 0.008) * 0.55 : 0;
      const mat = coil.current.material as MeshBasicMaterial;
      mat.color.setHex(writing ? AMBER : ACC_GLOW);
      mat.opacity = Math.min(1, 0.5 + g * 0.45);
    }

    if (coil2.current) {
      coil2.current.rotation.z -= 0.008 * speed;
      coil2.current.rotation.y = writing ? Math.cos(t * 0.01) * 0.7 : 0;
      const mat = coil2.current.material as MeshBasicMaterial;
      mat.color.setHex(writing ? 0xffffff : ACC_GLOW);
      mat.opacity = Math.min(1, 0.4 + g * 0.4);
    }

    if (chip.current) {
      chip.current.rotation.y += 0.01 * speed;
      chip.current.rotation.x += 0.006 * speed;
      chip.current.rotation.z += writing ? delta * 4.5 : 0;
      const mat = chip.current.material as MeshBasicMaterial;
      mat.color.setHex(writing ? AMBER : 0xffffff);
      mat.opacity = Math.min(1, 0.7 + g * 0.3);
      const chipScale = writing ? 1.15 + Math.sin(t * 0.03) * 0.25 : 1;
      chip.current.scale.setScalar(chipScale);
    }

    if (core.current) {
      const mat = core.current.material as MeshBasicMaterial;
      mat.color.setHex(writing ? AMBER : ACC_GLOW);
      mat.opacity = Math.min(1, g * (writing ? 0.95 : 0.5));
      const pulse = writing
        ? 1.4 + Math.sin(t * 0.035) * 0.55
        : 1 + Math.sin(t * 0.004) * 0.08 * g;
      core.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      <mesh ref={shell}>
        <icosahedronGeometry args={[2.6, 1]} />
        <meshBasicMaterial color={ACC} wireframe transparent opacity={0.3} />
      </mesh>

      <mesh ref={coil}>
        <torusGeometry args={[1.7, 0.05, 8, 60]} />
        <meshBasicMaterial color={ACC_GLOW} wireframe transparent opacity={0.75} />
      </mesh>

      <mesh ref={coil2}>
        <torusGeometry args={[1.2, 0.04, 8, 48]} />
        <meshBasicMaterial color={ACC_GLOW} wireframe transparent opacity={0.55} />
      </mesh>

      <mesh ref={chip}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshBasicMaterial color={0xffffff} wireframe transparent opacity={0.85} />
      </mesh>

      <mesh ref={core}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshBasicMaterial color={ACC_GLOW} transparent opacity={0} />
      </mesh>
    </group>
  );
}
