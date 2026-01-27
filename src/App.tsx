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
  const { status, credits, fuel, currentSector, hull } = useGameStore()
  const [showStation, setShowStation] = useState(false)
  const [session, setSession] = useState<any>(null)
  
  // === СТАНИ ===
  const [isDataLoaded, setIsDataLoaded] = useState(false) // Чи завантажили ми дані вперше?
  const [loadingData, setLoadingData] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string>('')

  // 🛡️ ЗАХИСТ: Пам'ятаємо останній ініціалізований сектор, щоб не робити це двічі
  const lastInitializedSector = useRef<string | null>(null) 

  // === 1. АВТОРИЗАЦІЯ ===
  useEffect(() => {
    // Первинна перевірка при запуску
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadUserData(session.user.id)
    })

    // Слухач подій (вхід, вихід, перемикання вкладок)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      
      // 👇 КРИТИЧНЕ ВИПРАВЛЕННЯ 👇
      // Якщо дані ВЖЕ завантажені (ми граємо), то НЕ завантажуємо їх знову при зміні вкладки.
      // Це запобігає відкату на старий сектор.
      if (session && !useGameStore.getState().currentSector) { 
         // (Тут перевірка трохи хитра: ми вантажимо тільки якщо локальний сектор ще не встановлений або ми явно хочемо ресет)
         // Найкращий варіант: просто покладаємось на isDataLoaded знизу в loadUserData
         if (!isDataLoaded) loadUserData(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // Порожній масив = запускається 1 раз

  // === 2. ЗАВАНТАЖЕННЯ ПРОФІЛЮ ===
  const loadUserData = async (userId: string) => {
    // 👇 ЗАХИСТ: Якщо ми вже в грі - не перезаписуємо дані старими з бази!
    if (isDataLoaded) return 

    setLoadingData(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

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
      setIsDataLoaded(true) // ✅ Фіксуємо, що дані є. Більше не вантажимо.
      console.log('✅ PROFILE LOADED')
    }
    setLoadingData(false)
  }

  // === 3. ЗБЕРЕЖЕННЯ (Global Save) ===
  const saveGame = async (reason: string) => {
    if (!session || !isDataLoaded) return

    console.log(`💾 SAVING: ${reason}`)
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
    if (!error) setLastSavedTime(new Date().toLocaleTimeString())
  }

  // === 4. ЛОГІКА ВХОДУ В СЕКТОР (Warp Logic) ===
  useEffect(() => {
    if (!session || !isDataLoaded) return 

    // 👇 Блокуємо повторний запуск коду, якщо ми вже тут
    if (lastInitializedSector.current === currentSector) return
    lastInitializedSector.current = currentSector

    const initSector = async () => {
        console.log('🌌 WARP ARRIVAL:', currentSector)

        // 👇 1. МИТТЄВИЙ ЗАПИС КООРДИНАТ В БАЗУ
        // Ми не чекаємо saveGame, ми пишемо це прямо зараз, щоб база знала, де ми.
        if (currentSector !== '0:0') {
            await supabase.from('profiles').update({ 
                current_sector: currentSector,
                updated_at: new Date()
            }).eq('id', session.user.id)
        }

        // 2. Історія відвідувань
        const { visitedSectors } = useGameStore.getState()
        if (!visitedSectors.includes(currentSector)) {
            const newVisited = [...visitedSectors, currentSector]
            useGameStore.setState({ visitedSectors: newVisited })
            // Фонове оновлення історії
            supabase.from('profiles').update({ visited_sectors: newVisited }).eq('id', session.user.id).then()
        }

        // 3. Отримуємо дані про сектор (ресурси)
        let { data: sector } = await supabase
            .from('sectors')
            .select('*')
            .eq('id', currentSector)
            .single()

        // 4. Генерація нового (якщо ніхто тут не був)
        if (!sector) {
            const newSectorData = {
                id: currentSector,
                discovered_by: session.user.id,
                sector_type: 'wild', 
                iron_amount: Math.floor(Math.random() * 500) + 100, 
                gold_amount: Math.floor(Math.random() * 200),
                dark_matter_amount: Math.random() > 0.9 ? Math.floor(Math.random() * 50) : 0
            }
            const { error } = await supabase.from('sectors').insert(newSectorData)
            if (!error) sector = newSectorData
        }

        // 5. Оновлюємо гру
        if (sector) {
            useGameStore.setState({
                currentSectorType: sector.sector_type, 
                sectorResources: {
                    iron: sector.iron_amount,
                    gold: sector.gold_amount,
                    darkMatter: sector.dark_matter_amount
                }
            })
        }
        
        // 6. Скануємо (малюємо об'єкти)
        useGameStore.getState().scanCurrentSector()
        
        // 7. Повноцінне збереження (про всяк випадок)
        if (currentSector !== '0:0') {
             saveGame('Warp Complete')
        }
    }

    initSector()
  }, [currentSector, session, isDataLoaded])


  // === 5. ТРИГЕРИ (Події для збереження) ===
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


  // === 6. РЕНДЕР ===
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
      {(status === 'space' || status === 'mining' || status === 'combat') && <SpaceView />}

      {/* Індикатор збереження */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
          {isSaving && <div className="text-neon-cyan text-[10px] font-mono animate-pulse flex items-center gap-1 bg-black/50 px-2 py-1 rounded border border-neon-cyan/30"><RotateCcw size={10} className="animate-spin"/> SYNCING...</div>}
          {!isSaving && lastSavedTime && <div className="text-gray-500 text-[10px] font-mono">LAST SYNC: {lastSavedTime}</div>}
      </div>

      {status === 'hangar' && (
        <>
          <HangarScene />
          <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between pointer-events-none animate-in fade-in duration-1000">
            <div className="flex justify-between items-start">
              <div className="glass-panel px-6 py-2 rounded-br-2xl border-l-4 border-l-neon-cyan">
                <h2 className="text-neon-cyan font-mono text-xl font-bold">USS-NEMESIS</h2>
                <p className="text-xs text-gray-400 font-mono">SECTOR {currentSector}</p>
              </div>
              <div className="flex flex-col items-end gap-2 pointer-events-auto mt-8">
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => saveGame('Manual')} className="flex items-center gap-2 px-3 py-1 bg-green-900/50 border border-green-500 text-green-400 text-xs font-mono hover:bg-green-500 hover:text-black transition-all active:scale-95"><Save size={12}/> SAVE</button>
                    <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-3 py-1 bg-red-900/50 border border-red-500 text-red-400 text-xs font-mono hover:bg-red-500 hover:text-black transition-all"><LogOut size={12}/> LOGOUT</button>
                  </div>
                  <div className="glass-panel px-6 py-2 rounded-bl-2xl border-r-4 border-r-neon-orange text-right">
                    <h2 className="text-neon-orange font-mono text-xl font-bold">{credits.toLocaleString()} CR</h2>
                    <p className="text-xs text-gray-400 font-mono">FUEL: {fuel}%</p>
                  </div>
                  {currentSector === '0:0' && (
                      <button onClick={() => setShowStation(true)} className="flex items-center gap-2 px-5 py-2 bg-black/60 backdrop-blur-md border border-neon-cyan/30 text-neon-cyan font-mono text-sm hover:bg-neon-cyan hover:text-black transition-all rounded-l-xl border-r-4 border-r-neon-cyan group"><ShoppingBag size={16} className="group-hover:animate-bounce"/> STATION</button>
                  )}
              </div>
            </div>
            
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
              <button onClick={() => useGameStore.setState({ status: 'map' })} className="bg-neon-orange/20 backdrop-blur-md border border-neon-orange text-neon-orange px-12 py-3 font-mono font-bold text-xl rounded clip-path-polygon hover:bg-neon-orange hover:text-black transition-all shadow-[0_0_20px_rgba(255,174,0,0.3)]">OPEN NAVIGATION</button>
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