import { useState } from 'react'
import { useGameStore } from '../store'
import { Navigation, Crosshair, MapPin, Eye, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Ban } from 'lucide-react'

export default function SectorMap() {
  const { 
    currentSector, 
    visitedSectors, // <--- Важливий масив із бази
    targetSector, 
    setTargetSector, 
    startWarp, 
    fuel,
    status
  } = useGameStore((state: any) => state)

  // Стан для центру перегляду карти (камера), незалежно від положення корабля
  const [viewCenter, setViewCenter] = useState(currentSector || '0:0')

  // Локальна функція розрахунку палива
  const getFuelCost = (target: string) => {
      if (!currentSector || !target) return 0
      const [x1, y1] = currentSector.split(':').map(Number)
      const [x2, y2] = target.split(':').map(Number)
      const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      return Math.ceil(dist * 10)
  }

  // Навігація по карті (зсув камери)
  const moveView = (dx: number, dy: number) => {
      const [cx, cy] = viewCenter.split(':').map(Number)
      setViewCenter(`${cx + dx}:${cy + dy}`)
  }

  // Генеруємо сітку 5x5 навколо viewCenter
  const [cx, cy] = viewCenter.split(':').map(Number)
  const gridSize = 2
  const grid = []

  for (let y = cy - gridSize; y <= cy + gridSize; y++) {
    for (let x = cx - gridSize; x <= cx + gridSize; x++) {
      grid.push(`${x}:${y}`)
    }
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="absolute top-8 left-8 border-l-4 border-neon-cyan pl-4">
        <h2 className="text-3xl font-mono text-neon-cyan font-bold flex items-center gap-3 tracking-widest">
            <MapPin className="animate-bounce" /> TACTICAL MAP
        </h2>
        <p className="text-gray-500 font-mono text-sm mt-1">SECTOR VIEW: {viewCenter}</p>
      </div>

      {/* STATUS PANEL (RIGHT) */}
      <div className="absolute top-8 right-8 text-right bg-space-900/80 p-4 border border-white/10 rounded backdrop-blur-sm">
        <div className="text-neon-orange font-bold font-mono text-2xl flex items-center justify-end gap-2">
            FUEL: {fuel}% <span className="text-xs text-gray-500 bg-black px-1 rounded">MAX 100</span>
        </div>
        
        {targetSector ? (
             <div className="mt-2 text-right">
                <div className="text-xs text-gray-400 font-mono">DESTINATION: <span className="text-white font-bold">{targetSector}</span></div>
                <div className="text-xs font-mono mt-1">
                    COST: <span className={fuel >= getFuelCost(targetSector) ? 'text-neon-cyan' : 'text-neon-red font-bold'}>
                        {getFuelCost(targetSector)} UNITS
                    </span>
                </div>
            </div>
        ) : (
            <div className="mt-2 text-xs text-gray-500 font-mono animate-pulse">
                SELECT A SECTOR TO WARP
            </div>
        )}
      </div>

      {/* === MAP CONTAINER === */}
      <div className="relative p-12 bg-space-950/50 rounded-3xl border border-neon-cyan/20 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* Navigation Controls (Arrows) */}
        <button onClick={() => moveView(0, -1)} className="absolute top-2 left-1/2 -translate-x-1/2 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full transition-all">
            <ChevronUp size={32}/>
        </button>
        <button onClick={() => moveView(0, 1)} className="absolute bottom-2 left-1/2 -translate-x-1/2 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full transition-all">
            <ChevronDown size={32}/>
        </button>
        <button onClick={() => moveView(-1, 0)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full transition-all">
            <ChevronLeft size={32}/>
        </button>
        <button onClick={() => moveView(1, 0)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full transition-all">
            <ChevronRight size={32}/>
        </button>

        {/* GRID */}
        <div className="grid grid-cols-5 gap-4 relative z-10">
            {grid.map(sectorId => {
                const isCurrent = sectorId === currentSector
                const isTarget = sectorId === targetSector
                
                // Перевіряємо, чи відвідували ми цей сектор (або це 0:0, який завжди відкритий)
                const isVisited = visitedSectors.includes(sectorId) || sectorId === '0:0'

                return (
                    <button 
                        key={sectorId}
                        onClick={() => setTargetSector(sectorId)}
                        disabled={isCurrent}
                        className={`
                            w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center relative transition-all duration-300
                            ${isCurrent 
                                ? 'bg-neon-cyan border-neon-cyan text-black shadow-[0_0_20px_rgba(0,240,255,0.6)] scale-110 z-20' 
                                : isTarget
                                    ? 'bg-neon-orange/20 border-neon-orange text-neon-orange border-dashed animate-pulse z-10'
                                    : isVisited
                                        ? 'bg-space-800/60 border-neon-cyan/30 text-neon-cyan/70 hover:bg-space-700 hover:border-neon-cyan hover:text-white'
                                        : 'bg-black/40 border-white/5 text-transparent hover:border-white/20'
                            }
                        `}
                    >
                        {isCurrent && <span className="text-[10px] font-bold">YOU</span>}
                        
                        {/* Координати показуємо тільки якщо були там або це ми */}
                        {(isVisited || isCurrent) ? (
                            <span className={`font-mono text-xs ${isCurrent ? 'font-black' : ''}`}>{sectorId}</span>
                        ) : (
                            <span className="text-white/10 text-lg">?</span>
                        )}

                        {isVisited && !isCurrent && (
                            <div className="absolute top-1 right-1 opacity-50"><Eye size={8}/></div>
                        )}
                        
                        {isTarget && !isCurrent && <Crosshair size={12} className="mt-1"/>}
                    </button>
                )
            })}
        </div>

        {/* Center Indicator (Decoration) */}
        <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none"/>
      </div>

      {/* CONTROLS FOOTER */}
      <div className="absolute bottom-12 flex gap-4">
        <button 
            onClick={() => useGameStore.setState({ status: 'space' })}
            className="px-8 py-3 border border-gray-600 text-gray-400 font-mono hover:bg-white/10 hover:text-white transition-all rounded clip-path-polygon uppercase tracking-wider text-sm"
        >
            Return to Bridge
        </button>

        <button 
            disabled={!targetSector || fuel < getFuelCost(targetSector || '')}
            onClick={startWarp}
            className="px-10 py-3 bg-neon-cyan text-black font-bold font-mono hover:bg-white hover:scale-105 transition-all rounded shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 uppercase tracking-wider text-sm"
        >
            {targetSector && fuel < getFuelCost(targetSector) ? (
                <><Ban size={16}/> INSUFFICIENT FUEL</>
            ) : (
                <><Navigation size={16} className={targetSector ? 'animate-spin-slow' : ''} /> INITIATE WARP</>
            )}
        </button>
      </div>

    </div>
  )
}