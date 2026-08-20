import { createHash } from "node:crypto"

const DOMAIN = /^[a-z0-9][a-z0-9._:-]{0,127}$/
const ID_PREFIX = /^[a-z][a-z0-9-]{0,31}$/
const ARRAY_INDEX = /^(0|[1-9]\d*)$/
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/

type JsonPrimitive = null | boolean | number | string
export type CanonicalJsonValue = JsonPrimitive | CanonicalJsonValue[] | { [key: string]: CanonicalJsonValue }

function assertUnicode(value: string): void {
  if (LONE_SURROGATE.test(value)) throw new TypeError("Canonical JSON rejects strings containing lone Unicode surrogates.")
}

function dataDescriptors(value: object): Record<string, PropertyDescriptor> {
  if (Object.getOwnPropertySymbols(value).length) throw new TypeError("Canonical JSON rejects symbol-keyed properties.")
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const [key, descriptor] of Object.entries(descriptors)) {
    assertUnicode(key)
    if (!descriptor.enumerable) throw new TypeError("Canonical JSON rejects non-enumerable own properties.")
    if (!("value" in descriptor)) throw new TypeError("Canonical JSON rejects accessor properties.")
  }
  return descriptors
}

function canonical(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null"
  if (typeof value === "string") { assertUnicode(value); return JSON.stringify(value) }
  if (typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new TypeError("Canonical JSON rejects non-finite numbers and negative zero.")
    return JSON.stringify(value)
  }
  if (typeof value !== "object") throw new TypeError(`Canonical JSON rejects ${typeof value} values.`)
  if (ancestors.has(value)) throw new TypeError("Canonical JSON rejects cyclic values.")
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      const descriptors = Object.getOwnPropertyDescriptors(value)
      if (Object.getOwnPropertySymbols(value).length) throw new TypeError("Canonical JSON rejects symbol-keyed array properties.")
      const keys = Object.keys(descriptors)
      for (const key of keys) {
        if (key === "length") continue
        const descriptor = descriptors[key]
        if (!ARRAY_INDEX.test(key) || Number(key) >= value.length) throw new TypeError("Canonical JSON rejects extra array properties.")
        if (!descriptor.enumerable || !("value" in descriptor)) throw new TypeError("Canonical JSON rejects non-data array properties.")
      }
      const entries: string[] = []
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)]
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError("Canonical JSON rejects sparse arrays.")
        entries.push(canonical(descriptor.value, ancestors))
      }
      return `[${entries.join(",")}]`
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new TypeError("Canonical JSON accepts only plain objects and arrays.")
    }
    const descriptors = dataDescriptors(value)
    return `{${Object.keys(descriptors).sort().map((key) => `${JSON.stringify(key)}:${canonical(descriptors[key].value, ancestors)}`).join(",")}}`
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
