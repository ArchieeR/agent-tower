import { createHash } from "node:crypto"

import type { OrganizationReadModel } from "../organization-model.ts"
import { canonicalOrganizationSnapshot } from "./organization-canonical.ts"

export function hashOrganizationSnapshot(model: OrganizationReadModel): string {
  return createHash("sha256").update(canonicalOrganizationSnapshot(model)).digest("hex")
}
