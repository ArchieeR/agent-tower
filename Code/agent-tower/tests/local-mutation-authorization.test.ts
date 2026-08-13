import { strict as assert } from "node:assert"
import { test } from "node:test"

import { isTrustedLocalMutation } from "../lib/server/local-mutation-authorization.ts"

test("accepts a same-origin loopback department mutation", () => {
  const request = new Request("http://127.0.0.1:3008/api/organization/departments/marketing", {
    method: "PUT",
    headers: { origin: "http://127.0.0.1:3008" },
  })
  assert.equal(isTrustedLocalMutation(request), true)
})

test("rejects a cross-origin or non-loopback department mutation", () => {
  const crossOrigin = new Request("http://127.0.0.1:3008/api/organization/departments/marketing", {
    method: "PUT",
    headers: { origin: "https://attacker.example" },
  })
  const nonLoopback = new Request("https://agent-tower.example/api/organization/departments/marketing", {
    method: "PUT",
    headers: { origin: "https://agent-tower.example" },
  })
  assert.equal(isTrustedLocalMutation(crossOrigin), false)
  assert.equal(isTrustedLocalMutation(nonLoopback), false)
})
