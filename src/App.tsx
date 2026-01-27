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
  const { status, credits, fuel, currentSector } = useGameStore() // Додав hull для спостереження
  const [showStation, setShowStation] = useState(false)
  
  const [session, setSession] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(false)
  
  // Стан для відображення процесу збереження
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string>('')

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

  // === АВТОЗБЕРЕЖЕННЯ  ===
  // 1. Зберігаємось при зміні СЕКТОРУ (Це і є успішний Варп)
  useEffect(() => {
    if (!session || currentSector === '0:0') return

    const initSector = async () => {
        // 1. Оновлюємо "Відвідані сектори" в профілі гравця
        const { visitedSectors } = useGameStore.getState()
        if (!visitedSectors.includes(currentSector)) {
            const newVisited = [...visitedSectors, currentSector]
            useGameStore.setState({ visitedSectors: newVisited })
            
            // Зберігаємо в базу (оновлюємо масив visited_sectors)
            await supabase.from('profiles').update({ 
                visited_sectors: newVisited 
            }).eq('id', session.user.id)
        }

        // 2. Перевіряємо, чи існує сектор у Глобальній Мапі
        let { data: sector} = await supabase
            .from('sectors')
            .select('*')
            .eq('id', currentSector)
            .single()

        // 3. Якщо сектору немає — ми ПЕРШОВІДКРИВАЧІ! Генеруємо його.
        if (!sector) {
            console.log('🆕 DISCOVERING NEW SECTOR:', currentSector)
            const newSectorData = {
                id: currentSector,
                discovered_by: session.user.id,
                // Рандомна кількість ресурсів на весь сектор
                iron_amount: Math.floor(Math.random() * 500) + 100, 
                gold_amount: Math.floor(Math.random() * 200),
                dark_matter_amount: Math.random() > 0.9 ? Math.floor(Math.random() * 50) : 0
            }
            
            const { error: insertError } = await supabase
                .from('sectors')
                .insert(newSectorData)
            
            if (!insertError) sector = newSectorData
        } else {
            console.log('📡 SECTOR DATA LOADED:', sector)
        }

        // 4. Оновлюємо локальний стан (щоб UI знав, скільки тут ресурсів)
        if (sector) {
            useGameStore.setState({
                sectorResources: {
                    iron: sector.iron_amount,
                    gold: sector.gold_amount,
                    darkMatter: sector.dark_matter_amount
                }
            })
        }
    }

    initSector()
  }, [currentSector, session])

  // 2. Зберігаємось при вході в АНГАР (Це покриває і Смерть, і Стикування)
  useEffect(() => {
      if (session && status === 'hangar') {
          saveGame(true)
      }
  }, [status]) // Спрацьовує, коли змінюється екран на ангар

  // === ЗБЕРЕЖЕННЯ ПРИ ВХОДІ В АНГАР ===
  useEffect(() => {
      if (status === 'hangar' && session) {
          saveGame(true)
      }
  }, [status]) // Спрацьовує, коли змінюється статус гри

  useEffect(() => {
      if (!session) return

      // Запускаємо таймер
      const saveTimer = setTimeout(() => {
          saveGame(true) // Тихе збереження
      }, 2000) // 2000 мс = 2 секунди затримки

      // Якщо за ці 2 секунди щось знову змінилося — скасовуємо попередній таймер і запускаємо новий
      return () => clearTimeout(saveTimer)
      
  }, [credits, fuel, session]) // <--- Слідкуємо за грошима та паливом

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
      })
    }
    setLoadingData(false)
  }

  // === ОНОВЛЕНА ФУНКЦІЯ SAVE ===
  const saveGame = async (silent = false) => {
    if (!session) return
    setIsSaving(true)

    // Отримуємо АКТУАЛЬНИЙ стан (включно з тим, що тільки що накопали)
    const state = useGameStore.getState() // <--- Найважливіший момент: беремо найсвіжіші дані
    
    const { error } = await supabase
      .from('profiles')
      .update({
        credits: state.credits,
        fuel: state.fuel,
        hull: state.hull,
        current_sector: state.currentSector,
        cargo: state.cargo, // <--- ДОДАЛИ ЦЕЙ РЯДОК (збереження інвентарю)
        visited_sectors: state.visitedSectors, // <--- І це теж корисно оновити
        updated_at: new Date()
      })
      .eq('id', session.user.id)

    setIsSaving(false) // Вимикаємо індикатор

    if (error) {
        console.error('Save error', error)
        if (!silent) alert('Error saving!')
    } else {
        const time = new Date().toLocaleTimeString()
        setLastSavedTime(time)
        if (!silent) {
            // alert('Game Saved!') // Прибираємо алерт, бо він бісить
        }
    }
  }

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
            saveGame(true)
          }} 
        />
      )}
      {status === 'warping' && <WarpScreen />}
      {status === 'map' && <SectorMap />}
      {(status === 'space' || status === 'mining' || status === 'combat') && <SpaceView />}

      {/* === 🆕 ІНДИКАТОР ЗБЕРЕЖЕННЯ (Завжди видно зверху справа) === */}
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
                    {/* Кнопка ручного збереження тепер просто для заспокоєння гравця */}
                    <button 
                        onClick={() => saveGame(false)} 
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

             {/* СЛОТИ (Без змін) */}
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