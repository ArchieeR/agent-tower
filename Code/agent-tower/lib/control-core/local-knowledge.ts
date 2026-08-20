import { createHash } from "node:crypto"
import { access, readFile, readdir, realpath } from "node:fs/promises"
import * as path from "node:path"

export type KnowledgeSource = {
  id: string
  root: string
}

export type KnowledgeSearchOptions = {
  sourceIds?: string[]
  limit?: number
}

export type KnowledgeSearchResult = {
  documentId: string
  title: string
  version: string
  chunkIds: string[]
  excerpt: string
}

export type KnowledgeDocument = {
  id: string
  sourceId: string
  relativePath: string
  version: string
  content: string
}

export type KnowledgeChunk = {
  id: string
  documentId: string
  startLine: number
  endLine: number
  content: string
}

export type KnowledgeCitation = {
  id: string
  documentId: string
  version: string
  chunkIds: string[]
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

async function markdownFiles(root: string, relative = ""): Promise<string[]> {
  const directory = path.join(root, relative)
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const child = path.join(relative, entry.name)
        if (entry.isDirectory()) return markdownFiles(root, child)
        return entry.isFile() && entry.name.toLowerCase().endsWith(".md") ? [child] : []
      }),
  )
  return nested.flat().sort()
}

function parseChunkId(value: string, lineCount: number): { start: number; end: number } {
  const match = /^L([1-9]\d*)-L([1-9]\d*)$/.exec(value)
  if (!match) throw new Error(`Invalid knowledge chunk id: ${value}`)
  const start = Number(match[1])
  const end = Number(match[2])
  if (start > end || end > lineCount) throw new Error(`Knowledge chunk is outside the document: ${value}`)
  if (end - start + 1 > 200) throw new Error(`Knowledge chunk requests more than 200 lines: ${value}`)
  return { start, end }
}

export class LocalKnowledgeConnector {
  private readonly sources: Map<string, KnowledgeSource>

  constructor(sources: KnowledgeSource[]) {
    this.sources = new Map(sources.map((source) => [source.id, { ...source, root: path.resolve(source.root) }]))
  }

  private async availableSources(sourceIds?: string[]): Promise<KnowledgeSource[]> {
    const requested = sourceIds?.length
      ? sourceIds.map((id) => this.sources.get(id)).filter((source): source is KnowledgeSource => Boolean(source))
      : Array.from(this.sources.values())
    const available: KnowledgeSource[] = []
    for (const source of requested) {
      try {
        await access(source.root)
        available.push(source)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
    }
    return available
  }

  private async resolveDocument(
    documentId: string,
  ): Promise<{ source: KnowledgeSource; relativePath: string; absolutePath: string }> {
    const separator = documentId.indexOf(":")
    if (separator <= 0) throw new Error(`Invalid knowledge document ID: ${documentId}`)
    const sourceId = documentId.slice(0, separator)
    const relativePath = documentId.slice(separator + 1)
    const source = this.sources.get(sourceId)
    if (!source) throw new Error(`Knowledge source is unavailable: ${sourceId}`)
    if (!relativePath.toLowerCase().endsWith(".md")) throw new Error(`Invalid knowledge document path: ${relativePath}`)
    const absolutePath = path.resolve(source.root, relativePath)
    if (!absolutePath.startsWith(`${source.root}${path.sep}`)) throw new Error(`Invalid knowledge document path: ${relativePath}`)
    const [realRoot, realDocument] = await Promise.all([realpath(source.root), realpath(absolutePath)])
    if (!realDocument.startsWith(`${realRoot}${path.sep}`)) throw new Error(`Invalid knowledge document path: ${relativePath}`)
    return { source, relativePath: relativePath.split(path.sep).join("/"), absolutePath: realDocument }
  }

  async search(query: string, options: KnowledgeSearchOptions = {}): Promise<KnowledgeSearchResult[]> {
    if (query.length > 1_024) throw new Error("Knowledge search query exceeds 1024 characters.")
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean)
    if (!terms.length) throw new Error("Knowledge search query is required.")
    const allowedSources = await this.availableSources(options.sourceIds)
    const results: Array<KnowledgeSearchResult & { score: number }> = []

    for (const source of allowedSources) {
      for (const relativePath of await markdownFiles(source.root)) {
        const documentId = `${source.id}:${relativePath.split(path.sep).join("/")}`
        const document = await this.getDocument(documentId)
        const lower = document.content.toLowerCase()
        if (!terms.every((term) => lower.includes(term))) continue
        const lines = document.content.split("\n")
        const firstMatch = Math.max(
          0,
          lines.findIndex((line) => terms.some((term) => line.toLowerCase().includes(term))),
        )
        const start = Math.max(0, firstMatch - 2)
        const end = Math.min(lines.length - 1, firstMatch + 2)
        const title = lines.find((line) => line.startsWith("# "))?.slice(2).trim() || path.basename(relativePath, ".md")
        results.push({
          documentId,
          title,
          version: document.version,
          chunkIds: [`L${start + 1}-L${end + 1}`],
          excerpt: lines.slice(start, end + 1).join("\n"),
          score: terms.reduce((total, term) => total + lower.split(term).length - 1, 0),
        })
      }
    }

    return results
      .sort((left, right) => right.score - left.score || left.documentId.localeCompare(right.documentId))
      .slice(0, Math.max(1, Math.min(options.limit ?? 10, 50)))
      .map((result) => ({
        documentId: result.documentId,
        title: result.title,
        version: result.version,
        chunkIds: result.chunkIds,
        excerpt: result.excerpt,
      }))
  }

  async getDocument(documentId: string): Promise<KnowledgeDocument> {
    const { source, relativePath, absolutePath } = await this.resolveDocument(documentId)
    const content = await readFile(absolutePath, "utf8")
    return { id: documentId, sourceId: source.id, relativePath, version: sha256(content), content }
  }

  async getChunks(documentId: string, chunkIds: string[]): Promise<KnowledgeChunk[]> {
    if (chunkIds.length > 20) throw new Error("Knowledge chunk request exceeds 20 chunks.")
    const document = await this.getDocument(documentId)
    const lines = document.content.split("\n")
    return chunkIds.map((id) => {
      const range = parseChunkId(id, lines.length)
      return {
        id,
        documentId,
        startLine: range.start,
        endLine: range.end,
        content: lines.slice(range.start - 1, range.end).join("\n"),
      }
    })
  }

  async cite(documentId: string, version: string, chunkIds: string[]): Promise<KnowledgeCitation> {
    const document = await this.getDocument(documentId)
    if (document.version !== version) throw new Error("Knowledge document version changed before citation.")
    await this.getChunks(documentId, chunkIds)
    return {
      id: `citation-${sha256(JSON.stringify({ documentId, version, chunkIds })).slice(0, 24)}`,
      documentId,
      version,
      chunkIds: [...chunkIds],
    }
  }
}
