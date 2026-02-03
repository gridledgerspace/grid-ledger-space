import { useGameStore, SHIP_SPECS } from '../store'
import { Check, Shield, Box, Zap, Crosshair } from 'lucide-react'

export default function Shipyard() {
    const { credits, shipClass, buyShip } = useGameStore((state: any) => state)

    return (
        <div className="h-full overflow-y-auto p-2 md:p-4">
            <h3 className="text-white font-bold font-mono mb-4 text-sm md:text-base border-b border-white/10 pb-2">AVAILABLE SHIPS</h3>
            
            <div className="grid grid-cols-1 gap-4">
                {Object.entries(SHIP_SPECS).map(([key, spec]) => {
                    const isOwned = shipClass === key
                    const canAfford = credits >= spec.price

                    return (
                        <div key={key} className={`relative p-4 rounded-xl border transition-all ${isOwned ? 'bg-neon-cyan/5 border-neon-cyan' : 'bg-space-900/50 border-white/10 hover:border-white/30'}`}>
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-[10px] text-gray-500 font-mono uppercase">{spec.type} CLASS</div>
                                    <h4 className={`text-xl font-black font-mono uppercase ${isOwned ? 'text-neon-cyan' : 'text-white'}`}>{spec.name}</h4>
                                </div>
                                <div className="text-right">
                                    {isOwned ? (
                                        <div className="flex items-center gap-2 text-neon-cyan font-bold text-xs bg-neon-cyan/10 px-3 py-1 rounded">
                                            <Check size={14}/> OWNED
                                        </div>
                                    ) : (
                                        <div className={`text-lg font-mono font-bold ${canAfford ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {spec.price === 0 ? 'FREE' : `${spec.price.toLocaleString()} CR`}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <StatBox icon={<Shield size={14}/>} label="HULL" value={spec.maxHull} max={500} color="text-green-400" />
                                <StatBox icon={<Shield size={14} className="fill-current"/>} label="ARMOR" value={`${spec.armor}%`} color="text-blue-400" />
                                <StatBox icon={<Box size={14}/>} label="CARGO" value={spec.maxCargo} max={400} color="text-yellow-400" />
                                <StatBox icon={<Zap size={14}/>} label="JUMP" value={`${spec.jumpRange} SEC`} color="text-purple-400" />
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-4 bg-black/20 p-2 rounded">
                                <Crosshair size={14} /> MODULE SLOTS: <span className="text-white font-bold">{spec.maxSlots}</span>
                            </div>

                            <p className="text-xs text-gray-300 italic mb-4 border-l-2 border-white/20 pl-3">
                                "{spec.desc}"
                            </p>

                            {/* Action Button */}
                            {!isOwned && (
                                <button 
                                    onClick={() => buyShip(key)}
                                    disabled={!canAfford}
                                    className={`w-full py-3 font-bold text-xs tracking-widest uppercase transition-all
                                        ${canAfford 
                                            ? 'bg-neon-cyan text-black hover:bg-white hover:scale-[1.02]' 
                                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                                    `}
                                >
                                    {canAfford ? 'PURCHASE SHIP' : 'INSUFFICIENT FUNDS'}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// Helper для відображення смужки статів
function StatBox({ icon, label, value, max, color }: any) {
    const isPercent = typeof value === 'string'
    const numValue = isPercent ? parseInt(value) : value
    const maxVal = max || 100
    const percent = Math.min(100, (numValue / maxVal) * 100)

    return (
        <div className="bg-black/40 p-2 rounded border border-white/5">
            <div className={`flex items-center gap-2 mb-1 ${color} text-[10px] font-bold`}>
                {icon} {label}
            </div>
            <div className="text-white font-mono font-bold text-sm mb-1">{value}</div>
            {!isPercent && max && (
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${color.replace('text-', 'bg-')} opacity-80`} style={{ width: `${percent}%` }} />
                </div>
            )}
        </div>
    )
}