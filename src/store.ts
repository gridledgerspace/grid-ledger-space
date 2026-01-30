import { create } from 'zustand'
import { supabase } from './supabase'

export type EntityType = 'asteroid' | 'enemy' | 'station' | 'empty' | 'debris' | 'container'
export type ResourceType = 'Iron' | 'Gold' | 'DarkMatter'

export interface SpaceObject {
  id: string
  type: EntityType
  distance: number
  scanned: boolean
  
  // Для сумісності
  resourceType?: ResourceType
  enemyLevel?: number
  loot?: {
      credits?: number
  }

  // Дані для майнінгу
  data?: {
    resource: string
    amount: number
  }
}

export interface SectorDetail {
    id: string
    hasResources: boolean
    isDepleted: boolean
    lastUpdated: number
}

// === ДОПОМІЖНІ ФУНКЦІЇ ===

// 1. Розрахунок відстані між секторами
const getDistance = (s1: string, s2: string) => {
    const [x1, y1] = s1.split(':').map(Number)
    const [x2, y2] = s2.split(':').map(Number)
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

export const calculateFuelCost = (current: string, target: string): number => {
    if (!current || !target) return 0
    return Math.ceil(getDistance(current, target) * 10)
}

// 2. Генератор контенту на основі відстані (ПРОГРЕСІЯ)
const generateSectorContent = (sectorId: string) => {
    const dist = getDistance('0:0', sectorId)
    
    // БАЗОВІ ЗНАЧЕННЯ
    let iron = 0, gold = 0, darkMatter = 0, enemies = 0
    let enemyLvl = 1

    // === ЗОНА 1: БЕЗПЕЧНА (Радіус < 3) ===
    if (dist < 3) {
        iron = Math.floor(Math.random() * 300) + 100 
        gold = Math.random() > 0.8 ? Math.floor(Math.random() * 50) : 0 
        enemies = 0 
    } 
    // === ЗОНА 2: ФРОНТИР (Радіус 3 - 7) ===
    else if (dist < 8) {
        iron = Math.floor(Math.random() * 200) + 50
        gold = Math.floor(Math.random() * 150) + 50
        enemies = Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0 
        enemyLvl = 1
    }
    // === ЗОНА 3: ГЛИБОКИЙ КОСМОС (Радіус 8+) ===
    else {
        iron = Math.floor(Math.random() * 100)
        gold = Math.floor(Math.random() * 300) + 100
        darkMatter = Math.random() > 0.6 ? Math.floor(Math.random() * 50) + 10 : 0
        enemies = Math.floor(Math.random() * 3) + 2 
        enemyLvl = Math.floor(Math.random() * 3) + 2 
    }

    return { iron, gold, darkMatter, enemies, enemyLvl }
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
  sectorResources: {
    iron: number
    gold: number
    darkMatter: number
  }
  
  localObjects: SpaceObject[]
  sectorDetails: Record<string, SectorDetail>
  
  currentEventId: string | null
  inCombat: boolean
  enemyMaxHp: number
  enemyHp: number
  combatLog: string[]

  setTargetSector: (sector: string) => void
  startWarp: () => void
  completeWarp: () => void
  scanCurrentSector: () => void 
  fetchSectorGrid: (center: string) => Promise<void>
  
  mineObject: (id: string) => void
  extractResource: () => void
  sellResource: (resource: string) => void
  buyFuel: () => void
  repairHull: () => void
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
  sectorDetails: {},

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
      const { targetSector } = get()
      if (!targetSector) return

      set({ 
          status: 'space', 
          currentSector: targetSector, 
          targetSector: null, 
          localObjects: [], 
          currentEventId: null
      })

      get().scanCurrentSector()
  },

  scanCurrentSector: async () => {
    const { currentSector } = get()
    set({ inCombat: false, combatLog: [], currentEventId: null })

    // 1. СТАНЦІЯ
    if (currentSector === '0:0') {
      set({
        localObjects: [{ id: 'station-alpha', type: 'station', distance: 2000, scanned: true }],
        currentSectorType: 'station',
        combatLog: ['> Docking beacon detected.']
      })
      return
    }
    set({ currentSectorType: 'wild' })

    // 2. ОТРИМУЄМО ДАНІ З БД
    const { data: sectorData } = await supabase
        .from('sectors')
        .select('*')
        .eq('id', currentSector)
        .single()

    let currentRes = { iron: 0, gold: 0, darkMatter: 0 }
    let enemyCount = 0

    if (sectorData) {
        // Перевірка на регенерацію (3 години)
        let isRegenerated = false
        if (sectorData.last_depleted_at) {
            const depTime = new Date(sectorData.last_depleted_at).getTime()
            const now = new Date().getTime()
            if ((now - depTime) >= 3 * 60 * 60 * 1000) {
                isRegenerated = true
            }
        }

        if (isRegenerated) {
            console.log('♻️ SECTOR REGENERATED!')
            const gen = generateSectorContent(currentSector)
            
            await supabase.from('sectors').update({
                iron_amount: gen.iron,
                gold_amount: gen.gold,
                dark_matter_amount: gen.darkMatter,
                enemy_count: gen.enemies,
                last_depleted_at: null
            }).eq('id', currentSector)
            
            currentRes = { iron: gen.iron, gold: gen.gold, darkMatter: gen.darkMatter }
            enemyCount = gen.enemies
        } else {
            currentRes = {
                iron: sectorData.iron_amount,
                gold: sectorData.gold_amount,
                darkMatter: sectorData.dark_matter_amount
            }
            enemyCount = sectorData.enemy_count
        }
    } else {
        // Новий сектор
        console.log('✨ NEW SECTOR GENERATED')
        const gen = generateSectorContent(currentSector)
        
        await supabase.from('sectors').update({
            iron_amount: gen.iron,
            gold_amount: gen.gold,
            dark_matter_amount: gen.darkMatter,
            enemy_count: gen.enemies
        }).eq('id', currentSector)

        currentRes = { iron: gen.iron, gold: gen.gold, darkMatter: gen.darkMatter }
        enemyCount = gen.enemies
    }

    set({ sectorResources: currentRes })

    // 3. СТВОРЕННЯ ОБ'ЄКТІВ
    const objects: SpaceObject[] = []
    
    // А) ВОРОГИ
    for (let i = 0; i < enemyCount; i++) {
        objects.push({ 
            id: `enemy-${i}-${Date.now()}`, 
            type: 'enemy', 
            distance: 2500 + (i * 500), 
            scanned: true, 
            enemyLevel: 1 
        })
    }

    if (enemyCount > 0) {
        set({ inCombat: true, combatLog: [`> WARNING: ${enemyCount} HOSTILE SIGNATURES!`] })
    }

    // Б) РЕСУРСИ (Паралельний спавн)
    let asteroidIndex = 0

    // Залізо
    if (currentRes.iron > 0) {
        const chunks = currentRes.iron > 300 ? 2 : 1
        const amountPerChunk = Math.floor(currentRes.iron / chunks)
        
        for(let i=0; i<chunks; i++) {
             objects.push({
                id: `ast-iron-${i}`,
                type: 'asteroid',
                distance: 3000 + (asteroidIndex * 800),
                scanned: true,
                data: { resource: 'Iron', amount: amountPerChunk }
            })
            asteroidIndex++
        }
    }

    // Золото
    if (currentRes.gold > 0) {
         objects.push({
            id: `ast-gold`,
            type: 'asteroid',
            distance: 3200 + (asteroidIndex * 800),
            scanned: true,
            data: { resource: 'Gold', amount: currentRes.gold }
        })
        asteroidIndex++
    }

    // Темна матерія
    if (currentRes.darkMatter > 0) {
         objects.push({
            id: `ast-dm`,
            type: 'asteroid',
            distance: 4000, 
            scanned: true,
            data: { resource: 'DarkMatter', amount: currentRes.darkMatter }
        })
    }

    // В) СМІТТЯ
    if (objects.length === 0) {
         objects.push({ id: 'debris-1', type: 'debris', distance: 2000, scanned: true })
         objects.push({ id: 'debris-2', type: 'debris', distance: 3500, scanned: true })
    }

    set({ localObjects: objects })
  },

  fetchSectorGrid: async (center: string) => {
      if (!center) return
      const [cx, cy] = center.split(':').map(Number)
      const gridSize = 2
      const idsToFetch: string[] = []

      for (let y = cy - gridSize; y <= cy + gridSize; y++) {
          for (let x = cx - gridSize; x <= cx + gridSize; x++) {
              idsToFetch.push(`${x}:${y}`)
          }
      }

      const { data, error } = await supabase
          .from('sectors')
          .select('id, iron_amount, gold_amount, dark_matter_amount, enemy_count, last_depleted_at')
          .in('id', idsToFetch)

      if (error || !data) return

      const newDetails: Record<string, SectorDetail> = {}
      const now = new Date().getTime()

      data.forEach((row: any) => {
          let isDepleted = false
          if (row.last_depleted_at) {
              const depTime = new Date(row.last_depleted_at).getTime()
              if ((now - depTime) < 3 * 60 * 60 * 1000) isDepleted = true
          }

          const totalRes = (row.iron_amount || 0) + (row.gold_amount || 0) + (row.dark_matter_amount || 0)
          const hasResources = totalRes > 0 && !isDepleted

          newDetails[row.id] = {
              id: row.id,
              hasResources,
              isDepleted,
              lastUpdated: now
          }
      })

      set(state => ({ sectorDetails: { ...state.sectorDetails, ...newDetails } }))
  },

  // === 🔥 ОСЬ ФУНКЦІЯ, ЯКУ Я ПРОПУСТИВ МИНУЛОГО РАЗУ 🔥 ===
  mineObject: (id) => set({ status: 'mining', currentEventId: id }),
  // ========================================================

  extractResource: async () => {
    const { localObjects, currentEventId, cargo, maxCargo, currentSector, sectorResources } = get()
    
    const targetIndex = localObjects.findIndex(obj => obj.id === currentEventId)
    if (targetIndex === -1) return

    const target = localObjects[targetIndex]
    if (!target.data) return 

    const resourceType = target.data.resource 
    const amountAvailable = target.data.amount

    const currentLoad = Object.values(cargo).reduce((a, b) => a + b, 0)
    if (currentLoad >= maxCargo) return 
    if (amountAvailable <= 0) return 

    const amountToMine = Math.min(10, amountAvailable, maxCargo - currentLoad)

    // 1. Оновлюємо локально
    const updatedObjects = [...localObjects]
    updatedObjects[targetIndex] = {
        ...target,
        data: { ...target.data, amount: amountAvailable - amountToMine }
    }
    
    if (updatedObjects[targetIndex].data!.amount <= 0) {
        updatedObjects[targetIndex].type = 'debris'
    }

    // 2. Вантаж
    const newCargo = { ...cargo }
    newCargo[resourceType] = (newCargo[resourceType] || 0) + amountToMine

    // 3. Глобальні ресурси
    const newSectorResources = { ...sectorResources }
    if (resourceType === 'Iron') newSectorResources.iron -= amountToMine
    if (resourceType === 'Gold') newSectorResources.gold -= amountToMine
    if (resourceType === 'DarkMatter') newSectorResources.darkMatter -= amountToMine

    set({
        localObjects: updatedObjects,
        cargo: newCargo,
        sectorResources: newSectorResources,
        combatLog: [`> Extracted ${amountToMine}T of ${resourceType}`]
    })

    // 4. Запис у БД
    const updateData: any = {}
    if (resourceType === 'Iron') updateData.iron_amount = newSectorResources.iron
    if (resourceType === 'Gold') updateData.gold_amount = newSectorResources.gold
    if (resourceType === 'DarkMatter') updateData.dark_matter_amount = newSectorResources.darkMatter

    if ((newSectorResources.iron + newSectorResources.gold + newSectorResources.darkMatter) <= 0) {
        updateData.last_depleted_at = new Date().toISOString()
    }

    supabase.from('sectors').update(updateData).eq('id', currentSector).then()
  },

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
      const { fuel, maxFuel, credits } = get()
      if (fuel >= maxFuel) return 
      
      const missing = maxFuel - fuel
      const cost = missing * 2 

      if (credits >= cost) {
          set({ fuel: maxFuel, credits: credits - cost })
      } else {
          const possible = Math.floor(credits / 2)
          if (possible > 0) {
             set({ fuel: fuel + possible, credits: credits - (possible * 2) })
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
      const { localObjects, currentEventId, currentSector } = get()
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
              status: 'space', 
              inCombat: false, 
              localObjects: [...filteredObjects, debris, container], 
              currentEventId: null, 
              combatLog: []
          })

          supabase
            .from('sectors')
            .select('enemy_count')
            .eq('id', currentSector)
            .single()
            .then(({ data }) => {
                if (data && data.enemy_count > 0) {
                    supabase.from('sectors').update({ enemy_count: data.enemy_count - 1 }).eq('id', currentSector).then()
                }
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

      const newObjects = [...localObjects]
      newObjects.splice(idx, 1)

      set({ credits: newCredits, cargo: newCargo, localObjects: newObjects, currentEventId: null })
      alert(msg)
  },

  closeEvent: () => set({ status: 'space', currentEventId: null })
}))