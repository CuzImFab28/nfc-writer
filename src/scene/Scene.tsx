import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer } from "@react-three/drei";
import { Suspense } from "react";
import type { SessionPhase } from "../nfc/types";
import { NfcChip } from "./NfcChip";

type SceneProps = {
  phase: SessionPhase;
};

export function Scene({ phase }: SceneProps) {
  return (
    <div className="scene-shell">
      <Canvas
        camera={{ position: [0, 0.35, 4.2], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#05080f"]} />
        <ambientLight intensity={0.35} />
        <spotLight
          position={[4, 6, 4]}
          angle={0.35}
          penumbra={0.8}
          intensity={2.2}
          color="#dff7ff"
        />
        <spotLight
          position={[-4, 2, -2]}
          angle={0.5}
          penumbra={1}
          intensity={1.1}
          color="#fbbf24"
        />

        <Suspense fallback={null}>
          <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
            <NfcChip phase={phase} />
          </Float>
          <ContactShadows
            position={[0, -1.15, 0]}
            opacity={0.45}
            scale={8}
            blur={2.4}
            far={4}
          />
          <Environment resolution={256}>
            <Lightformer
              intensity={2}
              position={[0, 4, 0]}
              scale={[8, 1.5, 1]}
              form="rect"
              color="#9fe7ff"
            />
            <Lightformer
              intensity={1.2}
              position={[4, 0, 2]}
              scale={[4, 4, 1]}
              form="ring"
              color="#f59e0b"
            />
          </Environment>
        </Suspense>
      </Canvas>
    </div>
  );
}
