// Text classification: split free text into "actions" vs "updates"
// and match it to a deal file by name / keyword

import type { DealFile } from './db'

const STOPWORDS = new Set(['project','file','deal','the','and','for','new','group','company','ltd','llc','inc','plc'])

const ACTION_VERBS = new Set([
  'chase','send','review','prepare','draft','call','schedule','book',
  'arrange','circulate','share','check','follow','finalise','finalize',
  'submit','request','ask','get','obtain','collect','push','respond',
  'reply','remind','ensure','negotiate','organise','organize','set',
  'sign','issue','confirm','update','add','fix','find','contact',
  'email','speak','meet','agree','complete','close','engage','instruct',
])
const ACTION_PHRASES = /\b(required|needed|need|needs|to do|todo|must|should|await(?:ing)? (?:sign.?off|approval|response)|action:|next step)\b/i
const UPDATE_WORDS = new Set([
  'provided','received','sent','completed','signed','agreed','moved',
  'rescheduled','updated','issued','closed','spoke','met','discussed',
  'finished','done','confirmed','delivered','uploaded','circulated',
  'arrived','said','told','advised','noted','was','were','went',
  'came','happened','submitted','shared','returned','replied',
])
const UPDATE_PHRASES = /\b(no change|on track|on hold|fyi|as expected|per (?:the )?(?:email|call)|has been|have been|heads.?up)\b/i

function classifyFragment(s: string): 'action' | 'update' {
  const tokens = s.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean)
  const CONNECTORS = new Set(['to','and','then','please','pls'])
  let action = 0, update = 0
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (ACTION_VERBS.has(t) && (i === 0 || CONNECTORS.has(tokens[i - 1]))) action += i === 0 ? 2 : 1
    if (UPDATE_WORDS.has(t)) update += 1
  }
  if (ACTION_PHRASES.test(s)) action += 2
  if (UPDATE_PHRASES.test(s)) update += 2
  for (const t of tokens) {
    if (t.length > 4 && t.endsWith('ed') && !UPDATE_WORDS.has(t) && !ACTION_VERBS.has(t)) update += 0.5
  }
  return update > action ? 'update' : 'action'
}

export function classifyText(text: string): { kind: 'action' | 'update'; text: string }[] {
  const rawFrags = text
    .split(/[\n;]+|(?<=[a-z0-9)])\.\s+|,/i)
    .map((s) => s.trim().replace(/^[-–—•]\s*/, ''))
    .filter((s) => s.length > 1)
  const frags = rawFrags.length ? rawFrags : [text.trim()]
  const merged: { kind: 'action' | 'update'; text: string }[] = []
  for (const frag of frags) {
    const kind = classifyFragment(frag)
    const last = merged[merged.length - 1]
    if (last && last.kind === kind) last.text += ', ' + frag
    else merged.push({ kind, text: frag })
  }
  return merged
}

export function fileMatchWords(f: DealFile): string[] {
  const name = f.name.toLowerCase()
  const nameWords = name.split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  return [...new Set([name, ...nameWords, ...(f.keywords || []).map((k) => k.toLowerCase())])].filter((w) => w.length >= 3)
}

function wordInText(hay: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${esc}(?:[^\\p{L}\\p{N}]|$)`, 'iu').test(hay)
}

export function matchFileToText(
  text: string,
  files: DealFile[],
): { file: DealFile; word: string }[] {
  const hay = text.toLowerCase()
  const activeFiles = files.filter((f) => !['Passed', 'Closed'].includes(f.stage))
  const matches: { file: DealFile; word: string }[] = []
  for (const f of activeFiles) {
    const word = fileMatchWords(f).find((w) => wordInText(hay, w))
    if (word) matches.push({ file: f, word })
  }
  return matches
}
