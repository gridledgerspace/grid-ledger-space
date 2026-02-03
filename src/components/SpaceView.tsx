import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store'
import Object3D from './Object3D'

// === КОРАБЕЛЬ ГРАВЦЯ ===
function Ship({ isMoving }: { isMoving: boolean }) {
  const shipRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  
  // Вектор швидкості
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  // Поточна позиція для перевірки меж
  const position = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((_state, delta) => {
    if (!shipRef.current) return

    // 1. Корабель завжди перед камерою
    const targetPos = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10))
    shipRef.current.position.lerp(targetPos, 0.1)
    shipRef.current.rotation.copy(camera.rotation)

    // 2. Фізика руху
    if (isMoving) {
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)
        velocity.current.addScaledVector(direction, delta * 50) // Прискорення
    } else {
        velocity.current.multiplyScalar(0.95) // Інерція/гальмування
    }

    // Обмеження швидкості
    velocity.current.clampLength(0, 100)

    // 3. Рух камери
    camera.position.add(velocity.current.clone().multiplyScalar(delta))
    position.current.copy(camera.position)

    // 🔥 НЕВИДИМА СТІНА (Радіус 5000)
    const MAX_DISTANCE = 5000 
    const distFromCenter = position.current.length()

    if (distFromCenter > MAX_DISTANCE) {
        // М'яко відштовхуємо назад до центру
        const pushBack = position.current.clone().normalize().multiplyScalar(-100 * delta)
        camera.position.add(pushBack)
        
        // Гасимо швидкість, щоб не було "тремтіння" об стіну
        velocity.current.multiplyScalar(0.5) 
    }
  })

  return (
    <group ref={shipRef}>
       <Object3D type="player" color="#00f0ff" />
       {/* Ефект двигуна */}
       {isMoving && (
           <mesh position={[0, 0, 2]}>
               <sphereGeometry args={[0.2, 16, 16]} />
               <meshBasicMaterial color="orange" transparent opacity={0.8} />
           </mesh>
       )}
    </group>
  )
}

// === ОБ'ЄКТИ В КОСМОСІ ===
function SpaceObjectMesh({ obj }: { obj: any }) {
    const ref = useRef<THREE.Group>(null)
    const { camera } = useThree()
    const [distance, setDistance] = useState(0)
    
    // Генеруємо стабільну позицію на основі ID об'єкта
    // (У майбутньому краще брати реальні x/y/z з бази)
    const seed = obj.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    const angle = seed % (Math.PI * 2)
    // Розподіляємо об'єкти трохи по висоті, щоб не було пласко
    const height = (seed % 500) - 250 
    
    const x = Math.cos(angle) * obj.distance
    const z = Math.sin(angle) * obj.distance
    const pos = new THREE.Vector3(x, height, z)

    useFrame(() => {
        if (ref.current) {
            // Оновлюємо дистанцію до гравця для лейблу
            // Робимо це рідше або округлюємо, щоб не миготіли цифри
            const dist = Math.floor(ref.current.position.distanceTo(camera.position))
            if (Math.abs(dist - distance) > 10) { // Оновлюємо тільки якщо змінилось на 10км
                setDistance(dist)
            }
            ref.current.lookAt(camera.position)
        }
    })

    return (
        <group ref={ref} position={pos}>
            <Object3D type={obj.type} color={obj.type === 'enemy' ? '#ff0000' : obj.type === 'station' ? '#00ff00' : '#ffffff'} />
            
            {/* Текстова мітка над об'єктом */}
            <Html position={[0, 2, 0]} center distanceFactor={150}>
                <div className="pointer-events-none select-none flex flex-col items-center">
                    <div className="bg-black/60 border border-white/20 px-2 py-1 rounded text-[10px] text-white backdrop-blur-sm">
                        <div className="font-bold text-neon-cyan uppercase whitespace-nowrap">{obj.type}</div>
                        <div className="text-gray-400 font-mono">{distance} KM</div>
                    </div>
                </div>
            </Html>
        </group>
    )
}

export default function SpaceView() {
  const { currentSector, localObjects } = useGameStore((state: any) => state)
  const [isMoving, setIsMoving] = useState(false)
  
  // Керування мишею/тачем
  useEffect(() => {
      const handleDown = () => setIsMoving(true)
      const handleUp = () => setIsMoving(false)
      
      window.addEventListener('mousedown', handleDown)
      window.addEventListener('mouseup', handleUp)
      window.addEventListener('touchstart', handleDown)
      window.addEventListener('touchend', handleUp)

      return () => {
          window.removeEventListener('mousedown', handleDown)
          window.removeEventListener('mouseup', handleUp)
          window.removeEventListener('touchstart', handleDown)
          window.removeEventListener('touchend', handleUp)
      }
  }, [])

  return (
    <div className="h-full w-full bg-black relative">
        {/* HUD: Назва сектору */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="glass-panel px-4 py-2 border-l-4 border-l-neon-cyan bg-black/40 backdrop-blur-md">
                <h1 className="text-xl font-bold text-neon-cyan font-mono">SECTOR {currentSector}</h1>
            </div>
        </div>

        {/* 3D Сцена */}
        <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
            <color attach="background" args={['#02020a']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            
            {/* Глибоке зоряне небо */}
            <Stars radius={300} depth={100} count={5000} factor={4} saturation={0} fade />
            
            {/* Корабель гравця */}
            <Ship isMoving={isMoving} />
            
            {/* Інші об'єкти */}
            {localObjects.map((obj: any) => (
                <SpaceObjectMesh key={obj.id} obj={obj} />
            ))}

        </Canvas>
    </div>
  )
}