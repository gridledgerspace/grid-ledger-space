import { create } from 'zustand'

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
  status: 'hangar' | 'map' | 'warping' | 'space' | 'mining' | 'combat'
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

  extractResource: () => {
      const { localObjects, currentEventId, cargo, maxCargo } = get()
      const targetIndex = localObjects.findIndex(obj => obj.id === currentEventId)
      if (targetIndex === -1) return

      const target = localObjects[targetIndex]
      if (!target.resourceAmount || !target.resourceType) return

      const currentLoad = Object.values(cargo).reduce((a, b) => a + b, 0)
      const spaceLeft = maxCargo - currentLoad
      if (spaceLeft <= 0) return 

      const amount = Math.min(25, target.resourceAmount, spaceLeft)
      const newObjects = [...localObjects]
      newObjects[targetIndex] = { ...target, resourceAmount: target.resourceAmount - amount }

      if (newObjects[targetIndex].resourceAmount! <= 0) {
          // Астероїд вичерпано -> перетворюємо його на пустий камінь або видаляємо
          newObjects.splice(targetIndex, 1)
          set({ status: 'space', currentEventId: null })
      }

      set({
          localObjects: newObjects,
          cargo: { ...cargo, [target.resourceType]: cargo[target.resourceType] + amount }
      })
  },

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

  scanCurrentSector: () => {
    const { currentSectorType } = get() // <--- Дивимось тип
    
    // ЯКЩО ЦЕ СТАНЦІЯ (будь-де, хоч 0:0, хоч 100:100)
    if (currentSectorType === 'station') {
      set({
        localObjects: [{ 
          id: 'station-alpha', 
          type: 'station', 
          distance: 1000, 
          scanned: true 
        }],
        inCombat: false,
        combatLog: ['> Docking beacon detected.', '> Station approach vector locked.']
      })
      return
    }

    // ЯКЩО ДИКИЙ КОСМОС (все як раніше)
    const rng = Math.random()
    if (rng > 0.7) {
       const enemy: SpaceObject = { id: `enemy-${Date.now()}`, type: 'enemy', distance: 3000, scanned: true }
       set({ localObjects: [enemy], inCombat: true, combatLog: ['> WARNING: HOSTILE SIGNATURE DETECTED!'] })
    } else {
       const asteroid: SpaceObject = { id: `asteroid-${Date.now()}`, type: 'asteroid', distance: 2500, scanned: true }
       set({ localObjects: [asteroid], inCombat: false, combatLog: ['> Asteroid field detected.', '> Mining scanners active.'] })
    }
  },

  closeEvent: () => set({ status: 'space', currentEventId: null })
}))