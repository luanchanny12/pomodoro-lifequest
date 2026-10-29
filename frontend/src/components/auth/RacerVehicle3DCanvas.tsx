import React, { useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Center } from '@react-three/drei'
import * as THREE from 'three'
import { RotateCw, Sparkles, Compass } from 'lucide-react'

interface RacerVehicle3DCanvasProps {
  selectedAvatar: string
}

// ── 1. SIÊU XE NEON (CYBER CAR) ──
const CyberCarMesh: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null)
  const exhaustRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (exhaustRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 12) * 0.18
      exhaustRef.current.scale.set(1, pulse, 1)
    }
  })

  return (
    <group ref={groupRef} position={[0, -0.05, 0]}>
      {/* Khung gầm chính */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[1.9, 0.35, 0.95]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Mũi xe vát nhọn phía trước */}
      <mesh position={[0.7, 0.05, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.7, 0.22, 0.92]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* Đuôi xe thể thao */}
      <mesh position={[-0.7, 0.15, 0]}>
        <boxGeometry args={[0.65, 0.32, 0.92]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Buồng lái kính tối màu khí động học */}
      <mesh position={[-0.05, 0.38, 0]}>
        <boxGeometry args={[0.85, 0.3, 0.72]} />
        <meshStandardMaterial
          color="#030712"
          metalness={0.95}
          roughness={0.1}
          emissive="#06b6d4"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Dải đèn Neon sườn xe (Cyan & Magenta) */}
      <mesh position={[0, 0.12, 0.49]}>
        <boxGeometry args={[1.7, 0.04, 0.02]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0, 0.12, -0.49]}>
        <boxGeometry args={[1.7, 0.04, 0.02]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3} />
      </mesh>

      {/* Đèn pha phía trước */}
      <mesh position={[1.02, 0.08, 0.32]}>
        <boxGeometry args={[0.06, 0.08, 0.22]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={4} />
      </mesh>
      <mesh position={[1.02, 0.08, -0.32]}>
        <boxGeometry args={[0.06, 0.08, 0.22]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={4} />
      </mesh>

      {/* Cánh gió đuôi thể thao (Rear Spoiler) */}
      <group position={[-0.92, 0.42, 0]}>
        <mesh position={[0, 0, 0.3]}>
          <boxGeometry args={[0.05, 0.25, 0.04]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, -0.3]}>
          <boxGeometry args={[0.05, 0.25, 0.04]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[0.32, 0.04, 0.98]} />
          <meshStandardMaterial color="#0369a1" emissive="#0284c7" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* 4 Bánh xe Cyber Neon (Torus vành phát sáng) */}
      {[
        [0.6, 0.05, 0.5],
        [0.6, 0.05, -0.5],
        [-0.6, 0.05, 0.5],
        [-0.6, 0.05, -0.5],
      ].map(([x, y, z], idx) => (
        <group key={idx} position={[x, y, z]}>
          {/* Lốp xe cao su đen */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.14, 24]} />
            <meshStandardMaterial color="#020617" roughness={0.8} />
          </mesh>
          {/* Vành neon phát quang */}
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[0.16, 0.03, 12, 24]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={3}
            />
          </mesh>
        </group>
      ))}

      {/* Ống xả phản lực đuôi xe với lửa neon */}
      <group position={[-1.02, 0.1, 0]}>
        <mesh ref={exhaustRef} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.18, 0.45, 16]} />
          <meshStandardMaterial
            color="#f43f5e"
            emissive="#fb7185"
            emissiveIntensity={4}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>
    </group>
  )
}

// ── 2. TÀU VŨ TRỤ (ROCKET) ──
const RocketMesh: React.FC = () => {
  const flameRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (flameRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 14) * 0.2
      flameRef.current.scale.set(1, scale, 1)
    }
  })

  return (
    <group position={[0, -0.1, 0]} rotation={[0, 0, -0.15]}>
      {/* Thân tàu hình trụ thuôn */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.42, 0.48, 1.6, 32]} />
        <meshStandardMaterial
          color="#f1f5f9"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Đầu chóp nón khí động học (Nosecone) */}
      <mesh position={[0, 1.25, 0]}>
        <coneGeometry args={[0.42, 0.8, 32]} />
        <meshStandardMaterial
          color="#e11d48"
          metalness={0.8}
          roughness={0.3}
          emissive="#e11d48"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Cửa sổ vòm kính phi hành gia */}
      <mesh position={[0, 0.5, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.04, 16, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0.4]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={2.5}
          roughness={0.1}
        />
      </mesh>

      {/* Dải tem sọc trang trí thân tàu */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.12, 32]} />
        <meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={0.8} />
      </mesh>

      {/* 3 Cánh lái tam giác (Fins) */}
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, idx) => (
        <group key={idx} rotation={[0, angle, 0]} position={[0, -0.4, 0]}>
          <mesh position={[0.55, 0, 0]} rotation={[0, 0, -0.4]}>
            <boxGeometry args={[0.4, 0.65, 0.05]} />
            <meshStandardMaterial
              color="#e11d48"
              metalness={0.8}
              roughness={0.25}
            />
          </mesh>
        </group>
      ))}

      {/* Miệng loa phản lực */}
      <mesh position={[0, -0.72, 0]}>
        <cylinderGeometry args={[0.35, 0.26, 0.22, 24]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} />
      </mesh>

      {/* Quầng lửa phản lực Plasma bập bùng */}
      <mesh ref={flameRef} position={[0, -1.15, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.28, 0.75, 16]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#fbbf24"
          emissiveIntensity={4}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  )
}

// ── 3. ĐĨA BAY LƯỢNG TỬ (QUANTUM SAUCER) ──
const QuantumSaucerMesh: React.FC = () => {
  const ringRef = useRef<THREE.Group>(null)
  const beamRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = -state.clock.elapsedTime * 1.8
    }
    if (beamRef.current) {
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 6) * 0.25
      beamRef.current.scale.set(pulse, 1, pulse)
    }
  })

  return (
    <group position={[0, 0.05, 0]}>
      {/* Đĩa kim loại chính (Dáng vòm elip) */}
      <mesh position={[0, 0, 0]} scale={[1.55, 0.28, 1.55]}>
        <sphereGeometry args={[0.9, 32, 24]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.92}
          roughness={0.15}
        />
      </mesh>

      {/* Vòm quan sát bán cầu bằng kính lượng tử */}
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.48, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#38bdf8"
          emissiveIntensity={1.8}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Lõi năng lượng phát sáng bên trong buồng lái */}
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#c084fc" emissive="#c084fc" emissiveIntensity={3} />
      </mesh>

      {/* Vành đai lượng tử xoay ngược chiều (Quantum Ring) */}
      <group ref={ringRef} position={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.58, 0.04, 16, 48]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={3}
          />
        </mesh>
        {/* 6 Hạt năng lượng đính trên vành */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i * Math.PI) / 3
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 1.58, 0, Math.sin(angle) * 1.58]}
            >
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={4} />
            </mesh>
          )
        })}
      </group>

      {/* Cụm đèn phát xạ bên dưới đĩa */}
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.35, 0.2, 0.12, 24]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} />
      </mesh>

      {/* Luồng tia lực hút (Tractor Beam) hướng xuống */}
      <mesh ref={beamRef} position={[0, -0.65, 0]}>
        <coneGeometry args={[0.65, 0.9, 24]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.5}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ── 4. CHIẾN CƠ TIA CHỚP (LIGHTNING JET) ──
const LightningMesh: React.FC = () => {
  const coreRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (coreRef.current) {
      const pulse = 2.5 + Math.sin(state.clock.elapsedTime * 15) * 1.2
      // @ts-ignore
      coreRef.current.material.emissiveIntensity = pulse
    }
  })

  return (
    <group position={[0, -0.05, 0]}>
      {/* Thân tiêm kích Delta sắc nhọn */}
      <mesh position={[0.2, 0.08, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.42, 2.1, 4]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Buồng lái dát vàng tia chớp */}
      <mesh position={[0.25, 0.24, 0]}>
        <boxGeometry args={[0.75, 0.2, 0.35]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#fbbf24"
          emissiveIntensity={1.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Cánh delta xuôi vát nhọn hình tia chớp */}
      <mesh position={[-0.2, 0.04, 0.75]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.65]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[-0.2, 0.04, -0.75]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.65]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Rìa mép cánh phát sáng năng lượng điện vàng */}
      <mesh position={[-0.2, 0.04, 1.05]}>
        <boxGeometry args={[1.0, 0.05, 0.03]} />
        <meshStandardMaterial color="#f59e0b" emissive="#fbbf24" emissiveIntensity={3.5} />
      </mesh>
      <mesh position={[-0.2, 0.04, -1.05]}>
        <boxGeometry args={[1.0, 0.05, 0.03]} />
        <meshStandardMaterial color="#f59e0b" emissive="#fbbf24" emissiveIntensity={3.5} />
      </mesh>

      {/* Hai cánh đuôi đứng kép nghiêng chữ V */}
      <mesh position={[-0.7, 0.32, 0.35]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.45, 0.55, 0.04]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.7, 0.32, -0.35]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.45, 0.55, 0.04]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.8} />
      </mesh>

      {/* Lõi năng lượng tia sét trung tâm */}
      <mesh ref={coreRef} position={[0, 0.15, 0]}>
        <octahedronGeometry args={[0.18]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fde047"
          emissiveIntensity={3}
        />
      </mesh>

      {/* Động cơ phản lực kép siêu thanh */}
      <mesh position={[-0.92, 0.06, 0.24]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.35, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={3} />
      </mesh>
      <mesh position={[-0.92, 0.06, -0.24]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.35, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={3} />
      </mesh>
    </group>
  )
}

// ── 5. MÔ TÔ ÁNH SÁNG (LIGHTCYCLE) ──
const LightCycleMesh: React.FC = () => {
  const trailRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (trailRef.current) {
      const pulse = 0.7 + Math.sin(state.clock.elapsedTime * 10) * 0.3
      // @ts-ignore
      trailRef.current.material.opacity = pulse
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* 2 Bánh xe không trục khổng lồ (Hubless Wheels) */}
      {/* Bánh trước */}
      <group position={[0.75, 0.08, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.38, 0.12, 16, 32]} />
          <meshStandardMaterial
            color="#ec4899"
            emissive="#ec4899"
            emissiveIntensity={3}
            roughness={0.2}
          />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.26, 0.26, 0.18, 24]} />
          <meshStandardMaterial color="#020617" metalness={0.95} />
        </mesh>
      </group>

      {/* Bánh sau */}
      <group position={[-0.75, 0.08, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.38, 0.12, 16, 32]} />
          <meshStandardMaterial
            color="#ec4899"
            emissive="#ec4899"
            emissiveIntensity={3}
            roughness={0.2}
          />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.26, 0.26, 0.18, 24]} />
          <meshStandardMaterial color="#020617" metalness={0.95} />
        </mesh>
      </group>

      {/* Thân mô tô bọc kín kết nối 2 bánh */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[1.3, 0.42, 0.48]} />
        <meshStandardMaterial
          color="#090d16"
          metalness={0.92}
          roughness={0.15}
        />
      </mesh>

      {/* Dải neon sống lưng uốn lượn phong cách TRON */}
      <mesh position={[0, 0.41, 0]}>
        <boxGeometry args={[1.15, 0.04, 0.06]} />
        <meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={4} />
      </mesh>

      {/* Dải neon sườn xe 2 bên */}
      <mesh position={[0, 0.18, 0.25]}>
        <boxGeometry args={[1.2, 0.03, 0.02]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0, 0.18, -0.25]}>
        <boxGeometry args={[1.2, 0.03, 0.02]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3} />
      </mesh>

      {/* Kính chắn gió vòm hẹp của tay đua */}
      <mesh position={[0.25, 0.35, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.55, 0.18, 0.32]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={1.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Vệt sáng đuôi xe (Light Wall Trail) */}
      <mesh ref={trailRef} position={[-1.25, 0.08, 0]}>
        <boxGeometry args={[0.8, 0.32, 0.04]} />
        <meshStandardMaterial
          color="#ec4899"
          emissive="#ec4899"
          emissiveIntensity={3.5}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  )
}

// ── BỆ ĐỠ HOLOGRAPHIC (HOLO PEDESTAL) ──
const HoloPedestal: React.FC = () => {
  const ringRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.45
    }
  })

  return (
    <group position={[0, -0.65, 0]}>
      {/* Vòng tròn neon bệ đỡ trung tâm */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.02, 16, 64]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={2}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Vòng ngoài xoay chậm radar */}
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.85, 0.015, 16, 48]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={1.5}
            transparent
            opacity={0.4}
          />
        </mesh>
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, i) => (
          <mesh
            key={i}
            position={[Math.cos(angle) * 1.85, 0, Math.sin(angle) * 1.85]}
          >
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#f59e0b" emissive="#fbbf24" emissiveIntensity={3} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ── CONTROLLER CHỌN RENDER PHƯƠNG TIỆN ──
const VehicleSelector: React.FC<{ avatarId: string }> = ({ avatarId }) => {
  switch (avatarId) {
    case 'rocket':
      return <RocketMesh />
    case 'cyber_car':
      return <CyberCarMesh />
    case 'quantum_saucer':
      return <QuantumSaucerMesh />
    case 'lightning':
      return <LightningMesh />
    case 'lightcycle':
      return <LightCycleMesh />
    default:
      return <CyberCarMesh />
  }
}

const VEHICLE_NAMES: Record<string, { name: string; tag: string; color: string }> = {
  rocket: { name: 'Tàu Vũ Trụ Vô Tận', tag: 'Tốc độ ánh sáng • Lướt nhanh vạn dặm', color: 'text-rose-400' },
  cyber_car: { name: 'Siêu Xe Neon Cyberpunk', tag: 'Bứt tốc ngoạn mục • Khung titan khí động', color: 'text-cyan-400' },
  quantum_saucer: { name: 'Đĩa Bay Lượng Tử', tag: 'Dịch chuyển tức thời • Đai xoay lượng tử', color: 'text-purple-400' },
  lightning: { name: 'Chiến Cơ Tia Chớp', tag: 'Nhanh như sét đánh • Cánh delta siêu thanh', color: 'text-amber-400' },
  lightcycle: { name: 'Mô Tô Ánh Sáng TRON', tag: 'Uốn lượn phong cách • Bánh xe không trục', color: 'text-pink-400' },
}

export const RacerVehicle3DCanvas: React.FC<RacerVehicle3DCanvasProps> = ({ selectedAvatar }) => {
  const [autoRotate, setAutoRotate] = useState(true)
  const controlsRef = useRef<any>(null)

  const vehicleInfo = VEHICLE_NAMES[selectedAvatar] || VEHICLE_NAMES.cyber_car

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-cyan-500/30 bg-gradient-to-b from-[#080d19]/90 via-[#0a1122]/95 to-[#060a14] shadow-2xl shadow-cyan-950/40">
      {/* Header Overlay */}
      <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 shadow-sm pointer-events-auto">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span className="text-[11px] font-black tracking-wide text-white">
            {vehicleInfo.name}
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
            3D 360°
          </span>
        </div>

        {/* Controls Quick Toolbar */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-xl border transition text-[10px] font-bold flex items-center gap-1 ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-black/50 text-white/50 border-white/10 hover:text-white'
            }`}
            title={autoRotate ? 'Đang tự xoay (Bấm để dừng)' : 'Bấm để tự xoay'}
          >
            <RotateCw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            <span className="hidden sm:inline">{autoRotate ? 'Tự xoay' : 'Dừng'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 rounded-xl bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 transition"
            title="Đặt lại góc nhìn ban đầu"
          >
            <Compass className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="w-full h-44 sm:h-48 cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ position: [2.8, 1.6, 2.8], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} color="#e0f2fe" />
          <directionalLight position={[-5, -4, -5]} intensity={0.6} color="#3b82f6" />
          <pointLight position={[0, 2, 0]} intensity={1.2} color="#38bdf8" distance={6} />

          {/* Controls: Kéo chuột / chạm xoay 360 độ */}
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={2.0}
            maxDistance={5.2}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.85}
            autoRotate={autoRotate}
            autoRotateSpeed={1.8}
            dampingFactor={0.06}
          />

          <Suspense fallback={null}>
            {/* Lơ lửng bồng bềnh */}
            <Float
              speed={2.2}
              rotationIntensity={0.3}
              floatIntensity={0.5}
              floatingRange={[-0.08, 0.08]}
            >
              <Center>
                <VehicleSelector avatarId={selectedAvatar} />
              </Center>
            </Float>

            {/* Bệ đỡ Hologram */}
            <HoloPedestal />
          </Suspense>
        </Canvas>
      </div>

      {/* Bottom Hint Footer */}
      <div className="px-3 py-1.5 bg-black/70 border-t border-white/5 flex items-center justify-between text-[10px] text-white/50">
        <span className="truncate">{vehicleInfo.tag}</span>
        <span className="text-cyan-300 font-semibold shrink-0 ml-2">
          🖱️ Kéo để xoay 360° • Cuộn phóng to
        </span>
      </div>
    </div>
  )
}

export default RacerVehicle3DCanvas