import { useGameStore, type ResourceType } from '../store'
import { XCircle, ShoppingBag } from 'lucide-react'

interface StationMenuProps {
  onClose: () => void
}

export default function StationMenu({ onClose }: StationMenuProps) {
  const { cargo, credits,  sellResource,} = useGameStore()

  // Ціни для візуалізації
  const prices: Record<ResourceType, number> = {
    'Iron': 10,
    'Gold': 50,
    'DarkMatter': 150
  }

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-2xl p-8 border border-neon-cyan/50 relative shadow-[0_0_50px_rgba(0,240,255,0.1)]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
            <XCircle />
        </button>

        <h2 className="text-3xl font-mono text-neon-cyan font-bold mb-1 flex items-center gap-3">
            <ShoppingBag /> STATION MARKET
        </h2>
        <p className="text-gray-400 font-mono text-sm mb-8">SECTOR 0:0 TRADE HUB</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* ЛІВА КОЛОНКА: ПРОДАЖ РЕСУРСІВ */}
            <div className="space-y-4">
                <h3 className="text-neon-orange font-mono font-bold border-b border-white/10 pb-2">SELL RESOURCES</h3>
                
                {Object.entries(cargo).map(([res, amount]) => (
                    <div key={res} className="flex justify-between items-center bg-space-900 p-3 rounded border border-white/5">
                        <div>
                            <div className="text-white font-mono font-bold">{res}</div>
                            <div className="text-xs text-gray-500">{amount} units in cargo</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-neon-cyan font-mono text-sm">
                                +{(amount * prices[res as ResourceType]).toLocaleString()} CR
                            </div>
                            <button 
                                onClick={() => sellResource(res as ResourceType)}
                                disabled={amount === 0}
                                className="px-4 py-1 bg-white/5 hover:bg-neon-cyan hover:text-black border border-white/10 rounded text-xs font-mono transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                SELL ALL
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ПРАВА КОЛОНКА: ОБСЛУГОВУВАННЯ */}
            <div className="space-y-4">
                <h3 className="text-white font-mono font-bold border-b border-white/10 pb-2">SERVICES</h3>

                <div className="mt-8 pt-4 border-t border-white/10 text-right">
                    <div className="text-gray-400 text-sm font-mono">CURRENT BALANCE</div>
                    <div className="text-3xl text-neon-cyan font-bold font-mono">{credits.toLocaleString()} CR</div>
                </div>
            </div>
        </div>

      </div>
    </div>
  )
}