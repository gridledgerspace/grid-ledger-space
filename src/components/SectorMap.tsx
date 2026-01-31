import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store'
import { Navigation, Crosshair, MapPin, Skull, Home, Gem, CircleDashed, Loader2, LocateFixed, Rocket } from 'lucide-react'

export default function SectorMap() {
  const { 
    currentSector, visitedSectors, targetSector, setTargetSector, 
    startWarp, fetchSectorGrid, sectorDetails, localObjects
  } = useGameStore((state: any) => state)

  // Центр перегляду
  const [viewCenter, setViewCenter] = useState(currentSector || '0:0')
  const [isLoading, setIsLoading] = useState(false)

  // === ДРАГ-Н-ДРОП ЛОГІКА ===
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })     // Де натиснули
  const currentTranslate = useRef({ x: 0, y: 0 }) // Поточний зсув (візуальний)
  const mapRef = useRef<HTMLDivElement>(null)  // Реф на контейнер сітки

  // Розмір клітинки + відступ (w-20 = 80px, gap-2 = 8px -> ~88px)
  // На мобільному менше: w-[18vw]
  const CELL_SIZE = window.innerWidth < 768 ? window.innerWidth * 0.18 + 4 : 88 

  useEffect(() => {
      const loadData = async () => {
          setIsLoading(true)
          await fetchSectorGrid(viewCenter)
          setIsLoading(false)
      }
      loadData()
  }, [viewCenter])

  // --- ОБРОБНИКИ ПОДІЙ (TOUCH & MOUSE) ---

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    // Скидаємо поточний зсув
    currentTranslate.current = { x: 0, y: 0 }
    if (mapRef.current) {
        mapRef.current.style.transition = 'none' // Прибираємо анімацію для миттєвої реакції
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    currentTranslate.current = { x: dx, y: dy }

    // Рухаємо сітку візуально
    if (mapRef.current) {
        mapRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (mapRef.current) {
        mapRef.current.style.transition = 'transform 0.3s ease-out'
        mapRef.current.style.transform = 'translate(0px, 0px)' // Повертаємо візуально в центр
    }

    // Якщо рух був маленький (< 5px), вважаємо це кліком, а не драгом
    // (Логіка кліку обробляється на кнопці, тут ми просто ігноруємо зміну центру)
    if (dist < 10) return 

    // Рахуємо, на скільки клітинок ми змістилися
    // Інвертуємо (тягнемо вправо -> бачимо ліві сектори)
    const sectorsX = -Math.round(dx / CELL_SIZE)
    const sectorsY = -Math.round(dy / CELL_SIZE)

    if (sectorsX !== 0 || sectorsY !== 0) {
        const [cx, cy] = viewCenter.split(':').map(Number)
        setViewCenter(`${cx + sectorsX}:${cy + sectorsY}`)
    }
  }

  // Центрування на гравці
  const centerOnPlayer = () => {
      setViewCenter(currentSector)
  }

  // === ВІДОБРАЖЕННЯ КОНТЕНТУ ===
  const getSectorContent = (id: string) => {
      if (id === '0:0') return { type: 'station', icon: <Home size={14}/>, color: 'text-white' }
      
      // Якщо це поточний сектор - дивимось реальні дані
      if (id === currentSector && localObjects.length > 0) {
           const hasEnemy = localObjects.some((o: any) => o.type === 'enemy')
           const hasPlayer = localObjects.some((o: any) => o.type === 'player')
           const hasResources = localObjects.some((o: any) => o.type === 'asteroid' && o.data)
           
           if (hasPlayer) return { type: 'player', icon: <Rocket size={14}/>, color: 'text-green-400' } // Інший гравець
           if (hasEnemy) return { type: 'enemy', icon: <Skull size={14}/>, color: 'text-neon-red' }
           if (hasResources) return { type: 'resources', icon: <Gem size={14}/>, color: 'text-neon-cyan' }
      }

      const details = sectorDetails[id]
      if (details) {
          if (details.isDepleted) return { type: 'empty', icon: <CircleDashed size={14}/>, color: 'text-gray-700' }
          if (details.hasResources) return { type: 'resources', icon: <Gem size={14}/>, color: 'text-neon-cyan' }
          return { type: 'empty', icon: <CircleDashed size={14}/>, color: 'text-gray-700' }
      }
      return { type: 'unknown', icon: null, color: 'text-gray-800' }
  }

  const getFuelCost = (target: string) => {
      if (!currentSector || !target) return 0
      const [x1, y1] = currentSector.split(':').map(Number)
      const [x2, y2] = target.split(':').map(Number)
      const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      return Math.ceil(dist * 10)
  }

  // Генеруємо сітку. Збільшуємо радіус для більшого екрану
  const [cx, cy] = viewCenter.split(':').map(Number)
  // Радіус 3 дає 7x7 = 49 секторів, що достатньо перекриває екран
  const gridSize = 3 
  const grid = []

  for (let y = cy - gridSize; y <= cy + gridSize; y++) {
    for (let x = cx - gridSize; x <= cx + gridSize; x++) {
      grid.push(`${x}:${y}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-mono text-white h-[100dvh] overflow-hidden select-none">
      
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-space-900 via-black to-black opacity-80" />
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
        <div className="glass-panel px-4 py-2 border-l-4 border-l-neon-cyan pointer-events-auto">
             <h2 className="text-xl md:text-2xl text-neon-cyan font-bold flex items-center gap-2 uppercase shadow-neon">
                 <MapPin className="w-5 h-5" /> Tactical Map
             </h2>
             <div className="flex items-center gap-2 mt-1">
                 <p className="text-gray-500 text-xs">VIEW: <span className="text-white">{viewCenter}</span></p>
                 {isLoading && <Loader2 size={12} className="animate-spin text-neon-cyan"/>}
             </div>
        </div>

        {/* Center Button */}
        <button 
            onClick={centerOnPlayer}
            className="glass-panel p-3 rounded-full border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all pointer-events-auto shadow-lg active:scale-95"
            title="Center on Ship"
        >
            <LocateFixed size={24} />
        </button>
      </div>

      {/* STATUS PANEL (Right) */}
      {targetSector && (
          <div className="absolute top-20 right-4 z-20 pointer-events-none animate-in slide-in-from-right">
             <div className="glass-panel p-4 text-right border-r-4 border-r-neon-orange pointer-events-auto min-w-[140px]">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Target</div>
                <div className="text-white font-bold text-xl">{targetSector}</div>
                
                <div className="flex justify-end gap-2 my-1 items-center">
                    {getSectorContent(targetSector).icon}
                    <span className={`text-[10px] font-bold ${getSectorContent(targetSector).color}`}>
                        {getSectorContent(targetSector).type.toUpperCase()}
                    </span>
                </div>

                <div className="w-full h-px bg-white/10 my-2"></div>
                <div className="text-[10px] text-gray-500">DISTANCE</div>
                <div className="text-neon-cyan font-bold">{getFuelCost(targetSector)} KM</div>
            </div>
          </div>
      )}

      {/* === MAP INTERFACE (DRAGGABLE AREA) === */}
      <div 
        className="flex-1 relative z-10 overflow-hidden cursor-move flex items-center justify-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp} // Якщо курсор вилетів за екран
      >
        
        {/* GRID CONTAINER */}
        <div 
            ref={mapRef}
            className="grid gap-1 md:gap-2 p-10 transition-transform duration-75 ease-linear will-change-transform"
            style={{ 
                gridTemplateColumns: `repeat(${gridSize * 2 + 1}, minmax(0, 1fr))`
            }}
        >
            {grid.map(sectorId => {
                const isCurrent = sectorId === currentSector
                const isTarget = sectorId === targetSector
                const isVisited = visitedSectors.includes(sectorId) || sectorId === '0:0' || isCurrent
                const content = getSectorContent(sectorId)

                return (
                    <button 
                        key={sectorId}
                        // Для кліку використовуємо onPointerUp логіку "мала дистанція", 
                        // але для простоти можна залишити onClick, бо наш onPointerUp ігнорує малі рухи
                        onClick={() => !isDragging && setTargetSector(sectorId)}
                        disabled={isCurrent}
                        className={`
                            w-[18vw] h-[18vw] md:w-20 md:h-20 max-w-[80px] max-h-[80px]
                            rounded border flex flex-col items-center justify-center relative transition-all duration-200 group overflow-hidden
                            ${isCurrent 
                                ? 'bg-neon-cyan border-neon-cyan text-black shadow-neon z-20 scale-110' 
                                : isTarget
                                    ? 'bg-neon-orange/10 border-neon-orange text-neon-orange border-dashed z-10'
                                    : isVisited
                                        ? 'bg-space-800/60 border-white/10 hover:border-neon-cyan/50 hover:bg-space-700'
                                        : 'bg-black/20 border-white/5 text-transparent'}
                        `}
                    >
                        {isVisited && !isCurrent && content.icon && (
                            <div className={`opacity-80 ${content.color} scale-75 md:scale-100`}>
                                {content.icon}
                            </div>
                        )}

                        <span className={`text-[8px] md:text-[10px] font-mono mt-0.5 ${isCurrent ? 'font-black' : 'text-gray-500'}`}>
                            {isVisited ? sectorId : ''}
                        </span>

                        {isCurrent && <span className="text-[6px] md:text-[9px] font-black leading-none uppercase mt-1">YOU</span>}
                        {isTarget && !isCurrent && <Crosshair size={14} className="absolute inset-0 m-auto animate-spin-slow opacity-50"/>}
                    </button>
                )
            })}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="absolute bottom-6 w-full px-6 flex justify-center gap-4 z-20 pointer-events-none">
        <button 
            onClick={() => useGameStore.setState({ status: 'space' })}
            className="pointer-events-auto bg-black/80 backdrop-blur border border-gray-600 text-gray-400 px-6 py-3 rounded font-bold text-xs hover:text-white hover:border-white transition-all uppercase tracking-wider"
        >
            Close
        </button>

        <button 
            disabled={!targetSector}
            onClick={startWarp}
            className="pointer-events-auto bg-neon-cyan text-black px-10 py-3 rounded font-bold text-xs hover:bg-white hover:scale-105 transition-all shadow-neon uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
        >
            {targetSector ? (
                <><Navigation size={14} className="animate-spin-slow" /> Initiate Warp</>
            ) : (
                'Select Destination'
            )}
        </button>
      </div>

    </div>
  )
}