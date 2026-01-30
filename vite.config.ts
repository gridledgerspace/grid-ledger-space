import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Збільшуємо ліміт до 2000 кб (2MB), щоб прибрати попередження
    chunkSizeWarningLimit: 2000, 
    rollupOptions: {
        output: {
            // (Опціонально) Це розділить бібліотеки на окремі файли для кращого кешування
            manualChunks: {
                vendor: ['react', 'react-dom', 'zustand'],
                three: ['three', '@react-three/fiber', '@react-three/drei'],
                ui: ['lucide-react']
            }
        }
    }
  }
})