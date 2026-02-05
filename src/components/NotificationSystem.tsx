import { useGameStore } from '../store'
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'

export default function NotificationSystem() {
  const notifications = useGameStore((state: any) => state.notifications)

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
      {notifications.map((note: any) => (
        <div 
            key={note.id} 
            className="animate-in slide-in-from-top fade-in duration-300 bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl flex items-center gap-3"
        >
            {note.type === 'success' && <CheckCircle className="text-neon-cyan" size={20} />}
            {note.type === 'warning' && <AlertTriangle className="text-yellow-500" size={20} />}
            {note.type === 'error' && <XCircle className="text-red-500" size={20} />}
            {note.type === 'info' && <Info className="text-blue-400" size={20} />}
            
            <span className={`font-mono text-sm font-bold ${
                note.type === 'success' ? 'text-neon-cyan' : 
                note.type === 'warning' ? 'text-yellow-400' : 'text-white'
            }`}>
                {note.message}
            </span>
        </div>
      ))}
    </div>
  )
}