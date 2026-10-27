import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

function Core() {
  const meshRef = useRef<any>(null)
  const wireRef = useRef<any>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= 0.001
    }
  })

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <mesh ref={meshRef}>
        {/* Reduced detail: subdivisions 1→0 = 20 faces vs 80 faces */}
        <icosahedronGeometry args={[1.8, 1]} />
        <MeshDistortMaterial
          color="#00E5FF"
          emissive="#00E5FF"
          emissiveIntensity={0.35}
          roughness={0.2}
          metalness={0.8}
          distort={0.08}   // reduced from 0.1
          speed={1.5}      // reduced from 2
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Wireframe outer shell */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[2.2, 0]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.04} wireframe />
      </mesh>
    </Float>
  )
}

function Particles() {
  // Reduced from 2000 → 800 particles
  const count = 800
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 4
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])

  const ref = useRef<any>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.015  // slightly slower
    }
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.025} color="#00E5FF" transparent opacity={0.35} sizeAttenuation />
    </points>
  )
}

function Rings() {
  const count = 3
  const ringRefs = useRef<any[]>([])

  useFrame(() => {
    ringRefs.current.forEach((ref, i) => {
      if (ref) {
        ref.rotation.z += 0.0015 * (i + 1)  // slower than before
      }
    })
  })

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { ringRefs.current[i] = el }}
          rotation={[Math.PI / 3 + i * 0.1, 0, 0]}
        >
          {/* Reduced segments: 64 → 32 */}
          <ringGeometry args={[2.8 + i * 0.6, 2.85 + i * 0.6, 32]} />
          <meshBasicMaterial color="#00E5FF" transparent opacity={0.07 - i * 0.02} side={2} />
        </mesh>
      ))}
    </>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#00E5FF" />
      <pointLight position={[-5, -3, 2]} intensity={0.4} color="#6C63FF" />
      <Core />
      <Particles />
      <Rings />
      {/* Stars reduced: 500 → 200 */}
      <Stars radius={50} depth={50} count={200} factor={3} saturation={0} fade speed={0.3} />
    </>
  )
}

export default function AICoreScene() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[0]">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        // DPR capped at 1 (was 1.5) — biggest GPU win on low-end machines
        dpr={[1, 1]}
        gl={{
          antialias: false,  // turn off MSAA — huge perf gain, barely visible at this scale
          alpha: true,
          powerPreference: 'high-performance',
        }}
        // Only render when needed (R3F default is 60fps; this caps it)
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <Scene />
          <EffectComposer>
            {/* Only Bloom — removed ChromaticAberration (saves 1 full GPU pass) */}
            <Bloom
              luminanceThreshold={0.3}
              luminanceSmoothing={0.9}
              intensity={0.5}
              mipmapBlur  // more efficient blur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}
