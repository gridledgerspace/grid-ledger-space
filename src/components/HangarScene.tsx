import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Mesh } from 'three'
import { OrbitControls, Stars } from '@react-three/drei'

// Цей компонент — сам 3D об'єкт (поки що куб)
function RotatingCore() {
  const meshRef = useRef<Mesh>(null!)

  // Анімація: обертання в кожному кадрі
  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 0.5
    meshRef.current.rotation.x += delta * 0.2
  })

  return (
    <mesh ref={meshRef}>
      {/* Геометрія: Куб */}
      <boxGeometry args={[2.5, 2.5, 2.5]} />
      {/* Матеріал: Неонова сітка (Wireframe) */}
      <meshStandardMaterial 
        color="#00f0ff" 
        wireframe={true}
        emissive="#00f0ff"
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

// Головна сцена ангару
export default function HangarScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 6] }}>
        {/* Світло */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffae00" />
        
        {/* Фон: Зірки */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Корабель */}
        <RotatingCore />
        
        {/* Управління камерою мишкою */}
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  )
}