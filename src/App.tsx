import { useState, useEffect, useRef } from 'react'
import { useGameStore } from './store'
import { supabase } from './supabase'
import AuthScreen from './components/AuthScreen'
import HangarScene from './components/HangarScene'
import SectorMap from './components/SectorMap'
import SpaceView from './components/SpaceView'
import WarpScreen from './components/WarpScreen'
import EventOverlay from './components/EventOverlay'
import CombatOverlay from './components/CombatOverlay'
import StationMenu from './components/StationMenu'
import { Shield, Zap, Crosshair, Hexagon, ShoppingBag, LogOut, Save, RotateCcw  } from 'lucide-react'

function App() {
  const { status, credits, fuel, currentSector,  } = useGameStore()
  const [showStation, setShowStation] = useState(false)
  const [session, setSession] = useState<any>(null)
  
  // === СТАНИ ===
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [, setLastSavedTime] = useState<string>('')

  const lastInitializedSector = useRef<string | null>(null) 

  // === 1. АВТОРИЗАЦІЯ ===
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        useGameStore.getState().setUserId(session.user.id) 
        loadUserData(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
         useGameStore.getState().setUserId(session.user.id)
      }
      if (session && !useGameStore.getState().currentSector) { 
         if (!isDataLoaded) loadUserData(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, []) 

  // === 2. ЗАВАНТАЖЕННЯ ПРОФІЛЮ ===
  const loadUserData = async (userId: string) => {
    if (isDataLoaded) return 

    setLoadingData(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (data) {
      useGameStore.setState({
        credits: data.credits,
        fuel: data.fuel,
        maxFuel: data.max_fuel,
        hull: data.hull,
        maxHull: data.max_hull,
        currentSector: data.current_sector,
        cargo: data.cargo || {}, 
        visitedSectors: data.visited_sectors || ['0:0']
      })
      setIsDataLoaded(true)
    }
    setLoadingData(false)
  }

  // === 3. ЗБЕРЕЖЕННЯ ===
  const saveGame = async (_reason: string) => {
    if (!session || !isDataLoaded) return
    setIsSaving(true)
    const state = useGameStore.getState()
    
    const { error } = await supabase.from('profiles').update({
        credits: state.credits,
        fuel: state.fuel,
        hull: state.hull,
        current_sector: state.currentSector,
        cargo: state.cargo,
        visited_sectors: state.visitedSectors,
        updated_at: new Date()
      }).eq('id', session.user.id)

    setIsSaving(false)
    if (!error) setLastSavedTime(new Date().toLocaleTimeString())
  }

  // === 4. ЛОГІКА ВХОДУ В СЕКТОР ===
  useEffect(() => {
    if (!session || !isDataLoaded) return 
    if (lastInitializedSector.current === currentSector) return
    lastInitializedSector.current = currentSector

    const initSector = async () => {
        if (currentSector !== '0:0') {
            await supabase.from('profiles').update({ current_sector: currentSector, updated_at: new Date() }).eq('id', session.user.id)
        }

        const { visitedSectors } = useGameStore.getState()
        if (!visitedSectors.includes(currentSector)) {
            const newVisited = [...visitedSectors, currentSector]
            useGameStore.setState({ visitedSectors: newVisited })
            supabase.from('profiles').update({ visited_sectors: newVisited }).eq('id', session.user.id).then()
        }

        let { data: sector } = await supabase.from('sectors').select('*').eq('id', currentSector).single()

        if (!sector) {
            const newSectorData = {
                id: currentSector, discovered_by: session.user.id, sector_type: 'wild', 
                iron_amount: Math.floor(Math.random() * 500) + 100, 
                gold_amount: Math.floor(Math.random() * 200),
                dark_matter_amount: Math.random() > 0.9 ? Math.floor(Math.random() * 50) : 0
            }
            const { error: _error } = await supabase.from('sectors').insert(newSectorData)
            if (!_error) sector = newSectorData
        }

        if (sector) {
            useGameStore.setState({
                currentSectorType: sector.sector_type, 
                sectorResources: { iron: sector.iron_amount, gold: sector.gold_amount, darkMatter: sector.dark_matter_amount }
            })
        }
        
        useGameStore.getState().scanCurrentSector()
        if (currentSector !== '0:0') saveGame('Warp Complete')
    }
    initSector()
  }, [currentSector, session, isDataLoaded])


  useEffect(() => {
      if (session && status === 'hangar') saveGame('Enter Hangar')
  }, [status])

  useEffect(() => {
      if (!session || !isDataLoaded) return
      const timer = setTimeout(() => {
          const totalCargo = Object.values(useGameStore.getState().cargo).reduce((a: number, b: number) => a + b, 0)
          if (totalCargo > 0) saveGame('Cargo Update')
      }, 1000)
      return () => clearTimeout(timer)
  }, [useGameStore((state) => state.cargo)])
  
  if (!session) return <AuthScreen />
  if (loadingData) return <div className="h-screen bg-black text-neon-cyan flex items-center justify-center font-mono">LOADING DATA...</div>

  return (
    <div className="h-screen w-full bg-space-950 relative overflow-hidden text-white font-sans selection:bg-neon-cyan selection:text-black">
      
      <EventOverlay />
      <CombatOverlay />
      
      {showStation && (
      <StationMenu onClose={() => { setShowStation(false); saveGame('Station Exit') }} />
      )}

      {status === 'warping' && <WarpScreen />}
      {status === 'map' && <SectorMap />}
      {(status === 'space' || status === 'mining' || status === 'combat') && (
        <SpaceView key={currentSector} /> 
      )}

      {/* Індикатор збереження */}
      <div className="absolute top-16 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
          {isSaving && <div className="text-neon-cyan text-[10px] font-mono animate-pulse flex items-center gap-1 bg-black/50 px-2 py-1 rounded border border-neon-cyan/30"><RotateCcw size={10} className="animate-spin"/> SYNC</div>}
      </div>

      {status === 'hangar' && (
        <>
          <HangarScene />
          
          {/* === НОВИЙ АДАПТИВНИЙ ЛОЯУТ АНГАРА === */}
          <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
            
            {/* 1. HEADER (Compact) */}
            <div className="flex justify-between items-start p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
              {/* Ship Info */}
              <div className="glass-panel px-4 py-2 border-l-4 border-l-neon-cyan rounded-r-lg">
                 <h2 className="text-neon-cyan font-mono text-lg md:text-xl font-bold tracking-widest">USS-NEMESIS</h2>
                 <p className="text-[10px] text-gray-400 font-mono tracking-wider">SECTOR {currentSector}</p>
              </div>

              {/* Credits & Fuel */}
              <div className="glass-panel px-4 py-2 border-r-4 border-r-neon-orange rounded-l-lg text-right">
                 <h2 className="text-neon-orange font-mono text-lg md:text-xl font-bold">{credits.toLocaleString()} CR</h2>
                 <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 font-mono">
                    <span>FUEL:</span>
                    <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-orange" style={{ width: `${fuel}%` }} />
                    </div>
                    <span>{fuel}%</span>
                 </div>
              </div>
            </div>

            {/* Spacer (щоб центр був вільний для корабля) */}
            <div className="flex-1" />

            {/* 2. BOTTOM CONTROL DECK */}
            <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 pb-8 pointer-events-auto flex flex-col gap-4">
               
               {/* Buttons Row (Save, Logout, Station) */}
               <div className="flex justify-center items-center gap-3">
                  {currentSector === '0:0' && (
                      <button onClick={() => setShowStation(true)} className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan text-xs font-bold rounded hover:bg-neon-cyan hover:text-black transition-all">
                          <ShoppingBag size={14}/> STATION
                      </button>
                  )}
                  <button onClick={() => saveGame('Manual')} className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500 text-green-500 text-xs font-bold rounded hover:bg-green-500 hover:text-black transition-all">
                      <Save size={14}/> SAVE
                  </button>
                  <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500 text-red-500 text-xs font-bold rounded hover:bg-red-500 hover:text-black transition-all">
                      <LogOut size={14}/> EXIT
                  </button>
               </div>

               {/* Slots Grid (Adaptive: 4 in a row on mobile, bigger on desktop) */}
               <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-2xl mx-auto w-full">
                  <Slot icon={<Shield size={20} />} label="SHIELD" level="LVL 1" color="cyan" />
                  <Slot icon={<Zap size={20} />} label="ENGINE" level="LVL 1" color="cyan" />
                  <Slot icon={<Crosshair size={20} />} label="LASER" level="MK-I" color="orange" />
                  <Slot icon={<Hexagon size={20} />} label="CARGO" level="EMPTY" color="orange" />
               </div>

               {/* Main Nav Button */}
               <div className="flex justify-center mt-2">
                 <button 
                    onClick={() => useGameStore.setState({ status: 'map' })} 
                    className="w-full max-w-md bg-neon-orange text-black py-3 font-mono font-bold text-lg rounded clip-path-polygon hover:bg-white transition-all shadow-neon"
                 >
                    OPEN NAVIGATION
                 </button>
               </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}

// === Оновлений компактний слот ===
function Slot({ icon, label, level, color }: any) {
  const borderColor = color === 'cyan' ? 'border-neon-cyan/30' : 'border-neon-orange/30';
  const textColor = color === 'cyan' ? 'text-neon-cyan' : 'text-neon-orange';
  const bgHover = color === 'cyan' ? 'group-hover:bg-neon-cyan/10' : 'group-hover:bg-neon-orange/10';
  
  return (
    <div className={`
        glass-panel flex flex-col items-center justify-center 
        aspect-square rounded-lg border ${borderColor} ${bgHover} 
        transition-all cursor-pointer group p-2
    `}>
      <div className={`${textColor} mb-1 group-hover:scale-110 transition-transform opacity-80`}>{icon}</div>
      <div className="text-[8px] md:text-[10px] text-gray-500 font-mono tracking-widest">{label}</div>
      <div className={`text-[10px] md:text-sm font-bold ${textColor}`}>{level}</div>
    </div>
  )
}

export default App