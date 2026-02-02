import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useGameStore } from '../store'
import Object3D from './Object3D'
import { Zap, Crosshair, Box, Map, Activity, ShoppingBag, Wrench } from 'lucide-react'

export default function HangarScene() {
  const { 
      credits, cargo, maxCargo, hull, maxHull, shipClass, 
      setStationOpen, currentSector, repairHull 
  } = useGameStore((state: any) => state)

  const cargoCount = Object.values(cargo as Record<string, number>).reduce((a, b) => a + b, 0)
  
  // === ЛОГІКА РЕМОНТУ В АНГАРІ ===
  const healthPercent = (hull / maxHull) * 100
  const isDamaged = hull < maxHull
  const damageAmount = maxHull - hull
  const repairCost = damageAmount * 10
  const canAffordRepair = credits >= repairCost

  let healthColor = "text-white"
  let iconColor = "text-neon-cyan"
  
  if (healthPercent <= 30) {
      healthColor = "text-red-500"
      iconColor = "text-red-500 animate-pulse"
  } else if (healthPercent < 100) {
      healthColor = "text-yellow-500"
      iconColor = "text-yellow-500"
  }

  const handleQuickRepair = () => {
      if (isDamaged && canAffordRepair) {
          repairHull()
      } else if (isDamaged && !canAffordRepair) {
          alert('NOT ENOUGH CREDITS FOR REPAIR!')
      }
  }

  return (
    <div className="h-[100dvh] w-full bg-space-950 relative overflow-hidden flex flex-col font-mono select-none">
      
      <div className="absolute inset-0 z-0">
         <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffae00" />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
            <group position={[0, 0, 0]}>
                <Object3D type="player" color="#00f0ff" />
            </group>
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} enablePan={false} minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 1.5} />
         </Canvas>
      </div>

      {/* === UI: HEADER === */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-10 flex justify-between items-start pointer-events-none">
          <div className="glass-panel px-4 py-2 md:px-6 md:py-3 border-l-4 border-l-neon-cyan bg-black/60 backdrop-blur-md shadow-neon min-w-[150px]">
              <h1 className="text-lg md:text-2xl font-black text-neon-cyan tracking-widest uppercase truncate">
                  {shipClass ? `USS-${shipClass.toUpperCase()}` : 'USS-NEMESIS'}
              </h1>
              <p className="text-[10px] md:text-xs text-gray-400 font-mono mt-0.5">SECTOR 0:0 // HOME BASE</p>
          </div>

          <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="glass-panel px-3 py-2 md:px-4 md:py-2 bg-black/60 border border-yellow-500/30 text-yellow-500 font-mono font-bold text-base md:text-xl shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  {credits.toLocaleString()} CR
              </div>

              {currentSector === '0:0' && (
                  <button 
                    onClick={() => setStationOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-neon-cyan/10 border border-neon-cyan/50 text-neon-cyan text-xs font-bold hover:bg-neon-cyan hover:text-black transition-all shadow-md backdrop-blur-md"
                  >
                      <ShoppingBag size={14} /> STATION SERVICES
                  </button>
              )}
          </div>
      </div>

      {/* === UI: FOOTER === */}
      <div className="absolute bottom-0 w-full z-10 flex flex-col pointer-events-none pb-6 md:pb-8 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
          
          <div className="w-full overflow-x-auto px-4 pb-4 flex justify-start md:justify-center gap-3 md:gap-6 pointer-events-auto no-scrollbar">
              
              {/* 🔥 HULL (ТЕПЕР ІНТЕРАКТИВНИЙ) */}
              <button 
                  onClick={handleQuickRepair}
                  disabled={!isDamaged}
                  className={`
                      flex-shrink-0 flex flex-col items-center justify-center gap-1 md:gap-2
                      w-20 h-20 md:w-28 md:h-28 
                      glass-panel border bg-black/80 transition-all relative group
                      ${isDamaged 
                          ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:bg-red-900/20 cursor-pointer' 
                          : 'border-neon-cyan/30 hover:border-neon-cyan cursor-default'}
                  `}
              >
                  {isDamaged && (
                      <div className="absolute top-1 right-1 bg-red-500 text-black text-[8px] px-1 rounded font-bold animate-pulse">
                          REPAIR
                      </div>
                  )}
                  
                  {isDamaged ? (
                      // Іконка ключа при наведенні або пошкодженні
                      <div className="group-hover:hidden">
                          <Activity className={`w-5 h-5 md:w-8 md:h-8 ${iconColor}`} />
                      </div>
                  ) : (
                      <Activity className={`w-5 h-5 md:w-8 md:h-8 ${iconColor}`} />
                  )}
                  
                  {isDamaged && (
                      <div className="hidden group-hover:block text-red-500 animate-bounce">
                          <Wrench size={24} />
                      </div>
                  )}

                  <div className="text-[9px] md:text-xs text-gray-400 text-center leading-tight group-hover:opacity-100">
                      {isDamaged ? (
                          <span className="text-red-400 group-hover:hidden">DAMAGED</span>
                      ) : (
                          "HULL"
                      )}
                      
                      {/* При наведенні показуємо ціну */}
                      <div className="hidden group-hover:block text-yellow-500 font-bold text-[10px]">
                          -{repairCost} CR
                      </div>
                      
                      <span className={`block group-hover:hidden ${healthColor} font-bold text-xs md:text-sm`}>
                          {hull}/{maxHull}
                      </span>
                  </div>
              </button>

              {/* ENGINE (Без змін) */}
              <div className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 glass-panel border border-neon-cyan/30 flex flex-col items-center justify-center gap-1 md:gap-2 bg-black/80 hover:border-neon-cyan transition-all">
                  <Zap className="w-5 h-5 md:w-8 md:h-8 text-neon-cyan" />
                  <div className="text-[9px] md:text-xs text-gray-400 text-center leading-tight">
                      ENGINE<br/><span className="text-white font-bold text-xs md:text-sm">LVL 1</span>
                  </div>
              </div>
              
              {/* LASER (Без змін) */}
              <div className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 glass-panel border border-neon-orange/30 flex flex-col items-center justify-center gap-1 md:gap-2 bg-black/80 hover:border-neon-orange transition-all">
                  <Crosshair className="w-5 h-5 md:w-8 md:h-8 text-neon-orange" />
                  <div className="text-[9px] md:text-xs text-gray-400 text-center leading-tight">
                      LASER<br/><span className="text-white font-bold text-xs md:text-sm">MK-I</span>
                  </div>
              </div>
              
              {/* CARGO (Без змін) */}
              <div className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 glass-panel border border-yellow-500/30 flex flex-col items-center justify-center gap-1 md:gap-2 bg-black/80 hover:border-yellow-500 transition-all">
                  <Box className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" />
                  <div className="text-[9px] md:text-xs text-gray-400 text-center leading-tight">
                      CARGO<br/>
                      <span className={`font-bold text-xs md:text-sm ${cargoCount >= maxCargo ? "text-red-500" : "text-white"}`}>
                          {cargoCount}/{maxCargo}
                      </span>
                  </div>
              </div>
          </div>

          <div className="px-4 w-full flex justify-center pointer-events-auto mt-2">
              <button 
                  onClick={() => useGameStore.setState({ status: 'map' })}
                  className="w-full md:w-auto bg-neon-orange text-black font-black py-4 md:py-4 md:px-16 rounded clip-path-polygon hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,174,0,0.4)] flex items-center justify-center gap-3 text-lg tracking-wider uppercase"
              >
                  <Map size={20} /> LAUNCH
              </button>
          </div>
      </div>

    </div>
  )
}