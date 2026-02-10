import { useEffect, useRef } from 'react'
import { useGameStore } from '../store'
import { Shield, Zap, Skull, Wind, Crosshair } from 'lucide-react'

export default function CombatOverlay() {
  const { 
      status, inCombat, enemyHp, enemyMaxHp, hull, maxHull, 
      playerAttack, tryFlee, combatLog, localObjects, currentEventId 
  } = useGameStore((state: any) => state)

  const logEndRef = useRef<HTMLDivElement>(null)

  // Авто-скрол логу бою
  useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [combatLog])

  if (!inCombat || status !== 'combat') return null

  // Знаходимо ворога для відображення імені (якщо є)
  const enemy = localObjects.find((o: any) => o.id === currentEventId)
  const enemyName = enemy?.enemyLevel ? `MK-${enemy.enemyLevel} HOSTILE` : 'HOSTILE VESSEL'

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between">
      
      {/* --- TOP: ENEMY STATUS --- */}
      {/* 🔥 FIX: mt-14 опускає панель ворога нижче хедера на мобільних */}
      <div className="w-full flex justify-center pt-4 md:pt-8 pointer-events-auto mt-14 md:mt-0">
        <div className="w-[90%] md:w-[600px] bg-black/80 backdrop-blur-md border border-neon-red/50 p-3 md:p-4 rounded-xl shadow-[0_0_30px_rgba(255,0,60,0.2)]">
            <div className="flex justify-between items-center mb-2 text-neon-red font-mono font-bold">
                <span className="flex items-center gap-2 text-sm md:text-base">
                    <Skull size={18} className="animate-pulse"/> {enemyName}
                </span>
                <span className="text-xs md:text-sm">{enemyHp} / {enemyMaxHp}</span>
            </div>
            {/* HP Bar */}
            <div className="h-2 md:h-3 bg-gray-900 rounded-full overflow-hidden border border-neon-red/30">
                <div 
                    className="h-full bg-neon-red transition-all duration-300 ease-out shadow-[0_0_10px_#ff003c]"
                    style={{ width: `${(enemyHp / enemyMaxHp) * 100}%` }}
                />
            </div>
        </div>
      </div>

      {/* --- MIDDLE: COMBAT LOG (Mobile Only) --- */}
      {/* 🔥 FIX: Лог бою відображається на мобільному над кнопками */}
      <div className="flex-1 flex flex-col justify-end items-center pb-4 md:hidden overflow-hidden">
          <div className="w-[90%] max-h-[150px] overflow-y-auto space-y-1 p-2 mask-linear-fade">
              {combatLog.slice(-4).map((log: string, i: number) => (
                  <div key={i} className="text-[10px] font-mono text-neon-red/80 bg-black/60 px-2 py-1 rounded border-l-2 border-neon-red/50 backdrop-blur-sm">
                      {log}
                  </div>
              ))}
              <div ref={logEndRef} />
          </div>
      </div>

      {/* --- BOTTOM: PLAYER CONTROLS --- */}
      {/* Фон-градієнт для кращої читабельності кнопок */}
      <div className="w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-10 pb-6 px-4 pointer-events-auto">
          <div className="max-w-3xl mx-auto space-y-4">
              
              {/* Player Status Bar */}
              <div className="flex justify-between items-end text-neon-cyan font-mono text-xs md:text-sm mb-1 px-2">
                  <span className="flex items-center gap-2"><Shield size={14}/> SHIELDS & HULL</span>
                  <span>{hull} / {maxHull}</span>
              </div>
              <div className="h-2 md:h-3 bg-gray-900 rounded-full overflow-hidden border border-neon-cyan/30 mb-4 relative">
                  <div 
                      className="h-full bg-neon-cyan transition-all duration-300 ease-out shadow-[0_0_10px_#00f0ff]"
                      style={{ width: `${(hull / maxHull) * 100}%` }}
                  />
                  {/* Warning flash if low HP */}
                  {hull < maxHull * 0.3 && (
                      <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
                  )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 md:gap-6 h-16 md:h-20">
                  <button 
                      onClick={playerAttack}
                      className="bg-neon-red hover:bg-red-600 text-black font-black font-mono uppercase rounded flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,0,60,0.4)]"
                  >
                      <Crosshair size={24} className="md:w-8 md:h-8"/>
                      <span className="text-[10px] md:text-sm">FIRE</span>
                  </button>

                  <button 
                      className="bg-blue-900/50 border border-blue-500/50 text-blue-400 font-bold font-mono uppercase rounded flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed"
                  >
                      <Zap size={24} className="md:w-8 md:h-8"/>
                      <span className="text-[10px] md:text-sm">RECHARGE</span>
                  </button>

                  <button 
                      onClick={tryFlee}
                      className="bg-yellow-500/20 border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold font-mono uppercase rounded flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                      <Wind size={24} className="md:w-8 md:h-8"/>
                      <span className="text-[10px] md:text-sm">FLEE</span>
                  </button>
              </div>
          </div>
      </div>

    </div>
  )
}