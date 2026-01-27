import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, Vector3 } from 'three' //

interface Object3DProps {
  type: 'asteroid' | 'enemy' | 'station' | 'empty' | 'debris' | 'container'
  color: string
}

export default function Object3D({ type, color }: Object3DProps) {
  const meshRef = useRef<Mesh>(null!)
  
  // Початкова позиція "глибоко" в екрані для ефекту прильоту
  const targetPos = new Vector3(0, 0, 0)
  
  useEffect(() => {
      // При монтуванні (зміні типу) відкидаємо об'єкт назад
      if (meshRef.current) {
          meshRef.current.position.z = -50 // Далеко
          meshRef.current.scale.set(0.1, 0.1, 0.1) // Маленький
      }
  }, [type]) // Спрацьовує при зміні типу об'єкта

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // 1. Анімація обертання (постійна)
    const speed = type === 'debris' ? 0.05 : 0.2
    meshRef.current.rotation.y += delta * speed
    meshRef.current.rotation.x += delta * (speed / 2)

    // 2. ЕФЕКТ ЗБЛИЖЕННЯ (Lerp - лінійна інтерполяція)
    // Плавно наближаємо позицію Z до 0
    meshRef.current.position.z += (0 - meshRef.current.position.z) * delta * 5
    
    // Плавно збільшуємо масштаб до 1
    meshRef.current.scale.x += (1 - meshRef.current.scale.x) * delta * 5
    meshRef.current.scale.y += (1 - meshRef.current.scale.y) * delta * 5
    meshRef.current.scale.z += (1 - meshRef.current.scale.z) * delta * 5
  })

  const getGeometry = () => {
    switch (type) {
      case 'station': return <icosahedronGeometry args={[2.2, 0]} />
      case 'enemy': return <octahedronGeometry args={[2, 0]} />
      case 'asteroid': return <dodecahedronGeometry args={[2, 0]} />
      case 'debris': return <tetrahedronGeometry args={[1.5, 0]} /> 
      case 'container': return <boxGeometry args={[1.2, 1.2, 1.2]} />
      default: return null
    }
  }

  if (type === 'empty') return null

  return (
    <mesh ref={meshRef}>
      {getGeometry()}
      <meshStandardMaterial 
        color={color} 
        wireframe={true}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}