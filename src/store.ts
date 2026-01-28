import { create } from 'zustand'
import { supabase } from './supabase'

export type EntityType = 'asteroid' | 'enemy' | 'station' | 'empty' | 'debris' | 'container'
export type ResourceType = 'Iron' | 'Gold' | 'DarkMatter'

// Об'єкт у космосі
export interface SpaceObject {
  id: string
  type: EntityType
  distance: number
  scanned: boolean
  resourceType?: ResourceType
  resourceAmount?: number
  enemyLevel?: number
  loot?: {
      credits?: number
      resource?: ResourceType
      amount?: number
      module?: string
  }
  data?: {
    resource: string
    amount: number
    hasRare?: boolean // Можна додати і це на майбутнє для контейнерів
  }
}

// Інформація для Карти (легка версія даних)
export interface SectorInfo {
  hasStation: boolean
  hasEnemies: boolean
  resources: ResourceType[]
  lastVisited: number
}

// === ДОПОМІЖНА ФУНКЦІЯ ПАЛИВА ===
export const calculateFuelCost = (current: string, target: string): number => {
    if (!current || !target) return 0
    const [x1, y1] = current.split(':').map(Number)
    const [x2, y2] = target.split(':').map(Number)
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
    return Math.ceil(distance * 10)
}

interface GameState {
  status: 'hangar' | 'map' | 'warping' | 'space' | 'mining' | 'combat' | 'debris'
  currentSectorType: 'wild' | 'station'
  credits: number
  fuel: number
  maxFuel: number
  hull: number
  maxHull: number
  cargo: Record<ResourceType, number>
  maxCargo: number
  modules: string[]

  currentSector: string
  targetSector: string | null

  visitedSectors: string[] // Список відвіданих секторів
  sectorResources: {       // Ресурси, які доступні в даному секторі (спільні)
    iron: number
    gold: number
    darkMatter: number
  }

  localObjects: SpaceObject[]
  
  // ПАМ'ЯТЬ ГРИ
  scannedSectors: Record<string, SectorInfo> // Для іконок на карті
  sectorStates: Record<string, SpaceObject[]> // ПОВНИЙ ЗЛІПОК ОБ'ЄКТІВ (щоб не фармили безкінечно)
  
  currentEventId: string | null
  

  inCombat: boolean
  enemyMaxHp: number
  enemyHp: number
  combatLog: string[]

  

  setTargetSector: (sector: string) => void
  startWarp: () => void
  completeWarp: () => void
  scanCurrentSector: () => void
  
  scanSystem: () => void
  mineObject: (id: string) => void
  extractResource: () => void
  sellResource: (resource: ResourceType) => void
  refuelShip: () => void
  startCombat: (enemyId: string) => void
  playerAttack: () => void
  tryFlee: () => void
  endCombat: (win: boolean) => void
  openContainer: (id: string) => void
  closeEvent: () => void
}

const pseudoRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(Math.sin(hash) * 10000) % 1;
}

const generateLocalObjects = (sectorId: string): SpaceObject[] => {
    const objects: SpaceObject[] = []
    const count = Math.floor(pseudoRandom(sectorId) * 5) + 1
    
    for(let i=0; i<count; i++) {
        const seed = `${sectorId}-${i}`
        const rand = pseudoRandom(seed)
        let type: EntityType = 'empty'
        
        if (rand > 0.6) type = 'asteroid'
        if (rand > 0.9) type = 'enemy'
        if (sectorId === '0:0' && i === 0) type = 'station'

        if (type !== 'empty') {
            objects.push({
                id: `obj-${i}`,
                type,
                distance: Math.floor(rand * 5000) + 1000,
                scanned: false, 
                resourceType: rand > 0.8 ? 'Gold' : 'Iron',
                resourceAmount: type === 'asteroid' ? Math.floor(rand * 1000) + 200 : 0,
                enemyLevel: type === 'enemy' ? Math.floor(rand * 5) + 1 : 0
            })
        }
    }
    return objects
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'hangar',
  credits: 1000,
  fuel: 100,
  maxFuel: 100,
  hull: 100,
  maxHull: 100,
  cargo: { Iron: 0, Gold: 0, DarkMatter: 0 },
  maxCargo: 50,
  modules: ['scanner', 'mining_laser'],
  currentSectorType: 'wild',
  
  currentSector: '0:0',
  targetSector: null,

  visitedSectors: ['0:0'],
  sectorResources: { iron: 0, gold: 0, darkMatter: 0 },
  
  localObjects: [],
  scannedSectors: {
      '0:0': { hasStation: true, hasEnemies: false, resources: [], lastVisited: Date.now() }
  },
  
  // Ініціалізація станів секторів (поки пусто)
  sectorStates: {}, 

  currentEventId: null,
  inCombat: false,
  enemyMaxHp: 100,
  enemyHp: 100,
  combatLog: [],

  setTargetSector: (sector) => set({ targetSector: sector }),

  startWarp: () => {
      const { fuel, currentSector, targetSector } = get()
      if (!targetSector) return
      const cost = calculateFuelCost(currentSector, targetSector)

      if (fuel >= cost) {
          set({ status: 'warping', fuel: fuel - cost })
      } else {
          alert('NOT ENOUGH FUEL!')
      }
  },

  // === ВИПРАВЛЕНА ЛОГІКА ПЕРЕХОДУ ===
  completeWarp: () => {
      const { targetSector, currentSector, localObjects, sectorStates, scannedSectors } = get()
      if (!targetSector) return

      let objectsToSave = localObjects

      if (currentSector === '0:0' && localObjects.length === 0) {
          // Генеруємо базовий вміст 0:0 (Станцію) і помічаємо як сканований
          objectsToSave = generateLocalObjects('0:0').map(obj => ({ ...obj, scanned: true }))
      }

      // 1. ЗБЕРІГАЄМО СТАН ПОТОЧНОГО СЕКТОРУ
      const updatedSectorStates = {
          ...sectorStates,
          [currentSector]: objectsToSave 
      }

      // 2. ЗАВАНТАЖУЄМО НОВИЙ СЕКТОР
      let newObjects: SpaceObject[]

      if (updatedSectorStates[targetSector]) {
          // Завантажуємо з пам'яті (якщо вже були тут)
          newObjects = updatedSectorStates[targetSector]
      } else {
          // Генеруємо вперше
          newObjects = generateLocalObjects(targetSector)
          
          // Якщо прилетіли на 0:0 (і чомусь в пам'яті не було), робимо видимим
          if (targetSector === '0:0') {
             newObjects = newObjects.map(obj => ({ ...obj, scanned: true }))
          }
      }

      // 3. Оновлюємо карту
      const hasStation = newObjects.some(o => o.type === 'station')
      const hasEnemies = newObjects.some(o => o.type === 'enemy')
      const resources = Array.from(new Set(
          newObjects
            .filter(o => o.type === 'asteroid' && o.resourceType && o.resourceAmount! > 0)
            .map(o => o.resourceType!)
      ))

      const sectorInfo: SectorInfo = {
          hasStation,
          hasEnemies,
          resources,
          lastVisited: Date.now()
      }

      set({ 
          status: 'space', 
          currentSector: targetSector, 
          targetSector: null, 
          localObjects: newObjects, 
          sectorStates: updatedSectorStates, 
          currentEventId: null,
          scannedSectors: {
              ...scannedSectors,
              [targetSector]: sectorInfo
          }
      })
  },

  scanSystem: () => {
      const { currentSector, localObjects, scannedSectors } = get()
      const updatedLocal = localObjects.map(obj => ({ ...obj, scanned: true }))

      // Оновлюємо інформацію для карти
      const hasStation = updatedLocal.some(o => o.type === 'station')
      const hasEnemies = updatedLocal.some(o => o.type === 'enemy')
      const resources = Array.from(new Set(updatedLocal.filter(o => o.type === 'asteroid' && o.resourceType).map(o => o.resourceType!)))

      set({
          localObjects: updatedLocal,
          scannedSectors: {
              ...scannedSectors,
              [currentSector]: { hasStation, hasEnemies, resources, lastVisited: Date.now() }
          }
      })
  },

  mineObject: (id) => set({ status: 'mining', currentEventId: id }),

  sellResource: (resource) => {
      const { cargo, credits } = get()
      const amount = cargo[resource]
      if (amount <= 0) return
      const prices: Record<ResourceType, number> = { 'Iron': 10, 'Gold': 50, 'DarkMatter': 150 }
      set({
          credits: credits + (amount * prices[resource]),
          cargo: { ...cargo, [resource]: 0 }
      })
  },

  refuelShip: () => {
      const { fuel, maxFuel, credits } = get()
      const missing = maxFuel - fuel
      if (missing <= 0) return
      const costPerUnit = 2
      if (credits >= missing * costPerUnit) {
          set({ fuel: maxFuel, credits: credits - (missing * costPerUnit) })
      } else {
          const possible = Math.floor(credits / costPerUnit)
          set({ fuel: fuel + possible, credits: credits - (possible * costPerUnit) })
      }
  },

  startCombat: (enemyId) => {
      const { localObjects } = get()
      const enemy = localObjects.find(o => o.id === enemyId)
      if (!enemy) return
      const hp = 50 + (enemy.enemyLevel || 1) * 20
      set({ 
          status: 'combat', 
          currentEventId: enemyId,
          inCombat: true,
          enemyMaxHp: hp,
          enemyHp: hp,
          combatLog: ['WARNING: HOSTILE ENGAGED! SYSTEM READY.']
      })
  },

  playerAttack: () => {
      const { enemyHp, combatLog, hull } = get()
      const dmg = Math.floor(Math.random() * 10) + 15 
      const newEnemyHp = enemyHp - dmg
      const logs = [...combatLog, `> You fired laser: -${dmg} HP`]

      if (newEnemyHp <= 0) {
          get().endCombat(true)
      } else {
          const enemyDmg = Math.floor(Math.random() * 8) + 5
          const newHull = hull - enemyDmg
          set({ enemyHp: newEnemyHp, hull: newHull, combatLog: [...logs, `> Enemy returned fire: -${enemyDmg} HULL`] })
          if (newHull <= 0) get().endCombat(false)
      }
  },

  tryFlee: () => {
      if (Math.random() > 0.5) {
           set({ status: 'space', inCombat: false, combatLog: [], currentEventId: null })
      } else {
           set(state => ({ combatLog: [...state.combatLog, '> Flee failed! Engines jammed!'], hull: state.hull - 10 }))
      }
  },

  endCombat: (win) => {
      const { localObjects, currentEventId } = get()
      const enemy = localObjects.find(o => o.id === currentEventId)
      const dist = enemy?.distance || 2000

      if (win) {
          const filteredObjects = localObjects.filter(o => o.id !== currentEventId)
          const rewardCredits = Math.floor(Math.random() * 200) + 50
          const hasRare = Math.random() > 0.7
          
          const debris: SpaceObject = { id: `debris-${Date.now()}`, type: 'debris', distance: dist, scanned: true }
          const container: SpaceObject = { 
              id: `loot-${Date.now()}`, type: 'container', distance: dist + 50, scanned: true,
              loot: { credits: rewardCredits, resource: hasRare ? 'DarkMatter' : undefined, amount: hasRare ? 1 : 0 }
          }

          set({
              status: 'space', inCombat: false, localObjects: [...filteredObjects, debris, container], currentEventId: null, combatLog: []
          })
      } else {
          alert('CRITICAL FAILURE. SHIP DESTROYED.')
          set({ status: 'hangar', currentSector: '0:0', hull: 100, fuel: 50, cargo: { Iron: 0, Gold: 0, DarkMatter: 0 }, inCombat: false, combatLog: [] })
      }
  },

  openContainer: (id) => {
      const { localObjects, credits, cargo } = get()
      const idx = localObjects.findIndex(o => o.id === id)
      if (idx === -1) return
      const loot = localObjects[idx].loot
      if (!loot) return

      let newCredits = credits
      const newCargo = { ...cargo }
      let msg = 'CONTAINER: '
      if (loot.credits) { newCredits += loot.credits; msg += `${loot.credits} CR. ` }
      if (loot.resource && loot.amount) { newCargo[loot.resource] += loot.amount; msg += `${loot.amount} ${loot.resource}.` }

      const newObjects = [...localObjects]
      newObjects.splice(idx, 1)

      set({ credits: newCredits, cargo: newCargo, localObjects: newObjects, currentEventId: null })
      alert(msg)
  },

  scanCurrentSector: async () => {
    const { currentSector, currentSectorType, sectorResources } = get()
    
    set({ inCombat: false, combatLog: [], currentEventId: null })

    // А: СТАНЦІЯ
    if (currentSectorType === 'station') {
      set({
        localObjects: [{ 
          id: 'station-alpha', type: 'station', distance: 2000, scanned: true 
        }],
        combatLog: ['> Docking beacon detected.']
      })
      return
    }

    // Б: ПЕРЕВІРКА НА ВІДНОВЛЕННЯ РЕСУРСІВ (3 ГОДИНИ)
    // Нам треба перевірити це ще раз, бо дані могли застаріти з моменту завантаження
    let currentResources = { ...sectorResources }
    
    const { data: sectorData } = await supabase
        .from('sectors')
        .select('last_depleted_at, iron_amount, gold_amount, dark_matter_amount')
        .eq('id', currentSector)
        .single()

    if (sectorData && sectorData.last_depleted_at) {
        const depletedTime = new Date(sectorData.last_depleted_at).getTime()
        const now = new Date().getTime()
        const hoursPassed = (now - depletedTime) / (1000 * 60 * 60)

        if (hoursPassed >= 3) {
            console.log('♻️ SECTOR REGENERATED!')
            // Відновлюємо ресурси в базі
            const newIron = Math.floor(Math.random() * 500) + 100
            const newGold = Math.floor(Math.random() * 200)
            
            await supabase.from('sectors').update({
                iron_amount: newIron,
                gold_amount: newGold,
                last_depleted_at: null // Скидаємо таймер
            }).eq('id', currentSector)

            currentResources = { iron: newIron, gold: newGold, darkMatter: 0 }
            
            // Оновлюємо локальний стор
            set({ sectorResources: currentResources })
        }
    }

    // В: ВОРОГИ (Залишаємо як було)
    const rng = Math.random()
    if (rng > 0.8) { // 20% шанс на ворога
       const enemy: SpaceObject = { id: `enemy-${Date.now()}`, type: 'enemy', distance: 3000, scanned: true }
       set({ 
           localObjects: [enemy], inCombat: true, 
           combatLog: ['> ⚠️ WARNING: HOSTILE SIGNATURE DETECTED!'] 
       })
       return
    }

    // Г: ГЕНЕРАЦІЯ АСТЕРОЇДІВ (МУЛЬТИ-ОБ'ЄКТИ) ☄️☄️☄️
    const objects: SpaceObject[] = []
    
    // Перевіряємо загальну кількість ресурсів
    const totalIron = currentResources.iron
    const totalGold = currentResources.gold
    const totalDark = currentResources.darkMatter

    const totalResources = totalIron + totalGold + totalDark

    // Якщо ресурсів 0 — сектор ПУСТИЙ (УЛАМКИ)
    if (totalResources <= 0) {
        // Генеруємо 3-5 уламків
        const debrisCount = Math.floor(Math.random() * 3) + 3
        for (let i = 0; i < debrisCount; i++) {
            objects.push({
                id: `debris-${i}`,
                type: 'debris',
                distance: 2000 + Math.random() * 2000,
                scanned: true
            })
        }
        set({ 
            localObjects: objects, 
            combatLog: ['> Sector depleted.', '> Traces of previous mining detected.'] 
        })
        return
    }

    // Якщо ресурси Є — розбиваємо їх на декілька астероїдів
    // Наприклад, створимо 2-4 астероїди
    const asteroidCount = Math.floor(Math.random() * 3) + 2 
    
    // Розподіляємо ресурси (спрощено: просто ділимо порівну або рандомно)
    // Тут ми зробимо так: створимо кілька об'єктів, кожен матиме частину ресурсів
    
    let remainingIron = totalIron
    let remainingGold = totalGold

    for (let i = 0; i < asteroidCount; i++) {
        const isLast = i === asteroidCount - 1
        
        // Визначаємо долю ресурсів для цього каменю (якщо останній - забирає все, що лишилось)
        const ironChunk = isLast ? remainingIron : Math.floor(remainingIron / (asteroidCount - i))
        const goldChunk = isLast ? remainingGold : Math.floor(remainingGold / (asteroidCount - i))
        
        remainingIron -= ironChunk
        remainingGold -= goldChunk

        const hasGold = goldChunk > 0
        const resourceType = hasGold ? 'Gold' : 'Iron'
        const amount = hasGold ? goldChunk : ironChunk

        if (amount > 0) {
            objects.push({
                id: `asteroid-${i}-${Date.now()}`,
                type: 'asteroid',
                distance: 2500 + (i * 1000), // Кожен наступний далі
                scanned: true,
                data: {
                    resource: resourceType,
                    amount: amount
                }
            })
        }
    }

    set({ 
        localObjects: objects, 
        combatLog: [`> Scanners found ${objects.length} mineral deposits.`] 
    })
  },

  extractResource: async () => {
    const { localObjects, currentEventId, cargo, maxCargo, currentSector, sectorResources } = get()
    
    const targetIndex = localObjects.findIndex(obj => obj.id === currentEventId)
    if (targetIndex === -1) return

    const target = localObjects[targetIndex]
    if (!target.data) return 

    const resourceType = target.data.resource // 'Iron' | 'Gold'
    const amountAvailable = target.data.amount

    // Перевірки
    const currentLoad = Object.values(cargo).reduce((a, b) => a + b, 0)
    if (currentLoad >= maxCargo) return 
    if (amountAvailable <= 0) return 

    // Видобуваємо 10 або менше
    const amountToMine = Math.min(10, amountAvailable, maxCargo - currentLoad)

    // 1. ОНОВЛЮЄМО ЛОКАЛЬНИЙ ОБ'ЄКТ (Зменшуємо в астероїді)
    const updatedObjects = [...localObjects]
    updatedObjects[targetIndex] = {
        ...target,
        data: { ...target.data, amount: amountAvailable - amountToMine }
    }

    // Якщо в астероїді закінчилось все — міняємо його тип на 'debris' (УЛАМКИ)
    if (updatedObjects[targetIndex].data!.amount <= 0) {
        updatedObjects[targetIndex].type = 'debris'
        // updatedObjects[targetIndex].data = undefined // Можна очистити дані
    }

    // 2. ОНОВЛЮЄМО ВАНТАЖ
    const newCargo = { ...cargo }
    const rKey = resourceType as keyof typeof cargo
    newCargo[rKey] = (newCargo[rKey] || 0) + amountToMine

    // 3. ОНОВЛЮЄМО ГЛОБАЛЬНІ РЕСУРСИ СЕКТОРА (Для бази)
    const newSectorResources = { ...sectorResources }
    if (resourceType === 'Iron') newSectorResources.iron -= amountToMine
    if (resourceType === 'Gold') newSectorResources.gold -= amountToMine
    if (resourceType === 'DarkMatter') newSectorResources.darkMatter -= amountToMine

    // Ставимо стани
    set({
        localObjects: updatedObjects,
        cargo: newCargo,
        sectorResources: newSectorResources, // Важливо оновити це, щоб знати коли 0
        combatLog: [`> Extracted ${amountToMine}T of ${resourceType}`]
    })

    // 4. 🔥 ЗАПИС В БАЗУ ДАНИХ (Асинхронно)
    // Визначаємо колонку в БД
    const dbColumn = resourceType === 'Iron' ? 'iron_amount' : (resourceType === 'Gold' ? 'gold_amount' : 'dark_matter_amount')
    
    // Перевіряємо, чи сектор повністю пустий
    const isTotallyEmpty = (newSectorResources.iron + newSectorResources.gold + newSectorResources.darkMatter) <= 0
    
    const updateData: any = { [dbColumn]: Math.max(0, newSectorResources[resourceType === 'Iron' ? 'iron' : 'gold']) } // тут спрощення, треба брати правильне поле
    
    // Краще передати конкретне значення
    if (resourceType === 'Iron') updateData.iron_amount = newSectorResources.iron
    if (resourceType === 'Gold') updateData.gold_amount = newSectorResources.gold
    
    if (isTotallyEmpty) {
        updateData.last_depleted_at = new Date().toISOString()
        console.log('⚠️ SECTOR DEPLETED! Respawn timer started.')
    }

    // Відправляємо update (без await, щоб не блокувати гру, "Fire and Forget")
    supabase.from('sectors')
        .update(updateData)
        .eq('id', currentSector)
        .then(({ error }) => {
            if (error) console.error('Mining sync error:', error)
        })
  },

  closeEvent: () => set({ status: 'space', currentEventId: null })
}))