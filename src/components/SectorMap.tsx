import { useState } from 'react'
import { useGameStore } from '../store'
import { Navigation, Crosshair, MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Ban, Skull, Home, Gem, CircleDashed, } from 'lucide-react'

export default function SectorMap() {
  const { 
    currentSector, 
    visitedSectors, 
    scannedSectors, // <--- Додали пам'ять сканера
    localObjects,   // <--- Додали локальні об'єкти (те що бачимо зараз)
    targetSector, 
    setTargetSector, 
    startWarp, 
    fuel,
  } = useGameStore((state: any) => state)

  const [viewCenter, setViewCenter] = useState(currentSector || '0:0')

  // === РОЗУМНИЙ ВИЗНАЧНИК КОНТЕНТУ ===
  const getSectorContent = (id: string) => {
      // 1. СТАНЦІЯ (Завжди)
      if (id === '0:0') return { type: 'station', icon: <Home size={14}/>, color: 'text-white' }

      // 2. ЯКЩО МИ ЗАРАЗ ТУТ: Дивимось на реальні об'єкти (Truth of Reality)
      if (id === currentSector && localObjects.length > 0) {
          const hasEnemy = localObjects.some((o: any) => o.type === 'enemy')
          const hasResources = localObjects.some((o: any) => o.type === 'asteroid' && o.data && o.data.amount > 0)
          const hasStation = localObjects.some((o: any) => o.type === 'station')
          
          if (hasStation) return { type: 'station', icon: <Home size={14}/>, color: 'text-white' }
          if (hasEnemy) return { type: 'enemy', icon: <Skull size={14}/>, color: 'text-neon-red' }
          if (hasResources) return { type: 'resources', icon: <Gem size={14}/>, color: 'text-neon-cyan' }
          // Якщо тільки уламки
          return { type: 'debris', icon: <CircleDashed size={14}/>, color: 'text-gray-600' }
      }

      // 3. ЯКЩО МИ СКАНУВАЛИ ЦЕЙ СЕКТОР РАНІШЕ (Memory)
      if (scannedSectors && scannedSectors[id]) {
          const info = scannedSectors[id]
          if (info.hasStation) return { type: 'station', icon: <Home size={14}/>, color: 'text-white' }
          if (info.hasEnemies) return { type: 'enemy', icon: <Skull size={14}/>, color: 'text-neon-red' }
          if (info.resources && info.resources.length > 0) return { type: 'resources', icon: <Gem size={14}/>, color: 'text-neon-cyan' }
      }

      // 4. FALLBACK: ГЕНЕРАТОР (Якщо ми просто пролетіли і не зберегли деталі)
      // Ми налаштуємо його так, щоб він частіше показував ресурси, ніж пустоту
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
          hash = ((hash << 5) - hash) + id.charCodeAt(i);
          hash |= 0;
      }
      const seed = Math.abs(Math.sin(hash) * 10000) % 1;

      // Налаштування шансів (схоже на гру):
      if (seed > 0.85) return { type: 'enemy', icon: <Skull size={14}/>, color: 'text-neon-red' } // 15% Вороги
      if (seed > 0.25) return { type: 'resources', icon: <Gem size={14}/>, color: 'text-neon-cyan' } // 60% Ресурси (Було > 0.4)
      
      return { type: 'debris', icon: <CircleDashed size={14}/>, color: 'text-gray-600' } // 25% Пусто
  }

  const getFuelCost = (target: string) => {
      if (!currentSector || !target) return 0
      const [x1, y1] = currentSector.split(':').map(Number)
      const [x2, y2] = target.split(':').map(Number)
      const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      return Math.ceil(dist * 10)
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
    <div className="absolute inset-0 z-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-space-900 via-black to-black flex flex-col items-center justify-center animate-in fade-in duration-300 font-mono text-white">
      
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* HEADER */}
      <div className="absolute top-8 left-8 border-l-4 border-neon-cyan pl-4 z-10">
        <h2 className="text-3xl text-neon-cyan font-bold flex items-center gap-3 tracking-widest uppercase shadow-neon">
            <MapPin className="animate-bounce" /> Tactical Map
        </h2>
        <p className="text-gray-500 text-sm mt-1">SECTOR VIEW: <span className="text-white">{viewCenter}</span></p>
      </div>

      {/* STATUS PANEL */}
      <div className="absolute top-8 right-8 text-right bg-black/60 p-6 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl z-10 min-w-[220px]">
        <div className="text-neon-orange font-bold text-3xl flex items-center justify-end gap-2">
            {fuel}% <span className="text-[10px] text-gray-500 font-normal uppercase mt-2">Fuel Level</span>
        </div>
        
        <div className="w-full h-1.5 bg-gray-800 mt-2 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${fuel < 30 ? 'bg-red-500' : 'bg-neon-orange'}`} style={{ width: `${fuel}%` }} />
        </div>
        
        {targetSector ? (
             <div className="mt-4 pt-4 border-t border-white/10 text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Target System</div>
                <div className="text-white font-bold text-lg">{targetSector}</div>
                
                {visitedSectors.includes(targetSector) || targetSector === '0:0' ? (
                    <div className="flex justify-end gap-2 my-2 text-xs items-center font-bold">
                         <span className={getSectorContent(targetSector).color}>
                            {getSectorContent(targetSector).type.toUpperCase()}
                         </span>
                         {getSectorContent(targetSector).icon}
                    </div>
                ) : null}

                <div className={`text-xs mt-1 font-bold flex justify-end items-center gap-1 ${fuel >= getFuelCost(targetSector) ? 'text-neon-cyan' : 'text-red-500'}`}>
                    JUMP COST: {getFuelCost(targetSector)}
                </div>
            </div>
        ) : (
            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500 animate-pulse text-right">
                AWAITING COORDINATES...
            </div>
        )}
      </div>

      {/* === MAP INTERFACE === */}
      <div className="relative z-10 mt-10">
        
        {/* Navigation Arrows */}
        <button onClick={() => moveView(0, -1)} className="absolute -top-12 left-1/2 -translate-x-1/2 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full transition-all">
            <ChevronUp size={32}/>
        </button>
        <button onClick={() => moveView(0, 1)} className="absolute -bottom-12 left-1/2 -translate-x-1/2 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full transition-all">
            <ChevronDown size={32}/>
        </button>
        <button onClick={() => moveView(-1, 0)} className="absolute -left-16 top-1/2 -translate-y-1/2 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full transition-all">
            <ChevronLeft size={32}/>
        </button>
        <button onClick={() => moveView(1, 0)} className="absolute -right-16 top-1/2 -translate-y-1/2 p-2 text-neon-cyan hover:text-white hover:bg-neon-cyan/20 rounded-full transition-all">
            <ChevronRight size={32}/>
        </button>

        {/* GRID */}
        <div className="grid grid-cols-5 gap-3 p-5 bg-black/80 rounded-2xl border border-neon-cyan/30 shadow-[0_0_60px_rgba(0,240,255,0.15)] backdrop-blur-sm">
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
                            w-20 h-20 rounded border flex flex-col items-center justify-center relative transition-all duration-200 group overflow-hidden
                            ${isCurrent 
                                ? 'bg-neon-cyan border-neon-cyan text-black shadow-[0_0_20px_rgba(0,240,255,0.6)] z-20 scale-105' 
                                : isTarget
                                    ? 'bg-neon-orange/10 border-neon-orange text-neon-orange border-dashed shadow-[0_0_15px_rgba(255,174,0,0.4)] z-10'
                                    : isVisited
                                        ? 'bg-space-800/60 border-white/10 hover:border-neon-cyan/50 hover:bg-space-700'
                                        : 'bg-black/40 border-white/5 text-transparent hover:border-white/10'
                            }
                        `}
                    >
                        {/* Icon for Visited Sectors */}
                        {isVisited && !isCurrent && (
                            <div className={`mb-1 opacity-70 group-hover:opacity-100 transition-opacity ${content.color}`}>
                                {content.icon}
                            </div>
                        )}

                        <span className={`text-[10px] font-mono tracking-widest ${isCurrent ? 'font-black' : 'text-gray-400'}`}>
                            {isVisited ? sectorId : '?'}
                        </span>

                        {isCurrent && (
                            <span className="text-[9px] font-black mt-1 uppercase">YOU</span>
                        )}
                        
                        {isTarget && !isCurrent && (
                            <Crosshair size={16} className="absolute inset-0 m-auto animate-spin-slow opacity-50"/>
                        )}
                    </button>
                )
            })}
        </div>
        
        {/* LEGEND (Для розуміння іконок) */}
        <div className="flex justify-center gap-6 mt-6 text-[10px] text-gray-500 font-mono">
             <div className="flex items-center gap-2"><Gem size={10} className="text-neon-cyan"/> RICH</div>
             <div className="flex items-center gap-2"><Skull size={10} className="text-neon-red"/> THREAT</div>
             <div className="flex items-center gap-2"><CircleDashed size={10} className="text-gray-600"/> EMPTY</div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="absolute bottom-12 flex gap-6 z-10">
        <button 
            onClick={() => useGameStore.setState({ status: 'space' })}
            className="px-8 py-3 border border-gray-600 text-gray-400 text-sm font-bold tracking-wider hover:bg-white/10 hover:text-white transition-all rounded uppercase"
        >
            &lt; Return to Bridge
        </button>

        <button 
            disabled={!targetSector || fuel < getFuelCost(targetSector || '')}
            onClick={startWarp}
            className="px-10 py-3 bg-neon-cyan text-black font-bold text-sm tracking-wider hover:bg-white hover:scale-105 transition-all rounded shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 uppercase"
        >
            {targetSector && fuel < getFuelCost(targetSector) ? (
                <><Ban size={16}/> Low Fuel</>
            ) : (
                <><Navigation size={16} className={targetSector ? 'animate-spin-slow' : ''} /> Initiate Warp</>
            )}
        </button>
      </div>

    </div>
  )
}