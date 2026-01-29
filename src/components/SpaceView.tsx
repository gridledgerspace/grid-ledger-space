import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useGameStore } from '../store'
import Object3D from './Object3D'
import StationMenu from './StationMenu'
import { 
    Navigation, Scan, Pickaxe, Skull, Database, Home, 
    ShoppingBag, ArrowLeftCircle, Box, Trash2, 
    ChevronRight, ChevronLeft, Target 
} from 'lucide-react' 
// 1. Прибрали Crosshair з імпортів

// === ДВИГУН РУХУ ===
function GameLoop() {
  const { inCombat, status } = useGameStore()

  useFrame((_state, delta) => {
    if (inCombat || status === 'mining') return

    const store = useGameStore.getState()
    const objects = store.localObjects
    
    if (objects.length === 0) return

    const target = objects[0]
    
    const approachSpeed = Math.max(500, target.distance * 2.0) * delta

    let hasChanges = false
    const newObjects = objects.map((obj, index) => {
        if (index === 0) {
            if (obj.distance > 200) {
                const newDist = Math.max(200, obj.distance - approachSpeed)
                if (Math.floor(newDist) !== Math.floor(obj.distance)) {
                    hasChanges = true
                    return { ...obj, distance: newDist }
                }
            }
            return obj
        } 
        else {
            const flyAwaySpeed = approachSpeed * 0.5 
            if (obj.distance < 15000) {
                const newDist = obj.distance + flyAwaySpeed
                if (Math.floor(newDist) !== Math.floor(obj.distance)) {
                    hasChanges = true
                    return { ...obj, distance: newDist }
                }
            }
            return obj
        }
    })

    if (hasChanges) {
        useGameStore.setState({ localObjects: newObjects })
    }
  })

  return null
}

function BackgroundSignals({ objects }: { objects: any[] }) {
    const others = objects.slice(1)

    return (
        <group>
            {others.map((obj, i) => {
                const angle = (i / others.length) * Math.PI * 2
                const visualDist = Math.min(50, 15 + (obj.distance / 1000))
                
                const x = Math.cos(angle) * visualDist
                const z = Math.sin(angle) * visualDist
                const y = Math.sin(angle * 3) * (visualDist / 3)

                return (
                    <mesh key={obj.id} position={[x, y, z]}>
                        <sphereGeometry args={[0.1, 4, 4]} />
                        <meshBasicMaterial color="#444" wireframe />
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
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const logEndRef = useRef<HTMLDivElement>(null)
  
  // 2. Виправили (a, b) на (a, _b) щоб TS не сварився
  const sortedObjects = [...localObjects].sort((a, _b) => {
      if (a.id === selectedId) return -1
      return 0
  })

  const activeObj = sortedObjects[0]

  useEffect(() => {
      if (localObjects.length > 0 && !selectedId) {
          setSelectedId(localObjects[0].id)
      }
  }, [localObjects])

  useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [combatLog])

  const handleSelect = (id: string) => {
    if (id === selectedId) return
    setIsSwitching(true)
    setSelectedId(id)
    
    // Тут теж виправили на _b
    const newOrder = [...localObjects].sort((a, _b) => a.id === id ? -1 : 1)
    useGameStore.setState({ localObjects: newOrder })

    setTimeout(() => setIsSwitching(false), 800)
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
          case 'asteroid': return <Database size={16} className="text-neon-cyan"/>
          case 'enemy': return <Skull size={16} className="text-neon-red"/>
          case 'station': return <Home size={16} className="text-white"/>
          case 'container': return <Box size={16} className="text-yellow-400"/>
          case 'debris': return <Trash2 size={16} className="text-gray-500"/>
          default: return <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse"/>
      }
  }

  return (
    <div className="h-screen w-full bg-space-950 relative overflow-hidden flex">
      
      {/* 3D СЦЕНА */}
      <div className="absolute inset-0 z-0">
         <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffae00" />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
            
            <GameLoop /> 

            {activeObj && !isSwitching && activeObj.scanned && (
                <Object3D type={activeObj.type} color={getObjectColor(activeObj.type)} />
            )}

            <BackgroundSignals objects={sortedObjects} />
            
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={inCombat ? 0.2 : 0.5} />
         </Canvas>
      </div>

      {isSwitching && (
          <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-1 bg-neon-cyan/20 rounded-full overflow-hidden">
                      <div className="h-full bg-neon-cyan w-1/2 animate-[shimmer_1s_infinite]"/>
                  </div>
                  <div className="text-neon-cyan font-mono text-xl animate-pulse tracking-[0.5em]">
                      REALIGNING SENSORS...
                  </div>
              </div>
          </div>
      )}

      {showStationMenu && <StationMenu onClose={() => setShowStationMenu(false)} />}

      {/* === 3. ЗАГОЛОВОК СЕКТОРУ (ТЕПЕР ОКРЕМО ЗВЕРХУ) === */}
      <div className={`absolute top-0 left-0 right-0 z-10 pointer-events-none flex justify-center pt-6 transition-opacity duration-500 ${inCombat ? 'opacity-0' : 'opacity-100'}`}>
           {/* Зменшив розмір тексту до text-2xl */}
          <h1 className="text-2xl font-mono text-neon-cyan/70 font-bold tracking-widest drop-shadow-[0_0_5px_rgba(0,240,255,0.3)] bg-black/30 px-6 py-2 rounded-full backdrop-blur-sm border border-white/5">
              SECTOR {currentSector}
          </h1>
      </div>

      {/* === 4. ПАНЕЛЬ ВЗАЄМОДІЇ (ТЕПЕР ОКРЕМО ЗНИЗУ) === */}
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none flex flex-col justify-end items-center pb-8 p-6">
          <div className="pointer-events-auto">
             {activeObj && !inCombat ? (
                 <div className={`glass-panel p-6 border-t-2 border-t-neon-cyan/50 rounded-xl text-center min-w-[400px] transition-all duration-500 
                    backdrop-blur-xl bg-black/60 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]
                    ${isSwitching ? 'translate-y-20 opacity-0' : 'translate-y-0 opacity-100'}
                 `}>
                     <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
                         <div className="text-left">
                            <h2 className="text-3xl font-bold font-mono text-white">
                                {activeObj.scanned ? activeObj.type.toUpperCase() : 'UNKNOWN'}
                            </h2>
                            <p className="text-xs text-neon-cyan font-mono flex items-center gap-2">
                                <Target size={12}/> 
                                DISTANCE: {Math.floor(activeObj.distance)} KM
                            </p>
                         </div>
                         <div className="text-right text-xs text-gray-500 font-mono">
                             ID: {activeObj.id.split('-')[1] || '000'}
                         </div>
                     </div>

                     <div className="flex items-center justify-center gap-4">
                         {!activeObj.scanned && (
                             <button onClick={scanSystem} className="w-full py-4 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2">
                                 <Scan size={20}/> SCAN OBJECT
                             </button>
                         )}

                         {activeObj.scanned && activeObj.type === 'station' && (
                             <>
                                 <button onClick={() => setShowStationMenu(true)} className="flex-1 py-4 bg-neon-orange/20 border border-neon-orange text-neon-orange hover:bg-neon-orange hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2">
                                     <ShoppingBag size={20}/> MARKET
                                 </button>
                                 <button onClick={() => useGameStore.setState({ status: 'hangar' })} className="flex-1 py-4 border border-white/20 text-gray-300 hover:bg-white/10 font-mono transition-all flex items-center justify-center gap-2">
                                     <ArrowLeftCircle size={20}/> DOCK
                                 </button>
                             </>
                         )}

                         {activeObj.scanned && activeObj.type === 'asteroid' && (
                             <button onClick={() => mineObject(activeObj.id)} className="w-full py-4 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                                 <Pickaxe size={20}/> START MINING
                             </button>
                         )}

                         {activeObj.scanned && activeObj.type === 'enemy' && (
                             <button onClick={() => startCombat(activeObj.id)} className="w-full py-4 bg-neon-red/20 border border-neon-red text-neon-red hover:bg-neon-red hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,60,0.3)]">
                                 <Skull size={20}/> ATTACK
                             </button>
                         )}

                         {activeObj.scanned && activeObj.type === 'container' && (
                             <button onClick={() => openContainer(activeObj.id)} className="w-full py-4 bg-yellow-500/20 border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-mono font-bold transition-all flex items-center justify-center gap-2">
                                 <Box size={20}/> SALVAGE
                             </button>
                         )}

                          {activeObj.scanned && activeObj.type === 'debris' && (
                             <div className="w-full py-4 border border-gray-700 bg-gray-900/50 text-gray-500 font-mono text-sm flex items-center justify-center gap-2">
                                 <Trash2 size={16}/> RESOURCES DEPLETED
                             </div>
                         )}
                     </div>
                 </div>
             ) : null}
          </div>
      </div>

      {/* САЙДБАР ЗЛІВА */}
      <div className={`glass-panel border-l border-neon-cyan/30 flex flex-col z-20 bg-space-950/90 backdrop-blur-md transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'w-20' : 'w-80'}
      `}>
          <div className={`p-4 border-b flex items-center ${inCombat ? 'border-neon-red/50 bg-neon-red/10' : 'border-white/10'}`}>
              <button 
                onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                className="mr-2 text-neon-cyan hover:text-white transition-colors"
              >
                  {isSidebarCollapsed ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
              </button>
              
              {!isSidebarCollapsed && (
                  <h2 className={`${inCombat ? 'text-neon-red animate-pulse' : 'text-neon-cyan'} font-mono font-bold flex items-center gap-2 text-sm`}>
                      {inCombat ? 'COMBAT' : 'SYSTEM'}
                  </h2>
              )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {inCombat ? (
                  <div className="flex flex-col gap-1 font-mono text-xs p-2">
                      {isSidebarCollapsed ? (
                         <Skull className="text-neon-red mx-auto animate-pulse"/>
                      ) : (
                          <>
                            {combatLog.map((log, i) => (
                                <div key={i} className="text-neon-red border-b border-neon-red/10 pb-1 opacity-80">
                                    {log}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                          </>
                      )}
                  </div>
              ) : (
                  sortedObjects.map(obj => (
                    <button 
                        key={obj.id}
                        onClick={() => handleSelect(obj.id)}
                        className={`w-full rounded border transition-all group relative overflow-hidden flex items-center
                            ${selectedId === obj.id 
                                ? 'bg-neon-cyan/10 border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]' 
                                : 'bg-transparent border-white/5 hover:bg-white/5 hover:border-white/20'}
                            ${isSidebarCollapsed ? 'p-3 justify-center' : 'p-3 text-left gap-3'}
                        `}
                    >
                        {selectedId === obj.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-cyan"/>}
                        
                        <div className={`rounded bg-space-900 border border-white/10 flex items-center justify-center
                             ${isSidebarCollapsed ? 'p-2' : 'p-2'}
                             ${selectedId === obj.id ? 'text-neon-cyan' : 'text-gray-500 group-hover:text-white'}
                        `}>
                            {obj.scanned ? getIcon(obj.type) : <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse"/>}
                        </div>
                        
                        {!isSidebarCollapsed && (
                            <div className="min-w-0">
                                <div className={`text-xs font-mono font-bold truncate ${selectedId === obj.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                    {obj.scanned ? obj.type.toUpperCase() : 'UNKNOWN'}
                                </div>
                                <div className="text-[10px] text-gray-600 font-mono">
                                    {Math.floor(obj.distance)} KM
                                </div>
                            </div>
                        )}
                    </button>
                  ))
              )}
          </div>

          {!inCombat && !isSidebarCollapsed && (
              <div className="p-4 border-t border-white/10">
                  <button 
                    onClick={() => useGameStore.setState({ status: 'map' })}
                    className="w-full py-3 bg-space-800 border border-gray-600 text-gray-300 font-mono hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 text-xs"
                  >
                      <Navigation size={14}/> OPEN MAP
                  </button>
              </div>
          )}
          
           {!inCombat && isSidebarCollapsed && (
              <div className="p-4 border-t border-white/10 flex justify-center">
                  <button 
                    onClick={() => useGameStore.setState({ status: 'map' })}
                    className="text-gray-300 hover:text-white"
                  >
                      <Navigation size={20}/>
                  </button>
              </div>
          )}
      </div>
    </div>
  )
}