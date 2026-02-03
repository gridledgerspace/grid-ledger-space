import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment, Float } from '@react-three/drei'
import { useGameStore, SHIP_SPECS } from '../store'
import Object3D from './Object3D'
import { Zap, Box, Activity, Crosshair } from 'lucide-react'

// Ті самі кольори, що і в магазині
const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff',      
    'interceptor': '#ff003c', 
    'hauler': '#ffae00',      
    'explorer': '#a855f7'     
}

function HangarShip({ shipClass }: { shipClass: string }) {
    // Визначаємо колір для поточного класу
    const color = SHIP_COLORS[shipClass] || '#00f0ff'

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <group scale={1.5} rotation={[0.1, -0.5, 0]}>
                {/* Передаємо правильний колір у модель */}
                <Object3D type="player" color={color} />
                
                {/* Додаємо світіння двигуна відповідного кольору */}
                <pointLight position={[0, 0, 2]} distance={3} intensity={2} color={color} />
            </group>
        </Float>
    )
}

export default function HangarScene() {
  const { status, shipClass, hull, maxHull, cargo, maxCargo } = useGameStore((state: any) => state)

  // Отримуємо дані про поточний корабель
  const shipSpec = SHIP_SPECS[shipClass] || SHIP_SPECS['scout']
  const shipName = shipSpec.name
  const shipColor = SHIP_COLORS[shipClass] || '#00f0ff'

  if (status !== 'hangar') return null

  return (
    <div className="absolute inset-0 z-10 bg-black">
      
      {/* HEADER: Назва корабля */}
      <div className="absolute top-8 left-8 z-20">
          <div className="border-l-4 pl-4" style={{ borderColor: shipColor }}>
              <h1 className="text-4xl font-black text-white font-mono tracking-tighter uppercase" style={{ textShadow: `0 0 20px ${shipColor}` }}>
                  {shipName}
              </h1>
              <p className="text-gray-400 font-mono text-sm tracking-widest uppercase mt-1">
                  SECTOR 0:0 // HOME BASE
              </p>
          </div>
      </div>

      {/* STATS PANEL (Bottom) */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex gap-4">
          <StatBadge icon={<Activity/>} label="HULL" value={`${hull}/${maxHull}`} color="text-green-400" border="border-green-500/30" />
          <StatBadge icon={<Zap/>} label="ENGINE" value={`LVL ${shipSpec.jumpRange}`} color="text-purple-400" border="border-purple-500/30" />
          <StatBadge icon={<Crosshair/>} label="HARDPOINTS" value={`${shipSpec.maxSlots}`} color="text-red-400" border="border-red-500/30" />
          <StatBadge icon={<Box/>} label="CARGO" value={`${Object.values(cargo).reduce((a:any,b:any)=>a+b,0)}/${maxCargo}`} color="text-yellow-400" border="border-yellow-500/30" />
      </div>

      {/* LAUNCH BUTTON */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
          <button 
            onClick={() => useGameStore.setState({ status: 'space' })}
            className="bg-neon-orange text-black font-black text-xl py-4 px-12 rounded hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,165,0,0.4)] tracking-widest uppercase clip-path-polygon"
          >
              LAUNCH
          </button>
      </div>

      {/* 3D SCENE */}
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <color attach="background" args={['#050505']} />
        
        {/* Освітлення */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="white" />
        <pointLight position={[-10, 5, -5]} intensity={2} color={shipColor} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        <Environment preset="city" />

        {/* Корабель */}
        <HangarShip shipClass={shipClass} />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  )
}

function StatBadge({ icon, label, value, color, border }: any) {
    return (
        <div className={`w-24 h-24 bg-black/60 backdrop-blur-md border ${border} flex flex-col items-center justify-center p-2 rounded transition-all hover:bg-white/5`}>
            <div className={`${color} mb-1`}>{icon}</div>
            <div className="text-[10px] text-gray-500 font-bold tracking-wider">{label}</div>
            <div className="text-white font-mono font-bold text-lg">{value}</div>
        </div>
    )
}