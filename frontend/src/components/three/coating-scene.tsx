'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Run } from '@/lib/types';

interface CoatingSceneProps {
  run: Run | null;
  qualityColor: string;
}

function SprayGun({ position = [0, 3, 0] as [number, number, number] }) {
  const gunRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (gunRef.current) {
      gunRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 2;
    }
  });

  return (
    <group ref={gunRef} position={position}>
      {/* Gun body */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.1, 0.6, 16]} />
        <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Nozzle */}
      <mesh position={[0, -0.1, 0]}>
        <coneGeometry args={[0.08, 0.3, 16]} />
        <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

function PlasmaStream({ qualityColor }: { qualityColor: string }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 500;

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color(qualityColor);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = -Math.random() * 2.5;
      positions[i3 + 2] = (Math.random() - 0.5) * 0.5;

      // Color gradient from orange to quality color
      const t = positions[i3 + 1] / -2.5;
      const startColor = new THREE.Color('#ff6b35');
      const endColor = color;
      const mixedColor = startColor.lerp(endColor, t);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }

    return { positions, colors };
  }, [qualityColor]);

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3 + 1] -= 0.05;
        if (positions[i3 + 1] < -2.5) {
          positions[i3 + 1] = 0;
          positions[i3] = (Math.random() - 0.5) * 0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 2;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef} position={[0, 3, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Substrate({ qualityColor, thickness = 1 }: { qualityColor: string; thickness: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group position={[0, 0, 0]}>
      {/* Base substrate */}
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[4, 0.5, 3]} />
        <meshStandardMaterial color="#718096" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Coating layer */}
      <mesh ref={meshRef} position={[0, thickness * 0.05, 0]}>
        <boxGeometry args={[4, thickness * 0.1, 3]} />
        <meshStandardMaterial
          color={qualityColor}
          metalness={0.3}
          roughness={0.6}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

function Scene({ run, qualityColor }: CoatingSceneProps) {
  const thickness = run?.qualityMetrics?.thicknessUm || 300;
  const normalizedThickness = Math.min(Math.max(thickness / 400, 0.5), 1.5);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ff6b35" />

      <SprayGun />
      <PlasmaStream qualityColor={qualityColor} />
      <Substrate qualityColor={qualityColor} thickness={normalizedThickness} />

      {/* Info text */}
      {run && (
        <Float speed={1} rotationIntensity={0} floatIntensity={0.5}>
          <Text
            position={[0, 4.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {`Run: ${run.id} | Thickness: ${run.qualityMetrics?.thicknessUm.toFixed(1) || '--'} µm`}
          </Text>
        </Float>
      )}

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={15}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
      />
      <Environment preset="city" />
    </>
  );
}

export function CoatingScene({ run, qualityColor }: CoatingSceneProps) {
  return (
    <div className="h-[500px] w-full rounded-lg bg-gradient-to-b from-slate-900 to-slate-800">
      <Canvas
        camera={{ position: [6, 4, 6], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        <Scene run={run} qualityColor={qualityColor} />
      </Canvas>
    </div>
  );
}
