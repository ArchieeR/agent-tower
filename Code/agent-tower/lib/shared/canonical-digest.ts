import { createHash } from "node:crypto"

const DOMAIN = /^[a-z0-9][a-z0-9._:-]{0,127}$/
const ID_PREFIX = /^[a-z][a-z0-9-]{0,31}$/

type JsonPrimitive = null | boolean | number | string
export type CanonicalJsonValue = JsonPrimitive | CanonicalJsonValue[] | { [key: string]: CanonicalJsonValue }

function canonical(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null"
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON rejects non-finite numbers.")
    return JSON.stringify(value)
  }
  if (typeof value !== "object") throw new TypeError(`Canonical JSON rejects ${typeof value} values.`)
  if (ancestors.has(value)) throw new TypeError("Canonical JSON rejects cyclic values.")
  ancestors.add(value)
  try {
    if (Array.isArray(value)) return `[${value.map((entry) => canonical(entry, ancestors)).join(",")}]`
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new TypeError("Canonical JSON accepts only plain objects and arrays.")
    }
    return `{${Object.keys(value).sort().map((key) => {
      const entry = (value as Record<string, unknown>)[key]
      if (entry === undefined) throw new TypeError("Canonical JSON rejects undefined object properties.")
      return `${JSON.stringify(key)}:${canonical(entry, ancestors)}`
    }).join(",")}}`
  } finally {
    ancestors.delete(value)
  }
}

export function canonicalJsonV1(value: unknown): string {
  return canonical(value, new Set())
}

export function domainDigestV1(domain: string, value: unknown): string {
  if (!DOMAIN.test(domain)) throw new TypeError("Digest domain is invalid.")
  const preimage = `agent-tower:v1:${domain}\n${canonicalJsonV1(value)}`
  return createHash("sha256").update(preimage, "utf8").digest("hex")
}

export function deriveOpaqueIdV1(prefix: string, domain: string, value: unknown): string {
  if (!ID_PREFIX.test(prefix)) throw new TypeError("Opaque ID prefix is invalid.")
  return `${prefix}-${domainDigestV1(domain, value)}`
}
