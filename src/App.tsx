import { useState, useEffect } from 'react'
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
  const { status, credits, fuel, currentSector, hull } = useGameStore()
  const [showStation, setShowStation] = useState(false)
  
  const [session, setSession] = useState<any>(null)
  
  // Блокування збереження до повного завантаження даних
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  
  // Індикатори збереження
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string>('')

  // === 1. АВТОРИЗАЦІЯ І ЗАВАНТАЖЕННЯ ===
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadUserData(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadUserData(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  // === 2. ФУНКЦІЯ ЗАВАНТАЖЕННЯ ДАНИХ (Load) ===
  const loadUserData = async (userId: string) => {
    setLoadingData(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error loading data:', error)
    } else if (data) {
      useGameStore.setState({
        credits: data.credits,
        fuel: data.fuel,
        maxFuel: data.max_fuel,
        hull: data.hull,
        maxHull: data.max_hull,
        currentSector: data.current_sector,
        // Вантажимо інвентар та історію
        cargo: data.cargo || {}, 
        visitedSectors: data.visited_sectors || ['0:0']
      })
      console.log('✅ DATA FULLY LOADED, SAVING ENABLED')
      // Дозволяємо збереження тільки після успішного завантаження
      setIsDataLoaded(true) 
    }
    setLoadingData(false)
  }

  // === 3. ФУНКЦІЯ ЗБЕРЕЖЕННЯ (Save) ===
  const saveGame = async (reason: string) => {
    // Критична перевірка: не зберігаємо, поки дані не завантажились
    if (!session || !isDataLoaded) {
        if (session) console.warn(`🚫 Save blocked [${reason}]: Data not loaded yet`)
        return
    }

    console.log(`💾 SAVING GAME... Reason: ${reason}`)
    setIsSaving(true)

    const state = useGameStore.getState()
    
    const { error } = await supabase
      .from('profiles')
      .update({
        credits: state.credits,
        fuel: state.fuel,
        hull: state.hull,
        current_sector: state.currentSector,
        cargo: state.cargo,
        visited_sectors: state.visitedSectors,
        updated_at: new Date()
      })
      .eq('id', session.user.id)

    setIsSaving(false)
    
    if (error) {
        console.error('❌ Save failed:', error)
    } else {
        const time = new Date().toLocaleTimeString()
        setLastSavedTime(time)
        console.log('✅ SAVE COMPLETE')
    }
  }

  // === 4. ЛОГІКА СЕКТОРІВ (ВІДКРИТТЯ + ГЕНЕРАЦІЯ) ===
  useEffect(() => {
    if (!session) return 

    const initSector = async () => {
        // --- А: Додаємо в історію відвідувань ---
        const { visitedSectors } = useGameStore.getState()
        if (!visitedSectors.includes(currentSector)) {
            const newVisited = [...visitedSectors, currentSector]
            useGameStore.setState({ visitedSectors: newVisited })
            
            // Оновлюємо історію в базі окремим легким запитом (необов'язково, але надійно)
            await supabase.from('profiles').update({ 
                visited_sectors: newVisited 
            }).eq('id', session.user.id)
        }

        // --- Б: Перевіряємо базу на наявність сектору ---
        let { data: sector } = await supabase
            .from('sectors')
            .select('*')
            .eq('id', currentSector)
            .single()

        // --- В: Якщо сектору немає — генеруємо новий ---
        if (!sector) {
            console.log('🆕 DISCOVERING NEW SECTOR:', currentSector)
            const newSectorData = {
                id: currentSector,
                discovered_by: session.user.id,
                sector_type: 'wild', // Всі нові сектори - дикі
                iron_amount: Math.floor(Math.random() * 500) + 100, 
                gold_amount: Math.floor(Math.random() * 200),
                dark_matter_amount: Math.random() > 0.9 ? Math.floor(Math.random() * 50) : 0
            }
            
            const { error: insertError } = await supabase.from('sectors').insert(newSectorData)
            if (!insertError) sector = newSectorData
        }

        // --- Г: Оновлюємо гру даними про сектор ---
        if (sector) {
            useGameStore.setState({
                currentSectorType: sector.sector_type, // <--- Беремо тип з бази (wild або station)
                sectorResources: {
                    iron: sector.iron_amount,
                    gold: sector.gold_amount,
                    darkMatter: sector.dark_matter_amount
                }
            })
        }
        
        // --- Д: Запускаємо сканер (він малює об'єкти) ---
        useGameStore.getState().scanCurrentSector()
        
        // --- Е: Зберігаємо гру, бо ми змінили сектор ---
        if (currentSector !== '0:0') {
             saveGame('Sector Arrival')
        }
    }

    initSector()
  }, [currentSector, session])


  // === 5. ТРИГЕРИ ЗБЕРЕЖЕННЯ (Auto-Save triggers) ===

  // Тригер: Вхід в Ангар (після смерті або стикування)
  useEffect(() => {
      if (session && status === 'hangar') {
          saveGame('Enter Hangar')
      }
  }, [status])

  // Тригер: Зміна вантажу (Mining) - з затримкою 1 сек (Debounce)
  useEffect(() => {
      if (!session) return
      
      const timer = setTimeout(() => {
          // Перевіряємо, чи є що зберігати (щоб не спамити при старті)
          const totalCargo = Object.values(useGameStore.getState().cargo).reduce((a: number, b: number) => a + b, 0)
          if (totalCargo > 0 || isDataLoaded) {
             saveGame('Cargo Update')
          }
      }, 1000)
      
      return () => clearTimeout(timer)
  }, [useGameStore((state) => state.cargo)])


  // === 6. РЕНДЕР ===
  if (!session) return <AuthScreen />
  if (loadingData) return <div className="h-screen bg-black text-neon-cyan flex items-center justify-center font-mono">LOADING DATA...</div>

  return (
    <div className="h-screen w-full bg-space-950 relative overflow-hidden text-white font-sans selection:bg-neon-cyan selection:text-black">
      
      <EventOverlay />
      <CombatOverlay />
      
      {showStation && (
      <StationMenu 
        onClose={() => {
          setShowStation(false)
          saveGame('Station Exit') // <--- Зберігаємо при виході з магазину
        }} 
        />
      )}

      {status === 'warping' && <WarpScreen />}
      {status === 'map' && <SectorMap />}
      {(status === 'space' || status === 'mining' || status === 'combat') && <SpaceView />}

      {/* ІНДИКАТОР ЗБЕРЕЖЕННЯ (Правий верхній кут) */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
          {isSaving && (
              <div className="text-neon-cyan text-[10px] font-mono animate-pulse flex items-center gap-1 bg-black/50 px-2 py-1 rounded border border-neon-cyan/30">
                  <RotateCcw size={10} className="animate-spin"/> UPLOADING TO GRID...
              </div>
          )}
          {!isSaving && lastSavedTime && (
              <div className="text-gray-500 text-[10px] font-mono">
                  LAST SYNC: {lastSavedTime}
              </div>
          )}
      </div>

      {status === 'hangar' && (
        <>
          <HangarScene />
          <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between pointer-events-none animate-in fade-in duration-1000">
            
            <div className="flex justify-between items-start">
              <div className="glass-panel px-6 py-2 rounded-br-2xl border-l-4 border-l-neon-cyan">
                <h2 className="text-neon-cyan font-mono text-xl font-bold">USS-NEMESIS</h2>
                <p className="text-xs text-gray-400 font-mono">BASE: SECTOR {currentSector}</p>
              </div>
              
              <div className="flex flex-col items-end gap-2 pointer-events-auto mt-8">
                  {/* КНОПКИ */}
                  <div className="flex gap-2 mb-2">
                    <button 
                        onClick={() => saveGame('Manual Force Sync')} 
                        className="flex items-center gap-2 px-3 py-1 bg-green-900/50 border border-green-500 text-green-400 text-xs font-mono hover:bg-green-500 hover:text-black transition-all active:scale-95"
                    >
                        <Save size={12}/> FORCE SYNC
                    </button>
                    <button 
                        onClick={() => supabase.auth.signOut()} 
                        className="flex items-center gap-2 px-3 py-1 bg-red-900/50 border border-red-500 text-red-400 text-xs font-mono hover:bg-red-500 hover:text-black transition-all"
                    >
                        <LogOut size={12}/> LOGOUT
                    </button>
                  </div>

                  <div className="glass-panel px-6 py-2 rounded-bl-2xl border-r-4 border-r-neon-orange text-right">
                    <h2 className="text-neon-orange font-mono text-xl font-bold">{credits.toLocaleString()} CR</h2>
                    <p className="text-xs text-gray-400 font-mono">FUEL: {fuel}%</p>
                  </div>

                  {currentSector === '0:0' && (
                      <button onClick={() => setShowStation(true)} className="flex items-center gap-2 px-5 py-2 bg-black/60 backdrop-blur-md border border-neon-cyan/30 text-neon-cyan font-mono text-sm hover:bg-neon-cyan hover:text-black transition-all rounded-l-xl border-r-4 border-r-neon-cyan group">
                          <ShoppingBag size={16} className="group-hover:animate-bounce"/> STATION SERVICES
                      </button>
                  )}
              </div>
            </div>

             {/* СЛОТИ КОРАБЛЯ */}
            <div className="flex justify-between items-center h-full px-4 mt-10">
                 <div className="flex flex-col gap-4 pointer-events-auto">
                    <Slot icon={<Shield size={24} />} label="SHIELD" level="LVL 1" color="cyan" />
                    <Slot icon={<Zap size={24} />} label="ENGINE" level="LVL 1" color="cyan" />
                </div>
                <div className="flex flex-col gap-4 pointer-events-auto">
                    <Slot icon={<Crosshair size={24} />} label="LASER" level="MK-I" color="orange" />
                    <Slot icon={<Hexagon size={24} />} label="CARGO" level="EMPTY" color="orange" />
                </div>
            </div>

            <div className="flex justify-center pb-8 pointer-events-auto">
              <button 
                onClick={() => useGameStore.setState({ status: 'map' })}
                className="bg-neon-orange/20 backdrop-blur-md border border-neon-orange text-neon-orange px-12 py-3 font-mono font-bold text-xl rounded clip-path-polygon hover:bg-neon-orange hover:text-black transition-all shadow-[0_0_20px_rgba(255,174,0,0.3)]"
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

// Допоміжний компонент слота
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