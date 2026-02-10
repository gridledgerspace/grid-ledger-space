import { useState, useEffect, useRef } from 'react'
import { useGameStore, LASER_STATS, type LootItem } from '../store'
import { X, Pickaxe, Zap, Activity, Box } from 'lucide-react'

// --- КОМПОНЕНТ ОДНОГО ЛАЗЕРНОГО СЛОТА ---
function LaserSlot({ item, onMine }: { item: LootItem, onMine: (amount: number) => void }) {
    const [progress, setProgress] = useState(0)
    const [isActive, setIsActive] = useState(false)
    
    // Зберігаємо час останнього старту циклу
    const startTimeRef = useRef<number>(0)
    const stats = LASER_STATS[item.id] || LASER_STATS['default']

    const toggleActive = () => {
        if (!isActive) {
            startTimeRef.current = Date.now()
            setIsActive(true)
        } else {
            setIsActive(false)
            setProgress(0)
        }
    }

    // 🔥 ФУНКЦІЯ ОБРОБКИ ЦИКЛУ (винесена окремо)
    const processMiningCycle = () => {
        if (!isActive) return

        const now = Date.now()
        const elapsed = now - startTimeRef.current

        // Якщо пройшов час повного циклу (або кількох)
        if (elapsed >= stats.cooldown) {
            // Рахуємо, скільки повних циклів пройшло (на випадок, якщо вкладка спала довго)
            const cyclesCompleted = Math.floor(elapsed / stats.cooldown)
            
            // Видобуваємо руду за ВСІ пропущені цикли
            onMine(stats.yield * cyclesCompleted)

            // Пересуваємо час старту вперед на кількість пройдених циклів
            // Це зберігає ритм і не "обнуляє" зайвий час
            startTimeRef.current += (cyclesCompleted * stats.cooldown)
            
            // Скидаємо візуальний прогрес (або ставимо залишок, якщо хочете супер точність)
            setProgress(0)
        } else {
            // Просто оновлюємо візуальну смужку
            const percentage = (elapsed / stats.cooldown) * 100
            setProgress(Math.min(percentage, 100))
        }
    }

    // 1. Таймер (працює коли вкладка активна)
    useEffect(() => {
        let interval: any
        if (isActive) {
            interval = setInterval(processMiningCycle, 100)
        }
        return () => clearInterval(interval)
    }, [isActive])

    // 2. Слухач видимості сторінки (спрацьовує, коли ви повертаєтесь на вкладку)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                // Миттєво перераховуємо прогрес при поверненні
                processMiningCycle()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [isActive])

    return (
        <div className="flex flex-col items-center gap-2">
            <button 
                onClick={toggleActive}
                className={`w-14 h-14 md:w-16 md:h-16 border rounded flex flex-col items-center justify-center transition-all relative overflow-hidden group
                    ${isActive ? 'border-neon-cyan bg-neon-cyan/10' : 'border-white/20 bg-black/40 hover:border-white/50'}
                `}
            >
                <div className="z-10 flex flex-col items-center pointer-events-none">
                    <Zap size={20} className={isActive ? 'text-neon-cyan animate-pulse' : 'text-gray-500 group-hover:text-white'} />
                    <span className={`text-[8px] md:text-[9px] font-mono mt-1 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
                        {isActive ? 'ON' : 'OFF'}
                    </span>
                </div>
                
                {/* Фон прогрес-бару */}
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-neon-cyan/30 transition-all duration-100 linear pointer-events-none"
                    style={{ height: `${progress}%` }}
                />
            </button>
            
            {/* Статистика лазера */}
            <div className="text-center">
                <div className="text-[8px] md:text-[9px] font-mono text-gray-400 uppercase truncate w-16 md:w-20">
                    {item.name.replace('Mining Laser ', '')}
                </div>
                <div className="text-[8px] text-neon-cyan font-mono">
                    {stats.yield}T / {(stats.cooldown/1000).toFixed(1)}s
                </div>
            </div>
        </div>
    )
}

// --- ГОЛОВНИЙ КОМПОНЕНТ ---
export default function EventOverlay() {
  const { status, currentEventId, localObjects, closeEvent, extractResource, cargo, maxCargo, equipped } = useGameStore((state: any) => state)

  if (status !== 'mining' || !currentEventId) return null

  const target = localObjects.find((o: any) => o.id === currentEventId)
  if (!target) return null

  const currentLoad = Object.values(cargo || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
  
  // Знаходимо всі встановлені лазери
  const miningLasers = Object.values(equipped).filter((item: any) => item && (item.name.toLowerCase().includes('mining') || item.id.includes('mining'))) as LootItem[]

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none p-4">
      <div className="w-full max-w-[500px] bg-black/90 backdrop-blur-xl border border-orange-500/50 rounded-xl p-4 md:p-6 pointer-events-auto relative shadow-[0_0_50px_rgba(255,165,0,0.15)] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4 md:mb-6">
            <div>
                <h2 className="text-lg md:text-xl font-bold font-mono text-orange-500 flex items-center gap-2">
                    <Pickaxe className="animate-pulse" /> MINING PROTOCOL
                </h2>
                <div className="text-[10px] text-gray-500 font-mono tracking-widest mt-1 uppercase">
                    TARGET LOCKED: {target.id}
                </div>
            </div>
            <button onClick={closeEvent} className="text-gray-500 hover:text-white transition-colors"><X /></button>
        </div>

        {/* Target Info */}
        <div className="space-y-3 mb-4 md:mb-6 bg-white/5 p-3 md:p-4 rounded border border-white/10">
            <div className="flex justify-between text-xs md:text-sm font-mono border-b border-white/10 pb-2">
                <span className="text-gray-400">TARGET ORE:</span>
                <span className="text-white font-bold uppercase">{target.data?.resource}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm font-mono border-b border-white/10 pb-2">
                <span className="text-gray-400">DEPOSIT SIZE:</span>
                <span className="text-neon-cyan font-bold">{target.data?.amount} T</span>
            </div>
            
            {/* Cargo Bar */}
            <div className="pt-2">
                <div className="flex justify-between text-[10px] md:text-xs font-mono mb-1">
                    <span className="text-gray-400 flex items-center gap-2"><Box size={12}/> CARGO BAY:</span>
                    <span className={currentLoad >= maxCargo ? 'text-red-500' : 'text-white'}>
                        {currentLoad} / {maxCargo} T
                    </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ${currentLoad >= maxCargo ? 'bg-red-500' : 'bg-orange-500'}`} 
                        style={{ width: `${Math.min((currentLoad/maxCargo)*100, 100)}%` }} 
                    />
                </div>
            </div>
        </div>

        {/* Active Lasers */}
        <div>
            <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-3 flex items-center gap-2">
                <Activity size={14} className="text-orange-500"/> Active Lasers Control
            </div>
            
            {miningLasers.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-red-500/30 bg-red-500/5 text-red-500 text-xs font-mono rounded">
                    ⚠ NO MINING LASERS DETECTED
                </div>
            ) : (
                <div className="flex justify-center flex-wrap gap-3 md:gap-4">
                    {miningLasers.map((laser, idx) => (
                        <LaserSlot 
                            key={`${laser.id}-${idx}`} 
                            item={laser} 
                            onMine={extractResource} 
                        />
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  )
}