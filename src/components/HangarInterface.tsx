import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Float } from '@react-three/drei'
import { useGameStore, SHIP_SPECS, type LootItem } from '../store' // 🔥 ВИПРАВЛЕНО ІМПОРТ ТИПУ
import Object3D from './Object3D'
import { 
    Zap, Box, Activity, Crosshair, Shield, Settings, Grid, LogOut 
} from 'lucide-react'

// Кольори кораблів
const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff', 'interceptor': '#ff003c', 'hauler': '#ffae00', 'explorer': '#a855f7'     
}

export default function HangarInterface() {
  const { status, shipClass, hull, maxHull, cargo, maxCargo, credits, inventory, equipped, unequipItem, equipItem } = useGameStore((state: any) => state)
  const [activeTab, setActiveTab] = useState<'overview' | 'fitting' | 'cargo'>('overview')
  const [selectedItem, setSelectedItem] = useState<LootItem | null>(null)

  const spec = SHIP_SPECS[shipClass] || SHIP_SPECS['scout']
  const color = SHIP_COLORS[shipClass] || '#00f0ff'

  if (status !== 'hangar') return null

  // Helper для слотів
  const renderSlot = (slotIndex: number, type: 'weapon' | 'module') => {
      const slotId = `${type}-${slotIndex}`
      const item = equipped[slotId]

      return (
          <div key={slotId} className="relative group">
              <div className={`w-16 h-16 border rounded bg-black/50 flex items-center justify-center transition-all ${item ? 'border-neon-cyan' : 'border-white/10 hover:border-white/30'}`}>
                  {item ? (
                      <div className="text-center">
                          <Box size={20} className={type === 'weapon' ? 'text-red-500' : 'text-blue-500'} />
                          <div className="text-[9px] mt-1 text-white truncate max-w-[50px]">{item.name}</div>
                      </div>
                  ) : (
                      <div className="text-white/10 text-[10px] uppercase">{type}</div>
                  )}
              </div>
              
              {/* Дії при кліку */}
              {item && (
                  <button 
                    onClick={() => unequipItem(slotId)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                      <LogOut size={10} className="text-white"/>
                  </button>
              )}
              
              {/* Якщо обрано предмет в інвентарі, показуємо кнопку "Equip" */}
              {!item && selectedItem && selectedItem.type === type && (
                  <button 
                    onClick={() => { equipItem(selectedItem, slotId); setSelectedItem(null); }}
                    className="absolute inset-0 bg-green-500/20 hover:bg-green-500/40 flex items-center justify-center text-green-400 font-bold text-xs animate-pulse"
                  >
                      EQUIP
                  </button>
              )}
          </div>
      )
  }

  return (
    <div className="absolute inset-0 z-50 bg-black text-white flex flex-col md:flex-row overflow-hidden">
        
        {/* === LEFT SIDEBAR (SHIP PREVIEW) === */}
        <div className="w-full md:w-1/3 bg-space-950 border-r border-white/10 flex flex-col relative">
            <div className="p-6 border-b border-white/10">
                <h1 className="text-3xl font-black font-mono uppercase" style={{ color: color }}>{spec.name}</h1>
                <p className="text-gray-500 text-xs tracking-[0.2em] font-mono">HANGAR BAY // SECTOR 0:0</p>
            </div>

            {/* 3D Model Container */}
            <div className="flex-1 relative bg-[radial-gradient(circle_at_center,#1a1a2e_0%,#000000_100%)]">
                <Canvas camera={{ position: [2, 2, 5], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <pointLight position={[-5, 0, -5]} intensity={2} color={color} />
                    <Float speed={2} rotationIntensity={0.5}>
                        <group scale={1.5}><Object3D type="player" color={color} /></group>
                    </Float>
                    <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5}/>
                    <Stars radius={50} count={1000} factor={2} fade />
                </Canvas>
                
                {/* Stats Overlay */}
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2">
                    <div className="bg-black/60 p-2 border border-white/10 rounded backdrop-blur-md">
                        <div className="text-[10px] text-gray-400 font-bold">HULL</div>
                        <div className="text-neon-cyan font-mono">{hull} / {maxHull}</div>
                    </div>
                    <div className="bg-black/60 p-2 border border-white/10 rounded backdrop-blur-md">
                        <div className="text-[10px] text-gray-400 font-bold">CARGO</div>
                        <div className="text-yellow-400 font-mono">{Object.values(cargo).reduce((a:any,b:any)=>a+b,0)} / {maxCargo}</div>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-white/10">
                <button 
                    onClick={() => useGameStore.setState({ status: 'space' })}
                    className="w-full py-4 bg-neon-orange text-black font-black text-xl tracking-widest hover:bg-white transition-all clip-path-polygon"
                >
                    LAUNCH SHIP
                </button>
            </div>
        </div>

        {/* === RIGHT CONTENT (TABS) === */}
        <div className="flex-1 flex flex-col bg-black/95">
            {/* Tab Navigation */}
            <div className="flex border-b border-white/10">
                {['overview', 'fitting', 'cargo'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-8 py-4 text-sm font-bold uppercase tracking-wider transition-all border-r border-white/10
                            ${activeTab === tab ? 'bg-white/10 text-white border-b-2 border-b-neon-cyan' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                        `}
                    >
                        {tab}
                    </button>
                ))}
                <div className="flex-1 flex justify-end items-center px-6">
                    <span className="text-neon-cyan font-mono font-bold text-xl">{credits.toLocaleString()} CR</span>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative">
                
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-white font-mono text-lg border-l-4 border-neon-cyan pl-3 mb-4">SHIP STATISTICS</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StatCard icon={<Shield/>} label="Armor Rating" value={`${spec.armor}%`} desc="Damage reduction from incoming fire" />
                            <StatCard icon={<Zap/>} label="Warp Drive" value={`MK-${spec.jumpRange}`} desc="Maximum jump distance in sectors" />
                            <StatCard icon={<Crosshair/>} label="Weapon Slots" value={spec.maxSlots} desc="Available hardpoints for turrets" />
                            <StatCard icon={<Activity/>} label="Signature" value="LOW" desc="Enemy detection chance" />
                        </div>
                    </div>
                )}

                {/* 2. FITTING TAB (Інвентар + Слоти) */}
                {activeTab === 'fitting' && (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
                        {/* SHIP SLOTS */}
                        <div className="mb-8">
                            <h3 className="text-white font-mono text-sm mb-4 flex items-center gap-2">
                                <Settings size={16} className="text-neon-cyan"/> EQUIPPED MODULES
                            </h3>
                            <div className="flex gap-4 flex-wrap">
                                {/* Генеруємо слоти (наприклад 3 зброї, 3 модулі) */}
                                <div className="flex gap-2 p-4 border border-white/10 rounded bg-white/5">
                                    <div className="text-[10px] text-gray-500 w-full mb-2">HARDPOINTS</div>
                                    {[0, 1, 2].map(i => renderSlot(i, 'weapon'))}
                                </div>
                                <div className="flex gap-2 p-4 border border-white/10 rounded bg-white/5">
                                    <div className="text-[10px] text-gray-500 w-full mb-2">UTILITY</div>
                                    {[0, 1, 2].map(i => renderSlot(i, 'module'))}
                                </div>
                            </div>
                        </div>

                        {/* INVENTORY GRID */}
                        <div className="flex-1">
                            <h3 className="text-white font-mono text-sm mb-4 flex items-center gap-2">
                                <Grid size={16} className="text-neon-cyan"/> WAREHOUSE INVENTORY
                            </h3>
                            {inventory.length === 0 ? (
                                <div className="text-gray-600 font-mono text-sm border border-dashed border-gray-800 p-8 text-center rounded">
                                    NO ITEMS IN WAREHOUSE
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                    {inventory.map((item: LootItem) => (
                                        <button 
                                            key={item.id}
                                            onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                            className={`relative p-3 border rounded aspect-square flex flex-col items-center justify-center transition-all
                                                ${selectedItem?.id === item.id ? 'bg-neon-cyan/20 border-neon-cyan ring-1 ring-neon-cyan' : 'bg-white/5 border-white/10 hover:border-white/30'}
                                            `}
                                        >
                                            <Box className={item.type === 'weapon' ? 'text-red-400' : 'text-purple-400'} size={24}/>
                                            <div className="text-[10px] text-gray-400 mt-2 truncate w-full text-center">{item.name}</div>
                                            {selectedItem?.id === item.id && (
                                                <div className="absolute top-1 right-1 w-2 h-2 bg-neon-cyan rounded-full animate-pulse"/>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            {selectedItem && (
                                <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded flex justify-between items-center animate-in slide-in-from-bottom-2">
                                    <div>
                                        <div className="text-neon-cyan font-bold">{selectedItem.name}</div>
                                        <div className="text-xs text-gray-500 uppercase">{selectedItem.type}</div>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Select an empty slot above to equip
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. CARGO TAB (Старий карго) */}
                {activeTab === 'cargo' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-white font-mono text-lg border-l-4 border-yellow-500 pl-3 mb-4">RESOURCE HOLD</h3>
                        <div className="space-y-2">
                            {Object.entries(cargo).map(([name, amount]) => (
                                <div key={name} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded">
                                    <span className="font-bold text-gray-300">{name}</span>
                                    <span className="font-mono text-yellow-400 font-bold">{amount as number} T</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  )
}

function StatCard({ icon, label, value, desc }: any) {
    return (
        <div className="bg-white/5 border border-white/10 p-4 rounded hover:bg-white/10 transition-colors group">
            <div className="flex items-start justify-between mb-2">
                <div className="text-gray-400 group-hover:text-neon-cyan transition-colors">{icon}</div>
                <div className="text-xl font-bold text-white font-mono">{value}</div>
            </div>
            <div className="text-xs font-bold text-gray-300 uppercase">{label}</div>
            <div className="text-[10px] text-gray-600 mt-1">{desc}</div>
        </div>
    )
}