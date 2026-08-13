const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"])

export function isTrustedLocalMutation(request: Request): boolean {
  const target = new URL(request.url)
  if (!LOOPBACK_HOSTS.has(target.hostname)) return false
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    const source = new URL(origin)
    return LOOPBACK_HOSTS.has(source.hostname) && source.origin === target.origin
  } catch {
    return false
  }
}
