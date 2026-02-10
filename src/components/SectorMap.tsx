import { useState, useEffect, useRef } from 'react'
import { useGameStore, getGridDistance } from '../store'
import { Navigation, MapPin, Loader2, LocateFixed, Rocket, Home, Skull, Gem, CircleDashed, Ban, AlertTriangle, Zap, Route } from 'lucide-react'

export default function SectorMap() {
  const { 
    currentSector, visitedSectors, targetSector, setTargetSector, 
    startWarp, plotCourse, fetchSectorGrid, sectorDetails, localObjects,
    jumpRange, finalDestination // Додано finalDestination для розрахунків
  } = useGameStore((state: any) => state)

  const [viewCenter, setViewCenter] = useState(currentSector || '0:0')
  const [isLoading, setIsLoading] = useState(false)

  // === СТАБІЛЬНИЙ ДРАГ-Н-ДРОП (ПОВЕРНУТО ВАШУ ВЕРСІЮ) ===
  const [isDragging, setIsDragging] = useState(false)
  const offset = useRef({ x: 0, y: 0 }) 
  const dragStart = useRef({ x: 0, y: 0 })
  const mapRef = useRef<HTMLDivElement>(null)
  
  const isMobile = window.innerWidth < 768
  const CELL_SIZE = isMobile ? window.innerWidth * 0.18 : 80 
  const GAP_SIZE = isMobile ? 4 : 8
  const TOTAL_CELL_SIZE = CELL_SIZE + GAP_SIZE

  useEffect(() => {
      const loadData = async () => {
          setIsLoading(true)
          await fetchSectorGrid(viewCenter)
          setIsLoading(false)
      }
      loadData()
  }, [viewCenter])

  const applyTransform = (x: number, y: number) => {
      if (mapRef.current) {
          mapRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    if (mapRef.current) mapRef.current.style.transition = 'none'
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    e.preventDefault() 
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    applyTransform(offset.current.x + dx, offset.current.y + dy)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const currentTotalX = offset.current.x + dx
    const currentTotalY = offset.current.y + dy

    const sectorsX = -Math.round(currentTotalX / TOTAL_CELL_SIZE)
    const sectorsY = -Math.round(currentTotalY / TOTAL_CELL_SIZE)

    if (sectorsX !== 0 || sectorsY !== 0) {
        const [cx, cy] = viewCenter.split(':').map(Number)
        setViewCenter(`${cx + sectorsX}:${cy + sectorsY}`)
        offset.current.x = currentTotalX + (sectorsX * TOTAL_CELL_SIZE)
        offset.current.y = currentTotalY + (sectorsY * TOTAL_CELL_SIZE)
    } else {
        offset.current.x = currentTotalX
        offset.current.y = currentTotalY
    }
    applyTransform(offset.current.x, offset.current.y)
  }

  const centerOnPlayer = () => {
      setViewCenter(currentSector)
      offset.current = { x: 0, y: 0 }
      applyTransform(0, 0)
  }

  const handleSectorClick = (id: string) => {
      if (isDragging) return
      if (id === currentSector) return
      
      // Логіка автопілоту (якщо є в store) або просто вибір
      if (plotCourse) plotCourse(id)
      else setTargetSector(id)
  }

  // --- ВІЗУАЛІЗАЦІЯ ---
  const getSectorContent = (id: string) => {
      if (id === '0:0') return { type: 'station', icon: <Home size={16}/>, color: 'text-yellow-400', hasEnemies: false }
      
      let hasEnemies = false
      let hasResources = false
      let isDepleted = false
      let hasPlayer = false

      if (id === currentSector && localObjects.length > 0) {
           hasEnemies = localObjects.some((o: any) => o.type === 'enemy')
           hasPlayer = localObjects.some((o: any) => o.type === 'player')
           hasResources = localObjects.some((o: any) => o.type === 'asteroid' && o.data)
      } else {
          const details = sectorDetails[id]
          if (details) {
              hasEnemies = details.hasEnemies
              hasResources = details.hasResources
              isDepleted = details.isDepleted
          }
      }

      if (hasPlayer) return { type: 'player', icon: <Rocket size={14}/>, color: 'text-green-400', hasEnemies }
      if (hasResources) return { type: 'resources', icon: <Gem size={14}/>, color: 'text-neon-cyan', hasEnemies }
      if (hasEnemies) return { type: 'enemy', icon: <Skull size={14}/>, color: 'text-neon-red', hasEnemies }
      if (isDepleted) return { type: 'empty', icon: <CircleDashed size={14}/>, color: 'text-gray-700', hasEnemies: false }
      
      return { type: 'unknown', icon: null, color: 'text-gray-800', hasEnemies: false }
  }

  // 🔥 Виправлення TS: змінна isTargetReachable тепер визначена
  const isTargetReachable = targetSector && getGridDistance(currentSector, targetSector) <= jumpRange

  // === ГЕНЕРАЦІЯ СІТКИ ===
  const [cx, cy] = viewCenter.split(':').map(Number)
  const gridSize = 8 // 🔥 ЗБІЛЬШЕНО РАДІУС (було 4, стало 8)
  const grid = []
  for (let y = cy - gridSize; y <= cy + gridSize; y++) {
    for (let x = cx - gridSize; x <= cx + gridSize; x++) {
      grid.push(`${x}:${y}`)
    }
  }

  // === РОЗРАХУНОК СТРИБКІВ (Замість стрілок) ===
  const targetForCalc = finalDestination || targetSector
  const totalDist = targetForCalc ? getGridDistance(currentSector, targetForCalc) : 0
  const jumpsNeeded = Math.ceil(totalDist / jumpRange)

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-mono text-white h-[100dvh] overflow-hidden select-none touch-none">
      
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-space-900 via-black to-black opacity-80" />
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="glass-panel px-4 py-2 border-l-4 border-l-neon-cyan pointer-events-auto bg-black/60 backdrop-blur-md">
             <h2 className="text-xl md:text-2xl text-neon-cyan font-bold flex items-center gap-2 uppercase shadow-neon">
                 <MapPin className="w-5 h-5" /> Tactical Map
             </h2>
             <div className="flex items-center gap-2 mt-1">
                 <p className="text-gray-500 text-xs">VIEW: <span className="text-white">{viewCenter}</span></p>
                 {isLoading && <Loader2 size={12} className="animate-spin text-neon-cyan"/>}
             </div>
        </div>
        <button onClick={centerOnPlayer} className="glass-panel p-3 rounded-full border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all pointer-events-auto shadow-lg active:scale-95 bg-black/60">
            <LocateFixed size={24} />
        </button>
      </div>

      {/* TARGET PANEL (З кількістю стрибків) */}
      {targetSector && (
          <div className="absolute top-20 right-4 z-20 pointer-events-none animate-in slide-in-from-right">
             <div className="glass-panel p-4 text-right border-r-4 border-r-neon-orange pointer-events-auto min-w-[140px] bg-black/80 backdrop-blur-md">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                    {finalDestination ? 'FINAL DESTINATION' : 'TARGET'}
                </div>
                <div className={`font-bold text-xl ${finalDestination ? 'text-yellow-400' : 'text-white'}`}>
                    {finalDestination || targetSector}
                </div>
                
                {finalDestination && (
                    <div className="text-[10px] text-neon-cyan mt-1 flex items-center justify-end gap-1">
                        <Zap size={10}/> VIA: {targetSector}
                    </div>
                )}
                
                <div className="mt-3 border-t border-white/10 pt-2">
                    <div className="text-[9px] text-gray-500">TRAVEL INFO</div>
                    <div className="flex justify-end gap-3 mt-1">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-gray-400">DIST</span>
                            <span className="text-neon-cyan font-bold">{totalDist} LY</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-gray-400">JUMPS</span>
                            <span className={`font-bold ${jumpsNeeded > 1 ? 'text-yellow-400' : 'text-white'}`}>{jumpsNeeded}</span>
                        </div>
                    </div>
                </div>
                
                {!isTargetReachable && !finalDestination && (
                    <div className="mt-2 text-red-500 text-[10px] flex items-center justify-end gap-1">
                        <Ban size={10}/> OUT OF RANGE
                    </div>
                )}
            </div>
          </div>
      )}

      {/* MAP AREA (ГРІД БЕЗ SVG) */}
      <div 
        className="flex-1 relative z-10 overflow-hidden cursor-move flex items-center justify-center touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div 
            ref={mapRef}
            className="grid place-items-center will-change-transform" 
            style={{ 
                transform: `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`,
                width: 'max-content', 
                gap: `${GAP_SIZE}px`,
                gridTemplateColumns: `repeat(${gridSize * 2 + 1}, ${CELL_SIZE}px)`
            }}
        >
            {grid.map(sectorId => {
                const isCurrent = sectorId === currentSector
                const isTarget = sectorId === targetSector
                const isFinal = sectorId === finalDestination
                const isVisited = visitedSectors.includes(sectorId) || sectorId === '0:0' || isCurrent
                const content = getSectorContent(sectorId)
                const dist = getGridDistance(currentSector, sectorId)
                const isReachable = dist <= jumpRange
                const isStation = sectorId === '0:0'

                // Стилі клітинки
                let cellStyle = ''
                if (isCurrent) {
                    cellStyle = 'bg-neon-cyan border-neon-cyan text-black shadow-neon z-20 scale-110'
                } else if (isTarget) {
                    cellStyle = 'bg-neon-orange/20 border-neon-orange text-neon-orange border-dashed z-10'
                } else if (isFinal) {
                    cellStyle = 'bg-yellow-500/20 border-yellow-500 text-yellow-500 border-dashed z-10 animate-pulse'
                } else if (isStation) {
                    cellStyle = 'bg-yellow-400/10 border-yellow-400 text-yellow-400 shadow-[inset_0_0_15px_rgba(250,204,21,0.2)]'
                } else if (isReachable) {
                    if (isVisited) {
                        cellStyle = content.hasEnemies 
                            ? 'bg-red-900/30 border-red-500 text-white' 
                            : 'bg-space-800/80 border-white/20 hover:border-neon-cyan/50 hover:bg-space-700'
                    } else {
                        cellStyle = 'bg-black/40 border-white/10 hover:border-white/30 opacity-80'
                    }
                } else {
                    cellStyle = 'bg-black/20 border-white/5 opacity-40 grayscale'
                }

                return (
                    <button 
                        key={sectorId}
                        onClick={() => !isDragging && handleSectorClick(sectorId)}
                        disabled={isCurrent}
                        style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
                        className={`
                            rounded border flex flex-col items-center justify-center relative group overflow-hidden
                            transition-colors duration-200
                            ${cellStyle}
                        `}
                    >
                        {isStation && !isCurrent && <div className="absolute inset-0 flex items-center justify-center opacity-30 animate-pulse"><Home size={32}/></div>}
                        
                        {isVisited && !isCurrent && content.icon && (
                            <div className={`opacity-80 ${content.color} scale-75 md:scale-100 relative`}>
                                {content.icon}
                                {content.hasEnemies && content.type === 'resources' && (
                                    <div className="absolute -top-1 -right-2 text-red-500 animate-pulse"><AlertTriangle size={10} fill="currentColor" /></div>
                                )}
                            </div>
                        )}
                        
                        <span className={`text-[8px] md:text-[10px] font-mono mt-0.5 ${isCurrent ? 'font-black' : 'text-gray-500'}`}>
                            {isVisited || isStation || isTarget || isFinal ? sectorId : ''}
                        </span>
                        
                        {isCurrent && <span className="text-[6px] md:text-[9px] font-black leading-none uppercase mt-1">YOU</span>}
                        {isFinal && !isTarget && <Route size={12} className="mt-1 text-yellow-500" />}
                    </button>
                )
            })}
        </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-6 w-full px-6 flex justify-center gap-4 z-20 pointer-events-none">
        <button 
            onClick={() => useGameStore.setState({ status: 'space' })}
            className="pointer-events-auto bg-black/80 backdrop-blur border border-gray-600 text-gray-400 px-6 py-3 rounded font-bold text-xs hover:text-white hover:border-white transition-all uppercase tracking-wider"
        >
            Close
        </button>

        <button 
            disabled={!targetSector || (!isTargetReachable && !finalDestination)}
            onClick={() => startWarp()}
            className={`
                pointer-events-auto px-10 py-3 rounded font-bold text-xs transition-all uppercase tracking-wider flex items-center gap-2
                ${targetSector && (isTargetReachable || finalDestination)
                    ? 'bg-neon-cyan text-black hover:bg-white hover:scale-105 shadow-neon' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}
            `}
        >
            {targetSector ? (
                finalDestination 
                ? <><Zap size={14} className="animate-pulse" /> ENGAGE AUTOPILOT</>
                : <><Navigation size={14} className="animate-spin-slow" /> JUMP</>
            ) : (
                'Select Destination'
            )}
        </button>
      </div>

    </div>
  )
}