import { useGameStore, SHIP_SPECS } from '../store'
import { Check, Shield, Box, Zap, Crosshair } from 'lucide-react'
import ShipThumbnail from './ShipThumbnail'

export default function Shipyard() {
    const { credits, shipClass, buyShip } = useGameStore((state: any) => state)

    return (
        // 🔥 ВИПРАВЛЕННЯ 1: Flex-контейнер на всю висоту
        <div className="flex flex-col h-full relative">
            
            {/* 🔥 ВИПРАВЛЕННЯ 1: Заголовок винесено окремо (Він не скролиться) */}
            <div className="shrink-0 p-4 border-b border-white/10 bg-black/40 backdrop-blur-md z-20">
                <h3 className="text-white font-bold font-mono text-sm md:text-base tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse"></span>
                    AVAILABLE SHIPS
                </h3>
            </div>
            
            {/* 🔥 ВИПРАВЛЕННЯ 1: Скрол тільки для списку кораблів */}
            <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
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

                                {/* Content */}
                                <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4">
                                    <div className="w-full md:w-1/3 shrink-0">
                                        <ShipThumbnail shipClass={key} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-4">
                                            <StatBox icon={<Shield size={14}/>} label="HULL" value={spec.maxHull} max={600} color="text-green-400" />
                                            <StatBox icon={<Shield size={14} className="fill-current"/>} label="ARMOR" value={`${spec.armor}%`} max={100} color="text-blue-400" />
                                            <StatBox icon={<Box size={14}/>} label="CARGO" value={spec.maxCargo} max={500} color="text-yellow-400" />
                                            <StatBox icon={<Zap size={14}/>} label="JUMP" value={`${spec.jumpRange} LY`} max={5} color="text-purple-400" />
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-3 bg-black/30 p-2 rounded border border-white/5">
                                            <Crosshair size={14} className="text-neon-red"/> 
                                            HARDPOINTS: <span className="text-white font-bold">{spec.maxSlots} SLOTS</span>
                                        </div>

                                        <p className="text-xs text-gray-400 italic border-l-2 border-white/20 pl-3 leading-relaxed">
                                            {spec.desc}
                                        </p>
                                    </div>
                                </div>

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
        </div>
    )
}

// 🔥 ВИПРАВЛЕННЯ 2: Товсті та заповнені бари
function StatBox({ icon, label, value, max, color }: any) {
    const numValue = parseInt(value.toString().replace(/\D/g,'')) || 0
    const maxVal = max || 100
    
    // Розрахунок відсотка
    let percent = (numValue / maxVal) * 100
    // Обмежуємо: мінімум 5% (щоб було хоч щось видно, навіть якщо значення мале), максимум 100%
    if (numValue > 0) percent = Math.max(5, Math.min(100, percent))
    else percent = 0

    // Генеруємо клас фону (наприклад: text-green-400 -> bg-green-400)
    const bgClass = color.replace('text-', 'bg-')

    return (
        <div className="flex flex-col justify-end w-full">
            <div className="flex justify-between items-end mb-1.5">
                <div className={`flex items-center gap-1.5 ${color} text-[10px] font-bold uppercase tracking-wider`}>
                    {icon} {label}
                </div>
                <div className="text-white font-mono font-bold text-sm leading-none">{value}</div>
            </div>
            
            {/* Фон бару (темний) */}
            <div className="h-3 w-full bg-gray-800 rounded sm overflow-hidden border border-white/5 relative">
                {/* Заповнення (кольорове) */}
                <div 
                    className={`h-full ${bgClass} transition-all duration-700 ease-out shadow-[0_0_10px_currentColor]`} 
                    style={{ width: `${percent}%` }} 
                />
                 {/* Сітка поверх бару для ефекту (опціонально) */}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,#00000040_2px)] bg-[size:4px_100%] pointer-events-none opacity-30"></div>
            </div>
        </div>
    )
}