import { useGameStore } from '../store'
import { X, Box, Check, Download } from 'lucide-react'

export default function LootOverlay() {
  const { lootContainer, closeLoot, takeLootItem, takeAllLoot, cargo, maxCargo } = useGameStore((state: any) => state)

  if (!lootContainer) return null

  // 🔥 ВИПРАВЛЕННЯ: додано "as number"
  const currentLoad = Object.values(cargo || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
  const isFull = (currentLoad as number) >= maxCargo

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-space-950 border border-neon-cyan/50 rounded-xl shadow-[0_0_50px_rgba(0,240,255,0.1)] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-4 bg-black/40 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-yellow-500/20 p-2 rounded text-yellow-500"><Box size={20} /></div>
                <div>
                    <h3 className="text-white font-bold font-mono uppercase tracking-widest">Cargo Container</h3>
                    <div className="text-[10px] text-gray-500 font-mono">ENCRYPTED STORAGE UNIT</div>
                </div>
            </div>
            <button onClick={closeLoot} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        {/* CARGO CAPACITY INDICATOR */}
        <div className="bg-black/20 px-4 py-2 flex justify-between items-center text-xs font-mono border-b border-white/5">
            <span className="text-gray-400">YOUR CARGO SPACE:</span>
            <span className={isFull ? 'text-red-500' : 'text-neon-cyan'}>{currentLoad} / {maxCargo}</span>
        </div>
        {/* ITEMS LIST */}
        <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {lootContainer.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-xs">CONTAINER EMPTY</div>
            ) : (
                lootContainer.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5 hover:border-neon-cyan/30 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 flex items-center justify-center rounded ${item.type === 'weapon' ? 'bg-red-500/20 text-red-500' : item.type === 'module' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                <Box size={14} />
                            </div>
                            <div>
                                <div className="text-white font-bold text-sm">{item.name}</div>
                                {item.amount && <div className="text-[10px] text-gray-400">QTY: {item.amount}</div>}
                            </div>
                        </div>
                        <button onClick={() => takeLootItem(idx)} className="p-2 bg-black/40 rounded border border-white/10 text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all">
                            <Download size={16} />
                        </button>
                    </div>
                ))
            )}
        </div>
        {/* FOOTER */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex gap-3">
            <button onClick={takeAllLoot} disabled={lootContainer.length === 0} className="flex-1 bg-neon-cyan text-black font-bold py-3 rounded text-sm uppercase tracking-wider hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Check size={16} /> Take All
            </button>
        </div>
      </div>
    </div>
  )
}