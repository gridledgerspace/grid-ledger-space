import { useState, useEffect } from 'react'
import { useGameStore } from '../store'
import { Navigation, Crosshair, MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Ban, Skull, Home, Gem, CircleDashed, Loader2 } from 'lucide-react'

export default function SectorMap() {
  const { 
    currentSector, visitedSectors, targetSector, setTargetSector, 
    startWarp, fuel, fetchSectorGrid, sectorDetails, localObjects
  } = useGameStore((state: any) => state)

  const [viewCenter, setViewCenter] = useState(currentSector || '0:0')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
      const loadData = async () => {
          setIsLoading(true)
          await fetchSectorGrid(viewCenter)
          setIsLoading(false)
      }
      loadData()
  }, [viewCenter])

  const getSectorContent = (id: string) => {
      if (id === '0:0') return { type: 'station', icon: <Home size={12}/>, color: 'text-white' }
      
      const details = sectorDetails[id]
      if (id === currentSector && localObjects.length > 0) {
           const hasEnemy = localObjects.some((o: any) => o.type === 'enemy')
           const hasResources = localObjects.some((o: any) => o.type === 'asteroid' && o.data)
           if (hasEnemy) return { type: 'enemy', icon: <Skull size={12}/>, color: 'text-neon-red' }
           if (hasResources) return { type: 'resources', icon: <Gem size={12}/>, color: 'text-neon-cyan' }
      }
      if (details) {
          if (details.isDepleted) return { type: 'empty', icon: <CircleDashed size={12}/>, color: 'text-gray-700' }
          if (details.hasResources) return { type: 'resources', icon: <Gem size={12}/>, color: 'text-neon-cyan' }
          return { type: 'empty', icon: <CircleDashed size={12}/>, color: 'text-gray-700' }
      }
      return { type: 'unknown', icon: null, color: 'text-gray-800' }
  }

  const moveView = (dx: number, dy: number) => {
      const [cx, cy] = viewCenter.split(':').map(Number)
      setViewCenter(`${cx + dx}:${cy + dy}`)
  }

  const [cx, cy] = viewCenter.split(':').map(Number)
  const gridSize = 2
  const grid = []

  for (let y = cy - gridSize; y <= cy + gridSize; y++) {
    for (let x = cx - gridSize; x <= cx + gridSize; x++) {
      grid.push(`${x}:${y}`)
    }
  }

  return (
    // Використовуємо h-[100dvh] для коректної висоти на мобільних
    <div className="fixed inset-0 z-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-space-900 via-black to-black flex flex-col items-center justify-center animate-in fade-in duration-300 font-mono text-white h-[100dvh] overflow-hidden">
      

      {/* HEADER: Використовуємо clamp для розміру шрифту */}
      <div className="absolute top-2 left-4 md:top-8 md:left-8 border-l-2 md:border-l-4 border-neon-cyan pl-3 z-10">
        <h2 className="text-[clamp(1.2rem,4vw,2rem)] text-neon-cyan font-bold flex items-center gap-2 tracking-widest uppercase shadow-neon">
            <MapPin className="animate-bounce w-5 h-5 md:w-8 md:h-8" /> Tactical Map
        </h2>
        <div className="flex items-center gap-3 mt-1">
             <p className="text-gray-500 text-[10px] md:text-sm">SECTOR: <span className="text-white">{viewCenter}</span></p>
             {isLoading && <Loader2 size={12} className="animate-spin text-neon-cyan"/>}
        </div>
      </div>

      {/* STATUS PANEL: Менші відступи та шрифти */}
     

      {/* === MAP INTERFACE === */}
      <div className="relative z-10 mt-6 md:mt-0 flex flex-col items-center justify-center">
        
        {/* Navigation Arrows: Ближче до сітки */}
        <button onClick={() => moveView(0, -1)} className="mb-1 md:mb-4 p-1 md:p-2 text-neon-cyan hover:text-white rounded-full bg-black/50 border border-white/10"><ChevronUp size={24}/></button>
        
        <div className="flex items-center gap-1 md:gap-4">
            <button onClick={() => moveView(-1, 0)} className="mr-1 md:mr-0 p-1 md:p-2 text-neon-cyan hover:text-white rounded-full bg-black/50 border border-white/10"><ChevronLeft size={24}/></button>

            {/* GRID: Використовуємо VW для розмірів кнопок, щоб вони завжди влазили */}
            <div className="grid grid-cols-5 gap-1 md:gap-3 p-2 md:p-5 bg-black/80 rounded-xl border border-neon-cyan/30 shadow-[0_0_60px_rgba(0,240,255,0.15)] backdrop-blur-sm">
                {grid.map(sectorId => {
                    const isCurrent = sectorId === currentSector
                    const isTarget = sectorId === targetSector
                    const isVisited = visitedSectors.includes(sectorId) || sectorId === '0:0' || isCurrent
                    const content = getSectorContent(sectorId)

                    return (
                        <button 
                            key={sectorId}
                            onClick={() => setTargetSector(sectorId)}
                            disabled={isCurrent}
                            className={`
                                w-[15vw] h-[15vw] max-w-[50px] max-h-[50px] md:w-20 md:h-20 md:max-w-none md:max-h-none
                                rounded border flex flex-col items-center justify-center relative transition-all duration-200 group overflow-hidden
                                ${isCurrent 
                                    ? 'bg-neon-cyan border-neon-cyan text-black shadow-neon z-20 scale-105' 
                                    : isTarget
                                        ? 'bg-neon-orange/10 border-neon-orange text-neon-orange border-dashed z-10'
                                        : isVisited
                                            ? 'bg-space-800/60 border-white/10 hover:border-neon-cyan/50'
                                            : 'bg-black/40 border-white/5 text-transparent'}
                            `}
                        >
                            {isVisited && !isCurrent && content.icon && (
                                <div className={`opacity-80 ${content.color} scale-75 md:scale-100`}>
                                    {content.icon}
                                </div>
                            )}

                            {/* Дуже малий текст для мобільних */}
                            <span className={`text-[8px] md:text-[10px] font-mono mt-0.5 ${isCurrent ? 'font-black' : 'text-gray-400'}`}>
                                {isVisited ? sectorId : ''}
                            </span>

                            {isCurrent && <span className="text-[6px] md:text-[9px] font-black leading-none uppercase">YOU</span>}
                            {isTarget && !isCurrent && <Crosshair size={14} className="absolute inset-0 m-auto animate-spin-slow opacity-50"/>}
                        </button>
                    )
                })}
            </div>

            <button onClick={() => moveView(1, 0)} className="ml-1 md:ml-0 p-1 md:p-2 text-neon-cyan hover:text-white rounded-full bg-black/50 border border-white/10"><ChevronRight size={24}/></button>
        </div>
        
        <button onClick={() => moveView(0, 1)} className="mt-1 md:mt-4 p-1 md:p-2 text-neon-cyan hover:text-white rounded-full bg-black/50 border border-white/10"><ChevronDown size={24}/></button>
      </div>

      {/* FOOTER: Кнопки зменшуються і стають в рядок */}
      <div className="absolute bottom-6 md:bottom-12 flex gap-3 md:gap-6 z-10 w-full px-4 justify-center">
        <button 
            onClick={() => useGameStore.setState({ status: 'space' })}
            className="flex-1 max-w-[140px] py-3 border border-gray-600 bg-black/80 text-gray-400 text-[10px] md:text-sm font-bold tracking-wider hover:bg-white/10 hover:text-white rounded uppercase"
        >
            Back
        </button>

        <button 
            disabled={!targetSector || fuel < (targetSector || '')}
            onClick={startWarp}
            className="flex-[2] max-w-[200px] py-3 bg-neon-cyan text-black font-bold text-[10px] md:text-sm tracking-wider hover:bg-white transition-all rounded shadow-neon disabled:opacity-50 flex justify-center items-center gap-2 uppercase"
        >
            {targetSector && fuel < (targetSector) ? (
                <><Ban size={14}/> NO FUEL</>
            ) : (
                <><Navigation size={14} className={targetSector ? 'animate-spin-slow' : ''} /> WARP JUMP</>
            )}
        </button>
      </div>

    </div>
  )
}