import { useState } from 'react'
// 🔥 ВИПРАВЛЕННЯ: додано "type" перед LootItem
import { useGameStore, SHIP_SPECS, type LootItem } from '../store'
// 🔥 ВИПРАВЛЕННЯ: прибрано зайві імпорти
import { Check, Shield, Box, Zap, Crosshair } from 'lucide-react'

// Прості картинки (заглушки)
const SHIP_IMAGES: Record<string, string> = {
    'scout': 'https://placehold.co/400x200/00f0ff/000000?text=PHOENIX',
    'interceptor': 'https://placehold.co/400x200/ff003c/000000?text=PREDATOR',
    'hauler': 'https://placehold.co/400x200/ffae00/000000?text=BEHEMOTH',
    'explorer': 'https://placehold.co/400x200/a855f7/000000?text=VELOCITY',
}

// Список модулів для продажу
const MARKET_MODULES: LootItem[] = [
    { id: 'mining_laser_mk1', name: 'Mining Laser MK-1', type: 'module', price: 500, origin: 'standard', icon: 'pickaxe' },
    { id: 'pulse_laser_mk1', name: 'Pulse Laser MK-1', type: 'weapon', price: 1200, origin: 'standard', icon: 'crosshair' },
    { id: 'shield_gen_mk1', name: 'Shield Gen MK-1', type: 'module', price: 2000, origin: 'standard', icon: 'shield' },
    { id: 'warp_drive_mk2', name: 'Warp Drive MK-2', type: 'engine', price: 5000, origin: 'standard', icon: 'zap' },
]

export default function Shipyard() {
    const { credits, shipClass, buyShip, inventory, addNotification } = useGameStore((state: any) => state)
    const [tab, setTab] = useState<'ships' | 'modules'>('ships')

    const buyModule = (item: LootItem) => {
        if (credits < (item.price || 0)) {
            addNotification('INSUFFICIENT FUNDS', 'error')
            return
        }
        // Віднімаємо гроші
        useGameStore.setState({ 
            credits: credits - (item.price || 0),
            inventory: [...inventory, { ...item, id: `${item.id}-${Date.now()}` }] 
        })
        addNotification(`Bought ${item.name}`, 'success')
    }

    return (
        <div className="flex flex-col h-full w-full min-h-0 bg-[#0b0b15]">
            
            {/* Header Tabs */}
            <div className="shrink-0 p-4 border-b border-white/10 bg-black/40 flex gap-4">
                <button onClick={() => setTab('ships')} className={`px-4 py-2 font-bold font-mono text-sm uppercase ${tab === 'ships' ? 'bg-neon-cyan text-black' : 'text-gray-500 hover:text-white'}`}>
                    STARSHIPS
                </button>
                <button onClick={() => setTab('modules')} className={`px-4 py-2 font-bold font-mono text-sm uppercase ${tab === 'modules' ? 'bg-neon-cyan text-black' : 'text-gray-500 hover:text-white'}`}>
                    EQUIPMENT
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                
                {/* --- SHIPS TAB --- */}
                {tab === 'ships' && (
                    <div className="grid grid-cols-1 gap-4 pb-4">
                        {Object.entries(SHIP_SPECS).map(([key, spec]) => {
                            const isOwned = shipClass === key
                            const canAfford = credits >= spec.price

                            return (
                                <div key={key} className={`relative p-4 rounded-xl border transition-all ${isOwned ? 'bg-neon-cyan/5 border-neon-cyan' : 'bg-black/40 border-white/10'}`}>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="w-full md:w-1/3 aspect-video bg-black rounded overflow-hidden border border-white/5 relative group">
                                            <img src={SHIP_IMAGES[key]} alt={spec.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 text-[10px] text-neon-cyan font-bold rounded">{spec.type}</div>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-xl font-black font-mono text-white uppercase">{spec.name}</h4>
                                                {isOwned ? (
                                                    <div className="flex items-center gap-2 text-neon-cyan font-bold text-xs bg-neon-cyan/10 px-3 py-1 rounded border border-neon-cyan/30"><Check size={14}/> OWNED</div>
                                                ) : (
                                                    <div className={`text-lg font-mono font-bold ${canAfford ? 'text-yellow-500' : 'text-red-500'}`}>
                                                        {spec.price === 0 ? 'FREE' : `${spec.price.toLocaleString()} CR`}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-400">
                                                <div className="flex items-center gap-2"><Shield size={12}/> HULL: <span className="text-white">{spec.maxHull}</span></div>
                                                <div className="flex items-center gap-2"><Box size={12}/> CARGO: <span className="text-white">{spec.maxCargo}</span></div>
                                                <div className="flex items-center gap-2"><Zap size={12}/> JUMP: <span className="text-white">{spec.jumpRange} LY</span></div>
                                                <div className="flex items-center gap-2"><Crosshair size={12}/> SLOTS: <span className="text-white">{spec.maxSlots}</span></div>
                                            </div>

                                            {!isOwned && (
                                                <button 
                                                    onClick={() => buyShip(key)}
                                                    disabled={!canAfford}
                                                    className={`w-full py-3 font-bold text-xs tracking-widest uppercase rounded
                                                        ${canAfford ? 'bg-neon-cyan text-black hover:bg-white' : 'bg-gray-800 text-gray-500 opacity-50'}
                                                    `}
                                                >
                                                    {canAfford ? 'PURCHASE SHIP' : 'INSUFFICIENT FUNDS'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* --- MODULES TAB --- */}
                {tab === 'modules' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {MARKET_MODULES.map((item) => (
                            <div key={item.id} className="p-3 bg-black/40 border border-white/10 rounded flex justify-between items-center group hover:border-neon-cyan/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded bg-white/5 
                                        ${item.type === 'weapon' ? 'text-red-500' : item.type === 'engine' ? 'text-yellow-400' : 'text-purple-400'}
                                    `}>
                                        <Box size={18}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white">{item.name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase flex gap-2">
                                            <span>{item.type}</span>
                                            <span className="text-neon-cyan">{item.origin}</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => buyModule(item)}
                                    className="px-4 py-2 bg-white/5 hover:bg-neon-cyan hover:text-black text-neon-cyan border border-neon-cyan/30 rounded text-xs font-bold transition-all"
                                >
                                    {item.price} CR
                                </button>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    )
}