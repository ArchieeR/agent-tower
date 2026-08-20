import { readFile } from "node:fs/promises"

import type { MemberIdentityLink } from "./context-broker.ts"

type MemberLinkFile = {
  version: 1
  members: Record<string, { buzzMemberId: string; roleProfileId: string }>
}

export async function readMemberLinks(file: string): Promise<MemberIdentityLink[]> {
  let parsed: MemberLinkFile
  try {
    parsed = JSON.parse(await readFile(file, "utf8")) as MemberLinkFile
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
  if (parsed.version !== 1 || !parsed.members || typeof parsed.members !== "object") {
    throw new Error("Member link file has an unsupported shape.")
  }
  const links = Object.entries(parsed.members)
    .map(([memberId, entry]) => ({ memberId, buzzMemberId: entry.buzzMemberId, roleProfileId: entry.roleProfileId }))
    .sort((left, right) => left.memberId.localeCompare(right.memberId))
  const seenBuzzIds = new Set<string>()
  for (const link of links) {
    if (!link.memberId || !link.buzzMemberId || !link.roleProfileId) throw new Error("Member link identity is incomplete.")
    if (seenBuzzIds.has(link.buzzMemberId)) throw new Error(`Buzz member is linked more than once: ${link.buzzMemberId}`)
    seenBuzzIds.add(link.buzzMemberId)
  }
  return links
}
