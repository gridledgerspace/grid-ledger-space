import { useGameStore, SHIP_SPECS } from '../store'
import { Check, Shield, Box, Zap, Crosshair } from 'lucide-react'
import ShipThumbnail from './ShipThumbnail'

export default function Shipyard() {
    const { credits, shipClass, buyShip } = useGameStore((state: any) => state)

    return (
        <div className="h-full overflow-y-auto p-2 md:p-4 custom-scrollbar">
            <h3 className="text-white font-bold font-mono mb-4 text-sm md:text-base border-b border-white/10 pb-2 sticky top-0 bg-black/80 backdrop-blur z-10">AVAILABLE SHIPS</h3>
            
            <div className="grid grid-cols-1 gap-4 pb-4">
                {Object.entries(SHIP_SPECS).map(([key, spec]) => {
                    const isOwned = shipClass === key
                    const canAfford = credits >= spec.price

                    return (
                        <div key={key} className={`relative p-4 rounded-xl border transition-all group ${isOwned ? 'bg-neon-cyan/5 border-neon-cyan' : 'bg-space-900/50 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-[10px] text-gray-500 font-mono uppercase flex items-center gap-2">
                                        <span className={`inline-block w-2 h-2 rounded-full ${isOwned ? 'bg-neon-cyan' : 'bg-gray-600'}`}></span>
                                        {spec.type} CLASS
                                    </div>
                                    <h4 className={`text-xl font-black font-mono uppercase ${isOwned ? 'text-neon-cyan' : 'text-white group-hover:text-neon-cyan transition-colors'}`}>{spec.name}</h4>
                                </div>
                                <div className="text-right">
                                    {isOwned ? (
                                        <div className="flex items-center gap-2 text-neon-cyan font-bold text-xs bg-neon-cyan/10 px-3 py-1 rounded border border-neon-cyan/30">
                                            <Check size={14}/> OWNED
                                        </div>
                                    ) : (
                                        <div className={`text-lg font-mono font-bold ${canAfford ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {spec.price === 0 ? 'FREE' : `${spec.price.toLocaleString()} CR`}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content: 3D Model + Stats */}
                            <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4">
                                
                                {/* Left: 3D Thumbnail */}
                                <div className="w-full md:w-1/3 shrink-0">
                                    <ShipThumbnail shipClass={key} />
                                </div>

                                {/* Right: Stats */}
                                <div className="flex-1 min-w-0">
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <StatBox icon={<Shield size={14}/>} label="HULL" value={spec.maxHull} max={600} color="text-green-400" />
                                        <StatBox icon={<Shield size={14} className="fill-current"/>} label="ARMOR" value={`${spec.armor}%`} max={100} color="text-blue-400" />
                                        <StatBox icon={<Box size={14}/>} label="CARGO" value={spec.maxCargo} max={500} color="text-yellow-400" />
                                        <StatBox icon={<Zap size={14}/>} label="JUMP" value={`${spec.jumpRange} LY`} max={5} color="text-purple-400" />
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-3 bg-black/30 p-2 rounded border border-white/5">
                                        <Crosshair size={14} className="text-neon-red"/> 
                                        HARDPOINTS & MODULES: <span className="text-white font-bold">{spec.maxSlots} SLOTS</span>
                                    </div>

                                    <p className="text-xs text-gray-400 italic border-l-2 border-white/20 pl-3 leading-relaxed">
                                        {spec.desc}
                                    </p>
                                </div>
                            </div>

                            {/* Button */}
                            {!isOwned && (
                                <button 
                                    onClick={() => buyShip(key)}
                                    disabled={!canAfford}
                                    className={`w-full py-3 font-bold text-sm tracking-widest uppercase transition-all rounded-lg
                                        ${canAfford 
                                            ? 'bg-neon-cyan text-black hover:bg-white hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]' 
                                            : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}
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

// 🔥 ВИПРАВЛЕНИЙ STATBOX (без зайвої змінної isPercent)
function StatBox({ icon, label, value, max, color }: any) {
    // Ми прибрали isPercent, бо він не використовувався
    const numValue = parseInt(value.toString().replace(/\D/g,'')) 
    const maxVal = max || 100
    const percent = Math.min(100, Math.max(0, (numValue / maxVal) * 100))
    
    const bgColor = color.replace('text-', 'bg-')

    return (
        <div className="bg-black/40 p-2 rounded border border-white/5 flex flex-col justify-between min-h-[60px]">
            <div>
                <div className={`flex items-center gap-2 mb-1 ${color} text-[10px] font-bold uppercase tracking-wider`}>
                    {icon} {label}
                </div>
                <div className="text-white font-mono font-bold text-lg leading-none">{value}</div>
            </div>
            
            <div className="h-1.5 w-full bg-gray-800/50 rounded-full overflow-hidden mt-2 relative">
                <div className={`h-full ${bgColor} absolute top-0 left-0 transition-all duration-500 ease-out shadow-[0_0_5px_CurrentColor]`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    )
}