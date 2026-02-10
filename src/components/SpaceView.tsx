import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useGameStore, SHIP_SPECS } from '../store'
import Object3D from './Object3D'
import { 
    Navigation, Scan, Pickaxe, Skull, Database, Home, 
    ShoppingBag, ArrowLeftCircle, Box, Trash2, 
    ChevronRight, ChevronLeft, Target, Menu, X, List, Rocket, Shield, Activity
} from 'lucide-react'

const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff',      
    'interceptor': '#ff003c', 
    'hauler': '#ffae00',      
    'explorer': '#a855f7'     
}

const SHIP_SPEEDS: Record<string, number> = {
    'scout': 100,       
    'interceptor': 110, 
    'hauler': 60,       
    'explorer': 160     
}

const SPACE_COLOR = '#02020a'
const ARRIVAL_DISTANCE = 200 

// === 🔥 ОНОВЛЕНИЙ КОМПАКТНИЙ HUD ===
function CockpitHUD() {
    const { shipClass, hull, maxHull, cargo, maxCargo } = useGameStore((state: any) => state)
    const spec = SHIP_SPECS[shipClass] || SHIP_SPECS['scout']
    const color = SHIP_COLORS[shipClass] || '#00f0ff'
    
    const shadowStyle = { boxShadow: `0 0 10px ${color}40` }
    const borderStyle = { borderColor: `${color}80` }

    const currentCargo = Object.values(cargo || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)

    return (
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20 flex flex-col items-end gap-1 md:gap-2 animate-in slide-in-from-right duration-700 pointer-events-none w-1/3 md:w-auto">
            
            {/* ID CARD */}
            <div 
                className="bg-black/60 backdrop-blur-md border-r-2 md:border-r-4 p-2 md:p-3 pl-4 md:pl-6 rounded-l-lg transition-colors duration-500 w-full"
                style={{ ...borderStyle, borderRightColor: color, ...shadowStyle }}
            >
                <div className="text-[7px] md:text-[10px] text-gray-400 font-mono uppercase tracking-widest text-right mb-0.5">
                    SYS ONLINE
                </div>
                <h2 className="text-sm md:text-2xl font-black font-mono uppercase text-right leading-none truncate" style={{ color: color }}>
                    {spec.name}
                </h2>
            </div>

            {/* BARS */}
            <div className="flex gap-1 md:gap-2 w-full justify-end">
                {/* HULL */}
                <div className="bg-black/60 backdrop-blur-md border border-white/10 p-1 md:p-2 rounded flex-1 max-w-[80px] md:max-w-[100px]">
                    <div className="flex items-center justify-end gap-1 text-[8px] md:text-xs font-bold text-gray-400 mb-1">
                        HULL <Shield size={10} className={hull < maxHull * 0.3 ? 'text-red-500 animate-pulse' : 'text-gray-400'}/>
                    </div>
                    <div className="h-1 md:h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full transition-all duration-500"
                            style={{ width: `${(hull/maxHull)*100}%`, backgroundColor: hull < maxHull * 0.3 ? '#ef4444' : color }}
                        />
                    </div>
                    <div className="text-right text-[8px] md:text-[10px] font-mono text-white mt-0.5">{hull}/{maxHull}</div>
                </div>

                {/* CARGO */}
                <div className="bg-black/60 backdrop-blur-md border border-white/10 p-1 md:p-2 rounded flex-1 max-w-[80px] md:max-w-[100px]">
                    <div className="flex items-center justify-end gap-1 text-[8px] md:text-xs font-bold text-gray-400 mb-1">
                        CARGO <Box size={10}/>
                    </div>
                    <div className="h-1 md:h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-yellow-400 transition-all duration-500"
                            style={{ width: `${(currentCargo/maxCargo)*100}%` }}
                        />
                    </div>
                     <div className="text-right text-[8px] md:text-[10px] font-mono text-white mt-0.5">
                        {currentCargo}/{maxCargo}
                    </div>
                </div>
            </div>
        </div>
    )
}

// === ДВИГУН РУХУ ===
function GameLoop() {
  const { inCombat, status, shipClass } = useGameStore((state: any) => state) 

  useFrame((_state, delta) => {
    if (inCombat || status === 'mining') return

    const store = useGameStore.getState()
    const objects = store.localObjects
    
    if (objects.length === 0) return

    const target = objects[0]
    
    const baseSpeed = SHIP_SPEEDS[shipClass] || 100
    const speedMultiplier = baseSpeed / 100 

    let approachSpeed = target.distance * 2.5 * delta * speedMultiplier
    
    const minSpeed = 150 * delta * speedMultiplier
    if (approachSpeed < minSpeed) approachSpeed = minSpeed

    const backgroundSpeed = approachSpeed * 0.5

    let hasChanges = false

    const newObjects = objects.map((obj: any, index: number) => {
        if (index === 0) {
            if (obj.distance > ARRIVAL_DISTANCE) { 
                const newDist = Math.max(ARRIVAL_DISTANCE, obj.distance - approachSpeed)
                if (Math.abs(newDist - obj.distance) > 0.1) {
                    hasChanges = true
                    return { ...obj, distance: newDist }
                }
            }
            return obj
        } else {
            const SECTOR_LIMIT = 4000 
            if (obj.distance < SECTOR_LIMIT) {
                const newDist = Math.min(SECTOR_LIMIT, obj.distance + backgroundSpeed)
                if (Math.abs(newDist - obj.distance) > 0.1) {
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

// === ВІЗУАЛІЗАЦІЯ ОБ'ЄКТІВ ===
function ActiveObjectVisual({ object, color }: { object: any, color: string }) {
    const groupRef = useRef<any>(null)

    useFrame(() => {
        if (groupRef.current) {
            const targetZ = -(object.distance - 200) / 50
            if (Math.abs(targetZ - groupRef.current.position.z) > 20) {
                groupRef.current.position.z = targetZ
            } else {
                groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.1
            }
        }
    })

    return (
        <group ref={groupRef} position={[0, 0, -100]}>
            <Object3D type={object.type} color={color} />
        </group>
    )
}

export default function SpaceView() {
  const { 
      currentSector, localObjects, scanSystem, mineObject, startCombat, 
      inCombat, combatLog, openContainer, setStationOpen 
  } = useGameStore((state: any) => state)
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isMobileListOpen, setMobileListOpen] = useState(false)
  
  const logEndRef = useRef<HTMLDivElement>(null)
  const activeObj = localObjects[0]

  const isArrived = activeObj && activeObj.distance <= ARRIVAL_DISTANCE + 5

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
    
    const currentObjects = useGameStore.getState().localObjects
    const newOrder = [...currentObjects].sort((a: any, b: any) => {
        if (a.id === id) return -1
        if (b.id === id) return 1
        return 0
    })
    
    useGameStore.setState({ 
        localObjects: newOrder,
        status: 'space',
        currentEventId: null,
        inCombat: false
    })

    setMobileListOpen(false)
    setTimeout(() => setIsSwitching(false), 400)
  }

  const getObjectName = (obj: any) => {
      if (!obj.scanned) return 'UNKNOWN SIGNAL'
      if (obj.type === 'asteroid' && obj.data?.resource) return `${obj.data.resource.toUpperCase()} DEPOSIT`
      if (obj.type === 'enemy') {
          const classes = ['SCOUT', 'INTERCEPTOR', 'FRIGATE', 'DREADNOUGHT']
          const lvl = obj.enemyLevel || 1
          const className = classes[Math.min(lvl - 1, classes.length - 1)]
          return `MK-${lvl} ${className}`
      }
      if (obj.type === 'station') return 'TRADING STATION'
      if (obj.type === 'container') return 'LOST CARGO'
      if (obj.type === 'player') return obj.playerName || 'UNKNOWN PILOT'
      if (obj.type === 'debris') return 'SPACE DEBRIS'
      return obj.type.toUpperCase()
  }

  const getObjectColor = (type: string) => {
    switch (type) {
      case 'enemy': return '#ff003c'
      case 'asteroid': return '#00f0ff'
      case 'station': return '#ffffff'
      case 'container': return '#ffd700'
      case 'debris': return '#888888'
      case 'player': return '#00ff00' 
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
          case 'player': return <Rocket size={16} className="text-green-400"/>
          default: return <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse"/>
      }
  }

  return (
    <div className="h-[100dvh] w-full bg-[#02020a] relative overflow-hidden flex flex-col md:flex-row">
      
      <CockpitHUD />

      {/* 3D СЦЕНА */}
      <div className="absolute inset-0 z-0">
         <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
            <color attach="background" args={[SPACE_COLOR]} />
            <fog attach="fog" args={[SPACE_COLOR, 5, 20]} /> 
            
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffae00" />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
            
            <GameLoop /> 

            {activeObj && !isSwitching && activeObj.scanned && (
                <ActiveObjectVisual 
                    key={activeObj.id} 
                    object={activeObj} 
                    color={getObjectColor(activeObj.type)} 
                />
            )}
            
            <OrbitControls 
                enableZoom={false} 
                enablePan={false} 
                enableRotate={true} 
                autoRotate 
                autoRotateSpeed={inCombat ? 0.2 : 0.5} 
            />
         </Canvas>
      </div>

      {isSwitching && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
              {/* 🔥 ВИПРАВЛЕНО: додано text-center та w-full */}
              <div className="text-neon-cyan font-mono text-xl animate-pulse tracking-[0.3em] text-center w-full px-4">
                  CALCULATING TRAJECTORY...
              </div>
          </div>
      )}

      <div className={`absolute top-0 left-0 right-0 z-10 pointer-events-none flex justify-center pt-4 md:pt-6 transition-opacity duration-500 ${inCombat ? 'opacity-0' : 'opacity-100'}`}>
          <h1 className="text-sm md:text-2xl font-mono text-neon-cyan/70 font-bold tracking-widest bg-black/30 px-3 md:px-4 py-1 rounded-full backdrop-blur-sm border border-white/5">
              SEC {currentSector}
          </h1>
      </div>

      {/* ПАНЕЛЬ ВЗАЄМОДІЇ */}
      <div className="absolute inset-x-0 bottom-[4.5rem] md:bottom-0 z-10 pointer-events-none flex flex-col justify-end items-center pb-2 md:pb-8 p-3">
          <div className="pointer-events-auto w-full max-w-sm md:max-w-md">
             {activeObj && !inCombat ? (
                 <div className={`glass-panel p-4 md:p-6 border-t-2 border-t-neon-cyan/50 rounded-xl text-center w-full transition-all duration-500 
                    backdrop-blur-xl bg-black/80 shadow-lg
                    ${isSwitching ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}
                 `}>
                     <div className="flex justify-between items-end mb-3 border-b border-white/10 pb-2">
                         <div className="text-left">
                            <h2 className={`text-xl md:text-3xl font-bold font-mono ${activeObj.type === 'enemy' ? 'text-neon-red' : 'text-white'}`}>
                                {getObjectName(activeObj)}
                            </h2>
                            <p className="text-[10px] md:text-xs text-neon-cyan font-mono flex items-center gap-2">
                                <Target size={12}/> {Math.floor(activeObj.distance)} KM
                            </p>
                         </div>
                         <div className="text-right text-[10px] text-gray-500 font-mono">
                             ID: {activeObj.id.split('-')[1] || '000'}
                         </div>
                     </div>

                     <div className="grid grid-cols-1 gap-2">
                         {!activeObj.scanned && (
                             <button onClick={scanSystem} className="py-3 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan text-sm font-bold hover:bg-neon-cyan hover:text-black flex items-center justify-center gap-2">
                                 <Scan size={16}/> SCAN
                             </button>
                         )}

                         {activeObj.scanned && !isArrived && (
                             <div className="py-3 bg-black/40 border border-white/10 text-neon-cyan text-xs font-mono animate-pulse flex items-center justify-center gap-2">
                                 <Activity size={14} className="animate-spin"/> TRAJECTORY ALIGNMENT...
                             </div>
                         )}

                         {activeObj.scanned && isArrived && (
                             <>
                                 {activeObj.type === 'station' && (
                                     <div className="flex gap-2">
                                         <button onClick={() => setStationOpen(true)} className="flex-1 py-2 bg-neon-orange/20 border border-neon-orange text-neon-orange text-sm font-bold flex items-center justify-center gap-2">
                                             <ShoppingBag size={16}/> MARKET
                                         </button>
                                         <button onClick={() => useGameStore.setState({ status: 'hangar' })} className="flex-1 py-2 border border-white/20 text-gray-300 text-sm flex items-center justify-center gap-2">
                                             <ArrowLeftCircle size={16}/> DOCK
                                         </button>
                                     </div>
                                 )}
                                 {activeObj.type === 'asteroid' && (
                                     <button onClick={() => mineObject(activeObj.id)} className="py-3 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan text-sm font-bold hover:bg-neon-cyan hover:text-black flex items-center justify-center gap-2">
                                         <Pickaxe size={16}/> MINE
                                     </button>
                                 )}
                                 {activeObj.type === 'enemy' && (
                                     <button onClick={() => startCombat(activeObj.id)} className="py-3 bg-neon-red/20 border border-neon-red text-neon-red text-sm font-bold hover:bg-neon-red hover:text-black flex items-center justify-center gap-2 animate-pulse">
                                         <Skull size={16}/> ENGAGE HOSTILE
                                     </button>
                                 )}
                                 {activeObj.type === 'container' && (
                                     <button onClick={() => openContainer(activeObj.id)} className="py-3 bg-yellow-500/20 border border-yellow-500 text-yellow-500 text-sm font-bold hover:bg-yellow-500 hover:text-black flex items-center justify-center gap-2">
                                         <Box size={16}/> OPEN
                                     </button>
                                 )}
                                 {activeObj.type === 'debris' && (
                                     <div className="py-3 text-gray-500 text-xs font-mono border border-gray-800">NO ACTIONS AVAILABLE</div>
                                 )}
                             </>
                         )}
                     </div>
                 </div>
             ) : null}
         </div>
     </div>

     {/* МОБІЛЬНЕ НИЖНЄ МЕНЮ */}
     <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-space-950/90 border-t border-white/10 flex items-center justify-around z-30 px-2 backdrop-blur-lg">
         <button onClick={() => setMobileListOpen(!isMobileListOpen)} className={`flex flex-col items-center gap-1 p-2 w-16 ${isMobileListOpen ? 'text-neon-cyan' : 'text-gray-400'}`}>
             <List size={20} /> <span className="text-[9px]">LIST</span>
         </button>
         <button onClick={() => useGameStore.setState({ status: 'map' })} className="flex flex-col items-center gap-1 p-2 w-16 text-neon-orange">
             <Navigation size={20} /> <span className="text-[9px]">MAP</span>
         </button>
         <div className="flex flex-col items-center gap-1 p-2 w-16 text-gray-500">
             <Menu size={20} /> <span className="text-[9px]">MENU</span>
         </div>
     </div>

     {/* МОБІЛЬНИЙ СПИСОК */}
     {isMobileListOpen && (
         <div className="md:hidden absolute bottom-16 inset-x-0 bg-space-950/95 border-t border-neon-cyan/30 rounded-t-xl z-20 max-h-[50vh] overflow-y-auto p-3 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
             <div className="flex justify-between items-center mb-3 sticky top-0 bg-space-950/95 py-2 border-b border-white/10">
                 <h3 className="text-neon-cyan font-mono font-bold text-sm">OBJECTS</h3>
                 <button onClick={() => setMobileListOpen(false)}><X size={18} className="text-gray-400"/></button>
             </div>
             <div className="space-y-2 pb-2">
                 {localObjects.map((obj: any) => (
                     <button key={obj.id} onClick={() => handleSelect(obj.id)} className={`w-full p-3 rounded border text-left flex items-center gap-3 ${selectedId === obj.id ? 'bg-neon-cyan/10 border-neon-cyan text-white' : 'border-white/10 text-gray-400'}`}>
                         {obj.scanned ? getIcon(obj.type) : <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse"/>}
                         <div className="flex-1 min-w-0">
                             <div className="font-bold text-xs truncate">{getObjectName(obj)}</div>
                             <div className="text-[10px] opacity-70">{Math.floor(obj.distance)} KM</div>
                         </div>
                     </button>
                 ))}
             </div>
         </div>
     )}

     {/* ДЕСКТОПНИЙ САЙДБАР */}
     <div className={`hidden md:flex glass-panel border-l border-neon-cyan/30 flex-col z-20 bg-space-950/90 backdrop-blur-md transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
         <div className={`p-4 border-b flex items-center ${inCombat ? 'border-neon-red/50 bg-neon-red/10' : 'border-white/10'}`}>
             <button onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} className="mr-2 text-neon-cyan hover:text-white transition-colors">
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
                     {isSidebarCollapsed ? <Skull className="text-neon-red mx-auto animate-pulse"/> : (
                         <>
                           {combatLog.map((log: string, i: number) => (<div key={i} className="text-neon-red border-b border-neon-red/10 pb-1 opacity-80">{log}</div>))}
                           <div ref={logEndRef} />
                         </>
                     )}
                 </div>
             ) : (
                 localObjects.map((obj: any) => (
                   <button key={obj.id} onClick={() => handleSelect(obj.id)} className={`w-full rounded border transition-all group relative overflow-hidden flex items-center ${selectedId === obj.id ? 'bg-neon-cyan/10 border-neon-cyan shadow-sm' : 'bg-transparent border-white/5 hover:bg-white/5'} ${isSidebarCollapsed ? 'p-3 justify-center' : 'p-3 text-left gap-3'}`}>
                       {selectedId === obj.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-cyan"/>}
                       <div className={`rounded bg-space-900 border border-white/10 flex items-center justify-center p-2 ${selectedId === obj.id ? 'text-neon-cyan' : 'text-gray-500 group-hover:text-white'}`}>
                           {obj.scanned ? getIcon(obj.type) : <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse"/>}
                       </div>
                       {!isSidebarCollapsed && (
                           <div className="min-w-0">
                               <div className={`text-xs font-mono font-bold truncate ${selectedId === obj.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{getObjectName(obj)}</div>
                               <div className="text-[10px] text-gray-600 font-mono">{Math.floor(obj.distance)} KM</div>
                           </div>
                       )}
                   </button>
                 ))
             )}
         </div>
         {!inCombat && !isSidebarCollapsed && (
             <div className="p-4 border-t border-white/10">
                 <button onClick={() => useGameStore.setState({ status: 'map' })} className="w-full py-3 bg-space-800 border border-gray-600 text-gray-300 font-mono hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 text-xs">
                     <Navigation size={14}/> OPEN MAP
                 </button>
             </div>
         )}
         {!inCombat && isSidebarCollapsed && (
             <div className="p-4 border-t border-white/10 flex justify-center">
                 <button onClick={() => useGameStore.setState({ status: 'map' })} className="text-gray-300 hover:text-white"><Navigation size={20}/></button>
             </div>
         )}
     </div>
   </div>
 )
}