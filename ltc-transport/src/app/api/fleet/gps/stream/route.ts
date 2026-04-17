/**
 * SSE stream — 車行地圖訂閱駕駛位置更新
 * GET /api/fleet/gps/stream
 */
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-helpers'

declare global {
  // eslint-disable-next-line no-var
  var __gpsStore: Map<string, import('../route').GpsPoint> | undefined
  // eslint-disable-next-line no-var
  var __sseSubs: Set<(point: import('../route').GpsPoint) => void> | undefined
}

export async function GET() {
  const { error } = await requireRole('fleet_admin', 'system_admin', 'org_admin')
  if (error) return error

  const store = global.__gpsStore ?? new Map()
  const subs  = global.__sseSubs ?? new Set()

  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    start(controller) {
      // 先推送目前快照
      const snapshot = Array.from(store.values())
      const initMsg = `data: ${JSON.stringify({ type: 'snapshot', points: snapshot })}\n\n`
      controller.enqueue(encoder.encode(initMsg))

      // 訂閱後續更新
      const cb = (point: import('../route').GpsPoint) => {
        try {
          const msg = `data: ${JSON.stringify({ type: 'update', point })}\n\n`
          controller.enqueue(encoder.encode(msg))
        } catch {
          subs.delete(cb)
        }
      }
      subs.add(cb)

      // keep-alive ping every 25s
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(ping)
          subs.delete(cb)
        }
      }, 25000)

      // cleanup on close
      return () => {
        clearInterval(ping)
        subs.delete(cb)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
