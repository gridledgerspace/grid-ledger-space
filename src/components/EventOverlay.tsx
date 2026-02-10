import { useState, useEffect, useRef } from 'react'
import { useGameStore, LASER_STATS, type LootItem } from '../store'
import { X, Pickaxe, Zap, Activity, Box } from 'lucide-react'

// --- КОМПОНЕНТ ОДНОГО ЛАЗЕРНОГО СЛОТА ---
function LaserSlot({ item, onMine }: { item: LootItem, onMine: (amount: number) => void }) {
    const [progress, setProgress] = useState(0)
    const [isActive, setIsActive] = useState(false)
    
    // Використовуємо useRef для збереження часу старту.
    // useRef не викликає перерендер і зберігає значення між ними.
    const startTimeRef = useRef<number>(0)

    // Отримуємо характеристики лазера або дефолтні
    const stats = LASER_STATS[item.id] || LASER_STATS['default']

    const toggleActive = () => {
        if (!isActive) {
            // Старт: Зберігаємо поточну мітку часу
            startTimeRef.current = Date.now()
            setIsActive(true)
        } else {
            // Стоп
            setIsActive(false)
            setProgress(0)
        }
    }

    useEffect(() => {
        let interval: any

        if (isActive) {
            // Перевіряємо стан кожні 100мс (достатньо для плавності)
            // Навіть якщо браузер сповільнить це до 1000мс, математика (elapsed) залишиться точною.
            interval = setInterval(() => {
                const now = Date.now()
                const elapsed = now - startTimeRef.current // Скільки часу пройшло (мс)

                if (elapsed >= stats.cooldown) {
                    // 1. Цикл завершено
                    onMine(stats.yield)
                    
                    // 2. Скидаємо таймер для наступного циклу
                    // Оновлюємо час старту на поточний момент
                    startTimeRef.current = Date.now() 
                    setProgress(0)
                } else {
                    // 3. Оновлюємо візуальний прогрес
                    // Рахуємо відсоток на основі часу, а не кадрів
                    const visualProgress = (elapsed / stats.cooldown) * 100
                    setProgress(visualProgress)
                }
            }, 100)
        }

        return () => clearInterval(interval)
    }, [isActive, stats, onMine])

    return (
        <div className="flex flex-col items-center gap-2">
            <button 
                onClick={toggleActive}
                className={`w-16 h-16 border rounded flex flex-col items-center justify-center transition-all relative overflow-hidden group
                    ${isActive ? 'border-neon-cyan bg-neon-cyan/10' : 'border-white/20 bg-black/40 hover:border-white/50'}
                `}
            >
                <div className="z-10 flex flex-col items-center pointer-events-none">
                    <Zap size={20} className={isActive ? 'text-neon-cyan animate-pulse' : 'text-gray-500 group-hover:text-white'} />
                    <span className={`text-[9px] font-mono mt-1 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
                        {isActive ? 'ACTIVE' : 'READY'}
                    </span>
                </div>
                
                {/* Фон прогрес-бару */}
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-neon-cyan/30 transition-all duration-100 linear pointer-events-none"
                    style={{ height: `${progress}%` }}
                />
            </button>
            
            {/* Назва та характеристики */}
            <div className="text-center">
                <div className="text-[9px] font-mono text-gray-400 uppercase truncate w-20">
                    {item.name.replace('Mining Laser ', '')}
                </div>
                <div className="text-[8px] text-neon-cyan font-mono">
                    {stats.yield}T / {(stats.cooldown/1000).toFixed(1)}s
                </div>
            </div>
        </div>
    )
}

// --- ГОЛОВНИЙ КОМПОНЕНТ ВІКНА ---
export default function EventOverlay() {
  const { status, currentEventId, localObjects, closeEvent, extractResource, cargo, maxCargo, equipped } = useGameStore((state: any) => state)

  if (status !== 'mining' || !currentEventId) return null

  const target = localObjects.find((o: any) => o.id === currentEventId)
  if (!target) return null

  // Виправляємо типи для reduce, щоб уникнути помилок TS
  const currentLoad = Object.values(cargo || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
  
  // Знаходимо всі встановлені лазери
  const miningLasers = Object.values(equipped).filter((item: any) => item && (item.name.toLowerCase().includes('mining') || item.id.includes('mining'))) as LootItem[]

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none p-4">
      <div className="w-full max-w-[500px] bg-black/90 backdrop-blur-xl border border-orange-500/50 rounded-xl p-4 md:p-6 pointer-events-auto relative shadow-[0_0_50px_rgba(255,165,0,0.15)] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
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

        {/* Target Info Panel */}
        <div className="space-y-3 mb-6 bg-white/5 p-4 rounded border border-white/10">
            <div className="flex justify-between text-xs md:text-sm font-mono border-b border-white/10 pb-2">
                <span className="text-gray-400">TARGET ORE:</span>
                <span className="text-white font-bold uppercase">{target.data?.resource}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm font-mono border-b border-white/10 pb-2">
                <span className="text-gray-400">DEPOSIT SIZE:</span>
                <span className="text-neon-cyan font-bold">{target.data?.amount} T</span>
            </div>
            
            {/* Cargo Capacity Bar */}
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

        {/* Active Lasers Control Panel */}
        <div>
            <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mb-3 flex items-center gap-2">
                <Activity size={14} className="text-orange-500"/> Active Lasers Control
            </div>
            
            {miningLasers.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-red-500/30 bg-red-500/5 text-red-500 text-xs font-mono rounded">
                    ⚠ NO MINING LASERS DETECTED
                </div>
            ) : (
                <div className="flex justify-center flex-wrap gap-4">
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