import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useGameStore } from '../store'
import Object3D from './Object3D'
import { Shield, Zap, Crosshair, Box, Map, Activity } from 'lucide-react'

// === 1. РУХОМИЙ ФОН (Зірки обертаються) ===
function MovingStars() {
    const starsRef = useRef<any>(null)
    
    useFrame((_state, delta) => {
        if (starsRef.current) {
            // Обертаємо всю сферу зірок
            starsRef.current.rotation.y -= delta * 0.03 
            starsRef.current.rotation.x += delta * 0.01 
        }
    })

    return (
        <group ref={starsRef}>
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        </group>
    )
}

// === 2. КОРАБЕЛЬ (Тільки горизонтальне обертання) ===
function HangarShip() {
  const meshRef = useRef<any>(null)

  useFrame((_state, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.3 
    // Легкий дрейф вверх-вниз
    meshRef.current.position.y = Math.sin(_state.clock.elapsedTime * 0.5) * 0.1
  })

  return (
    <group ref={meshRef}>
        <Object3D type="player" color="#00f0ff" />
    </group>
  )
}

export default function HangarScene() {
  const { credits, cargo, maxCargo, hull, maxHull, shipClass } = useGameStore((state: any) => state)

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
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col font-mono select-none">
      
      {/* 3D СЦЕНА */}
      <div className="absolute inset-0 z-0">
         <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00f0ff" />
            
            <MovingStars />
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
      <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-start pointer-events-none">
          <div className="glass-panel px-4 py-2 border-l-4 border-l-neon-cyan bg-black/60 backdrop-blur-md shadow-neon">
              <h1 className="text-xl font-black text-neon-cyan tracking-widest uppercase">
                  {/* Відображаємо реальний клас корабля або дефолтну назву */}
                  {shipClass ? `USS-${shipClass.toUpperCase()}` : 'USS-NEMESIS'}
              </h1>
              <p className="text-[10px] text-gray-400 font-mono">SECTOR 0:0 // HOME BASE</p>
          </div>

          <div className="glass-panel px-3 py-2 bg-black/60 border border-yellow-500/30 text-yellow-500 font-mono font-bold text-lg shadow-[0_0_15px_rgba(234,179,8,0.2)]">
              {credits} CR
          </div>
      </div>

      {/* FOOTER & STATS */}
      <div className="absolute bottom-0 w-full z-10 flex flex-col pointer-events-none">
          
          {/* Стрічка модулів (Горизонтальний скрол) */}
          {/* pointer-events-auto потрібен, щоб можна було скролити цей блок */}
          <div className="w-full overflow-x-auto pb-4 px-4 flex justify-start md:justify-center gap-3 pointer-events-auto no-scrollbar">
              
              {/* CARD: HULL */}
              <div className={`w-20 h-20 flex-shrink-0 glass-panel border flex flex-col items-center justify-center gap-1 bg-black/80 transition-all ${healthPercent < 100 ? 'border-red-500/50' : 'border-neon-cyan/30'}`}>
                  <Activity size={18} className={iconColor} />
                  <div className="text-[9px] text-gray-400 text-center leading-tight">
                      HULL<br/>
                      <span className={`${healthColor} font-bold`}>{hull}/{maxHull}</span>
                  </div>
              </div>

              {/* CARD: ENGINE */}
              <div className="w-20 h-20 flex-shrink-0 glass-panel border border-neon-cyan/30 flex flex-col items-center justify-center gap-1 bg-black/80">
                  <Zap size={18} className="text-neon-cyan" />
                  <div className="text-[9px] text-gray-400 text-center leading-tight">ENGINE<br/><span className="text-white font-bold">LVL 1</span></div>
              </div>
              
              {/* CARD: LASER */}
              <div className="w-20 h-20 flex-shrink-0 glass-panel border border-neon-orange/30 flex flex-col items-center justify-center gap-1 bg-black/80">
                  <Crosshair size={18} className="text-neon-orange" />
                  <div className="text-[9px] text-gray-400 text-center leading-tight">LASER<br/><span className="text-white font-bold">MK-I</span></div>
              </div>
              
              {/* CARD: CARGO */}
              <div className="w-20 h-20 flex-shrink-0 glass-panel border border-yellow-500/30 flex flex-col items-center justify-center gap-1 bg-black/80">
                  <Box size={18} className="text-yellow-500" />
                  <div className="text-[9px] text-gray-400 text-center leading-tight">CARGO<br/><span className={`font-bold ${cargoCount >= maxCargo ? "text-red-500" : "text-white"}`}>{cargoCount}/{maxCargo}</span></div>
              </div>
          </div>

          {/* Кнопка запуску */}
          <div className="w-full p-4 pt-0 flex justify-center pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent">
              <button 
                  onClick={() => useGameStore.setState({ status: 'map' })}
                  className="w-full md:w-auto bg-neon-orange text-black font-black py-4 px-12 rounded clip-path-polygon hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,174,0,0.4)] flex items-center justify-center gap-3 text-lg tracking-wider uppercase"
              >
                  <Map size={20} /> OPEN STAR MAP
              </button>
          </div>
      </div>

    </div>
  )
}