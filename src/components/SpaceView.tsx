import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useGameStore } from '../store'
import Object3D from './Object3D'
import StationMenu from './StationMenu'
import { Navigation, Scan, Pickaxe, Skull, Database, Home, ShoppingBag, ArrowLeftCircle, Box, Trash2, Crosshair } from 'lucide-react'

// Компонент для фонових сигналів (інші об'єкти в секторі)
function BackgroundSignals({ objects, currentId }: { objects: any[], currentId: string | null }) {
    // Фільтруємо об'єкт, який зараз перед нами, щоб не дублювати його
    const others = objects.filter(o => o.id !== currentId)

    return (
        <group>
            {others.map((obj, i) => {
                // Генеруємо випадкову позицію на сфері навколо гравця
                // Використовуємо індекс для стабільності позиції
                const angle = (i / others.length) * Math.PI * 2
                const radius = 15 // Радіус орбіти фонових сигналів
                const x = Math.cos(angle) * radius
                const z = Math.sin(angle) * radius
                const y = Math.sin(angle * 3) * 5 // Трохи хвилеподібно по висоті

                return (
                    <mesh key={obj.id} position={[x, y, z]}>
                        <sphereGeometry args={[0.2, 8, 8]} />
                        <meshBasicMaterial color="#555" wireframe />
                        {/* Лінія до "землі" для стилю тактичної карти */}
                        <lineSegments>
                            <bufferGeometry />
                            <lineBasicMaterial color="#222" />
                        </lineSegments>
                    </mesh>
                )
            })}
        </group>
    )
}

export default function SpaceView() {
  const { 
      currentSector, 
      localObjects, 
      scanSystem, 
      mineObject, 
      startCombat, 
      inCombat, 
      combatLog,
      openContainer 
  } = useGameStore()
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [showStationMenu, setShowStationMenu] = useState(false)
  
  const logEndRef = useRef<HTMLDivElement>(null)
  const selectedObj = localObjects.find(o => o.id === selectedId)

  // 1. АВТОМАТИЧНИЙ ВИБІР НАЙБЛИЖЧОГО ОБ'ЄКТА ПРИ ВХОДІ
  useEffect(() => {
      // Якщо об'єкти є, але нічого не вибрано - обираємо перший (зазвичай найближчий або станцію)
      if (localObjects.length > 0 && !selectedId) {
          handleSelect(localObjects[0].id)
      }
  }, [localObjects, selectedId])

  useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [combatLog])

  const handleSelect = (id: string) => {
    if (id === selectedId) return
    setIsSwitching(true)
    setSelectedId(id)
    setTimeout(() => setIsSwitching(false), 500)
  }

  const getObjectColor = (type: string) => {
    switch (type) {
      case 'enemy': return '#ff003c'
      case 'asteroid': return '#00f0ff'
      case 'station': return '#ffffff'
      case 'container': return '#ffd700'
      case 'debris': return '#888888'
      default: return '#555555'
    }
  }

  const getIcon = (type: string) => {
      switch(type) {
          case 'asteroid': return <Database size={14} className="text-neon-cyan"/>
          case 'enemy': return <Skull size={14} className="text-neon-red"/>
          case 'station': return <Home size={14} className="text-white"/>
          case 'container': return <Box size={14} className="text-yellow-400"/>
          case 'debris': return <Trash2 size={14} className="text-gray-500"/>
          default: return <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse"/>
      }
  }

  return (
    <div className="h-screen w-full bg-space-950 relative overflow-hidden flex">
      
      {/* 3D СЦЕНА */}
      <div className="absolute inset-0 z-0">
         <Canvas camera={{ position: [0, 0, 8], fov: 60 }}> {/* Трохи віддалили камеру для ефекту */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffae00" />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
            
            {/* ГОЛОВНИЙ ОБ'ЄКТ (З ефектом прильоту) */}
            {selectedObj && !isSwitching && selectedObj.scanned && (
                <Object3D type={selectedObj.type} color={getObjectColor(selectedObj.type)} />
            )}

            {/* ФОНОВІ СИГНАЛИ (Інші об'єкти на відстані) */}
            <BackgroundSignals objects={localObjects} currentId={selectedId} />
            
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={inCombat ? 0.2 : 0.5} />
         </Canvas>
      </div>

      {isSwitching && (
          <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-t-neon-cyan border-r-transparent border-b-neon-cyan border-l-transparent rounded-full animate-spin" />
                  <div className="text-neon-cyan font-mono text-xl animate-pulse tracking-widest">
                      APPROACHING TARGET...
                  </div>
              </div>
          </div>
      )}

      {showStationMenu && <StationMenu onClose={() => setShowStationMenu(false)} />}

      {/* ЦЕНТРАЛЬНИЙ HUD */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
         
         {/* ВЕРХ */}
         <div className={`text-center transition-opacity duration-500 ${inCombat ? 'opacity-0' : 'opacity-100'}`}>
             <h1 className="text-4xl font-mono text-neon-cyan font-bold tracking-widest drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                 SECTOR {currentSector}
             </h1>
             <p className="text-xs text-gray-500 font-mono">SYSTEM SCAN COMPLETE</p>
         </div>

         {/* ЦЕНТР */}
         <div className="flex items-center justify-center pointer-events-auto">
            {selectedObj && !inCombat ? (
                <div className={`glass-panel p-6 border border-neon-cyan/30 rounded-xl text-center min-w-[300px] transition-all duration-500 ${isSwitching ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                    <h2 className="text-2xl font-bold font-mono text-white mb-1">
                        {selectedObj.scanned ? selectedObj.type.toUpperCase() : 'UNKNOWN SIGNAL'}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono mb-6">
                        DISTANCE: <span className="text-neon-cyan">{selectedObj.distance} KM</span> (APPROACHING)
                    </p>

                    <div className="flex flex-col gap-3">
                        {!selectedObj.scanned && (
                            <button onClick={scanSystem} className="py-3 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2">
                                <Scan size={18}/> ANALYZE SIGNATURE
                            </button>
                        )}

                        {selectedObj.scanned && selectedObj.type === 'station' && (
                            <>
                                <button onClick={() => setShowStationMenu(true)} className="py-3 bg-neon-orange/20 border border-neon-orange text-neon-orange hover:bg-neon-orange hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2">
                                    <ShoppingBag size={18}/> OPEN MARKET
                                </button>
                                <button onClick={() => useGameStore.setState({ status: 'hangar' })} className="py-3 border border-white/20 text-gray-300 hover:bg-white/10 font-mono transition-all flex items-center justify-center gap-2">
                                    <ArrowLeftCircle size={18}/> DOCK
                                </button>
                            </>
                        )}

                        {selectedObj.scanned && selectedObj.type === 'asteroid' && (
                            <button onClick={() => mineObject(selectedObj.id)} className="py-3 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2">
                                <Pickaxe size={18}/> MINE RESOURCES
                            </button>
                        )}

                        {selectedObj.scanned && selectedObj.type === 'enemy' && (
                            <button onClick={() => startCombat(selectedObj.id)} className="py-3 bg-neon-red/20 border border-neon-red text-neon-red hover:bg-neon-red hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2">
                                <Skull size={18}/> ENGAGE HOSTILE
                            </button>
                        )}

                        {selectedObj.scanned && selectedObj.type === 'container' && (
                            <button onClick={() => openContainer(selectedObj.id)} className="py-3 bg-yellow-500/20 border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2">
                                <Box size={18}/> COLLECT REWARD
                            </button>
                        )}

                         {selectedObj.scanned && selectedObj.type === 'debris' && (
                            <div className="text-gray-500 font-mono text-xs">
                                WRECKAGE TOO DAMAGED TO SALVAGE
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
         </div>
         <div className="h-10"></div>
      </div>

      {/* ПРАВА ПАНЕЛЬ */}
      <div className="w-80 glass-panel border-l border-neon-cyan/30 flex flex-col z-20 bg-space-950/90 backdrop-blur-md">
          
          <div className={`p-4 border-b ${inCombat ? 'border-neon-red/50 bg-neon-red/10' : 'border-white/10'}`}>
              <h2 className={`${inCombat ? 'text-neon-red animate-pulse' : 'text-neon-cyan'} font-mono font-bold flex items-center gap-2`}>
                  {inCombat ? <Skull size={16}/> : <Crosshair size={16}/>}
                  {inCombat ? 'COMBAT LOG' : 'SYSTEM OVERVIEW'}
              </h2>
              {!inCombat && (
                  <div className="text-[10px] text-gray-500 font-mono mt-1">
                      SIGNATURES DETECTED: {localObjects.length}
                  </div>
              )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              
              {inCombat ? (
                  <div className="flex flex-col gap-1 font-mono text-xs p-2">
                      {combatLog.map((log, i) => (
                          <div key={i} className="text-neon-red border-b border-neon-red/10 pb-1 opacity-80">
                              {log}
                          </div>
                      ))}
                      <div ref={logEndRef} />
                  </div>
              ) : (
                  localObjects.map(obj => (
                    <button 
                        key={obj.id}
                        onClick={() => handleSelect(obj.id)}
                        className={`w-full p-3 rounded border text-left flex items-center gap-3 transition-all group relative overflow-hidden
                            ${selectedId === obj.id 
                                ? 'bg-neon-cyan/10 border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]' 
                                : 'bg-transparent border-white/5 hover:bg-white/5 hover:border-white/20'}
                        `}
                    >
                        {selectedId === obj.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-cyan"/>}
                        
                        <div className={`p-2 rounded bg-space-900 border border-white/10 ${selectedId === obj.id ? 'text-neon-cyan' : 'text-gray-500 group-hover:text-white'}`}>
                            {obj.scanned ? getIcon(obj.type) : <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse"/>}
                        </div>
                        
                        <div>
                            <div className={`text-xs font-mono font-bold ${selectedId === obj.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                {obj.scanned ? obj.type.toUpperCase() : 'UNKNOWN'}
                            </div>
                            <div className="text-[10px] text-gray-600 font-mono">
                                {obj.distance} KM
                            </div>
                        </div>
                    </button>
                  ))
              )}
          </div>

          {!inCombat && (
              <div className="p-4 border-t border-white/10">
                  <button 
                    onClick={() => useGameStore.setState({ status: 'map' })}
                    className="w-full py-3 bg-space-800 border border-gray-600 text-gray-300 font-mono hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 text-xs"
                  >
                      <Navigation size={14}/> OPEN STAR MAP
                  </button>
              </div>
          )}
      </div>
    </div>
  )
}