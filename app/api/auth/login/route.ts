import { NextRequest, NextResponse } from 'next/server'
import { verifyPasscode, makeToken, authCookieHeader, checkRateLimit, recordFailedLogin, clearFailedLogins } from '@/lib/auth'

function clientIp(req: NextRequest): string {
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = checkRateLimit(ip)
  if (rl.blocked) {
    return NextResponse.json({ error: `Too many attempts — try again in ${rl.retryAfter}s` }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const given = String(body.passcode ?? '')

  await new Promise((r) => setTimeout(r, 400)) // constant-time delay

  const ok = await verifyPasscode(given)
  if (!ok) {
    recordFailedLogin(ip)
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 })
  }

  clearFailedLogins(ip)
  const token = await makeToken()
  return NextResponse.json({ ok: true }, {
    status: 200,
    headers: { 'Set-Cookie': authCookieHeader(token) },
  })
}
