import { useGameStore } from '../store'
import { Pickaxe, XCircle, AlertTriangle, Box, Siren } from 'lucide-react'

export default function EventOverlay() {
  const { 
    status, 
    currentEventId, 
    localObjects, 
    cargo, 
    maxCargo,
    modules,
    extractResource, 
    closeEvent 
  } = useGameStore((state: any) => state)

  // === 1. ПРІОРИТЕТ: СПОВІЩЕННЯ ПРО ВОРОГІВ (SCAN DETECTED) ===
  if (currentEventId === 'hostile_scan') {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
         <div className="bg-black/90 border-2 border-red-500 p-8 rounded-xl text-center shadow-[0_0_50px_rgba(255,0,0,0.6)] animate-pulse max-w-lg mx-4">
             <Siren className="w-20 h-20 text-red-500 mx-auto mb-6 animate-spin-slow" />
             <h1 className="text-3xl md:text-5xl font-black text-red-500 tracking-widest uppercase mb-4">WARNING</h1>
             <p className="text-white font-mono text-lg tracking-wider mb-8">HOSTILE SIGNATURES DETECTED</p>
             
             <button 
                onClick={() => closeEvent()}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-black font-bold text-xl rounded clip-path-polygon transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)]"
             >
                ACKNOWLEDGE
             </button>
         </div>
      </div>
    )
  }

  // === 2. ПРІОРИТЕТ: ЗАСІДКА (AMBUSH) ===
  if (currentEventId === 'ambush') {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-black/20">
         <div className="w-full py-12 bg-gradient-to-r from-transparent via-red-600/60 to-transparent flex items-center justify-center backdrop-blur-sm">
             <div className="text-center transform scale-150 transition-transform duration-1000">
                 <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,1)] animate-bounce">
                    AMBUSH!
                 </h1>
                 <div className="flex items-center justify-center gap-3 text-red-100 font-mono font-bold bg-black/60 px-6 py-2 rounded-full mt-4 border border-red-500/50">
                    <AlertTriangle size={24} className="text-red-500" /> 
                    <span>MINING INTERRUPTED - HOSTILES ENGAGING</span>
                 </div>
             </div>
         </div>
      </div>
    )
  }

  // === 3. ІНТЕРФЕЙС МАЙНІНГУ (Ваш код) ===
  // Показуємо тільки якщо статус 'mining'
  if (status === 'mining') {
      const target = localObjects.find((obj: any) => obj.id === currentEventId)
      
      const resourceType = target?.data?.resource || 'UNKNOWN'
      const resourceAmount = target?.data?.amount || 0

      if (!target || (resourceAmount <= 0)) {
          setTimeout(() => closeEvent(), 500)
          return null
      }

      const currentLoad = Object.values(cargo as Record<string, number>).reduce((a, b) => a + b, 0)
      const isFull = currentLoad >= maxCargo
      const hasLaser = modules.includes('mining_laser')

      return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className="glass-panel p-8 max-w-md w-full border border-neon-orange/50 relative shadow-[0_0_50px_rgba(255,174,0,0.1)]">
            
            <button 
                onClick={closeEvent}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
                <XCircle />
            </button>

            <h2 className="text-2xl font-mono text-neon-orange font-bold mb-2 flex items-center gap-3">
                <Pickaxe className="animate-pulse" /> MINING PROTOCOL
            </h2>
            
            <div className="my-6 p-4 bg-space-900/80 rounded border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm">TARGET ORE:</span>
                    <span className="text-white font-bold font-mono text-lg">{resourceType}</span>
                </div>
                
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm">DEPOSIT SIZE:</span>
                    <span className="text-neon-cyan font-bold font-mono text-lg">{resourceAmount} T</span>
                </div>
                
                <div className="w-full h-px bg-white/10 my-2" />
                
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm flex items-center gap-2">
                        <Box size={14}/> CARGO BAY:
                    </span>
                    <span className={`${isFull ? 'text-neon-red' : 'text-white'} font-mono`}>
                        {currentLoad} / {maxCargo} T
                    </span>
                </div>
                
                <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/10">
                    <div 
                        className={`h-full ${isFull ? 'bg-neon-red' : 'bg-neon-cyan'} transition-all duration-500`} 
                        style={{ width: `${(currentLoad / maxCargo) * 100}%` }}
                    />
                </div>
            </div>

            {hasLaser ? (
                <button
                    onClick={extractResource}
                    disabled={isFull || resourceAmount <= 0}
                    className="w-full py-4 bg-neon-orange text-black font-bold font-mono text-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,174,0,0.3)] flex items-center justify-center gap-2"
                >
                    {isFull ? 'CARGO FULL' : 'ACTIVATE LASER'}
                </button>
            ) : (
                <div className="w-full py-4 border border-neon-red text-neon-red text-center font-mono flex items-center justify-center gap-2 bg-neon-red/10">
                    <AlertTriangle size={20} /> MODULE MISSING
                </div>
            )}
          </div>
        </div>
      )
  }

  return null
}