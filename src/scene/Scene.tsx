import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { ScannerMesh } from "./ScannerMesh";

type SceneProps = {
  chipPresent: boolean;
};

export function Scene({ chipPresent }: SceneProps) {
  return (
    <div className="scene-canvas">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: "none" }}
      >
        <Suspense fallback={null}>
          <ScannerMesh chipPresent={chipPresent} />
        </Suspense>
      </Canvas>
    </div>
  );
}
