import { useGameStore } from '../store'
import { Navigation, Crosshair, MapPin, Eye } from 'lucide-react'

export default function SectorMap() {
  const { 
    currentSector, 
    visitedSectors,
    targetSector, 
    setTargetSector, 
    startWarp, 
    fuel,
    // calculateFuelCost — видалили, бо використовуємо локальну функцію нижче
  } = useGameStore((state: any) => state) 

  // Локальна функція розрахунку палива для карти
  const getFuelCost = (target: string) => {
      if (!currentSector || !target) return 0
      const [x1, y1] = currentSector.split(':').map(Number)
      const [x2, y2] = target.split(':').map(Number)
      const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      return Math.ceil(dist * 10)
  }

  // Центруємо карту навколо поточного сектора
  const [cx, cy] = currentSector.split(':').map(Number)
  
  // Генеруємо сітку 5x5
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
      <div className="absolute top-8 left-8">
        <h2 className="text-3xl font-mono text-neon-cyan font-bold flex items-center gap-3">
            <MapPin className="animate-bounce" /> TACTICAL MAP
        </h2>
        <p className="text-gray-500 font-mono text-sm">SECTOR VIEW: {currentSector}</p>
      </div>

      {/* STATUS PANEL */}
      <div className="absolute top-8 right-8 text-right">
        <div className="text-neon-orange font-bold font-mono text-2xl">FUEL: {fuel}%</div>
        {targetSector && (
            <div className="text-gray-400 font-mono text-xs mt-1">
                JUMP COST: <span className={fuel >= getFuelCost(targetSector) ? 'text-green-400' : 'text-red-500'}>
                    {getFuelCost(targetSector)} UNITS
                </span>
            </div>
        )}
        <div className="text-gray-600 font-mono text-[10px] mt-2">
            VISITED SYSTEMS: {visitedSectors.length}
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-5 gap-3 p-8 bg-space-900/50 rounded-xl border border-white/5 shadow-2xl relative">
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-neon-cyan"/>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-neon-cyan"/>

        {grid.map(sectorId => {
            const isCurrent = sectorId === currentSector
            const isTarget = sectorId === targetSector
            const isVisited = visitedSectors.includes(sectorId)

            let baseClass = "w-24 h-24 rounded border flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden"
            
            if (isCurrent) {
                baseClass += " bg-neon-cyan/20 border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)] z-10 scale-105"
            } else if (isTarget) {
                baseClass += " bg-neon-orange/20 border-neon-orange border-dashed animate-pulse"
            } else if (isVisited) {
                baseClass += " bg-space-800/80 border-white/20 hover:border-white/50 hover:bg-space-700"
            } else {
                baseClass += " bg-transparent border-white/5 opacity-30 hover:opacity-100 hover:border-white/20"
            }

            return (
                <button 
                    key={sectorId}
                    onClick={() => setTargetSector(sectorId)}
                    disabled={isCurrent}
                    className={baseClass}
                >
                    {isVisited && !isCurrent && (
                        <div className="absolute top-1 right-1 text-gray-500">
                            <Eye size={10} />
                        </div>
                    )}

                    <span className={`font-mono text-sm ${isCurrent ? 'text-white font-bold' : 'text-gray-400'}`}>
                        {sectorId}
                    </span>

                    {isCurrent && (
                        <span className="text-[10px] text-neon-cyan mt-1 font-bold animate-pulse">YOU</span>
                    )}
                    
                    {isTarget && !isCurrent && (
                        <Crosshair size={14} className="text-neon-orange mt-1"/>
                    )}

                    {!isVisited && !isCurrent && !isTarget && (
                         <span className="text-[8px] text-gray-700 mt-1">UNKNOWN</span>
                    )}
                </button>
            )
        })}
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-12 flex gap-4">
        <button 
            onClick={() => useGameStore.setState({ status: 'space' })}
            className="px-6 py-3 border border-gray-600 text-gray-400 font-mono hover:bg-white/10 hover:text-white transition-all rounded"
        >
            CANCEL
        </button>

        <button 
            disabled={!targetSector || fuel < getFuelCost(targetSector || '')}
            onClick={startWarp}
            className="px-8 py-3 bg-neon-cyan text-black font-bold font-mono hover:bg-white transition-all rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
            <Navigation size={18} /> 
            {targetSector ? `WARP TO ${targetSector}` : 'SELECT DESTINATION'}
        </button>
      </div>

    </div>
  )
}