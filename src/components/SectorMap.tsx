import { useState, useEffect, useRef } from 'react'
import { useGameStore, getGridDistance } from '../store'
import { Navigation, MapPin, Loader2, LocateFixed, Rocket, Home, Skull, Gem, CircleDashed, AlertTriangle, Zap, Route } from 'lucide-react'

export default function SectorMap() {
  const { 
    currentSector, visitedSectors, targetSector, setTargetSector, finalDestination,
    startWarp, plotCourse, fetchSectorGrid, sectorDetails, localObjects,
    jumpRange 
  } = useGameStore((state: any) => state)

  // Центр перегляду (камера)
  const [viewCenter, setViewCenter] = useState(currentSector || '0:0')
  const [isLoading, setIsLoading] = useState(false)

  // === ДРАГ-Н-ДРОП ===
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
    if (mapRef.current) {
        mapRef.current.style.transition = 'none'
        mapRef.current.setPointerCapture(e.pointerId)
    }
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

    if (mapRef.current) {
        mapRef.current.releasePointerCapture(e.pointerId)
        mapRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
    }

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const currentTotalX = offset.current.x + dx
    const currentTotalY = offset.current.y + dy

    // Магнітимо до сітки
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
      if (mapRef.current) mapRef.current.style.transition = 'transform 0.5s ease-in-out'
      applyTransform(0, 0)
  }

  const handleSectorClick = (id: string) => {
      if (isDragging) return
      if (id === currentSector) return
      if (plotCourse) plotCourse(id)
      else setTargetSector(id)
  }

  // --- ВІЗУАЛІЗАЦІЯ КОНТЕНТУ ---
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

  const isTargetReachable = targetSector && getGridDistance(currentSector, targetSector) <= jumpRange

  // === ГЕНЕРАЦІЯ СІТКИ ===
  // Важливо: cx, cy - це координати центру екрану в "світі гри"
  const [cx, cy] = viewCenter.split(':').map(Number)
  const gridSize = 6 // Радіус сітки (чим більше, тим більше секторів малюється)
  const grid = []
  for (let y = cy - gridSize; y <= cy + gridSize; y++) {
    for (let x = cx - gridSize; x <= cx + gridSize; x++) {
      grid.push(`${x}:${y}`)
    }
  }

  // === 🔥 ФУНКЦІЯ РОЗРАХУНКУ ПОЗИЦІЇ ===
  // Ця функція гарантує, що стрілки і кнопки використовують одну систему координат
  const getSectorPosition = (id: string) => {
      if (!id) return null
      const [sx, sy] = id.split(':').map(Number)
      
      // Позиція відносно центру (cx, cy)
      // Це ТА САМА формула, що використовується для style={{ transform }} у кнопок
      const x = (sx - cx) * TOTAL_CELL_SIZE
      const y = (sy - cy) * TOTAL_CELL_SIZE
      
      // Повертаємо центр клітинки
      return {
          x: x + CELL_SIZE / 2,
          y: y + CELL_SIZE / 2
      }
  }

  // === 🔥 МАЛЮВАННЯ СТРІЛОК ===
  const renderArrows = () => {
      const start = getSectorPosition(currentSector)
      const mid = getSectorPosition(targetSector)
      const end = getSectorPosition(finalDestination)

      if (!start || !mid) return null

      return (
          // z-index-0, щоб бути під текстом кнопок, але якщо треба ПОВЕРХ, ставте z-50 і pointer-events-none
          <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-50">
              <defs>
                  <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#00f0ff" />
                  </marker>
                  <marker id="arrow-gold" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#fbbf24" />
                  </marker>
              </defs>

              {/* 1. Лінія до проміжної цілі (Синя) */}
              <path 
                  d={`M ${start.x} ${start.y} L ${mid.x} ${mid.y}`}
                  stroke="#00f0ff" 
                  strokeWidth="3" 
                  strokeDasharray="8,4"
                  markerEnd="url(#arrow-blue)"
                  className="animate-pulse"
                  fill="none"
              />

              {/* 2. Лінія до фіналу (Золота) */}
              {end && (
                  <path 
                      d={`M ${mid.x} ${mid.y} L ${end.x} ${end.y}`}
                      stroke="#fbbf24" 
                      strokeWidth="3" 
                      strokeDasharray="8,4"
                      markerEnd="url(#arrow-gold)"
                      opacity="0.8"
                      fill="none"
                  />
              )}
          </svg>
      )
  }

  // Інфо для футера
  const totalDist = finalDestination ? getGridDistance(currentSector, finalDestination) : (targetSector ? getGridDistance(currentSector, targetSector) : 0)
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

      {/* TARGET INFO */}
      {targetSector && (
          <div className="absolute top-20 right-4 z-20 pointer-events-none animate-in slide-in-from-right">
             <div className="glass-panel p-4 text-right border-r-4 border-r-neon-orange pointer-events-auto min-w-[140px] bg-black/80 backdrop-blur-md">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                    {finalDestination ? 'FINAL DESTINATION' : 'NEXT JUMP'}
                </div>
                <div className={`font-bold text-xl ${finalDestination ? 'text-yellow-400' : 'text-white'}`}>
                    {finalDestination || targetSector}
                </div>
                
                {finalDestination && (
                    <div className="text-neon-cyan text-[10px] mt-1 flex items-center justify-end gap-1">
                        <Zap size={10}/> VIA: {targetSector}
                    </div>
                )}
                
                <div className="mt-2 flex justify-end items-center gap-4 text-[10px] text-gray-500">
                    <span>DIST: {totalDist} LY</span>
                    <span>JUMPS: {jumpsNeeded}</span>
                </div>
            </div>
          </div>
      )}

      {/* === MAP INTERACTIVE AREA === */}
      <div 
        className="flex-1 relative z-10 overflow-hidden cursor-move flex items-center justify-center touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Рухомий контейнер (Світ) */}
        <div 
            ref={mapRef}
            className="absolute top-1/2 left-1/2 will-change-transform" // Центруємо точку 0,0
            style={{ 
                transform: `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`,
                width: '0px', height: '0px', // Це точка відліку
                overflow: 'visible' 
            }}
        >
            {/* 🔥 СТРІЛКИ ТЕПЕР ТУТ, РАЗОМ З СІТКОЮ */}
            {renderArrows()}

            {grid.map(sectorId => {
                const [sx, sy] = sectorId.split(':').map(Number)
                const isCurrent = sectorId === currentSector
                const isTarget = sectorId === targetSector
                const isFinal = sectorId === finalDestination
                const isVisited = visitedSectors.includes(sectorId) || sectorId === '0:0' || isCurrent
                const content = getSectorContent(sectorId)
                const dist = getGridDistance(currentSector, sectorId)
                const isReachable = dist <= jumpRange
                const isStation = sectorId === '0:0'

                // Розрахунок позиції (відносно центру viewCenter)
                const posX = (sx - cx) * TOTAL_CELL_SIZE
                const posY = (sy - cy) * TOTAL_CELL_SIZE

                let cellStyle = ''
                if (isCurrent) {
                    cellStyle = 'bg-neon-cyan border-neon-cyan text-black shadow-neon z-20 scale-110'
                } else if (isTarget) {
                    cellStyle = 'bg-neon-orange/20 border-neon-orange text-neon-orange border-dashed z-10'
                } else if (isFinal) {
                    cellStyle = 'bg-yellow-500/20 border-yellow-500 text-yellow-500 border-dashed z-10'
                } else if (isStation) {
                    cellStyle = 'bg-yellow-400/10 border-yellow-400 text-yellow-400 shadow-[inset_0_0_15px_rgba(250,204,21,0.2)]'
                } else if (isReachable) {
                    if (isVisited) {
                        cellStyle = content.hasEnemies 
                            ? 'bg-red-900/30 border-red-500 text-white' 
                            : 'bg-space-800/80 border-white/20 hover:border-neon-cyan/50 hover:bg-space-700'
                    } else {
                        cellStyle = 'bg-black/40 border-white/10 hover:border-white/30'
                    }
                } else {
                    cellStyle = 'bg-black/20 border-white/5 opacity-40 grayscale'
                }

                return (
                    <button 
                        key={sectorId}
                        onClick={() => !isDragging && handleSectorClick(sectorId)}
                        disabled={isCurrent}
                        style={{ 
                            width: `${CELL_SIZE}px`, 
                            height: `${CELL_SIZE}px`,
                            position: 'absolute',
                            // 🔥 ВАЖЛИВО: Центруємо кнопку, щоб її координати збігалися з лініями
                            left: posX, 
                            top: posY,
                            marginLeft: -CELL_SIZE/2, // Зміщуємо на половину, щоб x,y були центром
                            marginTop: -CELL_SIZE/2
                        }}
                        className={`
                            rounded border flex flex-col items-center justify-center group overflow-hidden
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
                            {isVisited || isTarget || isFinal || isStation ? sectorId : ''}
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
                : <><Navigation size={14} className="animate-spin-slow" /> Initiate Warp</>
            ) : (
                'Select Destination'
            )}
        </button>
      </div>

    </div>
  )
}