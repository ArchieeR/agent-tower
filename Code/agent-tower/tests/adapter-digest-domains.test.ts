import { strict as assert } from "node:assert"
import { test } from "node:test"

import { hashComposioObservationV1 } from "../lib/adapters/tools/composio/adapter.ts"
import { domainDigestV1 } from "../lib/shared/canonical-digest.ts"

const observation = { adapterId: "buzz", hostId: "opaque-host", records: [{ id: "goose", ready: false }] }

const vectors = {
  envelope: "e41eb9cbc818032ab9c216e80964d473dada914ed3a156a74c44ab26b7888d70",
  organization: "05d8453e596227c9e40a6056085c1b04841def2b8921d3f88895b2697b15cc1f",
  catalog: "f4d3ce231c89a39c11669356e4ed4b926ce3062c907230e0c86930c8c91286b6",
  composio: "a6d0a38718132d09766043cf321934c8f6a34a8d590182c557538f0d091d8f37",
}

test("adapter observation digest domains have locked golden vectors", () => {
  assert.equal(domainDigestV1("adapter-envelope", observation), vectors.envelope)
  assert.equal(domainDigestV1("buzz-organization-observation", observation), vectors.organization)
  assert.equal(domainDigestV1("buzz-host-catalog-observation", observation), vectors.catalog)
  assert.equal(domainDigestV1("composio-tool-inventory", observation), vectors.composio)
})

test("adapter hash boundary rejects ambiguous values without invoking getters", () => {
  assert.throws(() => hashComposioObservationV1("composio-tool-inventory", { value: undefined }))
  assert.throws(() => hashComposioObservationV1("composio-tool-inventory", { value: -0 }))
  const sparse = Array(2); sparse[1] = "present"
  assert.throws(() => hashComposioObservationV1("composio-tool-inventory", { sparse }))
  let invoked = false
  const accessor = {}; Object.defineProperty(accessor, "value", { enumerable: true, get: () => { invoked = true; return "secret" } })
  assert.throws(() => hashComposioObservationV1("composio-tool-inventory", accessor))
  assert.equal(invoked, false)
})

test("identical adapter observation payloads cannot cross digest domains", () => {
  const digests = [
    domainDigestV1("adapter-envelope", observation),
    domainDigestV1("buzz-organization-observation", observation),
    domainDigestV1("buzz-host-catalog-observation", observation),
    domainDigestV1("composio-tool-inventory", observation),
  ]
  assert.equal(new Set(digests).size, digests.length)
})
