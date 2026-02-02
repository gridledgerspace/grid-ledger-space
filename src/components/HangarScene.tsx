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
    meshRef.current.rotation.y += delta * 0.5 
    meshRef.current.rotation.z = Math.sin(_state.clock.elapsedTime * 0.5) * 0.05
  })

  return (
    <group ref={meshRef}>
        <Object3D type="player" color="#00f0ff" />
    </group>
  )
}

export default function HangarScene() {
  // 🔥 ДОДАНО: hull та maxHull
  const { credits, cargo, maxCargo, hull, maxHull } = useGameStore((state: any) => state)

  const cargoCount = Object.values(cargo as Record<string, number>).reduce((a, b) => a + b, 0)
  
  // Визначаємо колір здоров'я
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
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col">
      
      {/* 3D СЦЕНА */}
      <div className="absolute inset-0 z-0">
         <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00f0ff" />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
            
            <HangarShip />

            <OrbitControls 
                enableZoom={false} 
                enablePan={false}
                minPolarAngle={Math.PI / 2.5} 
                maxPolarAngle={Math.PI / 1.5}
            />
         </Canvas>
      </div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
          <div className="glass-panel px-6 py-3 border-l-4 border-l-neon-cyan bg-black/60 backdrop-blur-md">
              <h1 className="text-2xl font-black text-neon-cyan tracking-widest uppercase">USS-NEMESIS</h1>
              <p className="text-xs text-gray-400 font-mono mt-1">SECTOR 0:0 // HOME BASE</p>
          </div>

          <div className="flex flex-col items-end gap-2">
              <div className="glass-panel px-4 py-2 bg-black/60 border border-yellow-500/30 text-yellow-500 font-mono font-bold text-lg">
                  {credits} CR
              </div>
          </div>
      </div>

      {/* BOTTOM STATS */}
      <div className="absolute bottom-0 w-full p-6 z-10 flex flex-col items-center gap-6 pointer-events-none">
          
          {/* Картки модулів */}
          <div className="flex gap-4 overflow-x-auto max-w-full pb-2 pointer-events-auto">
              
              {/* 🔥 ОНОВЛЕНА КАРТКА: ЗДОРОВ'Я (HULL) */}
              <div className={`w-24 h-24 glass-panel border flex flex-col items-center justify-center gap-2 bg-black/80 transition-colors group ${healthPercent < 100 ? 'border-red-500/50' : 'border-neon-cyan/30 hover:border-neon-cyan'}`}>
                  <Activity className={`${iconColor} group-hover:scale-110 transition-transform`} />
                  <div className="text-[10px] text-gray-400 font-mono text-center">
                      HULL INTEGRITY<br/>
                      <span className={`${healthColor} font-bold text-sm`}>{hull}/{maxHull}</span>
                  </div>
              </div>

              <div className="w-24 h-24 glass-panel border border-neon-cyan/30 flex flex-col items-center justify-center gap-2 bg-black/80 hover:border-neon-cyan transition-colors group">
                  <Zap className="text-neon-cyan group-hover:scale-110 transition-transform" />
                  <div className="text-[10px] text-gray-400 font-mono text-center">ENGINE<br/><span className="text-white font-bold">LVL 1</span></div>
              </div>
              
              <div className="w-24 h-24 glass-panel border border-neon-orange/30 flex flex-col items-center justify-center gap-2 bg-black/80 hover:border-neon-orange transition-colors group">
                  <Crosshair className="text-neon-orange group-hover:scale-110 transition-transform" />
                  <div className="text-[10px] text-gray-400 font-mono text-center">LASER<br/><span className="text-white font-bold">MK-I</span></div>
              </div>
              
              <div className="w-24 h-24 glass-panel border border-yellow-500/30 flex flex-col items-center justify-center gap-2 bg-black/80 hover:border-yellow-500 transition-colors group">
                  <Box className="text-yellow-500 group-hover:scale-110 transition-transform" />
                  <div className="text-[10px] text-gray-400 font-mono text-center">CARGO<br/><span className={cargoCount >= maxCargo ? "text-red-500 font-bold" : "text-white font-bold"}>{cargoCount}/{maxCargo}</span></div>
              </div>
          </div>

          {/* Кнопка вильоту */}
          <button 
              onClick={() => useGameStore.setState({ status: 'map' })}
              className="pointer-events-auto bg-neon-orange text-black font-black py-4 px-12 rounded clip-path-polygon hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,174,0,0.4)] flex items-center gap-3 text-lg tracking-wider"
          >
              <Map size={20} /> OPEN STAR MAP
          </button>
      </div>

    </div>
  )
}