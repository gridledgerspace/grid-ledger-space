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
import { Shield, Zap, Crosshair, Hexagon, ShoppingBag, LogOut, Save, RotateCcw } from 'lucide-react'

function App() {
  const { status, credits, currentSector } = useGameStore()
  const [showStation, setShowStation] = useState(false)
  const [session, setSession] = useState<any>(null)
  
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const lastInitializedSector = useRef<string | null>(null) 

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
      if (session) useGameStore.getState().setUserId(session.user.id)
      if (session && !useGameStore.getState().currentSector) { 
         if (!isDataLoaded) loadUserData(session.user.id)
      }
    })
    return () => subscription.unsubscribe()
  }, []) 

  const loadUserData = async (userId: string) => {
    if (isDataLoaded) return 
    setLoadingData(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      useGameStore.setState({
        credits: data.credits,
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

  const saveGame = async (_reason: string) => {
    if (!session || !isDataLoaded) return
    setIsSaving(true)
    const state = useGameStore.getState()
    await supabase.from('profiles').update({
        credits: state.credits, hull: state.hull,
        current_sector: state.currentSector, cargo: state.cargo,
        visited_sectors: state.visitedSectors, updated_at: new Date()
      }).eq('id', session.user.id)
    setIsSaving(false)
  }

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
                iron_amount: Math.floor(Math.random() * 500) + 100, gold_amount: Math.floor(Math.random() * 200),
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

  useEffect(() => { if (session && status === 'hangar') saveGame('Enter Hangar') }, [status])
  
  if (!session) return <AuthScreen />
  if (loadingData) return <div className="h-screen bg-black text-neon-cyan flex items-center justify-center font-mono">LOADING DATA...</div>

  return (
    // Використовуємо h-[100dvh] для коректної висоти на мобільних
    <div className="h-[100dvh] w-full bg-space-950 relative overflow-hidden text-white font-sans selection:bg-neon-cyan selection:text-black">
      <EventOverlay />
      <CombatOverlay />
      
      {showStation && <StationMenu onClose={() => { setShowStation(false); saveGame('Station Exit') }} />}
      {status === 'warping' && <WarpScreen />}
      {status === 'map' && <SectorMap />}
      {(status === 'space' || status === 'mining' || status === 'combat') && <SpaceView key={currentSector} />}

      {status === 'hangar' && (
        <>
          <HangarScene />
          
          <div className="absolute inset-0 z-10 flex flex-col pointer-events-none h-full">
            
            {/* === 1. HEADER (Top Bar) === */}
            <div className="flex justify-between items-start p-4 bg-gradient-to-b from-black/90 to-transparent pointer-events-auto">
              
              {/* Left: Ship Name & Status */}
              <div className="flex flex-col gap-2">
                  <div className="glass-panel px-4 py-2 border-l-4 border-l-neon-cyan rounded-r-lg bg-black/40 backdrop-blur-sm shadow-lg">
                    <h2 className="text-neon-cyan font-mono text-lg md:text-xl font-bold tracking-widest leading-none">USS-NEMESIS</h2>
                    <p className="text-[10px] text-gray-400 font-mono tracking-wider mt-1">SECTOR {currentSector}</p>
                  </div>
                  {/* Sync Indicator */}
                  {isSaving && <div className="text-neon-cyan text-[10px] font-mono animate-pulse flex items-center gap-1 ml-1"><RotateCcw size={10} className="animate-spin"/> SYNCING...</div>}
              </div>

              {/* Right: Credits & Buttons (Перенесли кнопки сюди) */}
              <div className="flex flex-col items-end gap-2">
                  <div className="glass-panel px-4 py-2 border-r-4 border-r-neon-orange rounded-l-lg text-right bg-black/40 backdrop-blur-sm shadow-lg">
                    <h2 className="text-neon-orange font-mono text-lg md:text-xl font-bold leading-none">{credits.toLocaleString()} CR</h2>
                  </div>

                  {/* Buttons Grid */}
                  <div className="flex gap-2">
                      {currentSector === '0:0' && (
                          <button onClick={() => setShowStation(true)} className="w-10 h-10 flex items-center justify-center bg-neon-cyan/10 border border-neon-cyan/50 text-neon-cyan rounded hover:bg-neon-cyan hover:text-black transition-all shadow-md" title="Station">
                              <ShoppingBag size={18}/>
                          </button>
                      )}
                      <button onClick={() => saveGame('Manual')} className="w-10 h-10 flex items-center justify-center bg-green-500/10 border border-green-500/50 text-green-500 rounded hover:bg-green-500 hover:text-black transition-all shadow-md" title="Save">
                          <Save size={18}/>
                      </button>
                      <button onClick={() => supabase.auth.signOut()} className="w-10 h-10 flex items-center justify-center bg-red-500/10 border border-red-500/50 text-red-500 rounded hover:bg-red-500 hover:text-black transition-all shadow-md" title="Logout">
                          <LogOut size={18}/>
                      </button>
                  </div>
              </div>
            </div>

            {/* SPACER (Розтягує простір між верхом і низом) */}
            <div className="flex-1" />

            {/* === 2. BOTTOM DECK (Тепер має бути видно) === */}
            <div className="bg-gradient-to-t from-black via-space-950/95 to-transparent p-4 pb-8 md:pb-10 pointer-events-auto flex flex-col gap-4">
               
               {/* Slots Grid */}
               <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-xl mx-auto w-full">
                  <Slot icon={<Shield size={18} />} label="SHIELD" level="LVL 1" color="cyan" />
                  <Slot icon={<Zap size={18} />} label="ENGINE" level="LVL 1" color="cyan" />
                  <Slot icon={<Crosshair size={18} />} label="LASER" level="MK-I" color="orange" />
                  <Slot icon={<Hexagon size={18} />} label="CARGO" level="EMPTY" color="orange" />
               </div>

               {/* Navigation Button */}
               <div className="flex justify-center mt-2 mb-2">
                 <button 
                    onClick={() => useGameStore.setState({ status: 'map' })} 
                    className="w-full max-w-sm bg-neon-orange text-black py-4 font-mono font-bold text-lg rounded clip-path-polygon hover:bg-white transition-all shadow-[0_0_20px_rgba(255,174,0,0.4)] tracking-widest uppercase"
                 >
                    Open Star Map
                 </button>
               </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Slot({ icon, label, level, color }: any) {
  const borderColor = color === 'cyan' ? 'border-neon-cyan/30' : 'border-neon-orange/30';
  const textColor = color === 'cyan' ? 'text-neon-cyan' : 'text-neon-orange';
  const bgHover = color === 'cyan' ? 'group-hover:bg-neon-cyan/10' : 'group-hover:bg-neon-orange/10';
  
  return (
    <div className={`
        glass-panel flex flex-col items-center justify-center 
        aspect-square rounded-lg border ${borderColor} ${bgHover} 
        transition-all cursor-pointer group p-1 bg-black/40 shadow-lg
    `}>
      <div className={`${textColor} mb-1 group-hover:scale-110 transition-transform opacity-80`}>{icon}</div>
      <div className="text-[8px] md:text-[10px] text-gray-500 font-mono tracking-widest">{label}</div>
      <div className={`text-[10px] md:text-xs font-bold ${textColor}`}>{level}</div>
    </div>
  )
}

export default App