import { useGameStore } from '../store'
import { Pickaxe, XCircle, AlertTriangle, Box } from 'lucide-react'

export default function EventOverlay() {
  const { 
    status, 
    currentEventId, 
    localObjects, 
    cargo, 
    maxCargo,
    modules,
    extractResource, 
    closeEvent 
  } = useGameStore((state: any) => state)

  // Показуємо тільки якщо статус 'mining' або 'combat'
  if (status !== 'mining') return null

  // Шукаємо об'єкт, з яким взаємодіємо
  const target = localObjects.find((obj: any) => obj.id === currentEventId)
  
  // Якщо об'єкт зник (видобули все) або не знайдений - закриваємо
  if (!target && status === 'mining') {
      // Використовуємо setTimeout, щоб уникнути конфлікту рендеру
      setTimeout(() => closeEvent(), 0)
      return null
  }

  const currentLoad = Object.values(cargo as Record<string, number>).reduce((a, b) => a + b, 0)
  const isFull = currentLoad >= maxCargo
  const hasLaser = modules.includes('mining_laser')

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
      <div className="glass-panel p-8 max-w-md w-full border border-neon-orange/50 relative shadow-[0_0_50px_rgba(255,174,0,0.1)]">
        
        {/* Кнопка закриття (Х) */}
        <button 
            onClick={closeEvent}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
            <XCircle />
        </button>

        {/* Заголовок */}
        <h2 className="text-2xl font-mono text-neon-orange font-bold mb-2 flex items-center gap-3">
            <Pickaxe className="animate-pulse" /> MINING PROTOCOL
        </h2>
        
        {/* Інформаційна панель */}
        <div className="my-6 p-4 bg-space-900/80 rounded border border-white/10 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-gray-400 font-mono text-sm">TARGET ORE:</span>
                <span className="text-white font-bold font-mono text-lg">{target?.resourceType || 'UNKNOWN'}</span>
            </div>
            
            <div className="flex justify-between items-center">
                <span className="text-gray-400 font-mono text-sm">DEPOSIT SIZE:</span>
                <span className="text-neon-cyan font-bold font-mono text-lg">{target?.resourceAmount} T</span>
            </div>
            
            <div className="w-full h-px bg-white/10 my-2" />
            
            <div className="flex justify-between items-center">
                <span className="text-gray-400 font-mono text-sm flex items-center gap-2">
                    <Box size={14}/> CARGO BAY:
                </span>
                <span className={`${isFull ? 'text-neon-red' : 'text-white'} font-mono`}>
                    {currentLoad} / {maxCargo} T
                </span>
            </div>
            
            {/* Прогрес бар трюму */}
            <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/10">
                <div 
                    className={`h-full ${isFull ? 'bg-neon-red' : 'bg-neon-cyan'} transition-all duration-500`} 
                    style={{ width: `${(currentLoad / maxCargo) * 100}%` }}
                />
            </div>
        </div>

        {/* Головна кнопка дії */}
        {hasLaser ? (
            <button
                onClick={extractResource}
                disabled={isFull || (target?.resourceAmount || 0) <= 0}
                className="w-full py-4 bg-neon-orange text-black font-bold font-mono text-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,174,0,0.3)] flex items-center justify-center gap-2"
            >
                {isFull ? 'CARGO FULL' : 'ACTIVATE LASER'}
            </button>
        ) : (
            <div className="w-full py-4 border border-neon-red text-neon-red text-center font-mono flex items-center justify-center gap-2 bg-neon-red/10">
                <AlertTriangle size={20} /> MODULE MISSING
            </div>
        )}

      </div>
    </div>
  )
}