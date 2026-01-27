import { useState } from 'react'
import { useGameStore } from './store'
import HangarScene from './components/HangarScene'
import SectorMap from './components/SectorMap'
import SpaceView from './components/SpaceView'
import WarpScreen from './components/WarpScreen'
import EventOverlay from './components/EventOverlay'
import StationMenu from './components/StationMenu'
import CombatOverlay from './components/CombatOverlay'
import { Shield, Zap, Crosshair, Hexagon, ShoppingBag } from 'lucide-react'

function App() {
  const { status, credits, fuel, currentSector } = useGameStore()
  const [showStation, setShowStation] = useState(false)

  return (
    <div className="h-screen w-full bg-space-950 relative overflow-hidden text-white font-sans selection:bg-neon-cyan selection:text-black">
      
      <EventOverlay />
      <CombatOverlay />
      
      {/* Показуємо Маркет, якщо натиснуто */}
      {showStation && <StationMenu onClose={() => setShowStation(false)} />}

      {status === 'warping' && <WarpScreen />}
      {status === 'map' && <SectorMap />}
      {(status === 'space' || status === 'mining' || status === 'combat') && <SpaceView />}

      {status === 'hangar' && (
        <>
          {/* 3D Фон */}
          <HangarScene />

          {/* UI Ангару */}
          <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between pointer-events-none animate-in fade-in duration-1000">
            
            {/* === ВЕРХНЯ ПАНЕЛЬ === */}
            <div className="flex justify-between items-start">
              
              {/* Ліво: Назва корабля */}
              <div className="glass-panel px-6 py-2 rounded-br-2xl border-l-4 border-l-neon-cyan">
                <h2 className="text-neon-cyan font-mono text-xl font-bold">USS-NEMESIS</h2>
                <p className="text-xs text-gray-400 font-mono">BASE: SECTOR {currentSector}</p>
              </div>
              
              {/* Право: Кредити + Кнопка Станції */}
              <div className="flex flex-col items-end gap-2 pointer-events-auto">
                  {/* Панель валюти */}
                  <div className="glass-panel px-6 py-2 rounded-bl-2xl border-r-4 border-r-neon-orange text-right">
                    <h2 className="text-neon-orange font-mono text-xl font-bold">{credits.toLocaleString()} CR</h2>
                    <p className="text-xs text-gray-400 font-mono">FUEL: {fuel}%</p>
                  </div>

                  {/* НОВА ПОЗИЦІЯ КНОПКИ ТОРГІВЛІ */}
                  {currentSector === '0:0' && (
                      <button 
                        onClick={() => setShowStation(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-black/60 backdrop-blur-md border border-neon-cyan/30 text-neon-cyan font-mono text-sm hover:bg-neon-cyan hover:text-black transition-all rounded-l-xl border-r-4 border-r-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.1)] group"
                      >
                          <ShoppingBag size={16} className="group-hover:animate-bounce"/> STATION SERVICES
                      </button>
                  )}
              </div>
            </div>

            {/* === ЦЕНТРАЛЬНА ЧАСТИНА (СЛОТИ) === */}
            {/* Тепер тут чисто, корабель по центру */}
            <div className="flex justify-between items-center h-full px-4 mt-10">
              
              {/* Лівий борт */}
              <div className="flex flex-col gap-4 pointer-events-auto">
                 <Slot icon={<Shield size={24} />} label="SHIELD" level="LVL 1" color="cyan" />
                 <Slot icon={<Zap size={24} />} label="ENGINE" level="LVL 1" color="cyan" />
              </div>

              {/* ПРАВИЙ БОРТ */}
              <div className="flex flex-col gap-4 pointer-events-auto">
                 <Slot icon={<Crosshair size={24} />} label="LASER" level="MK-I" color="orange" />
                 <Slot icon={<Hexagon size={24} />} label="CARGO" level="EMPTY" color="orange" />
              </div>
            </div>

            {/* === НИЖНЯ ПАНЕЛЬ (НАВІГАЦІЯ) === */}
            <div className="flex justify-center pb-8 pointer-events-auto">
              <button 
                onClick={() => useGameStore.setState({ status: 'map' })}
                className="bg-neon-orange/20 backdrop-blur-md border border-neon-orange text-neon-orange px-12 py-3 font-mono font-bold text-xl rounded clip-path-polygon hover:bg-neon-orange hover:text-black transition-all shadow-[0_0_20px_rgba(255,174,0,0.3)] hover:shadow-[0_0_40px_rgba(255,174,0,0.6)]"
              >
                OPEN NAVIGATION
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Slot({ icon, label, level, color }: any) {
  const borderColor = color === 'cyan' ? 'border-neon-cyan/50' : 'border-neon-orange/50';
  const textColor = color === 'cyan' ? 'text-neon-cyan' : 'text-neon-orange';

  return (
    <div className={`glass-panel w-24 h-24 flex flex-col items-center justify-center rounded-lg border ${borderColor} hover:bg-white/5 transition-colors cursor-pointer group`}>
      <div className={`${textColor} mb-1 group-hover:scale-110 transition-transform`}>{icon}</div>
      <div className="text-[10px] text-gray-400 font-mono">{label}</div>
      <div className={`text-xs font-bold ${textColor}`}>{level}</div>
    </div>
  )
}

export default App