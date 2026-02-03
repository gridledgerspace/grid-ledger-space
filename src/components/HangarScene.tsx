import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment, Float } from '@react-three/drei'
import { useGameStore, SHIP_SPECS } from '../store'
import Object3D from './Object3D'
import { Zap, Box, Activity, Crosshair, ShoppingBag } from 'lucide-react'

// Кольори (ті самі, що в магазині)
const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff',      
    'interceptor': '#ff003c', 
    'hauler': '#ffae00',      
    'explorer': '#a855f7'     
}

function HangarShip({ shipClass }: { shipClass: string }) {
    const color = SHIP_COLORS[shipClass] || '#00f0ff'

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <group scale={1.2} rotation={[0.1, -0.5, 0]}>
                <Object3D type="player" color={color} />
                {/* Легке підсвічування кольором корабля */}
                <pointLight position={[0, 0, 1]} distance={3} intensity={1} color={color} />
            </group>
        </Float>
    )
}

export default function HangarScene() {
  const { 
      status, shipClass, hull, maxHull, cargo, maxCargo, credits, 
      setStationOpen 
  } = useGameStore((state: any) => state)

  const shipSpec = SHIP_SPECS[shipClass] || SHIP_SPECS['scout']
  const shipColor = SHIP_COLORS[shipClass] || '#00f0ff'

  if (status !== 'hangar') return null

  return (
    <div className="absolute inset-0 z-10 bg-black">
      
      {/* HEADER: Повернуто старий стиль */}
      <div className="absolute top-8 left-8 z-20 border-l-2 border-neon-cyan pl-4">
          <h1 className="text-3xl font-bold text-neon-cyan font-mono uppercase" style={{ color: shipColor }}>
              {shipSpec.name}
          </h1>
          <p className="text-gray-500 font-mono text-xs tracking-widest mt-1">
              SECTOR 0:0 // HOME BASE
          </p>
      </div>

      {/* TOP RIGHT: Кредити та кнопка Сервісів (як було раніше) */}
      <div className="absolute top-8 right-8 z-20 flex flex-col items-end gap-2">
           <div className="text-neon-orange font-mono font-bold text-xl border border-neon-orange/30 px-4 py-1 rounded bg-black/50">
               {credits.toLocaleString()} CR
           </div>
           <button 
               onClick={() => setStationOpen(true)}
               className="flex items-center gap-2 border border-neon-cyan text-neon-cyan px-4 py-2 text-xs font-bold hover:bg-neon-cyan hover:text-black transition-all"
           >
               <ShoppingBag size={14} /> STATION SERVICES
           </button>
      </div>

      {/* STATS PANEL: Повернуто квадратні бокси */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex gap-4">
          <StatBox icon={<Activity size={20}/>} label="HULL" value={`${hull}/${maxHull}`} color="text-neon-cyan" />
          <StatBox icon={<Zap size={20}/>} label="ENGINE" value={`LVL ${shipSpec.jumpRange}`} color="text-neon-cyan" />
          <StatBox icon={<Crosshair size={20}/>} label="LASER" value={`MK-1`} color="text-neon-orange" />
          <StatBox icon={<Box size={20}/>} label="CARGO" value={`${Object.values(cargo).reduce((a:any,b:any)=>a+b,0)}/${maxCargo}`} color="text-yellow-400" />
      </div>

      {/* LAUNCH BUTTON: Повернуто жовту кнопку */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
          <button 
            onClick={() => useGameStore.setState({ status: 'space' })}
            className="bg-neon-orange text-black font-bold text-lg py-3 px-12 rounded hover:bg-white transition-colors"
          >
              LAUNCH
          </button>
      </div>

      {/* 3D SCENE */}
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <color attach="background" args={['#050505']} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="white" />
        
        {/* Контурне світло під колір корабля */}
        <pointLight position={[-10, 5, -5]} intensity={2} color={shipColor} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        <Environment preset="city" />

        <HangarShip shipClass={shipClass} />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  )
}

// Повернуто старий простий стиль квадратів
function StatBox({ icon, label, value, color }: any) {
    return (
        <div className="w-20 h-24 border border-white/10 bg-black/40 flex flex-col items-center justify-center p-2 rounded backdrop-blur-sm hover:border-white/30 transition-colors">
            <div className={`mb-2 ${color}`}>{icon}</div>
            <div className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">{label}</div>
            <div className="text-white font-mono font-bold text-sm mt-1">{value}</div>
        </div>
    )
}