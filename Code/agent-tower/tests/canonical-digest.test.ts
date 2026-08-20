import { strict as assert } from "node:assert"
import { test } from "node:test"

import { canonicalJsonV1, deriveOpaqueIdV1, domainDigestV1 } from "../lib/shared/canonical-digest.ts"

test("canonical JSON v1 sorts object keys and preserves array order", () => {
  assert.equal(canonicalJsonV1({ z: [3, 2, 1], a: { y: true, x: null } }), '{"a":{"x":null,"y":true},"z":[3,2,1]}')
  assert.equal(canonicalJsonV1({ b: 2, a: 1 }), canonicalJsonV1({ a: 1, b: 2 }))
  assert.notEqual(canonicalJsonV1([1, 2]), canonicalJsonV1([2, 1]))
})

test("canonical JSON v1 rejects values that are unsafe or lossy in JSON", () => {
  for (const value of [undefined, Number.NaN, Number.POSITIVE_INFINITY, BigInt(1), () => undefined, Symbol("x")]) {
    assert.throws(() => canonicalJsonV1(value))
  }
  assert.throws(() => canonicalJsonV1({ omitted: undefined }))
  assert.throws(() => canonicalJsonV1(new Date()))
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic
  assert.throws(() => canonicalJsonV1(cyclic), /cyclic/)
})

test("domain digest v1 has stable golden vectors and cross-type separation", () => {
  assert.equal(domainDigestV1("test.vector", { b: 2, a: 1 }), "9a61cf80ab180256e0835db0d0de51ce5675499aa6f6ddc429d58775c02c79b1")
  assert.notEqual(domainDigestV1("change.digest", { id: "same" }), domainDigestV1("adapter.plan", { id: "same" }))
  assert.equal(deriveOpaqueIdV1("operation", "adapter.operation", { index: 0 }), `operation-${domainDigestV1("adapter.operation", { index: 0 })}`)
  assert.throws(() => domainDigestV1("Bad Domain", {}), /domain/)
})
