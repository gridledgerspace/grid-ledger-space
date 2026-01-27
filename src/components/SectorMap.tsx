import { useState } from 'react'
import { useGameStore, calculateFuelCost } from '../store' // <-- Імпортуємо функцію розрахунку
import { Navigation, Map as MapIcon, Crosshair, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Locate, Skull, Database, Home, EyeOff } from 'lucide-react'

export default function SectorMap() {
  const { currentSector, setTargetSector, startWarp, fuel, scannedSectors } = useGameStore()
  const [selected, setSelected] = useState<string | null>(null)

  // Парсимо координати
  const [playerX, playerY] = currentSector.split(':').map(Number)
  const [viewX, setViewX] = useState(playerX)
  const [viewY, setViewY] = useState(playerY)

  const range = 2
  const sectors = []
  for(let y = viewY - range; y <= viewY + range; y++) {
      for(let x = viewX - range; x <= viewX + range; x++) {
          sectors.push(`${x}:${y}`)
      }
  }

  // РОЗРАХУНОК ВАРТОСТІ ДЛЯ ВИБРАНОГО СЕКТОРУ
  const jumpCost = selected ? calculateFuelCost(currentSector, selected) : 0
  const canJump = selected && fuel >= jumpCost

  const handleWarp = () => {
      if(canJump && selected) {
          setTargetSector(selected)
          startWarp()
      }
  }

  const recenter = () => {
      setViewX(playerX)
      setViewY(playerY)
  }

  return (
    <div className="h-screen w-full bg-space-950 flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in duration-500">
        
        {/* ФОН */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        
        {/* HUD */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-start pointer-events-none z-20">
            <div className="glass-panel px-6 py-2 rounded-br-2xl border-l-4 border-l-neon-cyan">
                <h2 className="text-neon-cyan font-mono text-xl font-bold flex items-center gap-2">
                    <MapIcon size={18}/> TACTICAL MAP
                </h2>
                <p className="text-xs text-gray-400 font-mono">SECTOR VIEW: {viewX}:{viewY}</p>
            </div>
            
            <div className="glass-panel px-6 py-2 rounded-bl-2xl border-r-4 border-r-neon-orange text-right">
                {/* Показуємо поточне паливо і вартість стрибка, якщо вибрано сектор */}
                <h2 className={`${fuel < 20 ? 'text-neon-red' : 'text-neon-orange'} font-mono text-xl font-bold`}>
                    FUEL: {fuel}% 
                    {selected && selected !== currentSector && (
                        <span className="text-sm text-gray-400 ml-2">(-{jumpCost})</span>
                    )}
                </h2>
                <p className="text-xs text-gray-400 font-mono">
                    {selected && selected !== currentSector 
                        ? `ESTIMATED COST: ${jumpCost} FUEL` 
                        : 'SELECT DESTINATION'}
                </p>
            </div>
        </div>

        {/* НАВІГАЦІЯ (Стрілки і Сітка) */}
        <div className="relative z-10 flex flex-col items-center gap-2">
            
            <button onClick={() => setViewY(viewY - 1)} className="p-2 glass-panel border border-neon-cyan/30 hover:bg-neon-cyan hover:text-black transition-colors rounded-full text-neon-cyan">
                <ChevronUp />
            </button>

            <div className="flex items-center gap-2">
                <button onClick={() => setViewX(viewX - 1)} className="p-2 glass-panel border border-neon-cyan/30 hover:bg-neon-cyan hover:text-black transition-colors rounded-full text-neon-cyan">
                    <ChevronLeft />
                </button>

                {/* СІТКА */}
                <div className="grid grid-cols-5 gap-2 p-3 glass-panel rounded-xl border border-neon-blue/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black/80">
                    {sectors.map(sec => {
                        const isCurrent = sec === currentSector
                        const isSelected = sec === selected
                        const isBase = sec === '0:0'
                        const info = scannedSectors[sec]
                        const isScanned = !!info
                        const [sx, sy] = sec.split(':').map(Number)

                        // Стилізація (як було раніше)
                        let cellStyle = ''
                        if (isCurrent) cellStyle = 'bg-neon-cyan text-black border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.6)] z-10 scale-105'
                        else if (isSelected) cellStyle = 'bg-neon-orange/20 border-neon-orange text-neon-orange z-10 scale-110 shadow-[0_0_20px_rgba(255,174,0,0.5)]'
                        else if (isScanned) cellStyle = 'bg-space-900/80 border-neon-blue/40 text-neon-blue hover:bg-neon-blue/10 hover:border-neon-blue'
                        else cellStyle = 'bg-black/40 border-white/5 text-gray-800 hover:border-white/20 hover:text-gray-500'

                        return (
                            <button
                                key={sec}
                                onClick={() => setSelected(sec)}
                                disabled={isCurrent}
                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded border flex flex-col items-center justify-center transition-all duration-300 relative group ${cellStyle}`}
                            >
                                <span className={`font-mono text-[10px] sm:text-xs font-bold absolute top-1 left-1 ${isCurrent ? 'opacity-100' : 'opacity-70'}`}>
                                    {sx}:{sy}
                                </span>

                                <div className="mt-2">
                                    {isCurrent ? <div className="w-2 h-2 bg-black rounded-full animate-ping" />
                                    : isScanned ? (
                                        <div className="flex gap-1 opacity-80">
                                            {info.hasStation && <Home size={10} />}
                                            {info.hasEnemies && <Skull size={10} className="text-red-500" />}
                                            {info.resources.length > 0 && <Database size={10} className="text-yellow-400" />}
                                            {!info.hasStation && !info.hasEnemies && info.resources.length === 0 && <span className="text-[8px] opacity-50">EMPTY</span>}
                                        </div>
                                    ) : <EyeOff size={12} className="opacity-20" />}
                                </div>

                                {isCurrent && <span className="text-[8px] font-bold absolute bottom-1">YOU</span>}
                                {isBase && !isCurrent && <span className="text-[8px] text-neon-blue font-bold absolute bottom-1 right-1">BASE</span>}
                                {isSelected && !isCurrent && <Crosshair size={14} className="absolute top-1 right-1 opacity-80 animate-spin-slow"/>}
                            </button>
                        )
                    })}
                </div>

                <button onClick={() => setViewX(viewX + 1)} className="p-2 glass-panel border border-neon-cyan/30 hover:bg-neon-cyan hover:text-black transition-colors rounded-full text-neon-cyan">
                    <ChevronRight />
                </button>
            </div>

            <button onClick={() => setViewY(viewY + 1)} className="p-2 glass-panel border border-neon-cyan/30 hover:bg-neon-cyan hover:text-black transition-colors rounded-full text-neon-cyan">
                <ChevronDown />
            </button>
            
            <button onClick={recenter} className="absolute top-0 right-0 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full border border-neon-cyan/30 transition-all">
                <Locate size={16} />
            </button>
        </div>

        {/* НИЖНЯ ПАНЕЛЬ ДІЙ */}
        {selected && selected !== currentSector && (
            <div className="absolute bottom-12 z-20 animate-in slide-in-from-bottom-4 fade-in duration-300 w-full max-w-md px-4">
                <div className="glass-panel p-4 rounded-lg border border-neon-cyan/30 flex justify-between items-center bg-space-950/95 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
                    
                    <div className="text-left">
                        <div className="text-[10px] text-gray-400 font-mono">TARGET VECTOR</div>
                        <div className="text-2xl text-neon-cyan font-bold font-mono">{selected}</div>
                        {/* Попередження про вартість */}
                        <div className={`text-xs font-mono font-bold mt-1 ${fuel < jumpCost ? 'text-neon-red' : 'text-neon-orange'}`}>
                            REQ. FUEL: {jumpCost}
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleWarp}
                        disabled={!canJump} // Блокуємо, якщо мало палива
                        className={`
                            font-bold font-mono px-6 py-3 rounded transition-all flex items-center gap-2
                            ${canJump 
                                ? 'bg-neon-cyan text-black hover:bg-white shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                                : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'}
                        `}
                    >
                        <Navigation size={18} />
                        {canJump ? 'WARP' : 'NO FUEL'}
                    </button>
                </div>
            </div>
        )}

        <div className="absolute bottom-4 left-4 z-20">
            <button 
                onClick={() => {
                    const destination = currentSector === '0:0' ? 'hangar' : 'space';
                    useGameStore.setState({ status: destination });
                }}
                className="px-4 py-2 text-xs font-mono text-gray-500 hover:text-white transition-colors flex items-center gap-2 border border-transparent hover:border-white/10 rounded"
            >
                &lt; {currentSector === '0:0' ? 'RETURN TO BASE' : 'CLOSE MAP'}
            </button>
        </div>
    </div>
  )
}