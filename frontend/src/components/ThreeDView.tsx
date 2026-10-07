import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, Grid } from "@react-three/drei";
import { useScene } from "../hooks/useTracks";
import { mapStore, sensorStore } from "../stores";
import { colors } from "../types/domain";
import { Button } from "./ui/button";
export function ThreeDView() {
  const { tracks } = useScene();
  const sensors = sensorStore((s) => s.items);
  const selected = mapStore((s) => s.selected);
  const select = mapStore((s) => s.select);
  const zones = mapStore((s) => s.zones);
  const [paths, setPaths] = useState(true);
  const [key, setKey] = useState(0);
  return (
    <div className="three-wrap">
      <Canvas
        key={key}
        camera={{ position: [210, 230, 260], fov: 50 }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#0a1622"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[70, 180, 50]} intensity={2} />
        <Suspense fallback={null}>
          <Grid
            args={[700, 700]}
            cellSize={20}
            cellThickness={0.7}
            cellColor="#1b3647"
            sectionSize={100}
            sectionColor="#2a5262"
            fadeDistance={900}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
            <planeGeometry args={[650, 650]} />
            <meshStandardMaterial color="#0c2129" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[35, 600]} />
            <meshStandardMaterial color="#263947" />
          </mesh>
          {Array.from({ length: 14 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (i % 2 ? 1 : -1) * (65 + (i % 3) * 35),
                8 + (i % 3) * 4,
                (Math.floor(i / 2) - 3) * 53,
              ]}
            >
              <boxGeometry args={[22, 16 + (i % 3) * 8, 30]} />
              <meshStandardMaterial color="#27414d" roughness={0.8} />
            </mesh>
          ))}
          {zones.map((z) => (
            <mesh
              key={z.id}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[z.x, 0.5, -z.y]}
            >
              <ringGeometry args={[z.radius - 1, z.radius, 64]} />
              <meshBasicMaterial color="#f58065" side={2} />
            </mesh>
          ))}
          {sensors.slice(0, 4).map((s, i) => (
            <group key={s.id} position={[s.position.x, 0, -s.position.y]}>
              <mesh position={[0, 8, 0]}>
                <cylinderGeometry args={[1, 1, 16, 8]} />
                <meshStandardMaterial color="#598598" />
              </mesh>
              <mesh position={[0, 17, 0]}>
                <boxGeometry args={[5, 3, 3]} />
                <meshStandardMaterial color="#75c9ed" />
              </mesh>
              <mesh position={[0, 4, 0]} rotation={[-Math.PI / 2, 0, i]}>
                <coneGeometry args={[45, 110, 3, 1, true]} />
                <meshBasicMaterial
                  color="#2295bb"
                  transparent
                  opacity={0.06}
                  side={2}
                />
              </mesh>
            </group>
          ))}
          {tracks
            .filter((t) => t.position)
            .map((t) => (
              <group key={t.id}>
                <mesh
                  onClick={(e) => {
                    e.stopPropagation();
                    select(t.id);
                  }}
                  position={[t.position!.x, 4, -t.position!.y]}
                  scale={selected === t.id ? 1.4 : 1}
                >
                  <boxGeometry
                    args={t.class_name === "Vehicle" ? [9, 5, 14] : [4, 8, 4]}
                  />
                  <meshStandardMaterial
                    color={colors[t.class_name]}
                    emissive={colors[t.class_name]}
                    emissiveIntensity={0.3}
                  />
                </mesh>
                {paths && t.trajectory.length > 1 && (
                  <Line
                    points={t.trajectory.map((p) => [p.x, 1, -p.y])}
                    color={colors[t.class_name]}
                    lineWidth={1}
                    transparent
                    opacity={0.5}
                  />
                )}
              </group>
            ))}
          <OrbitControls
            makeDefault
            minDistance={60}
            maxDistance={650}
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
        </Suspense>
      </Canvas>
      <div className="map-buttons">
        <Button onClick={() => setKey((v) => v + 1)}>Reset</Button>
        <Button onClick={() => setPaths((v) => !v)}>
          Paths {paths ? "on" : "off"}
        </Button>
      </div>
      <div className="map-caption">
        SIMPLIFIED LOCAL SCENE · ORBIT / PAN / ZOOM
      </div>
    </div>
  );
}
