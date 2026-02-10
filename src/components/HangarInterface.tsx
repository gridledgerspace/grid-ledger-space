import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment, Float } from '@react-three/drei'
import { useGameStore, SHIP_SPECS, type LootItem } from '../store'
import Object3D from './Object3D'
import { Zap, Box, Activity, Crosshair, ShoppingBag, X, LogOut } from 'lucide-react'

// Ті самі кольори
const SHIP_COLORS: Record<string, string> = {
    'scout': '#00f0ff',      
    'interceptor': '#ff003c', 
    'hauler': '#ffae00',      
    'explorer': '#a855f7'     
}

const SPACE_COLOR = '#02020a'

function HangarShip({ shipClass }: { shipClass: string }) {
    const color = SHIP_COLORS[shipClass] || '#00f0ff'
    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <group scale={1.2} rotation={[0.1, -0.5, 0]}>
                <Object3D type="player" color={color} />
                <pointLight position={[0, 0, 1]} distance={3} intensity={1} color={color} />
            </group>
        </Float>
    )
}

export default function HangarInterface() {
  const { 
      status, shipClass, hull, maxHull, cargo, maxCargo, credits, 
      setStationOpen, inventory, equipped, equipItem, unequipItem 
  } = useGameStore((state: any) => state)

  const [activeOverlay, setActiveOverlay] = useState<'fitting' | 'cargo' | null>(null)
  const [selectedItem, setSelectedItem] = useState<LootItem | null>(null)

  const shipSpec = SHIP_SPECS[shipClass] || SHIP_SPECS['scout']
  const shipColor = SHIP_COLORS[shipClass] || '#00f0ff'

  if (status !== 'hangar') return null

  // --- RENDERING SLOTS FOR FITTING ---
  const renderSlot = (index: number, type: 'weapon' | 'module' | 'engine') => {
      const slotId = `${type}-${index}`
      const item = equipped[slotId]
      return (
          <div key={slotId} 
               onClick={() => { if(!item && selectedItem?.type === type) { equipItem(selectedItem, slotId); setSelectedItem(null); } }}
               className={`w-14 h-14 md:w-16 md:h-16 border rounded bg-black/60 flex flex-col items-center justify-center relative cursor-pointer transition-all
               ${item ? 'border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'border-white/20'}
               ${!item && selectedItem?.type === type ? 'animate-pulse border-green-500 bg-green-500/10' : ''}
          `}>
              {item ? (
                  <>
                    <Box size={18} className={
                        type === 'weapon' ? 'text-red-500' : 
                        type === 'engine' ? 'text-yellow-400' : 'text-blue-400'
                    }/>
                    <div className="text-[8px] text-white mt-1 text-center truncate w-full px-1">{item.name}</div>
                    <button onClick={(e) => { e.stopPropagation(); unequipItem(slotId); }} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"><LogOut size={10} className="text-white"/></button>
                  </>
              ) : (
                  <div className="text-[8px] text-gray-600 uppercase font-mono">{type}</div>
              )}
          </div>
      )
  }

  return (
    <div className="absolute inset-0 z-10 bg-[#02020a] overflow-hidden">
      
      {/* 🔥 ОНОВЛЕНИЙ HEADER (Адаптивний) */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 md:p-8 flex justify-between items-start pointer-events-none">
          
          {/* Ліва частина: Назва корабля */}
          <div className="pointer-events-auto flex flex-col max-w-[50%]">
              <div className="border-l-2 border-neon-cyan pl-2 md:pl-4">
                  <h1 className="text-xl md:text-4xl font-bold text-neon-cyan font-mono uppercase leading-none truncate" style={{ color: shipColor }}>
                      {shipSpec.name}
                  </h1>
                  <p className="text-gray-500 font-mono text-[8px] md:text-xs tracking-widest mt-1">
                      SECTOR 0:0 // HOME
                  </p>
              </div>
          </div>

          {/* Права частина: Кредити та кнопка */}
          <div className="pointer-events-auto flex flex-col items-end gap-1 md:gap-2">
               <div className="text-neon-orange font-mono font-bold text-sm md:text-xl border border-neon-orange/30 px-2 md:px-4 py-1 rounded bg-black/50 backdrop-blur-sm">
                   {credits.toLocaleString()} CR
               </div>
               <button onClick={() => setStationOpen(true)} className="flex items-center gap-1 md:gap-2 border border-neon-cyan text-neon-cyan px-2 md:px-4 py-1 md:py-2 text-[10px] md:text-xs font-bold hover:bg-neon-cyan hover:text-black transition-all bg-black/50 backdrop-blur-sm">
                   <ShoppingBag size={12} className="md:w-4 md:h-4" /> SERVICES
               </button>
          </div>
      </div>

      {/* 3. 3D SCENE */}
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <color attach="background" args={[SPACE_COLOR]} />
        <fog attach="fog" args={[SPACE_COLOR, 5, 20]} />

        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="white" />
        <pointLight position={[-10, 5, -5]} intensity={2} color={shipColor} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        <Environment preset="city" />
        
        <HangarShip shipClass={shipClass} />
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>

      {/* 4. BOTTOM INTERACTIVE TABS */}
      {!activeOverlay && (
          <>
            <div className="absolute bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 z-20 flex gap-2 md:gap-4 scale-90 md:scale-100 origin-bottom">
                <StatBox icon={<Activity size={16} className="md:w-5 md:h-5"/>} label="HULL" value={`${hull}/${maxHull}`} color="text-neon-cyan" />
                <StatBox icon={<Zap size={16} className="md:w-5 md:h-5"/>} label="ENGINE" value={`LVL ${shipSpec.jumpRange}`} color="text-neon-cyan" />
                
                <StatBox 
                    icon={<Crosshair size={16} className="md:w-5 md:h-5"/>} 
                    label="FITTING" 
                    value={`${shipSpec.maxSlots} SLOTS`} 
                    color="text-neon-orange" 
                    onClick={() => setActiveOverlay('fitting')}
                    interactive
                />
                <StatBox 
                    icon={<Box size={16} className="md:w-5 md:h-5"/>} 
                    label="CARGO" 
                    value={`${Object.values(cargo).reduce((a:any,b:any)=>a+b,0)}/${maxCargo}`} 
                    color="text-yellow-400" 
                    onClick={() => setActiveOverlay('cargo')}
                    interactive
                />
            </div>

            <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-20 w-full flex justify-center">
                <button 
                    onClick={() => useGameStore.setState({ status: 'space' })}
                    className="bg-neon-orange text-black font-bold text-base md:text-lg py-3 px-12 rounded hover:bg-white transition-colors shadow-[0_0_20px_rgba(255,165,0,0.4)]"
                >
                    LAUNCH
                </button>
            </div>
          </>
      )}

      {/* 5. OVERLAYS (Fitting / Cargo) */}
      {activeOverlay && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-2xl bg-space-900 border border-white/20 rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
                  
                  {/* Overlay Header */}
                  <div className="p-3 md:p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <h2 className="text-base md:text-xl font-mono font-bold text-white flex items-center gap-2">
                          {activeOverlay === 'fitting' && <><Crosshair className="text-neon-orange w-4 h-4 md:w-6 md:h-6"/> SHIP CONFIG</>}
                          {activeOverlay === 'cargo' && <><Box className="text-yellow-400 w-4 h-4 md:w-6 md:h-6"/> CARGO HOLD</>}
                      </h2>
                      <button onClick={() => setActiveOverlay(null)} className="p-2 hover:text-red-500 transition-colors"><X/></button>
                  </div>

                  {/* Overlay Content */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                      
                      {/* --- FITTING PANEL --- */}
                      {activeOverlay === 'fitting' && (
                          <div className="space-y-6 md:space-y-8">
                              
                              {/* Engine Slot */}
                              <div>
                                  <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-2">
                                      <Zap size={12} className="text-yellow-400"/> Warp Drive Engine
                                  </div>
                                  <div className="flex flex-wrap gap-4">
                                      {renderSlot(0, 'engine')}
                                  </div>
                              </div>

                              {/* Slots Grid */}
                              <div>
                                  <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-2 flex items-center gap-2">
                                      <Crosshair size={12}/> Hardpoints & Utilities
                                  </div>
                                  <div className="flex flex-wrap gap-2 md:gap-4">
                                      <div className="flex gap-2">
                                          {Array.from({ length: Math.ceil(shipSpec.maxSlots/2) }).map((_, i) => renderSlot(i, 'weapon'))}
                                      </div>
                                      <div className="w-px bg-white/10 mx-1 md:mx-2"></div>
                                      <div className="flex gap-2">
                                          {Array.from({ length: Math.floor(shipSpec.maxSlots/2) }).map((_, i) => renderSlot(i, 'module'))}
                                      </div>
                                  </div>
                              </div>

                              {/* Inventory Grid */}
                              <div>
                                  <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-2 border-t border-white/10 pt-4">Warehouse Inventory</div>
                                  {inventory.length === 0 ? (
                                      <div className="text-gray-500 text-xs font-mono py-4 text-center border border-dashed border-white/10 rounded">Empty</div>
                                  ) : (
                                      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                          {inventory.map((item: LootItem) => (
                                              <button 
                                                  key={item.id}
                                                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                                  className={`aspect-square rounded border flex flex-col items-center justify-center p-1 transition-all
                                                      ${selectedItem?.id === item.id ? 'bg-neon-cyan/20 border-neon-cyan' : 'bg-white/5 border-white/10 hover:border-white/30'}
                                                  `}
                                              >
                                                  <Box size={16} className={
                                                      item.type === 'weapon' ? 'text-red-400' : 
                                                      item.type === 'engine' ? 'text-yellow-400' : 'text-purple-400'
                                                  }/>
                                                  <div className="text-[7px] md:text-[8px] text-gray-400 mt-1 truncate w-full text-center">{item.name}</div>
                                              </button>
                                          ))}
                                      </div>
                                  )}
                                  {selectedItem && (
                                      <div className="mt-2 text-[10px] md:text-xs text-neon-cyan font-mono animate-pulse">
                                          SELECTED: {selectedItem.name}
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* --- CARGO PANEL --- */}
                      {activeOverlay === 'cargo' && (
                          <div className="space-y-2">
                              <div className="flex justify-between text-xs font-mono text-gray-400 mb-2">
                                  <span>RESOURCE</span><span>QUANTITY</span>
                              </div>
                              {Object.entries(cargo).map(([name, amount]) => (
                                  <div key={name} className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded">
                                      <span className="font-bold text-white text-sm">{name}</span>
                                      <span className="font-mono text-yellow-400 font-bold text-sm">{amount as number} T</span>
                                  </div>
                              ))}
                              {(Object.values(cargo).reduce((a:any,b:any)=>a+b,0) === 0) && (
                                  <div className="text-gray-500 text-center py-4 text-xs">Cargo Hold Empty</div>
                              )}
                          </div>
                      )}

                  </div>
              </div>
          </div>
      )}

    </div>
  )
}

function StatBox({ icon, label, value, color, onClick, interactive }: any) {
    return (
        <div 
            onClick={interactive ? onClick : undefined}
            className={`
                w-16 h-20 md:w-20 md:h-24 border border-white/10 bg-black/40 flex flex-col items-center justify-center p-1 md:p-2 rounded backdrop-blur-sm 
                transition-all duration-200
                ${interactive ? 'cursor-pointer hover:border-white/50 hover:bg-white/10 hover:scale-105 active:scale-95' : ''}
            `}
        >
            <div className={`mb-1 md:mb-2 ${color}`}>{icon}</div>
            <div className="text-[7px] md:text-[9px] text-gray-500 font-bold tracking-wider uppercase">{label}</div>
            <div className="text-white font-mono font-bold text-xs md:text-sm mt-1">{value}</div>
        </div>
    )
}