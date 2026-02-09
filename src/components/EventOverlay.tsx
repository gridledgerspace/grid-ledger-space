import { useState, useEffect } from 'react'
import { useGameStore, LASER_STATS, type LootItem } from '../store'
// 🔥 ВИПРАВЛЕНО: Додано "Box" до імпортів
import { X, Pickaxe, Zap, Activity, Box } from 'lucide-react'

// Компонент одного лазерного слота
function LaserSlot({ item, onMine }: { item: LootItem, onMine: (amount: number) => void }) {
    const [progress, setProgress] = useState(0)
    const [isActive, setIsActive] = useState(false)

    // Отримуємо характеристики або дефолт
    const stats = LASER_STATS[item.id] || LASER_STATS['default']

    useEffect(() => {
        let interval: any
        if (isActive) {
            const stepTime = 50 // оновлення кожні 50мс
            const stepValue = (stepTime / stats.cooldown) * 100

            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        // Цикл завершено
                        onMine(stats.yield)
                        return 0 // скидаємо на 0 і продовжуємо, якщо хочемо авто-майнінг
                    }
                    return prev + stepValue
                })
            }, stepTime)
        }
        return () => clearInterval(interval)
    }, [isActive, stats, onMine])

    return (
        <div className="flex flex-col items-center gap-2">
            <button 
                onClick={() => setIsActive(!isActive)}
                className={`w-16 h-16 border rounded flex flex-col items-center justify-center transition-all relative overflow-hidden
                    ${isActive ? 'border-neon-cyan bg-neon-cyan/10' : 'border-white/20 bg-black/40 hover:border-white/50'}
                `}
            >
                <div className="z-10 flex flex-col items-center">
                    <Zap size={20} className={isActive ? 'text-neon-cyan animate-pulse' : 'text-gray-500'} />
                    <span className="text-[9px] font-mono mt-1 text-white">{isActive ? 'ACTIVE' : 'READY'}</span>
                </div>
                
                {/* Progress Fill */}
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-neon-cyan/20 transition-all duration-100 ease-linear"
                    style={{ height: `${progress}%` }}
                />
            </button>
            <div className="text-[10px] font-mono text-gray-400">{item.name.replace('Mining Laser ', '')}</div>
            <div className="text-[9px] text-neon-cyan">{stats.yield}T / {(stats.cooldown/1000).toFixed(1)}s</div>
        </div>
    )
}

export default function EventOverlay() {
  const { status, currentEventId, localObjects, closeEvent, extractResource, cargo, maxCargo, equipped } = useGameStore((state: any) => state)

  if (status !== 'mining' || !currentEventId) return null

  const target = localObjects.find((o: any) => o.id === currentEventId)
  if (!target) return null

  const currentLoad = Object.values(cargo || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
  
  // Знаходимо всі встановлені лазери
  const miningLasers = Object.values(equipped).filter((item: any) => item && (item.name.toLowerCase().includes('mining') || item.id.includes('mining'))) as LootItem[]

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="w-[500px] bg-black/80 backdrop-blur-md border border-orange-500/50 rounded-xl p-6 pointer-events-auto relative shadow-[0_0_50px_rgba(255,165,0,0.2)] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-xl font-bold font-mono text-orange-500 flex items-center gap-2">
                    <Pickaxe className="animate-pulse" /> MINING PROTOCOL
                </h2>
                <div className="text-[10px] text-gray-500 font-mono tracking-widest mt-1">
                    TARGET LOCKED: {target.id}
                </div>
            </div>
            <button onClick={closeEvent} className="text-gray-500 hover:text-white"><X /></button>
        </div>

        {/* Target Info */}
        <div className="space-y-2 mb-6 bg-black/40 p-4 rounded border border-white/5">
            <div className="flex justify-between text-sm font-mono border-b border-white/10 pb-2">
                <span className="text-gray-400">TARGET ORE:</span>
                <span className="text-white font-bold">{target.data?.resource}</span>
            </div>
            <div className="flex justify-between text-sm font-mono border-b border-white/10 pb-2">
                <span className="text-gray-400">DEPOSIT SIZE:</span>
                <span className="text-neon-cyan font-bold">{target.data?.amount} T</span>
            </div>
            <div className="pt-2">
                <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-gray-400 flex items-center gap-2"><Box size={12}/> CARGO BAY:</span>
                    <span className={currentLoad >= maxCargo ? 'text-red-500' : 'text-white'}>{currentLoad} / {maxCargo} T</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${(currentLoad/maxCargo)*100}%` }} />
                </div>
            </div>
        </div>

        {/* Lasers Grid */}
        <div className="mb-4">
            <div className="text-xs text-gray-500 font-bold uppercase mb-3 flex items-center gap-2">
                <Activity size={14}/> Active Lasers
            </div>
            
            {miningLasers.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-red-500/30 bg-red-500/10 text-red-500 text-xs font-mono rounded">
                    ⚠ NO MINING LASERS EQUIPPED
                </div>
            ) : (
                <div className="flex justify-center gap-4">
                    {miningLasers.map((laser, idx) => (
                        <LaserSlot key={`${laser.id}-${idx}`} item={laser} onMine={extractResource} />
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  )
}