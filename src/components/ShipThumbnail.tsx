import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import Object3D from './Object3D'

const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff',      
    'interceptor': '#ff003c', 
    'hauler': '#ffae00',      
    'explorer': '#a855f7'     
}

function RotatingShip({ type }: { type: string }) {
    const ref = useRef<any>(null)
    
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.2 
            ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
        }
    })

    const color = SHIP_COLORS[type] || '#ffffff'

    return (
        <group ref={ref} scale={1.1} rotation={[0.2, 0, 0]}>
            <Object3D type="player" color={color} />
        </group>
    )
}

export default function ShipThumbnail({ shipClass }: { shipClass: string }) {
  return (
    <div className="w-full h-32 md:h-40 bg-space-900/50 rounded-lg overflow-hidden border border-white/10 relative shadow-inner group-hover:border-neon-cyan/30 transition-colors">
        
        {/* 🔥 ПОВЕРНУЛИ СІТКУ (Технічний стиль) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
        
        {/* Радіальний градієнт для глибини */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] pointer-events-none"></div>

        <Canvas camera={{ position: [0, 1, 4], fov: 40 }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
            <pointLight position={[-5, 2, -5]} intensity={2} color={SHIP_COLORS[shipClass]} />
            
            <Environment preset="city" />

            <RotatingShip type={shipClass} />
        </Canvas>
    </div>
  )
}