import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
// 👇 ДОДАЛИ слово 'type'
import type { EntityType } from '../store'

interface Props {
  type: EntityType 
  color: string
}

export default function Object3D({ type, color }: Props) {
  const meshRef = useRef<any>(null)

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2
      if (type !== 'station' && type !== 'player') {
          meshRef.current.rotation.x += delta * 0.1
      }
    }
  })

  switch (type) {
    case 'asteroid':
      return (
        <mesh ref={meshRef}>
          <dodecahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial color={color} wireframe />
        </mesh>
      )
    
    case 'enemy':
      return (
        <mesh ref={meshRef}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} wireframe />
        </mesh>
      )

    case 'station':
      return (
        <mesh ref={meshRef}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color={color} wireframe />
        </mesh>
      )

    case 'container':
      return (
        <mesh ref={meshRef}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color={color} wireframe />
        </mesh>
      )

    case 'player':
      return (
        <mesh ref={meshRef} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.5, 1.5, 4]} />
          <meshStandardMaterial color={color} wireframe />
        </mesh>
      )

    default:
      return (
        <mesh ref={meshRef}>
          <tetrahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={color} wireframe />
        </mesh>
      )
  }
}