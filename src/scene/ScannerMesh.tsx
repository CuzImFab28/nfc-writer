import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshBasicMaterial } from "three";

const ACC = 0x8b5cf6;
const ACC_GLOW = 0xc4b5fd;

type ScannerMeshProps = {
  chipPresent: boolean;
};

export function ScannerMesh({ chipPresent }: ScannerMeshProps) {
  const shell = useRef<Mesh>(null);
  const coil = useRef<Mesh>(null);
  const coil2 = useRef<Mesh>(null);
  const chip = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  const glow = useRef(chipPresent ? 1 : 0.3);

  useFrame((_, delta) => {
    const target = chipPresent ? 1 : 0.3;
    glow.current += (target - glow.current) * Math.min(1, delta * 3.6);
    const speed = chipPresent ? 2.4 : 1;
    const g = glow.current;

    if (shell.current) {
      shell.current.rotation.y += 0.0025 * speed;
      shell.current.rotation.x += 0.001 * speed;
      const mat = shell.current.material as MeshBasicMaterial;
      mat.opacity = 0.25 + g * 0.25;
    }

    if (coil.current) {
      coil.current.rotation.z += 0.006 * speed;
      const mat = coil.current.material as MeshBasicMaterial;
      mat.opacity = 0.5 + g * 0.4;
    }

    if (coil2.current) {
      coil2.current.rotation.z -= 0.008 * speed;
      const mat = coil2.current.material as MeshBasicMaterial;
      mat.opacity = 0.4 + g * 0.35;
    }

    if (chip.current) {
      chip.current.rotation.y += 0.01 * speed;
      chip.current.rotation.x += 0.006 * speed;
      const mat = chip.current.material as MeshBasicMaterial;
      mat.opacity = 0.7 + g * 0.3;
    }

    if (core.current) {
      const mat = core.current.material as MeshBasicMaterial;
      mat.opacity = g * 0.5;
      const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.08 * g;
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
