import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Float } from '@react-three/drei'
import { useGameStore, SHIP_SPECS } from '../store'
import type { LootItem } from '../store' // 🔥 ВИПРАВЛЕНО ІМПОРТ
import Object3D from './Object3D'
import { 
    Zap, Box, Activity, Crosshair, Shield, Settings, 
    Rocket, ChevronDown, LogOut 
} from 'lucide-react'

const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff', 'interceptor': '#ff003c', 'hauler': '#ffae00', 'explorer': '#a855f7'     
}

export default function HangarInterface() {
  const { status, shipClass, hull, maxHull, cargo, maxCargo, credits, inventory, equipped, unequipItem, equipItem } = useGameStore((state: any) => state)
  
  // activePanel: null (головний екран), 'fitting', 'cargo'
  const [activePanel, setActivePanel] = useState<'fitting' | 'cargo' | null>(null)
  const [selectedItem, setSelectedItem] = useState<LootItem | null>(null)

  const spec = SHIP_SPECS[shipClass] || SHIP_SPECS['scout']
  const color = SHIP_COLORS[shipClass] || '#00f0ff'

  if (status !== 'hangar') return null

  // --- RENDERING HELPERS ---
  const renderSlot = (slotIndex: number, type: 'weapon' | 'module') => {
      const slotId = `${type}-${slotIndex}`
      const item = equipped[slotId]

      return (
          <div key={slotId} className="relative group">
              <div 
                className={`w-14 h-14 md:w-16 md:h-16 border rounded-lg bg-black/40 backdrop-blur-md flex items-center justify-center transition-all relative overflow-hidden
                    ${item ? 'border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'border-white/10'}
                    ${!item && selectedItem && selectedItem.type === type ? 'border-green-500 animate-pulse bg-green-500/10' : ''}
                `}
                onClick={() => {
                    if (!item && selectedItem && selectedItem.type === type) {
                        equipItem(selectedItem, slotId)
                        setSelectedItem(null)
                    }
                }}
              >
                  {item ? (
                      <div className="flex flex-col items-center justify-center p-1">
                          <Box size={18} className={type === 'weapon' ? 'text-red-500' : 'text-purple-400'} />
                          <div className="text-[8px] text-white truncate w-full text-center mt-1 leading-none">{item.name}</div>
                      </div>
                  ) : (
                      <div className="text-white/20 text-[8px] uppercase font-mono tracking-widest">{type}</div>
                  )}

                  {/* Кнопка зняти предмет */}
                  {item && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); unequipItem(slotId); }}
                        className="absolute top-0 right-0 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-bl-lg backdrop-blur-sm z-10"
                      >
                          <LogOut size={10}/>
                      </button>
                  )}
              </div>
          </div>
      )
  }

  return (
    <div className="absolute inset-0 z-10 bg-black text-white overflow-hidden">
        
        {/* === 1. 3D BACKGROUND (Завжди на фоні) === */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,#121212_0%,#000000_100%)]">
            <Canvas camera={{ position: [2, 2, 6], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-5, 0, -5]} intensity={2} color={color} />
                
                {/* Корабель трохи зсуваємо вгору, щоб панелі знизу не перекривали його повністю */}
                <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                    <group position={[0, 0.5, 0]} scale={1.3}>
                        <Object3D type="player" color={color} />
                    </group>
                </Float>
                
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3} minPolarAngle={Math.PI/3} maxPolarAngle={Math.PI/2} />
                <Stars radius={100} count={2000} factor={3} fade />
            </Canvas>
        </div>

        {/* === 2. TOP HEADER (Інформація) === */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-8 flex justify-between items-start pointer-events-none">
            {/* Ліво: Назва */}
            <div className="pointer-events-auto">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-1 h-8 bg-neon-cyan"></div>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black font-mono uppercase leading-none" style={{ color: color, textShadow: `0 0 20px ${color}60` }}>
                            {spec.name}
                        </h1>
                        <p className="text-[10px] text-gray-400 font-mono tracking-[0.3em] uppercase">
                            Home Base // Sector 0:0
                        </p>
                    </div>
                </div>
            </div>

            {/* Право: Кредити та кнопка виходу */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
                <div className="bg-black/60 border border-neon-cyan/30 px-4 py-2 rounded backdrop-blur-md">
                    <div className="text-xs text-neon-cyan font-bold uppercase tracking-widest">Credits</div>
                    <div className="text-xl font-mono text-white">{credits.toLocaleString()}</div>
                </div>
            </div>
        </div>

        {/* === 3. MAIN CONTENT (Panels) === */}
        
        {/* Панель ФІТИНГУ (Виїжджає знизу) */}
        {activePanel === 'fitting' && (
            <div className="absolute inset-x-0 bottom-[80px] top-24 z-20 px-4 md:px-20 pb-4 flex flex-col justify-end pointer-events-none">
                <div className="bg-black/80 backdrop-blur-xl border-t-2 border-neon-cyan rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] h-full max-h-[600px] pointer-events-auto overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                    
                    {/* Заголовок панелі */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h2 className="text-neon-cyan font-bold font-mono text-lg flex items-center gap-2">
                            <Settings className="animate-spin-slow"/> SHIP OUTFITTING
                        </h2>
                        <button onClick={() => setActivePanel(null)} className="p-2 hover:text-red-500 transition-colors"><ChevronDown/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {/* 1. SLOTS SECTION */}
                        <div className="mb-6">
                            <div className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Crosshair size={14}/> Active Hardpoints
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {/* Згенеруємо слоти згідно з класом корабля */}
                                {Array.from({ length: Math.ceil(spec.maxSlots / 2) }).map((_, i) => renderSlot(i, 'weapon'))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Zap size={14}/> Module Slots
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {Array.from({ length: Math.floor(spec.maxSlots / 2) }).map((_, i) => renderSlot(i, 'module'))}
                            </div>
                        </div>

                        {/* 2. INVENTORY SECTION */}
                        <div>
                            <div className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider flex items-center gap-2 border-t border-white/10 pt-4">
                                <Box size={14}/> Warehouse Storage
                            </div>
                            
                            {inventory.length === 0 ? (
                                <div className="text-center py-8 text-gray-600 font-mono text-xs border border-dashed border-white/10 rounded">
                                    WAREHOUSE EMPTY
                                </div>
                            ) : (
                                <div className="grid grid-cols-5 md:grid-cols-8 gap-2">
                                    {inventory.map((item: LootItem) => (
                                        <button 
                                            key={item.id}
                                            onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                            className={`aspect-square rounded border flex flex-col items-center justify-center p-1 transition-all relative
                                                ${selectedItem?.id === item.id ? 'bg-neon-cyan/20 border-neon-cyan' : 'bg-white/5 border-white/10 hover:border-white/30'}
                                            `}
                                        >
                                            <Box size={20} className={item.type === 'weapon' ? 'text-red-400' : 'text-purple-400'}/>
                                            {selectedItem?.id === item.id && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-neon-cyan rounded-full animate-pulse"/>}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Інформація про вибраний предмет */}
                            {selectedItem && (
                                <div className="mt-4 p-3 bg-neon-cyan/5 border border-neon-cyan/30 rounded flex justify-between items-center animate-in fade-in">
                                    <div>
                                        <div className="text-neon-cyan font-bold text-sm">{selectedItem.name}</div>
                                        <div className="text-[10px] text-gray-400 uppercase">Tap an empty slot above to equip</div>
                                    </div>
                                    <div className="px-2 py-1 bg-neon-cyan text-black text-xs font-bold rounded">
                                        SELECTED
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Панель ВАНТАЖУ */}
        {activePanel === 'cargo' && (
            <div className="absolute inset-x-0 bottom-[80px] top-1/2 z-20 px-4 md:px-20 pb-4 flex flex-col justify-end pointer-events-none">
                <div className="bg-black/80 backdrop-blur-xl border-t-2 border-yellow-500 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] h-full pointer-events-auto overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h2 className="text-yellow-500 font-bold font-mono text-lg flex items-center gap-2">
                            <Box/> CARGO HOLD
                        </h2>
                        <button onClick={() => setActivePanel(null)} className="p-2 hover:text-white transition-colors"><ChevronDown/></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 text-xs font-mono text-gray-400">
                            <span>CAPACITY</span>
                            <span>{Object.values(cargo).reduce((a:any,b:any)=>a+b,0)} / {maxCargo} T</span>
                        </div>
                        <div className="space-y-2">
                            {Object.entries(cargo).map(([name, amount]) => (
                                <div key={name} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold text-xs">
                                            {name[0]}
                                        </div>
                                        <span className="font-bold text-gray-300">{name}</span>
                                    </div>
                                    <span className="font-mono text-white font-bold text-lg">{amount as number}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}


        {/* === 4. BOTTOM NAVIGATION BAR (Головне меню) === */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-space-950/90 backdrop-blur-xl border-t border-white/10 z-30 flex items-center justify-around pb-2 px-2">
            
            {/* Кнопка Фітингу */}
            <button 
                onClick={() => setActivePanel(activePanel === 'fitting' ? null : 'fitting')}
                className={`flex flex-col items-center gap-1 p-2 w-20 transition-all ${activePanel === 'fitting' ? 'text-neon-cyan -translate-y-2' : 'text-gray-400 hover:text-white'}`}
            >
                <div className={`p-3 rounded-full ${activePanel === 'fitting' ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.5)]' : 'bg-white/5'}`}>
                    <Settings size={20} />
                </div>
                <span className="text-[10px] font-bold tracking-wider">FITTING</span>
            </button>

            {/* ВЕЛИКА КНОПКА ЗАПУСКУ (По центру) */}
            <button 
                onClick={() => useGameStore.setState({ status: 'space' })}
                className="flex flex-col items-center justify-center -translate-y-6 group"
            >
                <div className="w-20 h-20 bg-neon-orange rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,165,0,0.4)] border-4 border-space-950 group-hover:scale-105 transition-transform group-hover:shadow-[0_0_30px_rgba(255,165,0,0.6)]">
                    <Rocket size={32} className="text-black fill-current ml-1" />
                </div>
                <span className="text-neon-orange font-black text-xs tracking-widest mt-1 bg-black/50 px-2 py-0.5 rounded">LAUNCH</span>
            </button>

            {/* Кнопка Вантажу */}
            <button 
                onClick={() => setActivePanel(activePanel === 'cargo' ? null : 'cargo')}
                className={`flex flex-col items-center gap-1 p-2 w-20 transition-all ${activePanel === 'cargo' ? 'text-yellow-500 -translate-y-2' : 'text-gray-400 hover:text-white'}`}
            >
                <div className={`p-3 rounded-full ${activePanel === 'cargo' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(255,200,0,0.5)]' : 'bg-white/5'}`}>
                    <Box size={20} />
                </div>
                <span className="text-[10px] font-bold tracking-wider">CARGO</span>
            </button>

        </div>

        {/* SHIP STATS (Floating, small) */}
        {!activePanel && (
            <div className="absolute bottom-24 inset-x-0 flex justify-center gap-2 pointer-events-none animate-in fade-in duration-500">
                <StatBadge icon={<Shield size={12}/>} value={`${spec.armor}%`} label="ARM" color="text-blue-400" />
                
                {/* 🔥 ВИПРАВЛЕНО: використовуємо maxHull */}
                <StatBadge icon={<Activity size={12}/>} value={`${hull}/${maxHull}`} label="HULL" color="text-green-400" />
                
                <StatBadge icon={<Zap size={12}/>} value={`MK-${spec.jumpRange}`} label="WARP" color="text-purple-400" />
            </div>
        )}

    </div>
  )
}

function StatBadge({ icon, value, label, color }: any) {
    return (
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-2 rounded flex items-center gap-2 min-w-[80px]">
            <div className={color}>{icon}</div>
            <div>
                <div className="text-[9px] text-gray-500 font-bold">{label}</div>
                <div className="text-xs text-white font-mono font-bold leading-none">{value}</div>
            </div>
        </div>
    )
}