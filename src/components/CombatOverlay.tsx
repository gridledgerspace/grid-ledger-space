import { useGameStore } from '../store'
import { Crosshair, Shield, Zap, Skull, Wind } from 'lucide-react'

export default function CombatOverlay() {
  const { status, enemyHp, enemyMaxHp, hull, maxHull, playerAttack, tryFlee } = useGameStore()
  
  if (status !== 'combat') return null

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-between p-6">
      
      {/* ЧЕРВОНА РАМКА */}
      <div className="absolute inset-0 border-[6px] border-neon-red/50 animate-pulse pointer-events-none shadow-[inset_0_0_50px_rgba(255,0,0,0.2)]" />

      {/* ВЕРХ: HP ВОРОГА */}
      <div className="mx-auto w-full max-w-lg pointer-events-auto pt-4">
          <div className="flex justify-between text-neon-red font-mono font-bold mb-1">
              <span className="flex items-center gap-2"><Skull size={18}/> HOSTILE VESSEL</span>
              <span>{enemyHp} / {enemyMaxHp}</span>
          </div>
          <div className="w-full h-4 bg-black/80 border border-neon-red/50 skew-x-12 relative overflow-hidden">
              <div 
                className="h-full bg-neon-red transition-all duration-300 shadow-[0_0_10px_red]" 
                style={{ width: `${(enemyHp / enemyMaxHp) * 100}%` }}
              />
          </div>
      </div>

      {/* ЦЕНТР: ПОРОЖНЬО (для кращого огляду бою) */}
      <div className="flex-1"></div>

      {/* НИЗ: HP ГРАВЦЯ ТА КНОПКИ */}
      <div className="w-full max-w-2xl mx-auto pointer-events-auto pb-8">
          
          <div className="flex justify-between text-neon-cyan font-mono font-bold mb-1">
              <span className="flex items-center gap-2"><Shield size={18}/> SHIELDS & HULL</span>
              <span>{hull} / {maxHull}</span>
          </div>
          <div className="w-full h-4 bg-black/80 border border-neon-cyan/50 -skew-x-12 mb-6 relative overflow-hidden">
              <div 
                className="h-full bg-neon-cyan transition-all duration-300 shadow-[0_0_10px_cyan]" 
                style={{ width: `${(hull / maxHull) * 100}%` }}
              />
          </div>

          <div className="grid grid-cols-3 gap-4">
              <button onClick={playerAttack} className="py-4 bg-neon-red/20 border border-neon-red text-neon-red font-mono font-bold hover:bg-neon-red hover:text-black transition-all flex flex-col items-center gap-1 group shadow-[0_0_15px_rgba(255,0,0,0.2)]">
                  <Crosshair size={24} className="group-hover:rotate-90 transition-transform"/>
                  FIRE LASERS
              </button>
              
              <button className="py-4 bg-neon-blue/20 border border-neon-blue text-neon-blue font-mono font-bold hover:bg-neon-blue hover:text-black transition-all flex flex-col items-center gap-1 opacity-50 cursor-not-allowed">
                  <Zap size={24}/> RECHARGE
              </button>
              
              <button onClick={tryFlee} className="py-4 bg-yellow-500/20 border border-yellow-500 text-yellow-500 font-mono font-bold hover:bg-yellow-500 hover:text-black transition-all flex flex-col items-center gap-1">
                  <Wind size={24}/> WARP OUT
              </button>
          </div>
      </div>
    </div>
  )
}