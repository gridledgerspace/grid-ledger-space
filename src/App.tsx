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

function App() {
  const { status, credits, currentSector, setUserId, loadUserProfile, scanCurrentSector } = useGameStore((state: any) => state)
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
        setUserId(session.user.id) 
        loadUserData(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) setUserId(session.user.id)
      if (session && !currentSector) { 
         if (!isDataLoaded) loadUserData(session.user.id)
      }
    })
    return () => subscription.unsubscribe()
  }, []) 

  // === ЗАВАНТАЖЕННЯ Гравця ===
  const loadUserData = async (userId: string) => {
    if (isDataLoaded) return 
    setLoadingData(true)
    
    // Використовуємо store action для завантаження
    await loadUserProfile() // <--- Це завантажить hull, ship_class тощо
    
    // Додатково можна дозавантажити специфічні дані, якщо їх немає в loadUserProfile
    const { data } = await supabase.from('profiles').select('visited_sectors').eq('id', userId).single()
    if (data) {
        useGameStore.setState({ visitedSectors: data.visited_sectors || ['0:0'] })
    }

    setIsDataLoaded(true)
    setLoadingData(false)
    
    // Примусове сканування
    setTimeout(() => {
        scanCurrentSector()
    }, 100)
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
        
        // Перевірка сектору в БД
        let { data: sector } = await supabase.from('sectors').select('*').eq('id', currentSector).single()
        
        // Якщо сектору немає - store сам його створить через scanCurrentSector -> generate -> upsert
        // Тому тут ми просто запускаємо скан
        scanCurrentSector()
        
        if (currentSector !== '0:0') saveGame('Warp Complete')
    }
    initSector()
  }, [currentSector, session, isDataLoaded])

  // Автозбереження при вході в ангар
  useEffect(() => { if (session && status === 'hangar') saveGame('Enter Hangar') }, [status])
  
  if (!session) return <AuthScreen />
  if (loadingData) return <div className="h-screen bg-black text-neon-cyan flex items-center justify-center font-mono">LOADING DATA...</div>

  return (
    <div className="h-[100dvh] w-full bg-space-950 relative overflow-hidden text-white font-sans selection:bg-neon-cyan selection:text-black">
      
      {/* Глобальні оверлеї */}
      <EventOverlay />
      <CombatOverlay />
      
      {showStation && <StationMenu onClose={() => { setShowStation(false); saveGame('Station Exit') }} />}
      
      {/* Екрани */}
      {status === 'warping' && <WarpScreen />}
      {status === 'map' && <SectorMap />}
      
      {/* Основний ігровий вид */}
      {(status === 'space' || status === 'mining' || status === 'combat') && <SpaceView key={currentSector} />}

      {/* Ангар: тепер ми просто рендеримо сцену, вона сама малює свій UI */}
      {status === 'hangar' && (
        <>
            <HangarScene />
            {/* Індикатор збереження можна залишити глобально */}
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