import { strict as assert } from "node:assert"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"
import { test } from "node:test"

import { readMemberLinks } from "../lib/control-core/member-links.ts"

test("reads unique stable member links", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-links-"))
  const file = path.join(directory, "member-links.json")
  await writeFile(
    file,
    JSON.stringify({
      version: 1,
      members: {
        "system-manager": {
          buzzMemberId: "buzz:system-manager-instance",
          roleProfileId: "system-manager",
        },
      },
    }),
  )

  assert.deepEqual(await readMemberLinks(file), [
    {
      memberId: "system-manager",
      buzzMemberId: "buzz:system-manager-instance",
      roleProfileId: "system-manager",
    },
  ])
})

test("rejects duplicate Buzz identities across stable members", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-tower-links-"))
  const file = path.join(directory, "member-links.json")
  await writeFile(
    file,
    JSON.stringify({
      version: 1,
      members: {
        one: { buzzMemberId: "buzz:same", roleProfileId: "one" },
        two: { buzzMemberId: "buzz:same", roleProfileId: "two" },
      },
    }),
  )

  await assert.rejects(() => readMemberLinks(file), /Buzz member is linked more than once/)
})
