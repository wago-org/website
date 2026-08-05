import { readFile } from 'node:fs/promises'

const root = new URL('../corpora/', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'))

if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.modules) || manifest.modules.length < 3) {
  throw new Error('Corpora manifest must contain at least three modules')
}

const names = new Set()
for (const module of manifest.modules) {
  if (names.has(module.file)) throw new Error(`Duplicate corpus module: ${module.file}`)
  names.add(module.file)

  if (!module.file.endsWith('.wasm') || !module.source.endsWith('.wat')) {
    throw new Error(`Unexpected corpus paths for ${module.file}`)
  }

  const [wasm, source] = await Promise.all([
    readFile(new URL(module.file, root)),
    readFile(new URL(module.source, root), 'utf8')
  ])

  if (wasm.length < 8 || !wasm.subarray(0, 8).equals(Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]))) {
    throw new Error(`${module.file} is not a WebAssembly 1 binary`)
  }
  if (!source.startsWith('(module')) throw new Error(`${module.source} is not a WAT module`)
}

console.log(`Verified ${manifest.modules.length} WebAssembly corpus modules`)
