import { create } from 'zustand'
import { supabase } from './supabase'

export type EntityType = 'asteroid' | 'enemy' | 'station' | 'empty' | 'debris' | 'container' | 'player'
export type ResourceType = 'Iron' | 'Gold' | 'DarkMatter'

export interface SpaceObject {
  id: string
  type: EntityType
  distance: number
  scanned: boolean
  playerName?: string 
  resourceType?: ResourceType
  enemyLevel?: number
  loot?: { credits?: number }
  data?: { resource: string, amount: number }
}

export interface SectorDetail {
    id: string
    hasResources: boolean
    isDepleted: boolean
    lastUpdated: number
}

export const getGridDistance = (s1: string, s2: string) => {
    if (!s1 || !s2) return 0
    const [x1, y1] = s1.split(':').map(Number)
    const [x2, y2] = s2.split(':').map(Number)
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
}

const getDistance = (s1: string, s2: string) => {
    const [x1, y1] = s1.split(':').map(Number)
    const [x2, y2] = s2.split(':').map(Number)
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

const generateSectorContent = (sectorId: string) => {
    const dist = getDistance('0:0', sectorId)
    
    // Шанс 30%, що сектор буде порожнім (якщо ми не біля старту)
    const isEmpty = Math.random() > 0.7 && dist > 2; 

    let iron = 0, gold = 0, darkMatter = 0, enemies = 0
    let enemyLvl = 1

    if (!isEmpty) {
        if (dist < 3) {
            iron = Math.floor(Math.random() * 300) + 100 
            gold = Math.random() > 0.8 ? Math.floor(Math.random() * 50) : 0 
            enemies = 0 
        } else if (dist < 8) {
            iron = Math.random() > 0.3 ? Math.floor(Math.random() * 200) + 50 : 0
            gold = Math.random() > 0.5 ? Math.floor(Math.random() * 150) + 50 : 0
            enemies = Math.random() > 0.6 ? Math.floor(Math.random() * 2) + 1 : 0 
            enemyLvl = 1
        } else {
            iron = Math.random() > 0.5 ? Math.floor(Math.random() * 100) : 0
            gold = Math.floor(Math.random() * 300) + 100
            darkMatter = Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 10 : 0
            enemies = Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 1 : 0 
            enemyLvl = Math.floor(Math.random() * 3) + 2 
        }
    }
    
    return { iron, gold, darkMatter, enemies, enemyLvl }
}

interface GameState {
  status: 'hangar' | 'map' | 'warping' | 'space' | 'mining' | 'combat' | 'debris'
  currentSectorType: 'wild' | 'station'
  credits: number
  hull: number
  maxHull: number
  jumpRange: number 
  cargo: Record<string, number>
  maxCargo: number
  modules: string[]
  currentSector: string
  targetSector: string | null
  userId: string | null
  visitedSectors: string[]
  sectorResources: { iron: number, gold: number, darkMatter: number }
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
  updatePresence: () => Promise<void>
  scanSystem: () => void
  mineObject: (id: string) => void
  extractResource: () => void
  sellResource: (resource: string) => void
  repairHull: () => void
  startCombat: (enemyId: string) => void
  playerAttack: () => void
  tryFlee: () => void
  endCombat: (win: boolean) => void
  openContainer: (id: string) => void
  closeEvent: () => void
  setUserId: (id: string) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'hangar',
  credits: 1000,
  hull: 100,
  maxHull: 100,
  jumpRange: 1, 
  cargo: { Iron: 0, Gold: 0, DarkMatter: 0 },
  maxCargo: 50,
  modules: ['scanner', 'mining_laser'],
  currentSectorType: 'wild',
  currentSector: '0:0',
  targetSector: null,
  userId: null,
  visitedSectors: ['0:0'],
  sectorResources: { iron: 0, gold: 0, darkMatter: 0 },
  localObjects: [],
  sectorDetails: {},
  currentEventId: null,
  inCombat: false,
  enemyMaxHp: 100,
  enemyHp: 100,
  combatLog: [],

  setUserId: (id) => set({ userId: id }),
  setTargetSector: (sector) => set({ targetSector: sector }),

  // Просте закриття події, щоб прибрати оверлей
  closeEvent: () => set({ currentEventId: null }),

  updatePresence: async () => {
      const { userId, currentSector } = get()
      if (!userId) return
      await supabase.from('profiles').update({
          current_sector: currentSector,
          last_active: new Date().toISOString()
      }).eq('id', userId)
  },

  startWarp: () => {
      const { targetSector, currentSector, jumpRange } = get()
      if (!targetSector) return
      const dist = getGridDistance(currentSector, targetSector)
      if (dist > jumpRange) {
          alert('JUMP RANGE EXCEEDED! UPGRADE ENGINE.')
          return
      }
      set({ status: 'warping' })
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
      get().updatePresence().then(() => {
          get().scanCurrentSector()
      })
  },

  scanCurrentSector: async () => {
    const { currentSector, userId } = get()
    // Скидаємо все при вході в новий сектор
    set({ inCombat: false, combatLog: [], currentEventId: null })
    get().updatePresence()

    if (currentSector === '0:0') {
      set({
        localObjects: [{ id: 'station-alpha', type: 'station', distance: 2000, scanned: true }],
        currentSectorType: 'station',
        combatLog: ['> Docking beacon detected.']
      })
      return
    }
    set({ currentSectorType: 'wild' })

    const { data: sectorData } = await supabase.from('sectors').select('*').eq('id', currentSector).single()

    let currentRes = { iron: 0, gold: 0, darkMatter: 0 }
    let enemyCount = 0

    if (sectorData) {
        let isRegenerated = false
        if (sectorData.last_depleted_at) {
            const depTime = new Date(sectorData.last_depleted_at).getTime()
            const now = new Date().getTime()
            if ((now - depTime) >= 3 * 60 * 60 * 1000) isRegenerated = true
        }

        if (isRegenerated) {
            const gen = generateSectorContent(currentSector)
            await supabase.from('sectors').update({
                iron_amount: gen.iron, gold_amount: gen.gold, dark_matter_amount: gen.darkMatter,
                enemy_count: gen.enemies, last_depleted_at: null
            }).eq('id', currentSector)
            currentRes = { iron: gen.iron, gold: gen.gold, darkMatter: gen.darkMatter }
            enemyCount = gen.enemies
        } else {
            currentRes = { iron: sectorData.iron_amount, gold: sectorData.gold_amount, darkMatter: sectorData.dark_matter_amount }
            enemyCount = sectorData.enemy_count
        }
    } else {
        const gen = generateSectorContent(currentSector)
        await supabase.from('sectors').update({
            iron_amount: gen.iron, gold_amount: gen.gold, dark_matter_amount: gen.darkMatter, enemy_count: gen.enemies
        }).eq('id', currentSector)
        currentRes = { iron: gen.iron, gold: gen.gold, darkMatter: gen.darkMatter }
        enemyCount = gen.enemies
    }

    set({ sectorResources: currentRes })

    const objects: SpaceObject[] = []

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: players } = await supabase
        .from('profiles').select('id').eq('current_sector', currentSector)
        .neq('id', userId).gt('last_active', fiveMinutesAgo)

    if (players) {
        players.forEach((p, index) => {
            objects.push({
                id: `player-${p.id}`, type: 'player', distance: 1000 + (index * 500), scanned: true,
                playerName: `Pilot ${p.id.slice(0, 4)}`
            })
        })
    }
    
    // Генерація ворогів
    for (let i = 0; i < enemyCount; i++) {
        objects.push({ id: `enemy-${i}-${Date.now()}`, type: 'enemy', distance: 2500 + (i * 500), scanned: true, enemyLevel: 1 })
    }
    
    // 🔥 1. ПУШ-СПОВІЩЕННЯ ПРИ ВХОДІ
    if (enemyCount > 0) {
        set({ 
            combatLog: [`> WARNING: HOSTILE SCAN DETECTED!`, `> ENEMIES IN SECTOR: ${enemyCount}`],
            // Активуємо червоне вікно попередження
            currentEventId: 'hostile_scan' 
        }) 
    }

    let asteroidIndex = 0
    if (currentRes.iron > 0) {
        const chunks = currentRes.iron > 300 ? 2 : 1
        const amountPerChunk = Math.floor(currentRes.iron / chunks)
        for(let i=0; i<chunks; i++) {
             objects.push({ id: `ast-iron-${i}`, type: 'asteroid', distance: 3000 + (asteroidIndex * 800), scanned: true, data: { resource: 'Iron', amount: amountPerChunk } })
            asteroidIndex++
        }
    }
    if (currentRes.gold > 0) {
         objects.push({ id: `ast-gold`, type: 'asteroid', distance: 3200 + (asteroidIndex * 800), scanned: true, data: { resource: 'Gold', amount: currentRes.gold } })
        asteroidIndex++
    }
    if (currentRes.darkMatter > 0) {
         objects.push({ id: `ast-dm`, type: 'asteroid', distance: 4000, scanned: true, data: { resource: 'DarkMatter', amount: currentRes.darkMatter } })
    }

    if (objects.length === 0) {
         objects.push({ id: 'debris-1', type: 'debris', distance: 2000, scanned: true })
    }

    set({ localObjects: objects })
  },

  scanSystem: () => {
      const { localObjects } = get()
      const updated = localObjects.map(o => ({ ...o, scanned: true }))
      set({ localObjects: updated })
  },
  
  fetchSectorGrid: async (center: string) => {
      if (!center) return
      const [cx, cy] = center.split(':').map(Number)
      const gridSize = 4 
      const idsToFetch: string[] = []
      for (let y = cy - gridSize; y <= cy + gridSize; y++) {
          for (let x = cx - gridSize; x <= cx + gridSize; x++) { idsToFetch.push(`${x}:${y}`) }
      }
      const { data } = await supabase.from('sectors').select('id, iron_amount, gold_amount, dark_matter_amount, enemy_count, last_depleted_at').in('id', idsToFetch)
      if (!data) return
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
          newDetails[row.id] = { id: row.id, hasResources, isDepleted, lastUpdated: now }
      })
      set(state => ({ sectorDetails: { ...state.sectorDetails, ...newDetails } }))
  },

  // 🔥 2. ЗАСІДКА (AMBUSH) ТА СОРТУВАННЯ КАМЕРИ
  mineObject: (id) => {
      const { localObjects } = get()
      
      // Перевіряємо наявність ворогів
      const enemy = localObjects.find(o => o.type === 'enemy')
      
      if (enemy) {
          // --- СЦЕНАРІЙ ЗАСІДКИ ---
          
          // А. Переміщуємо ВОРОГА на початок масиву (щоб камера полетіла до нього)
          const newOrder = [...localObjects].sort((a, b) => {
              if (a.id === enemy.id) return -1
              if (b.id === enemy.id) return 1
              return 0
          })

          // Б. Вмикаємо напис AMBUSH та оновлюємо об'єкти
          set({ 
              localObjects: newOrder,
              currentEventId: 'ambush', 
              combatLog: ['> ALERT: MINING SENSORS ATTRACTED HOSTILES!']
          })

          // В. Затримка 2.5с перед стартом бою (щоб гравець побачив ворога)
          setTimeout(() => {
              get().startCombat(enemy.id)
              set({ currentEventId: null }) // Прибираємо напис, бо починається бій
          }, 2500)

      } else {
          // --- ЗВИЧАЙНИЙ ВИДОБУТОК ---
          
          // А. Переміщуємо РУДУ на початок масиву (щоб камера полетіла до неї)
          const newOrder = [...localObjects].sort((a, b) => {
              if (a.id === id) return -1
              if (b.id === id) return 1
              return 0
          })

          // Б. Відкриваємо вікно майнінгу
          set({ 
              status: 'mining', 
              currentEventId: id,
              localObjects: newOrder 
          })
      }
  },

  extractResource: async () => {
    get().updatePresence()
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
    const updatedObjects = [...localObjects]
    updatedObjects[targetIndex] = { ...target, data: { ...target.data, amount: amountAvailable - amountToMine } }
    if (updatedObjects[targetIndex].data!.amount <= 0) updatedObjects[targetIndex].type = 'debris'
    const newCargo = { ...cargo }
    newCargo[resourceType] = (newCargo[resourceType] || 0) + amountToMine
    const newSectorResources = { ...sectorResources }
    if (resourceType === 'Iron') newSectorResources.iron -= amountToMine
    if (resourceType === 'Gold') newSectorResources.gold -= amountToMine
    if (resourceType === 'DarkMatter') newSectorResources.darkMatter -= amountToMine
    set({ localObjects: updatedObjects, cargo: newCargo, sectorResources: newSectorResources, combatLog: [`> Extracted ${amountToMine}T of ${resourceType}`] })
    
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
      get().updatePresence()
      const { cargo, credits } = get()
      const amount = cargo[resource]
      if (!amount || amount <= 0) return
      const prices: Record<string, number> = { 'Iron': 10, 'Gold': 50, 'DarkMatter': 150 }
      set({ credits: credits + (amount * (prices[resource] || 0)), cargo: { ...cargo, [resource]: 0 } })
  },
  
  repairHull: () => {
      const { hull, maxHull, credits } = get()
      if (hull >= maxHull) return
      const damage = maxHull - hull
      const cost = damage * 10
      if (credits >= cost) { set({ credits: credits - cost, hull: maxHull }) }
  },

  startCombat: (enemyId) => {
      get().updatePresence()
      const { localObjects } = get()
      const enemy = localObjects.find(o => o.id === enemyId)
      if (!enemy) return
      const hp = 50 + (enemy.enemyLevel || 1) * 20
      set({ status: 'combat', currentEventId: enemyId, inCombat: true, enemyMaxHp: hp, enemyHp: hp, combatLog: ['WARNING: HOSTILE ENGAGED! SYSTEM READY.'] })
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
          const container: SpaceObject = { id: `loot-${Date.now()}`, type: 'container', distance: dist + 50, scanned: true, loot: { credits: rewardCredits } }
          set({ status: 'space', inCombat: false, localObjects: [...filteredObjects, debris, container], currentEventId: null, combatLog: [] })
          supabase.rpc('decrement_enemy_count', { row_id: currentSector }).then(({ error }) => {
               if (error) { 
                   supabase.from('sectors').select('enemy_count').eq('id', currentSector).single().then(({ data }) => {
                        if (data && data.enemy_count > 0) supabase.from('sectors').update({ enemy_count: data.enemy_count - 1 }).eq('id', currentSector).then()
                   })
               }
          })
      } else {
          alert('CRITICAL FAILURE. SHIP DESTROYED.')
          set({ status: 'hangar', currentSector: '0:0', hull: 100, cargo: { Iron: 0, Gold: 0, DarkMatter: 0 }, inCombat: false, combatLog: [] })
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
  }
}))