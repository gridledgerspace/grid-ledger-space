import { create } from 'zustand'
import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

// === 1. ТИПИ ТА ІНТЕРФЕЙСИ ===

export type EntityType = 'asteroid' | 'enemy' | 'station' | 'empty' | 'debris' | 'container' | 'player'
export type ResourceType = 'Iron' | 'Gold' | 'DarkMatter'

export interface LootItem {
    type: 'resource' | 'credits' | 'module' | 'weapon' | 'engine'
    id: string
    name: string
    amount?: number
    icon?: string
    price?: number
    origin?: 'standard' | 'crafted'
}

export interface GameNotification {
    id: string
    message: string
    type: 'success' | 'warning' | 'error' | 'info'
}

export interface SectorDetail {
    id: string
    hasResources: boolean
    hasEnemies: boolean
    isDepleted: boolean
    lastUpdated: number
}

export interface EquippedItems {
    [key: string]: LootItem | null 
}

export interface SpaceObject {
    id: string
    type: EntityType
    distance: number
    scanned: boolean
    playerName?: string 
    enemyLevel?: number
    data?: {
        resource?: ResourceType
        amount?: number
        loot?: LootItem[] 
    }
}

// КОНФІГУРАЦІЯ КОРАБЛІВ
export const SHIP_SPECS: Record<string, { 
    name: string, type: string, maxHull: number, armor: number, 
    maxCargo: number, maxSlots: number, jumpRange: number, price: number, desc: string
}> = {
    'scout': { name: 'PHOENIX', type: 'STARTER', maxHull: 100, armor: 0, maxCargo: 30, maxSlots: 6, jumpRange: 1, price: 0, desc: 'Reliable starter.' },
    'interceptor': { name: 'MK-2 PREDATOR', type: 'FIGHTER', maxHull: 300, armor: 20, maxCargo: 50, maxSlots: 8, jumpRange: 2, price: 15000, desc: 'Heavy armor fighter.' },
    'hauler': { name: 'HV-1 BEHEMOTH', type: 'HAULER', maxHull: 600, armor: 40, maxCargo: 500, maxSlots: 3, jumpRange: 1, price: 35000, desc: 'Deep space miner.' },
    'explorer': { name: 'NX-5 VELOCITY', type: 'EXPLORER', maxHull: 150, armor: 5, maxCargo: 60, maxSlots: 5, jumpRange: 4, price: 20000, desc: 'Advanced warp drive.' }
}

// === ДОПОМІЖНІ ФУНКЦІЇ ===

export const getGridDistance = (s1: string, s2: string) => {
    if (!s1 || !s2) return 0
    const [x1, y1] = s1.split(':').map(Number)
    const [x2, y2] = s2.split(':').map(Number)
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
}

const generateSectorContent = (sectorId: string) => {
    const [x, y] = sectorId.split(':').map(Number)
    const dist = Math.sqrt(x*x + y*y)
    const isEmpty = Math.random() > 0.7 && dist > 2; 

    let iron = 0, gold = 0, darkMatter = 0, enemies = 0, enemyLvl = 1

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

const recalculateShipStats = (shipClass: string, equipped: EquippedItems) => {
    const base = SHIP_SPECS[shipClass] || SHIP_SPECS['scout']
    let bonusHull = 0
    let bonusCargo = 0
    let bonusJump = 0

    Object.values(equipped).forEach(item => {
        if (!item) return
        const name = item.name.toLowerCase()
        if (name.includes('shield')) bonusHull += 50
        if (name.includes('hull')) bonusHull += 100
        if (name.includes('cargo')) bonusCargo += 20
        if (name.includes('warp drive mk-2')) bonusJump += 1
        if (name.includes('warp drive mk-3')) bonusJump += 2
    })

    // Генеруємо список модулів для зворотної сумісності (наприклад, для функції mineObject)
    const moduleList: string[] = []
    Object.values(equipped).forEach(item => {
        if(!item) return
        moduleList.push(item.id)
        
        const name = item.name.toLowerCase()
        // Додаємо системні теги
        if(name.includes('mining')) moduleList.push('mining_laser')
        if(name.includes('scanner')) moduleList.push('scanner')
    })

    return {
        maxHull: base.maxHull + bonusHull,
        maxCargo: base.maxCargo + bonusCargo,
        jumpRange: base.jumpRange + bonusJump,
        modules: moduleList
    }
}

// === STORE INTERFACE ===

interface GameState {
  status: 'hangar' | 'map' | 'warping' | 'space' | 'mining' | 'combat' | 'debris'
  currentSectorType: 'wild' | 'station'
  credits: number
  shipClass: string 
  hull: number
  maxHull: number
  jumpRange: number 
  cargo: Record<string, number>
  maxCargo: number
  modules: string[] 
  inventory: LootItem[]
  equipped: EquippedItems
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
  isStationOpen: boolean
  setStationOpen: (isOpen: boolean) => void
  realtimeChannel: RealtimeChannel | null
  notifications: GameNotification[]
  lootContainer: LootItem[] | null 
  
  // Actions
  addNotification: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void
  removeNotification: (id: string) => void
  setUserId: (id: string) => void
  buyShip: (shipClass: string) => void
  setTargetSector: (sector: string) => void
  startWarp: () => void
  completeWarp: () => void
  scanCurrentSector: () => Promise<void> 
  subscribeToSector: () => void 
  fetchSectorGrid: (center: string) => Promise<void>
  updatePresence: () => Promise<void>
  scanSystem: () => void
  mineObject: (id: string) => void
  extractResource: () => Promise<void>
  sellResource: (resource: string) => void
  repairHull: () => void
  startCombat: (enemyId: string) => void
  playerAttack: () => void
  tryFlee: () => void
  endCombat: (win: boolean) => void
  openContainer: (id: string) => void
  closeLoot: () => void
  takeLootItem: (index: number) => void
  takeAllLoot: () => void
  closeEvent: () => void
  
  // Inventory Actions
  equipItem: (item: LootItem, slotId: string) => void
  unequipItem: (slotId: string) => void
  dropItem: (itemId: string) => void
}

// === ZUSTAND STORE IMPLEMENTATION ===

export const useGameStore = create<GameState>((set, get) => ({
  status: 'hangar',
  credits: 1000,
  shipClass: 'scout',
  hull: 100,
  maxHull: 100,
  jumpRange: 1, 
  cargo: { Iron: 0, Gold: 0, DarkMatter: 0 },
  maxCargo: 30,
  modules: [],
  inventory: [],
  equipped: {},
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
  isStationOpen: false,
  realtimeChannel: null,
  notifications: [],
  lootContainer: null,

  setStationOpen: (isOpen) => set({ isStationOpen: isOpen }),

  addNotification: (message, type = 'info') => {
      const id = Math.random().toString(36).substr(2, 9)
      set(state => ({ notifications: [...state.notifications, { id, message, type }] }))
      setTimeout(() => get().removeNotification(id), 3000)
  },

  removeNotification: (id) => {
      set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }))
  },

  setUserId: async (id) => {
      set({ userId: id })
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single()

      if (data) {
          const savedClass = data.ship_class || 'scout'
          const equipped = data.equipped || {}
          const stats = recalculateShipStats(savedClass, equipped)

          let inventory = data.inventory || []
          // Видаємо стартовий набір, якщо гравець "голий"
          if (inventory.length === 0 && Object.keys(equipped).length === 0) {
              inventory = [
                  { id: 'start_mining', name: 'Mining Laser MK-1', type: 'module', icon: 'pickaxe', origin: 'standard' },
                  { id: 'start_engine', name: 'Warp Drive MK-1', type: 'engine', icon: 'zap', origin: 'standard' }
              ]
          }

          set({ 
              credits: data.credits,
              shipClass: savedClass,
              hull: data.hull,
              cargo: data.cargo || { Iron: 0, Gold: 0, DarkMatter: 0 },
              inventory: inventory,
              equipped: equipped,
              maxHull: stats.maxHull,
              maxCargo: stats.maxCargo,
              jumpRange: stats.jumpRange,
              modules: stats.modules
          })
      }
  },

  // === INVENTORY SYSTEM ===

  equipItem: async (item, slotId) => {
      const { equipped, inventory, userId, shipClass } = get()
      
      const newInventory = inventory.filter(i => i.id !== item.id)
      const currentItem = equipped[slotId]
      if (currentItem) {
          newInventory.push(currentItem)
      }
      
      const newEquipped = { ...equipped, [slotId]: item }
      const stats = recalculateShipStats(shipClass, newEquipped)

      set({ 
          inventory: newInventory, 
          equipped: newEquipped,
          maxHull: stats.maxHull,
          maxCargo: stats.maxCargo,
          jumpRange: stats.jumpRange,
          modules: stats.modules 
      })

      if (userId) await supabase.from('profiles').update({ 
          inventory: newInventory, 
          equipped: newEquipped 
      }).eq('id', userId)
  },

  unequipItem: async (slotId) => {
      const { equipped, inventory, userId, shipClass } = get()
      const item = equipped[slotId]
      if (!item) return

      const newInventory = [...inventory, item]
      const newEquipped = { ...equipped }
      delete newEquipped[slotId]

      const stats = recalculateShipStats(shipClass, newEquipped)

      set({ 
          inventory: newInventory, 
          equipped: newEquipped,
          maxHull: stats.maxHull,
          maxCargo: stats.maxCargo,
          jumpRange: stats.jumpRange,
          modules: stats.modules
      })

      if (userId) await supabase.from('profiles').update({ 
          inventory: newInventory, 
          equipped: newEquipped 
      }).eq('id', userId)
  },

  dropItem: async (itemId) => {
      const { inventory, userId } = get()
      const newInventory = inventory.filter(i => i.id !== itemId)
      set({ inventory: newInventory })
      get().addNotification('Item discarded', 'info')
      if (userId) await supabase.from('profiles').update({ inventory: newInventory }).eq('id', userId)
  },

  // === GAME ACTIONS ===

  mineObject: (id) => {
      const { localObjects, modules } = get() 
      
      // Перевіряємо масив modules, який тепер авто-оновлюється при екіпіруванні
      const hasLaser = modules.includes('mining_laser')

      if (!hasLaser) {
          get().addNotification('MINING LASER REQUIRED!', 'error')
          return
      }

      const enemy = localObjects.find(o => o.type === 'enemy')
      if (enemy) {
          get().addNotification('CANNOT MINE: HOSTILES NEARBY!', 'warning')
          get().startCombat(enemy.id)
      } else {
          set({ status: 'mining', currentEventId: id })
      }
  },

  takeLootItem: (index) => {
      const { lootContainer, cargo, maxCargo, inventory, localObjects, currentEventId } = get()
      if (!lootContainer || !currentEventId) return

      const item = lootContainer[index]
      let itemTaken = false

      // Логіка для ресурсів
      if (item.type === 'resource' && item.amount) {
          const currentLoad = Object.values(cargo).reduce((a, b) => a + (b as number), 0)
          if (currentLoad + item.amount > maxCargo) {
              get().addNotification('CARGO FULL!', 'warning')
              return
          }
          const newCargo = { ...cargo }
          newCargo[item.name] = ((newCargo[item.name] as number) || 0) + item.amount
          set({ cargo: newCargo })
          get().addNotification(`Received ${item.amount} ${item.name}`, 'success')
          itemTaken = true
      } 
      // Логіка для предметів (модулі, зброя)
      else {
           const newInventory = [...inventory, item]
           set({ inventory: newInventory })
           get().addNotification(`Stored: ${item.name}`, 'success')
           const uid = get().userId
           if(uid) supabase.from('profiles').update({ inventory: newInventory }).eq('id', uid).then()
           itemTaken = true
      }

      if (!itemTaken) return

      // Видаляємо предмет з контейнера
      const newLootList = [...lootContainer]
      newLootList.splice(index, 1)

      // Оновлюємо об'єкт в космосі
      const updatedObjects = localObjects.map(obj => {
          if (obj.id === currentEventId) {
              return { ...obj, data: { ...obj.data, loot: newLootList } }
          }
          return obj
      })

      // Якщо контейнер пустий - видаляємо його, інакше оновлюємо
      if (newLootList.length === 0) {
          set({ 
              lootContainer: null, 
              currentEventId: null,
              localObjects: updatedObjects.filter(o => o.id !== currentEventId) 
          })
          get().closeLoot()
      } else {
          set({ 
              lootContainer: newLootList,
              localObjects: updatedObjects 
          })
      }
  },

  // === STANDARD ACTIONS ===

  buyShip: async (newClass) => {
      const { credits, userId, cargo, shipClass } = get()
      const spec = SHIP_SPECS[newClass]
      if (shipClass === newClass) return 
      if (credits < spec.price) { get().addNotification('INSUFFICIENT FUNDS', 'error'); return }
      const currentCargoAmount = Object.values(cargo).reduce((a, b) => a + (b as number), 0)
      if (currentCargoAmount > spec.maxCargo) { get().addNotification('CARGO TOO HEAVY', 'warning'); return }
      const newCredits = credits - spec.price
      set({ credits: newCredits, shipClass: newClass, maxHull: spec.maxHull, hull: spec.maxHull, maxCargo: spec.maxCargo, jumpRange: spec.jumpRange })
      if (userId) { await supabase.from('profiles').update({ credits: newCredits, ship_class: newClass, hull: spec.maxHull, max_hull: spec.maxHull }).eq('id', userId) }
      get().addNotification(`PURCHASE SUCCESSFUL: ${spec.name}`, 'success')
  },
  
  setTargetSector: (sector) => set({ targetSector: sector }),
  
  updatePresence: async () => {
      const { userId, currentSector } = get()
      if (!userId) return
      await supabase.from('profiles').update({ current_sector: currentSector, last_active: new Date().toISOString() }).eq('id', userId)
  },

  startWarp: () => {
      const { targetSector, currentSector, jumpRange, realtimeChannel } = get()
      if (!targetSector) return
      const dist = getGridDistance(currentSector, targetSector)
      if (dist > jumpRange) { get().addNotification('JUMP RANGE EXCEEDED! UPGRADE ENGINE.', 'error'); return }
      if (realtimeChannel) { supabase.removeChannel(realtimeChannel); set({ realtimeChannel: null }) }
      set({ status: 'warping' })
  },

  completeWarp: () => {
      const { targetSector } = get()
      if (!targetSector) return
      set({ status: 'space', currentSector: targetSector, targetSector: null, localObjects: [], currentEventId: null })
      get().updatePresence().then(() => get().scanCurrentSector())
  },

  scanCurrentSector: async () => {
      const { currentSector, userId } = get()
      set({ inCombat: false, combatLog: [], currentEventId: null })
      get().updatePresence()
      get().subscribeToSector()

      if (currentSector === '0:0') {
        set({
          localObjects: [{ id: 'station-alpha', type: 'station', distance: 2000, scanned: true }],
          currentSectorType: 'station',
          combatLog: ['> Docking beacon detected.']
        })
        return
      }
      set({ currentSectorType: 'wild' })

      const { data: sectorData } = await supabase.from('sectors').select('*').eq('id', currentSector).maybeSingle()
      let currentRes = { iron: 0, gold: 0, darkMatter: 0 }
      let enemyCount = 0

      if (sectorData) {
          let isRegenerated = false
          if (sectorData.last_depleted_at) {
              const depTime = new Date(sectorData.last_depleted_at).getTime()
              if ((Date.now() - depTime) >= 3 * 60 * 60 * 1000) isRegenerated = true
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
              enemyCount = sectorData.enemy_count || 0
          }
      } else {
          const gen = generateSectorContent(currentSector)
          await supabase.from('sectors').upsert({
              id: currentSector, iron_amount: gen.iron, gold_amount: gen.gold, dark_matter_amount: gen.darkMatter,
              enemy_count: gen.enemies, x: Number(currentSector.split(':')[0]), y: Number(currentSector.split(':')[1])
          })
          currentRes = { iron: gen.iron, gold: gen.gold, darkMatter: gen.darkMatter }
          enemyCount = gen.enemies
      }

      set({ sectorResources: currentRes })
      const objects: SpaceObject[] = []

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: players } = await supabase.from('profiles').select('id').eq('current_sector', currentSector).neq('id', userId).gt('last_active', fiveMinutesAgo)
      if (players) {
          players.forEach((p, idx) => objects.push({ id: `player-${p.id}`, type: 'player', distance: 1000 + idx*500, scanned: true, playerName: `Pilot ${p.id.slice(0,4)}` }))
      }

      for (let i = 0; i < enemyCount; i++) objects.push({ id: `enemy-${i}-${Date.now()}`, type: 'enemy', distance: 2500 + i*500, scanned: true, enemyLevel: 1 })
      
      let astIdx = 0
      if (currentRes.iron > 0) {
           objects.push({ id: `ast-iron`, type: 'asteroid', distance: 3000, scanned: true, data: { resource: 'Iron', amount: currentRes.iron } })
           astIdx++
      }
      if (currentRes.gold > 0) objects.push({ id: `ast-gold`, type: 'asteroid', distance: 3200 + astIdx*500, scanned: true, data: { resource: 'Gold', amount: currentRes.gold } })
      if (currentRes.darkMatter > 0) objects.push({ id: `ast-dm`, type: 'asteroid', distance: 4000, scanned: true, data: { resource: 'DarkMatter', amount: currentRes.darkMatter } })

      if (objects.length === 0) objects.push({ id: 'debris-1', type: 'debris', distance: 2000, scanned: true })
      set({ localObjects: objects })
  },

  subscribeToSector: () => {
      const { currentSector, userId, realtimeChannel } = get()
      if (realtimeChannel) supabase.removeChannel(realtimeChannel)
      const channel = supabase.channel(`sector-room-${currentSector}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
            const { localObjects } = get()
            const newProfile = payload.new as any
            if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && newProfile.id !== userId) {
                if (newProfile.current_sector === currentSector) {
                    const exists = localObjects.find(o => o.id === `player-${newProfile.id}`)
                    if (!exists) {
                        const newPlayer: SpaceObject = {
                            id: `player-${newProfile.id}`, type: 'player', distance: 1500, scanned: true, playerName: `Pilot ${newProfile.id.slice(0, 4)}`
                        }
                        set({ localObjects: [...localObjects, newPlayer], combatLog: [...get().combatLog, `> ALERT: Pilot ${newProfile.id.slice(0,4)} entered.`] })
                    }
                } else {
                    set({ localObjects: localObjects.filter(o => o.id !== `player-${newProfile.id}`) })
                }
            }
            if (payload.eventType === 'DELETE') {
                const oldProfile = payload.old as any
                set({ localObjects: localObjects.filter(o => o.id !== `player-${oldProfile.id}`) })
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sectors', filter: `id=eq.${currentSector}` }, (payload) => {
            const newData = payload.new as any
            const { localObjects } = get()
            set({ sectorResources: { iron: newData.iron_amount, gold: newData.gold_amount, darkMatter: newData.dark_matter_amount }})
            const updated = localObjects.map(obj => {
                if (obj.type === 'asteroid' && obj.data?.resource) {
                    const res = obj.data.resource
                    const newAmount = res === 'Iron' ? newData.iron_amount : res === 'Gold' ? newData.gold_amount : newData.dark_matter_amount
                    return { ...obj, data: { ...obj.data, amount: Math.min(obj.data.amount || 0, newAmount) } }
                }
                return obj
            }).map(obj => {
                 if (obj.type === 'asteroid' && obj.data && (obj.data.amount || 0) <= 0) return { ...obj, type: 'debris' as EntityType }
                 return obj
            })
            set({ localObjects: updated })
        })
        .subscribe()
      set({ realtimeChannel: channel })
  },

  fetchSectorGrid: async (center) => {
      if (!center) return
      const [cx, cy] = center.split(':').map(Number)
      const gridSize = 4 
      const ids: string[] = []
      for (let y = cy - gridSize; y <= cy + gridSize; y++) {
          for (let x = cx - gridSize; x <= cx + gridSize; x++) ids.push(`${x}:${y}`)
      }
      const { data } = await supabase.from('sectors').select('id, iron_amount, gold_amount, dark_matter_amount, enemy_count').in('id', ids)
      if (!data) return
      const newDetails: Record<string, SectorDetail> = {}
      const now = Date.now()
      data.forEach((row: any) => {
          const total = (row.iron_amount||0) + (row.gold_amount||0) + (row.dark_matter_amount||0)
          newDetails[row.id] = { id: row.id, hasResources: total>0, hasEnemies: (row.enemy_count||0)>0, isDepleted: false, lastUpdated: now }
      })
      set(state => ({ sectorDetails: { ...state.sectorDetails, ...newDetails } }))
  },
  
  scanSystem: () => { const { localObjects } = get(); set({ localObjects: localObjects.map(o => ({ ...o, scanned: true })) }) },
  
  extractResource: async () => { 
      get().updatePresence()
      const { localObjects, currentEventId, cargo, maxCargo, currentSector, sectorResources } = get()
      const targetIdx = localObjects.findIndex(o => o.id === currentEventId)
      if (targetIdx === -1) return
      const target = localObjects[targetIdx]
      if (!target.data || !target.data.resource) return
      const resType = target.data.resource
      const amountAvailable = target.data.amount || 0
      const currentLoad = Object.values(cargo).reduce((a, b) => a + (b as number), 0)
      if (currentLoad >= maxCargo) { get().addNotification('CARGO FULL!', 'warning'); return }
      const amountToMine = Math.min(10, amountAvailable, maxCargo - currentLoad)
      const newCargo = { ...cargo, [resType]: ((cargo[resType] as number) || 0) + amountToMine }
      const newObjects = [...localObjects]
      newObjects[targetIdx] = { ...target, data: { ...target.data, amount: amountAvailable - amountToMine } }
      if ((newObjects[targetIdx].data?.amount || 0) <= 0) newObjects[targetIdx].type = 'debris'
      
      const newSecRes = { ...sectorResources }
      if (resType === 'Iron') newSecRes.iron -= amountToMine
      if (resType === 'Gold') newSecRes.gold -= amountToMine
      if (resType === 'DarkMatter') newSecRes.darkMatter -= amountToMine

      set({ localObjects: newObjects, cargo: newCargo, sectorResources: newSecRes, combatLog: [`> Extracted ${amountToMine}T of ${resType}`] })
      
      const updateData: any = {}
      if (resType === 'Iron') updateData.iron_amount = newSecRes.iron
      if (resType === 'Gold') updateData.gold_amount = newSecRes.gold
      if (resType === 'DarkMatter') updateData.dark_matter_amount = newSecRes.darkMatter
      supabase.from('sectors').update(updateData).eq('id', currentSector).then()
  },
  
  sellResource: (r) => { 
      const { cargo, credits } = get()
      const amount = cargo[r]
      if (!amount) return
      set({ credits: credits + amount * 10, cargo: { ...cargo, [r]: 0 } })
      get().addNotification(`Sold ${amount} ${r}`, 'success')
  },
  
  repairHull: () => { 
      const { maxHull, credits } = get()
      if (credits >= 100) set({ credits: credits - 100, hull: maxHull })
  },
  
  startCombat: (id) => { set({ status: 'combat', currentEventId: id, inCombat: true, enemyHp: 100, combatLog: ['ENGAGING HOSTILE'] }) },
  playerAttack: () => { 
      const { enemyHp } = get()
      set({ enemyHp: enemyHp - 10, combatLog: [...get().combatLog, '> Fired lasers: -10 HP'] })
      if(enemyHp - 10 <= 0) get().endCombat(true)
  },
  tryFlee: () => { get().endCombat(false) },
  
  endCombat: (win) => { 
      const { localObjects, currentEventId, currentSector } = get()
      const enemy = localObjects.find(o => o.id === currentEventId)
      const dist = enemy?.distance || 2000

      if(win) {
          get().addNotification('TARGET DESTROYED', 'success')
          
          // Генеруємо Лут
          const lootItems: LootItem[] = []
          if (Math.random() > 0.3) lootItems.push({ type: 'resource', id: 'iron', name: 'Iron', amount: 15 })
          if (Math.random() > 0.8) lootItems.push({ type: 'module', id: 'mining_laser_mk1', name: 'Mining Laser MK-1', origin: 'standard' })

          const filteredObjects = localObjects.filter(o => o.id !== currentEventId)
          const debris: SpaceObject = { id: `debris-${Date.now()}`, type: 'debris', distance: dist, scanned: true }
          const container: SpaceObject = { id: `loot-${Date.now()}`, type: 'container', distance: dist + 50, scanned: true, data: { loot: lootItems } }

          set({ status: 'space', inCombat: false, currentEventId: null, localObjects: [...filteredObjects, debris, container] })
          
          // Оновлюємо ворогів в БД (спрощено)
          supabase.from('sectors').select('enemy_count').eq('id', currentSector).single().then(({ data }) => {
                if (data && data.enemy_count > 0) supabase.from('sectors').update({ enemy_count: data.enemy_count - 1 }).eq('id', currentSector).then()
           })
      } else {
          set({ status: 'hangar', hull: 10, inCombat: false })
          get().addNotification('CRITICAL DAMAGE! EMERGENCY WARP.', 'error')
      }
  },
  
  openContainer: (id) => {
      const { localObjects } = get()
      const container = localObjects.find(o => o.id === id)
      if (!container) return
      let items: LootItem[] = container.data?.loot || [{ type: 'resource', id: 'iron', name: 'Iron', amount: 10 }]
      set({ lootContainer: items, currentEventId: id })
  },
  closeLoot: () => set({ lootContainer: null, currentEventId: null }),
  takeAllLoot: () => { const { lootContainer } = get(); if (!lootContainer) return; const count = lootContainer.length; for(let i=0; i<count; i++) get().takeLootItem(0) },
  closeEvent: () => set({ currentEventId: null })
}))