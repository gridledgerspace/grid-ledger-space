import { useState } from 'react'
import { useGameStore } from '../store'
import { X, ShoppingBag, Rocket, Wrench, Activity, ShieldCheck } from 'lucide-react'
import Shipyard from './Shipyard' // <--- Імпортуємо новий компонент

export default function StationMenu({ onClose }: { onClose: () => void }) {
  const { 
      credits, cargo, sellResource, 
      hull, maxHull, repairHull 
  } = useGameStore((state: any) => state)

  // Стан для вкладок
  const [activeTab, setActiveTab] = useState<'market' | 'shipyard'>('market')

  // Розрахунок ремонту...
  const damage = maxHull - hull
  const repairCost = damage * 10
  const canAfford = credits >= repairCost
  const isDamaged = damage > 0

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in p-4">
      <div className="glass-panel w-full max-w-4xl border border-neon-cyan/50 shadow-[0_0_50px_rgba(0,240,255,0.1)] flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-6">
                {/* TABS SWITCHER */}
                <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
                    <button 
                        onClick={() => setActiveTab('market')}
                        className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'market' ? 'bg-neon-cyan text-black shadow-neon' : 'text-gray-400 hover:text-white'}`}
                    >
                        <ShoppingBag size={14}/> MARKET
                    </button>
                    <button 
                        onClick={() => setActiveTab('shipyard')}
                        className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'shipyard' ? 'bg-neon-cyan text-black shadow-neon' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Rocket size={14}/> SHIPYARD
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 md:gap-8">
                <div className="text-right">
                    <span className="text-[8px] md:text-[10px] text-gray-500 block uppercase tracking-wider font-mono">Current Balance</span>
                    <span className="text-lg md:text-2xl font-bold text-neon-cyan font-mono drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
                        {credits.toLocaleString()} CR
                    </span>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden flex flex-col">
            
            {/* Вкладка SHIPYARD */}
            {activeTab === 'shipyard' && <Shipyard />}

            {/* Вкладка MARKET (Старий контент) */}
            {activeTab === 'market' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    
                    {/* LEFT: SELL */}
                    <div>
                        <h3 className="text-neon-orange font-bold font-mono mb-4 border-b border-neon-orange/30 pb-2 text-sm md:text-base">SELL RESOURCES</h3>
                        <div className="space-y-3">
                            {['Iron', 'Gold', 'DarkMatter'].map(res => {
                                const amount = cargo[res] || 0
                                const price = res === 'Iron' ? 10 : res === 'Gold' ? 50 : 150
                                const value = amount * price

                                return (
                                    <div key={res} className="flex justify-between items-center p-3 md:p-4 bg-space-900/50 border border-white/10 rounded hover:border-white/30 transition-all">
                                        <div>
                                            <div className="font-bold text-white text-sm md:text-base">{res}</div>
                                            <div className="text-[10px] md:text-xs text-gray-500">{amount} units</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-neon-cyan font-mono text-xs md:text-sm">+{value} CR</div>
                                            <button 
                                                disabled={amount === 0}
                                                onClick={() => sellResource(res)}
                                                className="px-3 py-1.5 bg-white/5 border border-white/20 text-[10px] md:text-xs font-bold hover:bg-neon-cyan hover:text-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-all uppercase"
                                            >
                                                SELL ALL
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* RIGHT: REPAIR */}
                    <div>
                        <div className="mb-4 border-b border-white/10 pb-2">
                            <h3 className="text-white font-bold font-mono text-sm md:text-base">SERVICES</h3>
                        </div>

                        <div className={`p-4 md:p-6 border rounded transition-all ${isDamaged ? 'bg-red-900/10 border-red-500/50' : 'bg-green-900/10 border-green-500/30'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {isDamaged ? <Activity className="text-red-500 animate-pulse" size={24}/> : <ShieldCheck className="text-green-500" size={24}/>}
                                    <div>
                                        <div className={`font-bold text-sm md:text-base ${isDamaged ? 'text-red-500' : 'text-green-500'}`}>HULL REPAIR</div>
                                        <div className="text-[10px] md:text-xs text-gray-400">Structural integrity restoration</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl md:text-2xl font-mono font-bold text-white">{hull} <span className="text-sm text-gray-500">/ {maxHull}</span></div>
                                </div>
                            </div>

                            <div className="w-full h-2 bg-black rounded-full overflow-hidden mb-6 border border-white/10">
                                <div className={`h-full transition-all duration-500 ${isDamaged ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${(hull/maxHull)*100}%` }} />
                            </div>

                            {isDamaged ? (
                                <div className="flex justify-between items-center">
                                    <div className="text-xs font-mono">
                                        <span className="text-gray-400">COST:</span> <span className={canAfford ? 'text-white' : 'text-red-500'}>{repairCost} CR</span>
                                    </div>
                                    <button 
                                        onClick={repairHull}
                                        disabled={!canAfford}
                                        className={`px-4 py-2 md:px-6 md:py-3 font-bold text-xs md:text-sm tracking-wider flex items-center gap-2 transition-all ${canAfford ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-900/20' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                                    >
                                        <Wrench size={16} /> REPAIR SHIP
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-2 text-green-500 font-mono text-xs md:text-sm border border-green-500/20 bg-green-500/5 rounded">
                                    SYSTEMS OPTIMAL. NO REPAIRS NEEDED.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}