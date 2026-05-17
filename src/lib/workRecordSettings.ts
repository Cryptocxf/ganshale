export type SystemRecordPeriodId =
  | 'none'
  | '10m'
  | '30m'
  | '1h'
  | '2h'
  | '5h'
  | '12:00'
  | '18:00'

/** @deprecated 请使用 `buildDefaultAiAutoSummaryPromptTemplate`（设置 → 提示词） */
export const DEFAULT_WORK_RECORD_SYSTEM_PROMPT =
  '根据我的应用时长和内容，总结一段工作内容记录'

export type WorkRecordSettings = {
  aiAutoSummaryEnabled: boolean
  systemRecordPeriod: SystemRecordPeriodId
}

export const WORK_RECORD_SETTINGS_CHANGED_EVENT = 'ganshale-work-record-settings-changed'

export const SYSTEM_RECORD_PERIOD_OPTIONS: { id: SystemRecordPeriodId; label: string }[] = [
  { id: 'none', label: '不需要' },
  { id: '10m', label: '10分钟' },
  { id: '30m', label: '30分钟' },
  { id: '1h', label: '1小时' },
  { id: '2h', label: '2小时' },
  { id: '5h', label: '5小时' },
  { id: '12:00', label: '12:00' },
  { id: '18:00', label: '18:00' },
]

/** 设置页：勾选 AI 自动总结后可选的间隔（不含「不需要」） */
export const AI_SUMMARY_PERIOD_OPTIONS = SYSTEM_RECORD_PERIOD_OPTIONS.filter(
  (o) => o.id !== 'none',
)

const STORAGE_KEY_V2 = 'ganshale-work-record-settings-v2'
const STORAGE_KEY_V1 = 'ganshale-work-record-settings-v1'

const CLOCK_PERIOD_IDS = new Set<SystemRecordPeriodId>(['12:00', '18:00'])
const PERIOD_IDS = new Set<string>(SYSTEM_RECORD_PERIOD_OPTIONS.map((o) => o.id))
const INTERVAL_PERIOD_IDS = new Set<SystemRecordPeriodId>([
  '10m',
  '30m',
  '1h',
  '2h',
  '5h',
])

function isPeriodId(v: unknown): v is SystemRecordPeriodId {
  return typeof v === 'string' && PERIOD_IDS.has(v)
}

function isIntervalPeriodId(id: SystemRecordPeriodId): boolean {
  return INTERVAL_PERIOD_IDS.has(id)
}

export function isAiAutoSummaryActive(settings: WorkRecordSettings): boolean {
  return settings.aiAutoSummaryEnabled
}

function defaultSettings(): WorkRecordSettings {
  return {
    aiAutoSummaryEnabled: true,
    systemRecordPeriod: '30m',
  }
}

function normalizePeriodForEnabled(
  period: SystemRecordPeriodId,
  fallback: SystemRecordPeriodId,
): SystemRecordPeriodId {
  if (period === 'none' || (!isIntervalPeriodId(period) && !CLOCK_PERIOD_IDS.has(period))) {
    return fallback
  }
  return period
}

function parseStoredSettings(raw: string): WorkRecordSettings {
  const j = JSON.parse(raw) as Partial<
    WorkRecordSettings & { aiAutoSummaryEnabled?: boolean; systemRecordPrompt?: string }
  >
  const fallback = defaultSettings()

  let aiAutoSummaryEnabled = fallback.aiAutoSummaryEnabled
  let systemRecordPeriod = fallback.systemRecordPeriod

  if (typeof j.aiAutoSummaryEnabled === 'boolean') {
    aiAutoSummaryEnabled = j.aiAutoSummaryEnabled
  } else if (j.systemRecordPeriod === 'none') {
    aiAutoSummaryEnabled = false
  } else if (isPeriodId(j.systemRecordPeriod)) {
    aiAutoSummaryEnabled = true
  }

  if (isPeriodId(j.systemRecordPeriod)) {
    systemRecordPeriod = j.systemRecordPeriod
  }

  if (!aiAutoSummaryEnabled) {
    return {
      aiAutoSummaryEnabled: false,
      systemRecordPeriod: normalizePeriodForEnabled(systemRecordPeriod, fallback.systemRecordPeriod),
    }
  }

  return {
    aiAutoSummaryEnabled: true,
    systemRecordPeriod: normalizePeriodForEnabled(
      systemRecordPeriod,
      fallback.systemRecordPeriod,
    ),
  }
}

function migrateFromV1(): WorkRecordSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V1)
    if (!raw) return null
    const j = JSON.parse(raw) as Partial<{
      systemRecordPeriod: string
      customPeriodMinutes: number
    }>
    const base = defaultSettings()
    let systemRecordPeriod: SystemRecordPeriodId = base.systemRecordPeriod
    if (j.systemRecordPeriod === 'custom') {
      const mins = j.customPeriodMinutes
      if (mins === 10) systemRecordPeriod = '10m'
      else if (mins === 60) systemRecordPeriod = '1h'
      else if (mins === 120) systemRecordPeriod = '2h'
      else if (mins === 300) systemRecordPeriod = '5h'
    } else if (isPeriodId(j.systemRecordPeriod)) {
      systemRecordPeriod = j.systemRecordPeriod
    }
    const aiAutoSummaryEnabled = systemRecordPeriod !== 'none'
    return {
      aiAutoSummaryEnabled,
      systemRecordPeriod: aiAutoSummaryEnabled
        ? normalizePeriodForEnabled(systemRecordPeriod, base.systemRecordPeriod)
        : base.systemRecordPeriod,
    }
  } catch {
    return null
  }
}

export function loadWorkRecordSettings(): WorkRecordSettings {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_V2)
    if (!raw) {
      const migrated = migrateFromV1()
      if (migrated) {
        saveWorkRecordSettings(migrated)
        return migrated
      }
      return defaultSettings()
    }
    return parseStoredSettings(raw)
  } catch {
    return defaultSettings()
  }
}

export function saveWorkRecordSettings(settings: WorkRecordSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(settings))
    window.dispatchEvent(new Event(WORK_RECORD_SETTINGS_CHANGED_EVENT))
  } catch {
    /* quota */
  }
}

export function systemRecordIntervalMs(settings: WorkRecordSettings): number | null {
  if (!isAiAutoSummaryActive(settings)) return null
  switch (settings.systemRecordPeriod) {
    case 'none':
      return null
    case '10m':
      return 10 * 60_000
    case '30m':
      return 30 * 60_000
    case '1h':
      return 60 * 60_000
    case '2h':
      return 2 * 60 * 60_000
    case '5h':
      return 5 * 60 * 60_000
    case '12:00':
    case '18:00':
      return null
    default:
      return 30 * 60_000
  }
}

export function isClockTriggeredPeriod(id: SystemRecordPeriodId): boolean {
  return CLOCK_PERIOD_IDS.has(id)
}

export function shouldFireClockSystemRecord(
  settings: WorkRecordSettings,
  now: Date,
  lastFiredKey: string | null,
): { fire: boolean; nextKey: string | null } {
  if (!isAiAutoSummaryActive(settings)) {
    return { fire: false, nextKey: lastFiredKey }
  }
  const slot = settings.systemRecordPeriod
  if (slot !== '12:00' && slot !== '18:00') {
    return { fire: false, nextKey: lastFiredKey }
  }
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const key = `${ymd}@${slot}`
  if (lastFiredKey === key) return { fire: false, nextKey: lastFiredKey }

  const [hh, mm] = slot.split(':').map(Number)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const targetMin = hh * 60 + mm
  if (nowMin >= targetMin && nowMin < targetMin + 2) {
    return { fire: true, nextKey: key }
  }
  return { fire: false, nextKey: lastFiredKey }
}
