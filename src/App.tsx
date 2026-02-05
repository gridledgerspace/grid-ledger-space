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
import { RotateCcw } from 'lucide-react'
import NotificationSystem from './components/NotificationSystem' // <--- IMPORT
import LootOverlay from './components/LootOverlay' // <--- IMPORT

function App() {
  const { status, currentSector, isStationOpen, setStationOpen } = useGameStore()
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

  // === ЗАВАНТАЖЕННЯ Гравця (Повернули робочу версію) ===
  const loadUserData = async (userId: string) => {
    if (isDataLoaded) return 
    setLoadingData(true)
    
    // Прямий запит до БД (як було у вас раніше)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    
    if (data) {
      useGameStore.setState({
        credits: data.credits,
        hull: data.hull,
        maxHull: data.max_hull,
        currentSector: data.current_sector,
        cargo: data.cargo || {}, 
        visitedSectors: data.visited_sectors || ['0:0'],
        // Якщо є ship_class - беремо його, якщо ні - дефолт
        shipClass: data.ship_class || 'scout' 
      })
      setIsDataLoaded(true)
      
      // Примусове сканування
      setTimeout(() => {
          useGameStore.getState().scanCurrentSector()
      }, 100)
    }
    setLoadingData(false)
  }

  const saveGame = async (_reason: string) => {
    if (!session || !isDataLoaded) return
    setIsSaving(true)
    const state = useGameStore.getState()
    await supabase.from('profiles').update({
        credits: state.credits, 
        hull: state.hull,
        current_sector: state.currentSector, 
        cargo: state.cargo,
        visited_sectors: state.visitedSectors, 
        updated_at: new Date()
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
            // Якщо сектору немає в БД - store сам його згенерує через scanCurrentSector
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
    <div className="h-[100dvh] w-full bg-space-950 relative overflow-hidden text-white font-sans selection:bg-neon-cyan selection:text-black">
      
      <EventOverlay />
      <CombatOverlay />
      <NotificationSystem />
      <LootOverlay />
      
      {/* 🔥 ВИПРАВЛЕНО: Використовуємо глобальний стейт */}
      {isStationOpen && <StationMenu onClose={() => { setStationOpen(false); saveGame('Station Exit') }} />}
      
      {status === 'warping' && <WarpScreen />}
      {status === 'map' && <SectorMap />}
      {(status === 'space' || status === 'mining' || status === 'combat') && <SpaceView key={currentSector} />}

      {status === 'hangar' && (
        <>
            <HangarScene />
            {isSaving && (
                <div className="absolute top-4 right-4 z-50 text-neon-cyan text-[10px] font-mono animate-pulse flex items-center gap-1">
                    <RotateCcw size={10} className="animate-spin"/> SAVING...
                </div>
            )}
        </>
      )}
      
    </div>
  )
}

export default App