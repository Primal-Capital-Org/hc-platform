// ICS / iCal parser — handles recurring events, timezones, exceptions

export interface CalEvent {
  uid: string
  summary: string
  location: string
  allDay: boolean
  start: number  // ms UTC
  end: number    // ms UTC
}

const CAL_WINDOW_DAYS = 42  // 6 weeks ahead

function unfold(text: string): string {
  return text.replace(/\r?\n[ \t]/g, '')
}

function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    })
    const p: Record<string, string> = {}
    for (const part of dtf.formatToParts(new Date(guess))) p[part.type] = part.value
    const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second)
    return guess - (wall - guess)
  } catch { return guess }
}

interface Parts { y: number; mo: number; d: number; h: number|null; mi: number; s: number; utc: boolean; dateOnly: boolean }

function parseDateValue(v: string): Parts | null {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
  if (!m) return null
  return {
    y: +m[1], mo: +m[2], d: +m[3],
    h: m[4] != null ? +m[4] : null,
    mi: m[5] != null ? +m[5] : 0,
    s: m[6] != null ? +m[6] : 0,
    utc: !!m[7], dateOnly: m[4] == null,
  }
}

function partsToTs(p: Parts, tzid: string | null): number {
  if (p.dateOnly) return Date.UTC(p.y, p.mo - 1, p.d)
  if (p.utc) return Date.UTC(p.y, p.mo - 1, p.d, p.h!, p.mi, p.s)
  if (tzid) return zonedToUtc(p.y, p.mo, p.d, p.h!, p.mi, p.s, tzid)
  return new Date(p.y, p.mo - 1, p.d, p.h!, p.mi, p.s).getTime()
}

const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

interface RawEvent {
  uid: string; summary: string; location: string; tzid: string | null
  startParts: Parts | null; startTs: number | null; endTs: number | null
  rrule: Record<string, string> | null; exdates: Set<string>
  cancelled: boolean; recurrenceId: string | null; allDay: boolean
}

function expandEvent(ev: RawEvent, winStart: number, winEnd: number): CalEvent[] {
  const out: CalEvent[] = []
  const durMs = ev.endTs != null && ev.startTs != null ? Math.max(0, ev.endTs - ev.startTs) : 3600000
  const base = { uid: ev.uid, summary: ev.summary, location: ev.location, allDay: ev.allDay }

  if (!ev.rrule) {
    if (ev.startTs != null && ev.startTs <= winEnd && ev.startTs + durMs >= winStart)
      out.push({ ...base, start: ev.startTs, end: ev.startTs + durMs })
    return out
  }

  const rule = ev.rrule
  const freq = rule.FREQ
  if (!['DAILY','WEEKLY','MONTHLY','YEARLY'].includes(freq)) return out
  const interval = Math.max(1, parseInt(rule.INTERVAL || '1', 10))
  const count = rule.COUNT ? parseInt(rule.COUNT, 10) : null
  let untilTs: number | null = null
  if (rule.UNTIL) { const up = parseDateValue(rule.UNTIL); if (up) untilTs = partsToTs(up, null) }
  const byday = freq === 'WEEKLY' && rule.BYDAY
    ? rule.BYDAY.split(',').map((d) => DAY_MAP[d.replace(/^[+-]?\d+/, '')]).filter((d) => d != null)
    : null
  const sp = ev.startParts!
  const startDate = new Date(Date.UTC(sp.y, sp.mo - 1, sp.d))
  const startDow  = startDate.getUTCDay()
  const startWeekMon = new Date(startDate)
  startWeekMon.setUTCDate(startDate.getUTCDate() - ((startDow + 6) % 7))
  let occurrences = 0
  const cur = new Date(startDate)
  for (let steps = 0; steps < 20500; steps++, cur.setUTCDate(cur.getUTCDate() + 1)) {
    const y = cur.getUTCFullYear(), mo = cur.getUTCMonth() + 1, d = cur.getUTCDate()
    let matches = false
    if (freq === 'DAILY') {
      const days = Math.round((cur.getTime() - startDate.getTime()) / 86400000)
      matches = days % interval === 0
    } else if (freq === 'WEEKLY') {
      const weeks = Math.floor(Math.round((cur.getTime() - startWeekMon.getTime()) / 86400000) / 7)
      matches = (byday ? byday.includes(cur.getUTCDay()) : cur.getUTCDay() === startDow)
        && weeks % interval === 0 && cur >= startDate
    } else if (freq === 'MONTHLY') {
      matches = d === sp.d && ((y - sp.y) * 12 + (mo - sp.mo)) % interval === 0
    } else if (freq === 'YEARLY') {
      matches = d === sp.d && mo === sp.mo && (y - sp.y) % interval === 0
    }
    if (!matches) continue
    occurrences++
    if (count && occurrences > count) break
    const ts = sp.dateOnly ? Date.UTC(y, mo - 1, d)
      : sp.utc ? Date.UTC(y, mo - 1, d, sp.h!, sp.mi, sp.s)
      : ev.tzid ? zonedToUtc(y, mo, d, sp.h!, sp.mi, sp.s, ev.tzid)
      : new Date(y, mo - 1, d, sp.h!, sp.mi, sp.s).getTime()
    if (untilTs != null && ts > untilTs) break
    if (ts > winEnd) break
    if (ts + durMs < winStart) continue
    const wallKey = `${y}${String(mo).padStart(2,'0')}${String(d).padStart(2,'0')}`
    if (ev.exdates.has(wallKey)) continue
    out.push({ ...base, start: ts, end: ts + durMs })
  }
  return out
}

function parseIcs(text: string): RawEvent[] {
  const lines = unfold(text).split(/\r?\n/)
  const events: RawEvent[] = []
  let ev: RawEvent | null = null
  for (const raw of lines) {
    const line = raw.trim()
    if (line === 'BEGIN:VEVENT') {
      ev = { uid:'', summary:'', location:'', tzid:null, startParts:null, startTs:null, endTs:null,
             rrule:null, exdates:new Set(), cancelled:false, recurrenceId:null, allDay:false }
      continue
    }
    if (line === 'END:VEVENT') { if (ev && ev.startParts && !ev.cancelled) events.push(ev); ev = null; continue }
    if (!ev) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const left = line.slice(0, idx)
    const value = line.slice(idx + 1)
    const [name, ...paramParts] = left.split(';')
    const params: Record<string,string> = {}
    for (const pp of paramParts) { const eq = pp.indexOf('='); if (eq !== -1) params[pp.slice(0,eq).toUpperCase()] = pp.slice(eq+1) }
    const n = name.toUpperCase()
    const clean = (s: string) => s.replace(/\\([,;nN\\])/g, (_, c) => c.toLowerCase() === 'n' ? ' ' : c)
    if (n === 'SUMMARY') ev.summary = clean(value)
    else if (n === 'LOCATION') ev.location = clean(value).slice(0, 200)
    else if (n === 'UID') ev.uid = value
    else if (n === 'STATUS' && value.toUpperCase() === 'CANCELLED') ev.cancelled = true
    else if (n === 'RECURRENCE-ID') ev.recurrenceId = value.slice(0, 8)
    else if (n === 'DTSTART') {
      const p = parseDateValue(value)
      if (p) { ev.tzid = params.TZID || null; ev.startParts = p; ev.allDay = p.dateOnly; ev.startTs = partsToTs(p, ev.tzid) }
    }
    else if (n === 'DTEND') { const p = parseDateValue(value); if (p) ev.endTs = partsToTs(p, params.TZID || ev.tzid) }
    else if (n === 'RRULE') {
      const rule: Record<string,string> = {}
      for (const part of value.split(';')) { const [k,v] = part.split('='); rule[k.toUpperCase()] = v }
      ev.rrule = rule
    }
    else if (n === 'EXDATE') {
      for (const v of value.split(',')) { const p = parseDateValue(v.trim()); if (p) ev.exdates.add(`${p.y}${String(p.mo).padStart(2,'0')}${String(p.d).padStart(2,'0')}`) }
    }
  }
  // Apply recurrence overrides
  const overrides = events.filter((e) => e.recurrenceId)
  for (const ov of overrides) {
    const master = events.find((e) => e.uid === ov.uid && !e.recurrenceId && e.rrule)
    if (master) master.exdates.add(ov.recurrenceId!)
  }
  return events
}

export async function fetchCalendar(icsUrl: string): Promise<{ events: CalEvent[]; error?: string }> {
  try {
    const res = await fetch(icsUrl, { headers: { 'User-Agent': 'HCPlatform/2.0' }, next: { revalidate: 600 } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('Not a valid iCal feed')
    const now = Date.now()
    const winStart = now - 86400000
    const winEnd   = now + CAL_WINDOW_DAYS * 86400000
    const all: CalEvent[] = []
    for (const ev of parseIcs(text)) all.push(...expandEvent(ev, winStart, winEnd))
    all.sort((a, b) => a.start - b.start)
    return { events: all.slice(0, 500) }
  } catch (err) {
    return { events: [], error: String(err) }
  }
}
