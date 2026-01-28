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
  
  // Старі поля (залишаємо для сумісності з твоїм кодом)
  resourceType?: ResourceType
  resourceAmount?: number
  enemyLevel?: number
  loot?: {
      credits?: number
      resource?: ResourceType
      amount?: number
      module?: string
  }

  // 👇 НОВЕ ПОЛЕ ДЛЯ МАЙНІНГУ (тут зберігаємо актуальну к-сть руди)
  data?: {
    resource: string
    amount: number
    hasRare?: boolean
  }
}

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
  cargo: Record<string, number> // Змінив на string для гнучкості
  maxCargo: number
  modules: string[]

  currentSector: string
  targetSector: string | null

  visitedSectors: string[]
  sectorResources: {
    iron: number
    gold: number
    darkMatter: number
  }

  localObjects: SpaceObject[]
  
  // ПАМ'ЯТЬ ГРИ
  scannedSectors: Record<string, SectorInfo>
  sectorStates: Record<string, SpaceObject[]>
  
  currentEventId: string | null
  
  inCombat: boolean
  enemyMaxHp: number
  enemyHp: number
  combatLog: string[]

  setTargetSector: (sector: string) => void
  startWarp: () => void
  completeWarp: () => void
  
  // 👇 Ця функція тепер буде головною для завантаження з БД
  scanCurrentSector: () => void 
  
  // 👇 Твої старі функції (повернув їх)
  scanSystem: () => void
  mineObject: (id: string) => void
  extractResource: () => void
  sellResource: (resource: string) => void
  buyFuel: () => void
  repairHull: () => void // Додав, бо ми це робили раніше
  startCombat: (enemyId: string) => void
  playerAttack: () => void
  tryFlee: () => void
  endCombat: (win: boolean) => void
  openContainer: (id: string) => void
  closeEvent: () => void
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

  completeWarp: () => {
      const { targetSector, currentSector, localObjects, sectorStates } = get()
      if (!targetSector) return

      // Зберігаємо стан старого сектору в пам'ять (хоча для ресурсів ми тепер юзаємо БД)
      const updatedSectorStates = {
          ...sectorStates,
          [currentSector]: localObjects 
      }

      set({ 
          status: 'space', 
          currentSector: targetSector, 
          targetSector: null, 
          localObjects: [], // Очищаємо, щоб scanCurrentSector завантажив нові
          sectorStates: updatedSectorStates, 
          currentEventId: null
      })

      // Запускаємо логіку завантаження з БД
      get().scanCurrentSector()
  },

  // === 🔥 ГОЛОВНА ЛОГІКА ЗАВАНТАЖЕННЯ СЕКТОРУ (З БД + РЕГЕНЕРАЦІЯ) ===
  scanCurrentSector: async () => {
    const { currentSector, sectorResources } = get()
    
    // Скидаємо бойовий стан
    set({ inCombat: false, combatLog: [], currentEventId: null })

    // 1. СТАНЦІЯ (Хардкод для 0:0 або якщо в базі тип station)
    // (Тут можна додати перевірку currentSectorType, якщо вона оновлюється з App.tsx)
    if (currentSector === '0:0') {
      set({
        localObjects: [{ 
          id: 'station-alpha', type: 'station', distance: 2000, scanned: true 
        }],
        currentSectorType: 'station',
        combatLog: ['> Docking beacon detected.']
      })
      return
    }

    set({ currentSectorType: 'wild' })

    // 2. ЗАПИТ ДО БАЗИ: Отримуємо ресурси
    const { data: sectorData } = await supabase
        .from('sectors')
        .select('last_depleted_at, iron_amount, gold_amount, dark_matter_amount')
        .eq('id', currentSector)
        .single()

    let currentRes = { ...sectorResources }

    // Якщо дані прийшли
    if (sectorData) {
        currentRes = {
            iron: sectorData.iron_amount,
            gold: sectorData.gold_amount,
            darkMatter: sectorData.dark_matter_amount
        }
        
        // 3. ПЕРЕВІРКА НА РЕГЕНЕРАЦІЮ (3 ГОДИНИ)
        if (sectorData.last_depleted_at) {
            const depletedTime = new Date(sectorData.last_depleted_at).getTime()
            const now = new Date().getTime()
            const hoursPassed = (now - depletedTime) / (1000 * 60 * 60)

            if (hoursPassed >= 3) {
                console.log('♻️ SECTOR REGENERATED!')
                const newIron = Math.floor(Math.random() * 500) + 100
                const newGold = Math.floor(Math.random() * 200)
                
                // Оновлюємо базу
                await supabase.from('sectors').update({
                    iron_amount: newIron,
                    gold_amount: newGold,
                    last_depleted_at: null
                }).eq('id', currentSector)

                currentRes = { iron: newIron, gold: newGold, darkMatter: 0 }
            }
        }
        set({ sectorResources: currentRes })
    }

    // 4. ГЕНЕРАЦІЯ ОБ'ЄКТІВ НА ОСНОВІ РЕСУРСІВ
    const objects: SpaceObject[] = []
    const totalIron = currentRes.iron
    const totalGold = currentRes.gold
    const totalRes = totalIron + totalGold

    // Якщо пусто -> Уламки
    if (totalRes <= 0) {
        const debrisCount = Math.floor(Math.random() * 3) + 3
        for (let i = 0; i < debrisCount; i++) {
            objects.push({
                id: `debris-${i}`, type: 'debris', distance: 2000 + Math.random() * 2000, scanned: true
            })
        }
        set({ localObjects: objects, combatLog: ['> Sector depleted.'] })
        return
    }

    // Якщо є ресурси -> Створюємо кілька астероїдів
    const asteroidCount = Math.floor(Math.random() * 3) + 2 
    let remainingIron = totalIron
    let remainingGold = totalGold

    for (let i = 0; i < asteroidCount; i++) {
        const isLast = i === asteroidCount - 1
        
        // Ділимо ресурси
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
                distance: 2500 + (i * 1000),
                scanned: true, // Відразу бачимо їх (або false, якщо хочеш юзати Scan System)
                resourceType: resourceType as ResourceType, // Для сумісності
                data: { resource: resourceType, amount: amount } // ДЛЯ НОВОГО МАЙНІНГУ
            })
        }
    }

    // Шанс на ворога
    if (Math.random() > 0.8) {
        objects.push({ id: `enemy-${Date.now()}`, type: 'enemy', distance: 3000, scanned: true, enemyLevel: 1 })
    }

    set({ localObjects: objects })
  },

  // === 🔥 ОНОВЛЕНИЙ ВИДОБУТОК (ПИШЕМО В БАЗУ) ===
  extractResource: async () => {
    const { localObjects, currentEventId, cargo, maxCargo, currentSector, sectorResources } = get()
    
    const targetIndex = localObjects.findIndex(obj => obj.id === currentEventId)
    if (targetIndex === -1) return

    const target = localObjects[targetIndex]
    if (!target.data) return // Якщо немає даних для майнінгу

    const resourceType = target.data.resource 
    const amountAvailable = target.data.amount

    // Перевірки
    const currentLoad = Object.values(cargo).reduce((a, b) => a + b, 0)
    if (currentLoad >= maxCargo) return 
    if (amountAvailable <= 0) return 

    // Копаємо 10
    const amountToMine = Math.min(10, amountAvailable, maxCargo - currentLoad)

    // 1. Оновлюємо ЛОКАЛЬНИЙ об'єкт
    const updatedObjects = [...localObjects]
    updatedObjects[targetIndex] = {
        ...target,
        data: { ...target.data, amount: amountAvailable - amountToMine }
    }
    
    if (updatedObjects[targetIndex].data!.amount <= 0) {
        updatedObjects[targetIndex].type = 'debris'
    }

    // 2. Оновлюємо ВАНТАЖ
    const newCargo = { ...cargo }
    newCargo[resourceType] = (newCargo[resourceType] || 0) + amountToMine

    // 3. Оновлюємо ГЛОБАЛЬНІ РЕСУРСИ в STORe
    const newSectorResources = { ...sectorResources }
    if (resourceType === 'Iron') newSectorResources.iron -= amountToMine
    if (resourceType === 'Gold') newSectorResources.gold -= amountToMine
    
    set({
        localObjects: updatedObjects,
        cargo: newCargo,
        sectorResources: newSectorResources,
        combatLog: [`> Extracted ${amountToMine}T of ${resourceType}`]
    })

    // 4. 🔥 ОНОВЛЮЄМО БАЗУ ДАНИХ
    const updateData: any = {}
    if (resourceType === 'Iron') updateData.iron_amount = newSectorResources.iron
    if (resourceType === 'Gold') updateData.gold_amount = newSectorResources.gold
    
    // Перевіряємо виснаження
    const isDepleted = (newSectorResources.iron + newSectorResources.gold) <= 0
    if (isDepleted) {
        updateData.last_depleted_at = new Date().toISOString()
    }

    // Fire and forget update
    supabase.from('sectors').update(updateData).eq('id', currentSector).then()
  },

  // === ТВОЇ СТАРІ ФУНКЦІЇ (ПОВЕРНУВ ЇХ) ===
  scanSystem: () => {
      const { currentSector, localObjects, scannedSectors } = get()
      const updatedLocal = localObjects.map(obj => ({ ...obj, scanned: true }))

      const hasStation = updatedLocal.some(o => o.type === 'station')
      const hasEnemies = updatedLocal.some(o => o.type === 'enemy')
      const resources = Array.from(new Set(updatedLocal.filter(o => o.type === 'asteroid' && o.data).map(o => o.data!.resource as ResourceType)))

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
      if (!amount || amount <= 0) return
      const prices: Record<string, number> = { 'Iron': 10, 'Gold': 50, 'DarkMatter': 150 }
      set({
          credits: credits + (amount * (prices[resource] || 0)),
          cargo: { ...cargo, [resource]: 0 }
      })
  },
  
  buyFuel: () => {
      const { credits, fuel, maxFuel } = get()
      if (credits < 20 || fuel >= maxFuel) return
      set({ credits: credits - 20, fuel: maxFuel })
  },

  repairHull: () => {
      const { hull, maxHull, credits } = get()
      if (hull >= maxHull) return
      const damage = maxHull - hull
      const cost = damage * 10
      if (credits >= cost) {
          set({ credits: credits - cost, hull: maxHull })
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
          
          const debris: SpaceObject = { id: `debris-${Date.now()}`, type: 'debris', distance: dist, scanned: true }
          const container: SpaceObject = { 
              id: `loot-${Date.now()}`, type: 'container', distance: dist + 50, scanned: true,
              loot: { credits: rewardCredits }
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
      if (loot.resource && loot.amount) { 
          // newCargo[loot.resource] += loot.amount; 
          msg += `${loot.amount} ${loot.resource}.` 
      }

      const newObjects = [...localObjects]
      newObjects.splice(idx, 1)

      set({ credits: newCredits, cargo: newCargo, localObjects: newObjects, currentEventId: null })
      alert(msg)
  },

  closeEvent: () => set({ status: 'space', currentEventId: null })
}))