import crypto from 'crypto'
import { getSetting, setSetting } from './db'

const COOKIE_NAME = 'hc_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function ensurePasscode(): Promise<string> {
  let passcode = await getSetting('passcode')
  if (!passcode) {
    passcode = 'HC-' + crypto.randomBytes(4).toString('hex')
    await setSetting('passcode', passcode)
  }
  return passcode
}

async function getSalt(): Promise<string> {
  let salt = await getSetting('auth_salt')
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex')
    await setSetting('auth_salt', salt)
  }
  return salt
}

export async function makeToken(): Promise<string> {
  const [passcode, salt] = await Promise.all([
    getSetting('passcode'),
    getSalt(),
  ])
  return crypto
    .createHash('sha256')
    .update(`${salt}|${passcode}`)
    .digest('hex')
}

export async function verifyPasscode(given: string): Promise<boolean> {
  const stored = await getSetting('passcode')
  if (!stored) return false
  if (given.length !== stored.length) return false
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(stored))
}

export async function verifyToken(token: string): Promise<boolean> {
  const want = await makeToken()
  if (token.length !== want.length) return false
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(want))
}

export function authCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}

// Simple in-memory rate limiter
const loginFails = new Map<string, { count: number; until: number }>()

export function checkRateLimit(ip: string): { blocked: boolean; retryAfter?: number } {
  const entry = loginFails.get(ip)
  if (entry && entry.until > Date.now()) {
    return { blocked: true, retryAfter: Math.ceil((entry.until - Date.now()) / 1000) }
  }
  return { blocked: false }
}

export function recordFailedLogin(ip: string): void {
  const entry = loginFails.get(ip)
  const count = (entry?.count ?? 0) + 1
  const delay = Math.min(15 * 60 * 1000, 1000 * 2 ** count)
  loginFails.set(ip, { count, until: Date.now() + delay })
}

export function clearFailedLogins(ip: string): void {
  loginFails.delete(ip)
}
