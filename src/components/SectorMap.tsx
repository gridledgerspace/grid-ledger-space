import { useEffect, useState, useMemo } from 'react'
import { useGameStore, getGridDistance } from '../store'
import { X, Navigation, Crosshair, MapPin, Zap, Home } from 'lucide-react'

export default function SectorMap() {
  const { 
      status, currentSector, sectorDetails, 
      fetchSectorGrid, startWarp, targetSector, setTargetSector, jumpRange 
  } = useGameStore((state: any) => state)

  // Кінцева ціль маршруту (якщо більше 1 стрибка)
  const [finalDestination, setFinalDestination] = useState<string | null>(null)

  useEffect(() => {
      if (status === 'map') {
          fetchSectorGrid(currentSector)
      }
  }, [status, currentSector])

  if (status !== 'map') return null

  const [cx, cy] = currentSector.split(':').map(Number)
  const gridSize = 3 // Радіус відображення (7x7 сітка)

  // Генеруємо сітку координат
  const gridCells = useMemo(() => {
      const cells = []
      for (let y = cy - gridSize; y <= cy + gridSize; y++) {
          for (let x = cx - gridSize; x <= cx + gridSize; x++) {
              cells.push(`${x}:${y}`)
          }
      }
      return cells
  }, [cx, cy])

  // Логіка вибору сектора (Маршрутизація)
  const handleSectorClick = (id: string) => {
      if (id === currentSector) return

      const dist = getGridDistance(currentSector, id)

      if (dist <= jumpRange) {
          // Якщо в межах стрибка - просто вибираємо
          setTargetSector(id)
          setFinalDestination(null)
      } else {
          // Якщо далеко - будуємо маршрут і вибираємо наступний крок
          setFinalDestination(id)
          
          // Знаходимо проміжну точку: рухаємось на jumpRange в сторону цілі
          const [tx, ty] = id.split(':').map(Number)
          
          const dx = tx - cx
          const dy = ty - cy
          
          // Нормалізуємо крок
          const ratio = jumpRange / Math.max(Math.abs(dx), Math.abs(dy))
          const nextX = Math.round(cx + dx * ratio)
          const nextY = Math.round(cy + dy * ratio)
          
          const nextHop = `${nextX}:${nextY}` === currentSector 
             ? `${cx + Math.sign(dx)}:${cy + Math.sign(dy)}` 
             : `${nextX}:${nextY}`

          setTargetSector(nextHop)
      }
  }

  // Розрахунок лінії маршруту для візуалізації
  const getLineCoordinates = () => {
      if (!finalDestination && !targetSector) return null
      
      const end = finalDestination || targetSector
      if (!end) return null

      const [ex, ey] = end.split(':').map(Number)
      
      // Сітка 7x7. Центр (3,3). 1 клітинка ≈ 14.28%
      const cellPercent = 100 / 7
      
      const startX = 50 
      const startY = 50
      
      const endX = 50 + (ex - cx) * cellPercent
      const endY = 50 + (ey - cy) * cellPercent

      return { x1: startX, y1: startY, x2: endX, y2: endY }
  }

  const routeLine = getLineCoordinates()
  const totalDistance = finalDestination ? getGridDistance(currentSector, finalDestination) : (targetSector ? getGridDistance(currentSector, targetSector) : 0)
  const jumpsRequired = Math.ceil(totalDistance / jumpRange)

  return (
    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      
      {/* --- HEADER --- */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto">
              <h2 className="text-2xl md:text-4xl font-black font-mono text-neon-cyan flex items-center gap-2">
                  <Navigation className="animate-pulse" /> TACTICAL MAP
              </h2>
              <div className="text-xs text-gray-400 font-mono mt-1">
                  SECTOR: <span className="text-white">{currentSector}</span> // RANGE: <span className="text-neon-orange">{jumpRange} LY</span>
              </div>
          </div>
          <button 
            onClick={() => useGameStore.setState({ status: 'space' })} 
            className="pointer-events-auto p-2 bg-white/5 border border-white/10 rounded hover:bg-white/20 text-gray-400 hover:text-white transition-all"
          >
            <X size={24}/>
          </button>
      </div>

      {/* --- GRID CONTAINER --- */}
      <div className="relative w-full max-w-md aspect-square bg-space-900/50 border border-white/10 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.05)]">
          
          {/* SVG LAYERS (Лінії та з'єднання) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-30">
             <defs>
                 <pattern id="smallGrid" width="14.28%" height="14.28%" patternUnits="userSpaceOnUse">
                     <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="0.5"/>
                 </pattern>
             </defs>
             <rect width="100%" height="100%" fill="url(#smallGrid)" />
             
             {/* ROUTE LINE */}
             {routeLine && (
                 <line 
                    x1={`${routeLine.x1}%`} y1={`${routeLine.y1}%`} 
                    x2={`${routeLine.x2}%`} y2={`${routeLine.y2}%`} 
                    stroke={finalDestination ? "#fbbf24" : "#00f0ff"} 
                    strokeWidth="2" 
                    strokeDasharray={finalDestination ? "5,5" : "0"}
                    className={finalDestination ? "animate-dash" : ""}
                 />
             )}
          </svg>

          {/* CELLS */}
          <div className="absolute inset-0 grid grid-cols-7 grid-rows-7 z-10 p-2 gap-1 md:gap-2">
              {gridCells.map(cellId => {
                  const isCurrent = cellId === currentSector
                  const isTarget = cellId === targetSector
                  const isFinal = cellId === finalDestination
                  const dist = getGridDistance(currentSector, cellId)
                  const inRange = dist <= jumpRange
                  
                  const detail = sectorDetails[cellId]
                  const isStation = cellId === '0:0' 

                  // Стилізація клітинки
                  let bgClass = "bg-white/5"
                  let borderClass = "border-white/5"
                  let textClass = "text-gray-600"
                  let opacityClass = "opacity-50" 

                  if (isCurrent) {
                      bgClass = "bg-neon-cyan/20"
                      borderClass = "border-neon-cyan"
                      textClass = "text-white"
                      opacityClass = "opacity-100"
                  } else if (isTarget) {
                      bgClass = "bg-neon-orange/20"
                      borderClass = "border-neon-orange animate-pulse"
                      textClass = "text-neon-orange"
                      opacityClass = "opacity-100"
                  } else if (isFinal) {
                      bgClass = "bg-yellow-500/10"
                      borderClass = "border-yellow-500 border-dashed"
                      textClass = "text-yellow-500"
                      opacityClass = "opacity-100"
                  } else if (isStation) {
                      bgClass = "bg-yellow-400/10 shadow-[inset_0_0_20px_rgba(250,204,21,0.2)]"
                      borderClass = "border-yellow-400"
                      textClass = "text-yellow-400 font-bold"
                      opacityClass = "opacity-100"
                  } else if (inRange) {
                      borderClass = "border-white/20 hover:border-white/50"
                      textClass = "text-gray-400"
                      opacityClass = "opacity-80"
                  }

                  return (
                      <button
                          key={cellId}
                          onClick={() => handleSectorClick(cellId)}
                          disabled={isCurrent}
                          className={`
                              relative flex flex-col items-center justify-center rounded transition-all duration-200
                              ${bgClass} ${borderClass} ${opacityClass} border
                              ${inRange && !isCurrent ? 'hover:scale-105 cursor-pointer' : ''}
                              ${!inRange && !isCurrent ? 'cursor-crosshair hover:bg-white/10' : ''}
                          `}
                      >
                          {/* Іконки */}
                          {isCurrent && <Navigation size={16} className="text-neon-cyan mb-1" />}
                          {isTarget && !isCurrent && <Crosshair size={16} className="text-neon-orange mb-1 animate-spin-slow" />}
                          {isFinal && <MapPin size={16} className="text-yellow-500 mb-1" />}
                          
                          {/* Іконка станції */}
                          {isStation && !isCurrent && !isTarget && (
                              <Home size={16} className="text-yellow-400 mb-1 animate-pulse" />
                          )}
                          
                          {/* Іконка ворогів */}
                          {detail?.hasEnemies && !isCurrent && (
                              <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-neon-red rounded-full animate-ping" />
                          )}
                          {/* Іконка ресурсів */}
                          {detail?.hasResources && !isCurrent && (
                              <div className="absolute bottom-1 right-1 w-1 h-1 bg-neon-cyan rounded-full" />
                          )}

                          <span className={`text-[8px] md:text-[10px] font-mono ${textClass}`}>
                              {cellId}
                          </span>
                      </button>
                  )
              })}
          </div>
      </div>

      {/* --- FOOTER CONTROLS --- */}
      <div className="w-full max-w-md mt-4 flex gap-4">
          <div className="flex-1 bg-black/50 border border-white/10 p-3 rounded flex flex-col justify-center">
              <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status</div>
              {finalDestination ? (
                  <div className="text-yellow-500 font-mono text-sm animate-pulse flex items-center gap-2">
                      <Zap size={14}/> ROUTE PLOTTED
                  </div>
              ) : targetSector ? (
                  <div className="text-neon-orange font-mono text-sm flex items-center gap-2">
                      <Crosshair size={14}/> LOCKED
                  </div>
              ) : (
                  <div className="text-gray-400 font-mono text-sm">IDLE</div>
              )}
          </div>

          <button
              onClick={() => startWarp()}
              disabled={!targetSector}
              className={`
                  flex-1 py-3 px-6 rounded font-bold font-mono text-lg uppercase transition-all flex flex-col items-center justify-center
                  ${targetSector 
                      ? 'bg-neon-orange text-black hover:bg-white shadow-[0_0_20px_rgba(255,165,0,0.4)]' 
                      : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'}
              `}
          >
              {finalDestination ? (
                  <>
                      <span>INITIATE JUMP</span>
                      <span className="text-[9px] opacity-70 mt-1">SEQ: 1 / {jumpsRequired}</span>
                  </>
              ) : (
                  <span>WARP DRIVE</span>
              )}
          </button>
      </div>
    </div>
  )
}