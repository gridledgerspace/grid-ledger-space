import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Stars } from '@react-three/drei'
import Object3D from './Object3D'

// Кольори для різних класів
const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff',      // Phoenix
    'interceptor': '#ff003c', // Predator
    'hauler': '#ffae00',      // Behemoth
    'explorer': '#a855f7'     // Velocity
}

// Компонент корабля
function RotatingShip({ type }: { type: string }) {
    const ref = useRef<any>(null)
    
    useFrame((state, delta) => {
        if (ref.current) {
            // Дуже повільне, презентаційне обертання
            ref.current.rotation.y += delta * 0.2 
            
            // Плавне погойдування ("дихання")
            ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
            
            // Легкий нахил для динаміки
            ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
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
    <div className="w-full h-32 md:h-40 bg-black rounded-lg overflow-hidden border border-white/10 relative shadow-inner group-hover:border-neon-cyan/30 transition-colors">
        
        {/* Тонка сітка на фоні */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
        
        <Canvas camera={{ position: [0, 1, 4], fov: 40 }}>
            <ambientLight intensity={0.5} />
            
            {/* Основне світло */}
            <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
            
            {/* Контурне світло (Rim light) під колір корабля */}
            <pointLight position={[-5, 2, -5]} intensity={2} color={SHIP_COLORS[shipClass]} />

            {/* Спокійні зірки на фоні */}
            <Stars radius={50} depth={0} count={200} factor={2} saturation={0} fade speed={0.5} />
            
            {/* Студійні відблиски */}
            <Environment preset="city" />

            <RotatingShip type={shipClass} />
        </Canvas>
    </div>
  )
}