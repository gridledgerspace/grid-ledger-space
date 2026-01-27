import { useState } from 'react'
import { supabase } from '../supabase'
import { User } from 'lucide-react'

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) alert(error.message)
      else alert('Check your email for the confirmation link!')
    }
    setLoading(false)
  }

  // --- НОВА ФУНКЦІЯ ДЛЯ ГОСТЯ ---
  const handleGuestLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInAnonymously()
    
    if (error) {
        alert(error.message)
    }
    // Якщо успішно — App.tsx сам побачить зміну сесії і пустить у гру
    setLoading(false)
  }
  // ------------------------------

  return (
    <div className="h-screen w-full bg-black flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-space-800 via-black to-black opacity-50"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

      <div className="z-10 w-full max-w-md p-8 glass-panel border border-neon-cyan/30 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.1)]">
        <h1 className="text-4xl font-mono font-bold text-center text-neon-cyan mb-2 tracking-widest">
            GRID LEDGER
        </h1>
        <p className="text-center text-gray-400 font-mono text-xs mb-8">DEEP SPACE ECONOMY PROTOCOL</p>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-mono text-neon-cyan mb-1 block">IDENTIFIER (EMAIL)</label>
            <input
              type="email"
              placeholder="pilot@space.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded p-3 text-white font-mono focus:border-neon-cyan focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-neon-cyan mb-1 block">SECURITY CODE (PASSWORD)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded p-3 text-white font-mono focus:border-neon-cyan focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 bg-neon-cyan text-black font-bold font-mono hover:bg-white transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'INITIATE LINK' : 'REGISTER NEW ID')}
          </button>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-black px-2 text-gray-500 font-mono">OR</span></div>
        </div>

        {/* --- КНОПКА ГОСТЯ --- */}
        <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-3 border border-neon-orange/50 text-neon-orange font-mono hover:bg-neon-orange/10 transition-all flex items-center justify-center gap-2 group"
        >
            <User size={16} className="group-hover:scale-110 transition-transform"/> 
            ENTER AS GUEST
        </button>
        {/* ------------------- */}

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-gray-500 hover:text-white font-mono underline decoration-dotted underline-offset-4"
          >
            {isLogin ? "NO ID DETECTED? CREATE ACCOUNT" : "ALREADY REGISTERED? LOGIN"}
          </button>
        </div>
      </div>
    </div>
  )
}