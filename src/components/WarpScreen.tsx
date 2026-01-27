import { useEffect, useState } from 'react'
import { useGameStore } from '../store'

export default function WarpScreen() {
  const { completeWarp, targetSector } = useGameStore()
  const [progress, setProgress] = useState(0)

  // Симуляція польоту (3 секунди для тесту, в релізі можна 10)
  useEffect(() => {
    const duration = 3000 // 3000 мс = 3 секунди
    const interval = 50 // оновлення кожні 50 мс
    const steps = duration / interval
    
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      setProgress((currentStep / steps) * 100)
      
      if (currentStep >= steps) {
        clearInterval(timer)
        completeWarp() // Завершуємо політ
      }
    }, interval)

    return () => clearInterval(timer)
  }, [completeWarp])

  return (
    <div className="h-screen w-full bg-space-950 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Ефект гіперпростору (швидкі лінії) */}
      <div className="absolute inset-0 z-0 opacity-50">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i}
            className="absolute bg-neon-cyan w-1 h-40 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${0.5 + Math.random()}s`,
              transform: `rotate(${45}deg) scale(${Math.random()})`
            }}
          />
        ))}
      </div>

      <div className="z-10 text-center space-y-8">
        <h1 className="text-6xl font-mono font-bold text-white tracking-widest animate-pulse drop-shadow-[0_0_30px_rgba(0,240,255,0.8)]">
          WARPING
        </h1>
        
        <div className="text-neon-cyan font-mono text-xl">
          DESTINATION: SECTOR {targetSector}
        </div>

        {/* Прогрес бар */}
        <div className="w-64 h-2 bg-space-900 rounded-full overflow-hidden border border-neon-cyan/30">
          <div 
            className="h-full bg-neon-cyan transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(0,240,255,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="font-mono text-xs text-neon-blue animate-pulse">
          CALCULATING VECTOR... {Math.round(progress)}%
        </div>
      </div>
    </div>
  )
}