import { useGameStore } from '../store'
import { X, Wrench, Activity, ShieldCheck } from 'lucide-react'

export default function StationMenu({ onClose }: { onClose: () => void }) {
  const { 
      credits, cargo, sellResource, 
      hull, maxHull, repairHull 
  } = useGameStore((state: any) => state)

  // Розрахунок вартості ремонту
  const damage = maxHull - hull
  const repairCost = damage * 10
  const canAfford = credits >= repairCost
  const isDamaged = damage > 0

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in p-4">
      <div className="glass-panel w-full max-w-4xl border border-neon-cyan/50 shadow-[0_0_50px_rgba(0,240,255,0.1)] flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40">
            <div>
                <h2 className="text-2xl font-black text-neon-cyan flex items-center gap-3 uppercase tracking-widest">
                    <Wrench size={24} /> Station Market
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-1">SECTOR 0:0 TRADE HUB</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={32} />
            </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* LEFT: MARKET (Продаж ресурсів) */}
            <div>
                <h3 className="text-neon-orange font-bold font-mono mb-4 border-b border-neon-orange/30 pb-2">SELL RESOURCES</h3>
                <div className="space-y-3">
                    {['Iron', 'Gold', 'DarkMatter'].map(res => {
                        const amount = cargo[res] || 0
                        const price = res === 'Iron' ? 10 : res === 'Gold' ? 50 : 150
                        const value = amount * price

                        return (
                            <div key={res} className="flex justify-between items-center p-4 bg-space-900/50 border border-white/10 rounded hover:border-white/30 transition-all">
                                <div>
                                    <div className="font-bold text-white">{res}</div>
                                    <div className="text-xs text-gray-500">{amount} units in cargo</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-neon-cyan font-mono">+{value} CR</div>
                                    <button 
                                        disabled={amount === 0}
                                        onClick={() => sellResource(res)}
                                        className="px-4 py-2 bg-white/5 border border-white/20 text-xs font-bold hover:bg-neon-cyan hover:text-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-all"
                                    >
                                        SELL ALL
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* RIGHT: SERVICES (Ремонт) */}
            <div>
                <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
                    <h3 className="text-white font-bold font-mono">SERVICES</h3>
                    <div className="text-right">
                        <span className="text-[10px] text-gray-500 block">CURRENT BALANCE</span>
                        <span className="text-xl font-bold text-neon-cyan font-mono">{credits.toLocaleString()} CR</span>
                    </div>
                </div>

                {/* HULL REPAIR CARD */}
                <div className={`p-6 border rounded transition-all ${isDamaged ? 'bg-red-900/10 border-red-500/50' : 'bg-green-900/10 border-green-500/30'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            {isDamaged ? <Activity className="text-red-500 animate-pulse" size={24}/> : <ShieldCheck className="text-green-500" size={24}/>}
                            <div>
                                <div className={`font-bold ${isDamaged ? 'text-red-500' : 'text-green-500'}`}>HULL REPAIR</div>
                                <div className="text-xs text-gray-400">Structural integrity restoration</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-mono font-bold text-white">{hull} <span className="text-sm text-gray-500">/ {maxHull}</span></div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-black rounded-full overflow-hidden mb-6 border border-white/10">
                        <div 
                            className={`h-full transition-all duration-500 ${isDamaged ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${(hull/maxHull)*100}%` }}
                        />
                    </div>

                    {isDamaged ? (
                        <div className="flex justify-between items-center">
                            <div className="text-xs font-mono">
                                <span className="text-gray-400">COST:</span> <span className={canAfford ? 'text-white' : 'text-red-500'}>{repairCost} CR</span>
                            </div>
                            <button 
                                onClick={repairHull}
                                disabled={!canAfford}
                                className={`px-6 py-3 font-bold text-sm tracking-wider flex items-center gap-2 transition-all ${canAfford ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-900/20' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                            >
                                <Wrench size={16} /> REPAIR SHIP
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-2 text-green-500 font-mono text-sm border border-green-500/20 bg-green-500/5 rounded">
                            SYSTEMS OPTIMAL. NO REPAIRS NEEDED.
                        </div>
                    )}
                </div>

            </div>
        </div>
      </div>
    </div>
  )
}