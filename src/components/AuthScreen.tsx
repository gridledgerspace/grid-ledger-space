import { useState } from 'react'
import { supabase } from '../supabase'

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true) // Перемикач Вхід / Реєстрація

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isLogin) {
      // ВХІД
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
    } else {
      // РЕЄСТРАЦІЯ
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
      })
      if (error) {
        alert(error.message)
      } else {
        alert('Check your email for the confirmation link!')
      }
    }
    setLoading(false)
  }

  return (
    <div className="h-screen w-full bg-black flex items-center justify-center relative overflow-hidden">
      {/* Фонові ефекти */}
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
              required
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
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-3 bg-neon-cyan text-black font-bold font-mono hover:bg-white transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'INITIATE LINK' : 'REGISTER NEW ID')}
          </button>
        </form>

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