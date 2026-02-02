import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useGameStore } from '../store'
import Object3D from './Object3D'
import { Shield, Zap, Crosshair, Box, Map, Activity } from 'lucide-react'

// === КОРАБЕЛЬ (Обертання тільки по горизонталі) ===
function HangarShip() {
  const meshRef = useRef<any>(null)

  useFrame((_state, delta) => {
    if (!meshRef.current) return
    // Обертання корабля (презентація)
    meshRef.current.rotation.y += delta * 0.3 
    // Легке похитування (імітація невагомості)
    meshRef.current.rotation.z = Math.sin(_state.clock.elapsedTime * 0.5) * 0.05
  })

  return (
    <group ref={meshRef}>
        <Object3D type="player" color="#00f0ff" />
    </group>
  )
}

// === ЗІРКИ (Повільно обертаються навколо, створюючи динаміку) ===
function MovingStars() {
    const starsRef = useRef<any>(null)
    useFrame((_state, delta) => {
        if (starsRef.current) {
            starsRef.current.rotation.y -= delta * 0.05 // Повільний дрейф фону
        }
    })
    return (
        <group ref={starsRef}>
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        </group>
    )
}

export default function HangarScene() {
  const { credits, cargo, maxCargo, hull, maxHull } = useGameStore((state: any) => state)

  const cargoCount = Object.values(cargo as Record<string, number>).reduce((a, b) => a + b, 0)
  
  // Кольори для здоров'я
  const healthPercent = (hull / maxHull) * 100
  let healthColor = "text-white"
  let iconColor = "text-neon-cyan"
  
  if (healthPercent <= 30) {
      healthColor = "text-red-500"
      iconColor = "text-red-500 animate-pulse"
  } else if (healthPercent < 100) {
      healthColor = "text-yellow-500"
      iconColor = "text-yellow-500"
  }

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col font-mono">
      
      {/* 3D СЦЕНА */}
      <div className="absolute inset-0 z-0">
         <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00f0ff" />
            
            {/* Рухомі зірки */}
            <MovingStars />
            
            <HangarShip />

            {/* OrbitControls: дозволяє крутити мишкою, але без авто-обертання камери */}
            <OrbitControls 
                enableZoom={false} 
                enablePan={false}
                minPolarAngle={Math.PI / 2.5} 
                maxPolarAngle={Math.PI / 1.5}
            />
         </Canvas>
      </div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-10 flex justify-between items-start pointer-events-none">
          <div className="glass-panel px-6 py-3 border-l-4 border-l-neon-cyan bg-black/60 backdrop-blur-md shadow-neon">
              <h1 className="text-xl md:text-2xl font-black text-neon-cyan tracking-widest uppercase">USS-NEMESIS</h1>
              <p className="text-[10px] md:text-xs text-gray-400 font-mono mt-1">SECTOR 0:0 // HOME BASE</p>
          </div>

          <div className="glass-panel px-4 py-2 bg-black/60 border border-yellow-500/30 text-yellow-500 font-mono font-bold text-lg md:text-xl shadow-[0_0_15px_rgba(234,179,8,0.2)]">
              {credits} CR
          </div>
      </div>

      {/* BOTTOM UI (Виправлена верстка) */}
      <div className="absolute bottom-0 w-full z-10 flex flex-col items-center pointer-events-none">
          
          {/* Панель модулів */}
          <div className="flex gap-3 md:gap-4 overflow-x-auto max-w-full p-4 pb-6 pointer-events-auto items-center justify-center">
              
              {/* HULL */}
              <div className={`w-20 h-20 md:w-24 md:h-24 glass-panel border flex flex-col items-center justify-center gap-1 md:gap-2 bg-black/80 transition-all group hover:scale-105 ${healthPercent < 100 ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-neon-cyan/30 hover:border-neon-cyan'}`}>
                  <Activity size={20} className={`${iconColor} group-hover:scale-110 transition-transform`} />
                  <div className="text-[9px] md:text-[10px] text-gray-400 font-mono text-center leading-tight">
                      HULL<br/>
                      <span className={`${healthColor} font-bold text-xs md:text-sm`}>{hull}/{maxHull}</span>
                  </div>
              </div>

              {/* ENGINE */}
              <div className="w-20 h-20 md:w-24 md:h-24 glass-panel border border-neon-cyan/30 flex flex-col items-center justify-center gap-1 md:gap-2 bg-black/80 hover:border-neon-cyan transition-all group hover:scale-105">
                  <Zap size={20} className="text-neon-cyan group-hover:scale-110 transition-transform" />
                  <div className="text-[9px] md:text-[10px] text-gray-400 font-mono text-center leading-tight">ENGINE<br/><span className="text-white font-bold text-xs md:text-sm">LVL 1</span></div>
              </div>
              
              {/* LASER */}
              <div className="w-20 h-20 md:w-24 md:h-24 glass-panel border border-neon-orange/30 flex flex-col items-center justify-center gap-1 md:gap-2 bg-black/80 hover:border-neon-orange transition-all group hover:scale-105">
                  <Crosshair size={20} className="text-neon-orange group-hover:scale-110 transition-transform" />
                  <div className="text-[9px] md:text-[10px] text-gray-400 font-mono text-center leading-tight">LASER<br/><span className="text-white font-bold text-xs md:text-sm">MK-I</span></div>
              </div>
              
              {/* CARGO */}
              <div className="w-20 h-20 md:w-24 md:h-24 glass-panel border border-yellow-500/30 flex flex-col items-center justify-center gap-1 md:gap-2 bg-black/80 hover:border-yellow-500 transition-all group hover:scale-105">
                  <Box size={20} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                  <div className="text-[9px] md:text-[10px] text-gray-400 font-mono text-center leading-tight">CARGO<br/><span className={`font-bold text-xs md:text-sm ${cargoCount >= maxCargo ? "text-red-500" : "text-white"}`}>{cargoCount}/{maxCargo}</span></div>
              </div>
          </div>

          {/* Головна кнопка (зробив її частиною нижньої панелі для стабільності) */}
          <div className="w-full bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-0 flex justify-center pointer-events-auto">
              <button 
                  onClick={() => useGameStore.setState({ status: 'map' })}
                  className="bg-neon-orange text-black font-black py-4 px-16 rounded clip-path-polygon hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,174,0,0.4)] flex items-center gap-3 text-lg tracking-wider uppercase"
              >
                  <Map size={20} /> Launch
              </button>
          </div>
      </div>

    </div>
  )
}