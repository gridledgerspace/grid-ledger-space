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
  
  // Старі поля (для сумісності)
  resourceType?: ResourceType
  resourceAmount?: number
  enemyLevel?: number
  loot?: {
      credits?: number
      resource?: ResourceType
      amount?: number
      module?: string
  }

  // 👇 НОВЕ ПОЛЕ: воно потрібне для майнінгу, щоб знати скільки залишилось
  data?: {
    resource: string
    amount: number
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
  cargo: Record<string, number>
  maxCargo: number
  modules: string[]

  currentSector: string
  targetSector: string | null

  visitedSectors: string[]
  // Глобальні ресурси сектору (синхронізуються з БД)
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
  
  scanCurrentSector: () => void // Завантаження даних з БД
  
  scanSystem: () => void
  mineObject: (id: string) => void
  extractResource: () => void
  sellResource: (resource: string) => void
  
  buyFuel: () => void // <--- ВИПРАВЛЕНО: Було refuelShip
  
  repairHull: () => void
  startCombat: (enemyId: string) => void
  playerAttack: () => void
  tryFlee: () => void
  endCombat: (win: boolean) => void
  openContainer: (id: string) => void
  closeEvent: () => void
}

// Генератор випадкових чисел на основі сіда (для стабільної генерації)
const pseudoRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(Math.sin(hash) * 10000) % 1;
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

      // Зберігаємо стан старого сектору
      const updatedSectorStates = {
          ...sectorStates,
          [currentSector]: localObjects 
      }

      set({ 
          status: 'space', 
          currentSector: targetSector, 
          targetSector: null, 
          localObjects: [], 
          sectorStates: updatedSectorStates, 
          currentEventId: null
      })

      // Запускаємо завантаження даних з БД для нового сектору
      get().scanCurrentSector()
  },

  // === 🔥 ГОЛОВНА ЛОГІКА ЗАВАНТАЖЕННЯ З БД ===
  scanCurrentSector: async () => {
    const { currentSector } = get()
    
    set({ inCombat: false, combatLog: [], currentEventId: null })

    // 1. СТАНЦІЯ (0:0)
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

    // 2. ОТРИМУЄМО РЕСУРСИ З БД
    const { data: sectorData } = await supabase
        .from('sectors')
        .select('last_depleted_at, iron_amount, gold_amount, dark_matter_amount')
        .eq('id', currentSector)
        .single()

    let currentRes = { iron: 0, gold: 0, darkMatter: 0 }

    if (sectorData) {
        currentRes = {
            iron: sectorData.iron_amount,
            gold: sectorData.gold_amount,
            darkMatter: sectorData.dark_matter_amount
        }
        
        // Перевірка на відновлення (3 години)
        if (sectorData.last_depleted_at) {
            const depletedTime = new Date(sectorData.last_depleted_at).getTime()
            const now = new Date().getTime()
            const hoursPassed = (now - depletedTime) / (1000 * 60 * 60)

            if (hoursPassed >= 3) {
                console.log('♻️ SECTOR REGENERATED!')
                const newIron = Math.floor(Math.random() * 500) + 100
                const newGold = Math.floor(Math.random() * 200)
                
                await supabase.from('sectors').update({
                    iron_amount: newIron,
                    gold_amount: newGold,
                    last_depleted_at: null
                }).eq('id', currentSector)

                currentRes = { iron: newIron, gold: newGold, darkMatter: 0 }
            }
        }
        // Оновлюємо глобальний стан ресурсів
        set({ sectorResources: currentRes })
    }

    // 3. ГЕНЕРАЦІЯ ОБ'ЄКТІВ НА ОСНОВІ ДАНИХ З БД
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

    // Генеруємо астероїди з реальними ресурсами
    const asteroidCount = Math.floor(Math.random() * 2) + 2 // 2-3 астероїди
    let remainingIron = totalIron
    let remainingGold = totalGold

    for (let i = 0; i < asteroidCount; i++) {
        const isLast = i === asteroidCount - 1
        
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
                scanned: true,
                // Заповнюємо обидва поля для сумісності
                resourceType: resourceType as ResourceType, 
                data: { resource: resourceType, amount: amount } 
            })
        }
    }

    // Шанс на ворога (на основі псевдорандому сектора, щоб не зникав при перезаході)
    if (pseudoRandom(currentSector) > 0.7) {
        objects.push({ id: `enemy-${currentSector}`, type: 'enemy', distance: 3000, scanned: true, enemyLevel: 1 })
    }

    set({ localObjects: objects })
  },

  // === 🔥 ВИПРАВЛЕНИЙ ВИДОБУТОК ІЗ ЗАПИСОМ В БД ===
  extractResource: async () => {
    const { localObjects, currentEventId, cargo, maxCargo, currentSector, sectorResources } = get()
    
    const targetIndex = localObjects.findIndex(obj => obj.id === currentEventId)
    if (targetIndex === -1) return

    const target = localObjects[targetIndex]
    if (!target.data) return 

    const resourceType = target.data.resource 
    const amountAvailable = target.data.amount

    // Перевірки
    const currentLoad = Object.values(cargo).reduce((a, b) => a + b, 0)
    if (currentLoad >= maxCargo) return 
    if (amountAvailable <= 0) return 

    // Видобуваємо 10 одиниць
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

    // 3. Оновлюємо ГЛОБАЛЬНІ РЕСУРСИ в Store
    const newSectorResources = { ...sectorResources }
    if (resourceType === 'Iron') newSectorResources.iron -= amountToMine
    if (resourceType === 'Gold') newSectorResources.gold -= amountToMine
    
    set({
        localObjects: updatedObjects,
        cargo: newCargo,
        sectorResources: newSectorResources,
        combatLog: [`> Extracted ${amountToMine}T of ${resourceType}`]
    })

    // 4. 🔥 ЗАПИС В СУПАБЕЙС (Fix Bug #1)
    const dbColumn = resourceType === 'Iron' ? 'iron_amount' : 'gold_amount'
    const newValue = resourceType === 'Iron' ? newSectorResources.iron : newSectorResources.gold
    
    const updateData: any = { [dbColumn]: newValue }
    
    // Перевірка на повне виснаження
    const isDepleted = (newSectorResources.iron + newSectorResources.gold) <= 0
    if (isDepleted) {
        updateData.last_depleted_at = new Date().toISOString()
    }

    console.log(`📡 SYNCING DB: ${dbColumn} = ${newValue}`) // Для відладки
    
    const { error } = await supabase
        .from('sectors')
        .update(updateData)
        .eq('id', currentSector)
    
    if (error) console.error('Mining sync error:', error)
  },

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
  
  // === 🔥 ВИПРАВЛЕНО: Функція перейменована на buyFuel (Fix Bug #2) ===
  buyFuel: () => {
      const { fuel, maxFuel, credits } = get()
      
      // Якщо бак повний - виходимо
      if (fuel >= maxFuel) {
          console.log('Fuel tank is full')
          return 
      }
      
      const missing = maxFuel - fuel
      const costPerUnit = 2
      const cost = missing * costPerUnit

      if (credits >= cost) {
          // Вистачає на повний бак
          set({ fuel: maxFuel, credits: credits - cost })
          console.log(`Refueled full: -${cost} CR`)
      } else {
          // Заливаємо на скільки вистачить грошей
          const possibleAmount = Math.floor(credits / costPerUnit)
          if (possibleAmount > 0) {
             set({ 
                 fuel: fuel + possibleAmount, 
                 credits: credits - (possibleAmount * costPerUnit) 
             })
             console.log(`Refueled partial: +${possibleAmount} units`)
          } else {
              console.log('Not enough credits for fuel')
          }
      }
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