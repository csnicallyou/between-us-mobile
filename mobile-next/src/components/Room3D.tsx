import React, { useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Group, Shape, ExtrudeGeometry } from "three";
import { Canvas } from "./RoomCanvas";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomDesign, themes } from "../domain/room";

type Vec = [number, number, number];
type Props = {
  design: RoomDesign;
  editing: boolean;
  action: string;
  reduceMotion: boolean;
  onSelect: (id: string) => void;
  silhouette?: number[][];
};
function Pebble({
  at,
  size,
  color,
  click,
  rough = 0.43,
}: {
  at: Vec;
  size: Vec;
  color: string;
  click?: () => void;
  rough?: number;
}) {
  return (
    <mesh
      position={at}
      scale={size}
      castShadow
      receiveShadow
      onClick={
        click
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              click();
            }
          : undefined
      }
    >
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}
function SoftBox({
  at,
  size,
  color,
  radius = 0.15,
  rough = 0.48,
}: {
  at: Vec;
  size: Vec;
  color: string;
  radius?: number;
  rough?: number;
}) {
  const geometry = React.useMemo(
    () =>
      new RoundedBoxGeometry(
        ...size,
        4,
        Math.min(radius, ...size.map((v) => v / 2 - 0.001)),
      ),
    [...size, radius],
  );
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={at} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}
function Arch({
  at,
  width,
  height,
  color,
  depth = 0.1,
}: {
  at: Vec;
  width: number;
  height: number;
  color: string;
  depth?: number;
}) {
  const geometry = React.useMemo(() => {
    const s = new Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, height - width / 2);
    s.absarc(0, height - width / 2, width / 2, 0, Math.PI, false);
    s.lineTo(-width / 2, 0);
    return new ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.055,
      bevelThickness: 0.055,
      bevelSegments: 4,
      steps: 1,
      curveSegments: 32,
    });
  }, [width, height, depth]);
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={at} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}
function Box({
  at,
  size,
  color,
  click,
}: {
  at: Vec;
  size: Vec;
  color: string;
  click?: () => void;
}) {
  return (
    <mesh
      position={at}
      receiveShadow
      onClick={
        click
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              click();
            }
          : undefined
      }
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Plant({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.23, 0.17, 0.46, 24]} />
        <meshStandardMaterial color="#deb295" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation={[0, i * 1.9, 0]}>
          <Pebble
            at={[0.18, 0.63 + i * 0.09, 0]}
            size={[0.17, 0.32, 0.095]}
            color={i % 2 ? "#93ab74" : "#738e60"}
          />
        </group>
      ))}
    </group>
  );
}
function Creature({
  who,
  action,
  onSelect,
  reduce,
  silhouette,
}: {
  who: number;
  action: string;
  onSelect: () => void;
  reduce: boolean;
  silhouette?: number[][];
}) {
  const ref = useRef<Group>(null);
  const color = who ? "#c7ace6" : "#f6dfbd";
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const walking = action === "walk";
    const sitting = action === "sit";
    const targetX = walking
      ? Math.sin(t * 0.8 + who) * 1.1
      : who
        ? 0.68
        : -0.68;
    const targetZ = sitting ? -1.05 : 1.48;
    ref.current.position.x +=
      (targetX - ref.current.position.x) * Math.min(1, dt * 3);
    ref.current.position.z +=
      (targetZ - ref.current.position.z) * Math.min(1, dt * 3);
    ref.current.position.y =
      (sitting ? 0.58 : 0) + (reduce ? 0 : Math.sin(t * 2 + who) * 0.035);
    ref.current.rotation.z = reduce ? 0 : Math.sin(t * 2 + who) * 0.025;
    ref.current.scale.y +=
      ((action === "rest" ? 0.9 : 1.23) - ref.current.scale.y) *
      Math.min(1, dt * 5);
  });
  const shape = React.useMemo(() => {
    if (who || !silhouette || silhouette.length < 4) return null;
    const s = new Shape();
    silhouette.forEach((p, i) => {
      const x = (p[0]! / 280 - 0.5) * 1.1,
        y = (0.5 - p[1]! / 230) * 1.2;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    });
    s.closePath();
    return new ExtrudeGeometry(s, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.09,
      bevelThickness: 0.09,
    });
  }, [silhouette, who]);
  React.useEffect(() => () => shape?.dispose(), [shape]);
  return (
    <group
      ref={ref}
      position={[who ? 0.68 : -0.68, 0, 1.48]}
      scale={[1.23, 1.23, 1.23]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {shape ? (
        <mesh geometry={shape} position={[0, 0.75, -0.2]} castShadow>
          <meshStandardMaterial color={color} />
        </mesh>
      ) : (
        <>
          <Pebble
            at={[0, 0.72, 0]}
            size={who ? [0.49, 0.53, 0.43] : [0.47, 0.55, 0.43]}
            color={color}
          />
          {who ? (
            <>
              <Pebble
                at={[-0.29, 1.18, 0]}
                size={[0.17, 0.25, 0.16]}
                color={color}
              />
              <Pebble
                at={[0.25, 1.18, 0]}
                size={[0.15, 0.19, 0.15]}
                color={color}
              />
              <Pebble
                at={[0, 1.29, 0]}
                size={[0.12, 0.18, 0.12]}
                color={color}
              />
            </>
          ) : (
            <>
              <Pebble
                at={[0, 1.36, 0]}
                size={[0.12, 0.21, 0.11]}
                color="#afc28b"
              />
              <Pebble
                at={[0.13, 1.42, 0]}
                size={[0.18, 0.09, 0.1]}
                color="#afc28b"
              />
            </>
          )}
        </>
      )}
      {[-1, 1].map((v) => (
        <group key={v}>
          <Pebble
            at={[v * 0.34, 0.14, 0.08]}
            size={[0.22, 0.13, 0.24]}
            color={color}
          />
          <Pebble
            at={[v * 0.46, 0.53, 0.03]}
            size={[0.12, 0.22, 0.15]}
            color={color}
          />
          {action === "idle" || action === "hug" ? (
            <mesh position={[v * 0.16, 0.82, 0.45]}>
              <torusGeometry args={[0.053, 0.013, 8, 20, Math.PI]} />
              <meshStandardMaterial color="#64404c" roughness={0.35} />
            </mesh>
          ) : (
            <Pebble
              at={[v * 0.16, 0.84, 0.44]}
              size={[0.048, 0.055, 0.035]}
              color="#533747"
            />
          )}
          <Pebble
            at={[v * 0.27, 0.7, 0.4]}
            size={[0.09, 0.045, 0.03]}
            color="#e4a3a0"
          />
        </group>
      ))}
      <mesh position={[0, 0.72, 0.455]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.045, 0.009, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#80545a" />
      </mesh>
      {(action === "idle" || action === "hug") && (
        <Token
          kind={who && action !== "hug" ? "star" : "heart"}
          at={[who ? -0.22 : 0.22, 0.45, 0.5]}
        />
      )}
    </group>
  );
}
function Token({ kind, at }: { kind: "heart" | "star"; at: Vec }) {
  const geometry = React.useMemo(() => {
    const s = new Shape();
    if (kind === "heart") {
      s.moveTo(0, -0.25);
      s.bezierCurveTo(-0.5, 0.05, -0.26, 0.42, 0, 0.19);
      s.bezierCurveTo(0.26, 0.42, 0.5, 0.05, 0, -0.25);
    } else {
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 0.14 : 0.31;
        const x = Math.cos(a) * r,
          y = Math.sin(a) * r;
        i ? s.lineTo(x, y) : s.moveTo(x, y);
      }
      s.closePath();
    }
    return new ExtrudeGeometry(s, {
      depth: 0.09,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.045,
      bevelThickness: 0.045,
      steps: 1,
      curveSegments: 24,
    });
  }, [kind]);
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={at} castShadow>
      <meshStandardMaterial
        color={kind === "heart" ? "#ef96ab" : "#f6cf7f"}
        roughness={0.3}
      />
    </mesh>
  );
}
function Room(props: Props) {
  const { design, editing, onSelect } = props;
  const t = themes[design.theme] || themes[0];
  const sofa = design.sofa || t.sofa;
  const evening = design.theme === 4;
  return (
    <>
      <color attach="background" args={[t.wall]} />
      <ambientLight intensity={evening ? 0.5 : 0.65} />
      <hemisphereLight args={["#fff2de", "#ac7984", 0.9]} />
      <directionalLight
        position={[-3, 6, 4]}
        intensity={3.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-normalBias={0.04}
        shadow-radius={5}
      />
      <pointLight
        position={[-1.4, 3.1, 1]}
        intensity={evening ? 1 : 9}
        color="#ffe4b1"
        distance={8}
      />
      <pointLight
        position={[2, 2.2, -1]}
        intensity={props.action === "lamp" ? 9 : evening ? 6 : 1}
        color="#ffc983"
      />
      <Box at={[0, -0.16, 0]} size={[30, 0.3, 30]} color={t.floor} />
      <Box at={[0, 9.8, -2.35]} size={[30, 20, 0.2]} color={t.wall} />
      <Box at={[-3.35, 2, 0]} size={[0.2, 4.5, 5]} color={t.wall} />
      <Box at={[3.35, 2, 0]} size={[0.2, 4.5, 5]} color={t.wall} />
      {/* Concentric bevelled arches give the window the soft toy-room proportions. */}
      <Arch at={[0, 1.25, -2.17]} width={3.15} height={2.88} color="#d0a080" />
      <Arch at={[0, 1.3, -2.01]} width={2.96} height={2.69} color="#ffdfb8" />
      <Arch at={[0, 1.38, -1.85]} width={2.64} height={2.43} color={t.sky} />
      <Pebble
        at={[0.68, 3.03, -1.68]}
        size={[0.23, 0.23, 0.05]}
        color="#ffdf9b"
      />
      {[-0.85, -0.25, 0.45, 0.95].map((x, i) => (
        <Pebble
          key={x}
          at={[x, 1.72 + (i % 2) * 0.2, -1.66]}
          size={[0.35, 0.48, 0.06]}
          color={i % 2 ? "#a9bf88" : "#8da976"}
        />
      ))}
      {[-0.85, -0.58, -0.3].map((x, i) => (
        <Pebble
          key={x}
          at={[x, 3.05 + (i % 2) * 0.07, -1.66]}
          size={[0.24, 0.12, 0.035]}
          color="#fff3e8"
        />
      ))}
      <SoftBox
        at={[0, 1.36, -1.62]}
        size={[3.07, 0.18, 0.43]}
        color="#ffdfb5"
        radius={0.07}
      />
      {/* Simple wall panelling and skirting keep the room from reading as an empty box. */}
      <SoftBox
        at={[0, 0.22, -2.09]}
        size={[6.5, 0.18, 0.16]}
        color="#dbab88"
        radius={0.05}
      />
      {[-2.9, -2.2, 2.2, 2.9].map((x) => (
        <SoftBox
          key={x}
          at={[x, 1.9, -2.14]}
          size={[0.045, 3.45, 0.055]}
          color="#e8bb95"
          radius={0.015}
        />
      ))}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect("sofa");
        }}
      >
        <SoftBox
          at={[0, 0.5, -1.25]}
          size={[2.85, 0.42, 1.02]}
          color={sofa}
          rough={design.material === "satin" ? 0.23 : 0.65}
          radius={0.19}
        />
        <SoftBox
          at={[0, 1.05, -1.66]}
          size={[2.65, 0.95, 0.4]}
          color={sofa}
          rough={design.material === "satin" ? 0.23 : 0.65}
          radius={0.19}
        />
        {[-0.66, 0.66].map((x) => (
          <SoftBox
            key={x}
            at={[x, 0.75, -1.16]}
            size={[1.28, 0.24, 0.85]}
            color={sofa}
            rough={design.material === "satin" ? 0.23 : 0.65}
            radius={0.11}
          />
        ))}
        {[-1, 1].map((v) => (
          <group key={v}>
            <Pebble
              at={[v * 1.29, 0.88, -1.33]}
              size={[0.26, 0.45, 0.6]}
              color={sofa}
              rough={design.material === "satin" ? 0.23 : 0.65}
            />
            <Pebble
              at={[v * 0.69, 0.94, -1.43]}
              size={[0.33, 0.3, 0.15]}
              color={v === 1 ? "#c7b9db" : t.accent}
            />
            <Box
              at={[v * 1.05, 0.15, -1.4]}
              size={[0.12, 0.3, 0.15]}
              color="#9f7966"
            />
          </group>
        ))}
        {design.model === "cloud" && (
          <Pebble
            at={[0, 1.24, -1.77]}
            size={[0.64, 0.42, 0.25]}
            color={sofa}
            rough={design.material === "satin" ? 0.23 : 0.65}
          />
        )}
      </group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0.6]}
        receiveShadow
      >
        <circleGeometry args={[1.64, 64]} />
        <meshStandardMaterial color={evening ? "#a58ba9" : "#f0d9c5"} />
      </mesh>
      <group
        position={[0.42, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("creative");
        }}
      >
        <Box
          at={[-2.37, 0.85, -1.1]}
          size={[0.8, 0.12, 0.75]}
          color="#e4bf98"
        />
        {[-2.65, -2.1].map((x) => (
          <Box
            key={x}
            at={[x, 0.42, -1.1]}
            size={[0.09, 0.85, 0.5]}
            color="#d0a17e"
          />
        ))}
        <Box
          at={[-2.37, 1.35, -1.27]}
          size={[0.52, 0.75, 0.08]}
          color="#fff0d5"
        />
        <Pebble
          at={[-2.4, 1.35, -1.2]}
          size={[0.19, 0.2, 0.03]}
          color={t.sofa}
        />
        <Pebble
          at={[-2.2, 0.98, -0.88]}
          size={[0.09, 0.12, 0.09]}
          color="#b3a4c6"
        />
      </group>
      <group
        position={[-0.4, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("table");
        }}
      >
        <Pebble
          at={[2.28, 0.77, -0.55]}
          size={[0.62, 0.09, 0.52]}
          color="#f0cfaa"
        />
        <Box
          at={[2.28, 0.37, -0.55]}
          size={[0.18, 0.72, 0.18]}
          color="#bd9878"
        />
        <Box
          at={[2.18, 0.9, -0.58]}
          size={[0.42, 0.09, 0.33]}
          color="#a6b9b0"
        />
        <Box at={[2.28, 1, -0.6]} size={[0.35, 0.09, 0.3]} color="#d7a6aa" />
        <Pebble
          at={[2.65, 0.94, -0.4]}
          size={[0.1, 0.14, 0.1]}
          color="#fff1d5"
        />
      </group>
      <Plant x={-2.15} z={0.15} s={1.12} />
      <Plant x={2.25} z={-1.7} s={1.5} />
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect("lamp");
        }}
      >
        <Box at={[1.82, 1.1, -1.7]} size={[0.04, 2.2, 0.04]} color="#bc9175" />
        <Pebble
          at={[1.82, 2.2, -1.7]}
          size={[0.36, 0.3, 0.32]}
          color={props.action === "lamp" ? "#ffbc58" : "#ffe1a4"}
        />
        <Pebble
          at={[1.82, 0.06, -1.7]}
          size={[0.25, 0.06, 0.25]}
          color="#bd967e"
        />
      </group>
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect("art");
        }}
      >
        <Box at={[2.2, 2.9, -2.17]} size={[0.72, 0.88, 0.12]} color="#fff0d8" />
        <Box
          at={[2.2, 2.9, -2.09]}
          size={[0.56, 0.72, 0.05]}
          color={
            design.decor === "flower"
              ? "#c9b9d9"
              : design.decor === "heart"
                ? "#e5a3b1"
                : "#d7d5ab"
          }
        />
        {design.decor === "flower" ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <Pebble
                key={i}
                at={[
                  2.2 + Math.cos((i * Math.PI * 2) / 5) * 0.13,
                  2.94 + Math.sin((i * Math.PI * 2) / 5) * 0.13,
                  -2.03,
                ]}
                size={[0.1, 0.1, 0.02]}
                color="#fff0d6"
              />
            ))}
            <Pebble
              at={[2.2, 2.94, -2.0]}
              size={[0.07, 0.07, 0.02]}
              color={t.accent}
            />
          </>
        ) : design.decor === "heart" ? (
          <>
            <Pebble
              at={[2.13, 2.99, -2.03]}
              size={[0.11, 0.12, 0.02]}
              color="#d67c94"
            />
            <Pebble
              at={[2.27, 2.99, -2.03]}
              size={[0.11, 0.12, 0.02]}
              color="#d67c94"
            />
            <mesh position={[2.2, 2.89, -2.02]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.18, 0.2, 3]} />
              <meshStandardMaterial color="#d67c94" />
            </mesh>
          </>
        ) : (
          <Pebble
            at={[2.2, 2.94, -2.04]}
            size={[0.18, 0.18, 0.02]}
            color={t.accent}
          />
        )}
      </group>
      {!editing &&
        [0, 1].map((who) => (
          <Creature
            key={who}
            who={who}
            action={props.action}
            reduce={props.reduceMotion}
            silhouette={props.silhouette}
            onSelect={() => onSelect(who ? "partner" : "me")}
          />
        ))}
    </>
  );
}
export function Room3D(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2.8, 7.9], fov: 48, near: 0.1, far: 50 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.5, -0.3)}
    >
      <Room {...props} />
    </Canvas>
  );
}
