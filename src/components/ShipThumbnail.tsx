import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Sparkles } from '@react-three/drei'
import Object3D from './Object3D'

// Тимчасові кольори для різних класів, щоб вони відрізнялися візуально
const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff',      // Phoenix (Блакитний)
    'interceptor': '#ff003c', // Predator (Червоний)
    'hauler': '#ffae00',      // Behemoth (Помаранчевий)
    'explorer': '#a855f7'     // Velocity (Фіолетовий)
}

// Компонент корабля, що обертається
function RotatingShip({ type }: { type: string }) {
    const ref = useRef<any>(null)
    
    useFrame((state, delta) => {
        if (ref.current) {
            // Повільне обертання по осі Y
            ref.current.rotation.y += delta * 0.4
            // Легке погойдування для динаміки
            ref.current.position.y = Math.sin(state.clock.elapsedTime) * 0.05
        }
    })

    // Визначаємо колір на основі класу корабля
    const color = SHIP_COLORS[type] || '#ffffff'

    return (
        <group ref={ref} scale={1.2}>
            {/* Тут ми використовуємо стандартну модель гравця, але змінюємо колір */}
            <Object3D type="player" color={color} />
            
            {/* Додаємо трохи блискіток для ефекту "нового" корабля */}
            <Sparkles count={20} scale={2} size={1} speed={0.4} color={color} opacity={0.5} />
        </group>
    )
}

export default function ShipThumbnail({ shipClass }: { shipClass: string }) {
  return (
    // Контейнер для 3D сцени
    <div className="w-full h-32 md:h-40 bg-space-950 rounded-lg overflow-hidden border border-white/10 relative shadow-inner">
        
        {/* Декоративна сітка на фоні */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>
        
        <Canvas camera={{ position: [0, 1, 3.5], fov: 45 }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
            <pointLight position={[-5, -5, -5]} intensity={0.5} color={SHIP_COLORS[shipClass]} />
            
            {/* Додаємо "студійне" освітлення */}
            <Environment preset="city" />

            <RotatingShip type={shipClass} />
        </Canvas>
    </div>
  )
}