// 构建两份产物：
// - lib/index.js：host 端（Node ESM），注册润色/预测 HTTP 接口
// - lib/client.js：client 端（浏览器 IIFE），通过 window.__ModuleLoader__ 注册到 DSH Web
import { build, context } from 'esbuild'
import { readFile } from 'node:fs/promises'
import process from 'node:process'

const client = {
  entryPoints: ['src/client/index.jsx'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  // React 由 DSH 的模块加载器在运行时提供，见 src/client/react.js
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  legalComments: 'none',
  charset: 'utf8',
}

const host = {
  entryPoints: ['src/index.js'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  packages: 'external',
  legalComments: 'none',
  charset: 'utf8',
}

// 客户端注册 id 必须等于包名，否则 DSH 报 "loaded without registering"
async function validate() {
  const { name } = JSON.parse(await readFile('package.json', 'utf8'))
  const out = await readFile(client.outfile, 'utf8')
  if (!out.includes(`id: "${name}"`) || !out.includes('window.__ModuleLoader__.load')) {
    throw new Error(`lib/client.js 缺少 DSH 模块注册，或注册 id 不是包名 "${name}"`)
  }
  console.log(`built ${client.outfile} and ${host.outfile}`)
}

if (process.argv.includes('--watch')) {
  const contexts = await Promise.all([context(client), context(host)])
  await Promise.all(contexts.map(c => c.watch()))
  console.log('watching src/ ...')
} else {
  await Promise.all([build(client), build(host)])
  await validate()
}
