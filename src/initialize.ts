/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { spawn } from 'node:child_process'

import parseArgv from 'minimist'

let cwd = process.cwd(),
  outPkg: any = {}

function readJson(baseDir: string, file: string) {
  return JSON.parse(readFileSync(join(baseDir, file), 'utf-8'))
}

const pkgDir = resolve(__dirname, '..'),
  args = parseArgv(process.argv),
  isRoot = args.root,
  projectIsRoot = typeof isRoot === 'string',
  newProject = Boolean((args._[2] && resolve(args._[2]) !== process.cwd()) || projectIsRoot),
  project = projectIsRoot ? isRoot : newProject ? args._[2] : basename(cwd),
  pkgJson = readJson(pkgDir, 'package.json') as any,
  tsconfigJson = readJson(pkgDir, 'tsconfig.json'),
  nodeVersion = process.version.replace('v', ''),
  vsCodeExtensions = readJson(pkgDir, 'vscode/extensions.json'),
  vsCodeSettings = readJson(pkgDir, 'vscode/settings.json'),
  license = readFileSync(join(pkgDir, 'LICENSE'), 'utf-8').replace(
    '2020',
    new Date().getFullYear().toString()
  )

console.log('@calebboyd/create-tsp: ', pkgJson.version)

try {
  outPkg = readJson(cwd, 'package.json')
} catch (e) {
  void e
}

const devDeps = Object.assign({}, outPkg.devDependencies, pkgJson.devDependencies)
devDeps['@types/minimist'] = undefined

Object.assign(outPkg, 'private' in outPkg ? { private: outPkg.private } : {})

outPkg.name = outPkg.name || project
outPkg.version = outPkg.version || '0.0.1'
outPkg.license = outPkg.license || 'MIT'
outPkg.type = 'commonjs'
const cjsFile = `./lib/${outPkg.name}.js`
outPkg.main = outPkg.main || cjsFile
outPkg.exports = {
  '.': {
    node: {
      require: cjsFile,
    },
    default: cjsFile,
  },
  './package.json': './package.json',
}
outPkg.engines = pkgJson.engines
outPkg.files = ['lib'].concat(outPkg.files || [])
outPkg.scripts = pkgJson.scripts
outPkg.dependencies = outPkg.dependencies || {}
outPkg.devDependencies = devDeps
outPkg.mocha = pkgJson.mocha
outPkg.prettier = pkgJson.prettier
outPkg.commitlint = pkgJson.commitlint
outPkg.eslintConfig = pkgJson.eslintConfig

outPkg.devDependencies['@types/minimist'] = undefined
if (!isRoot) {
  outPkg.scripts.commitlint =
    outPkg.commitlint =
    outPkg.devDependencies['@commitlint/cli'] =
    outPkg.devDependencies['@commitlint/config-angular'] =
      undefined
}

function tryAction(fn: any): void {
  try {
    fn()
  } catch (e: any) {
    console.error('Failed trying to run init\n\t' + e?.message)
  }
}

if (newProject) {
  cwd = resolve(cwd, project)
  console.log('Creating project directory: ' + project)
  tryAction(() => mkdirSync(cwd))
} else {
  console.log('Creating project in current directory')
}

console.log('Writing package files...')

tryAction(() => mkdirSync(join(cwd, 'src')))
if (isRoot) {
  tryAction(() => appendFileSync(join(cwd, '.node-version'), nodeVersion))
  tryAction(() => mkdirSync(join(cwd, '.vscode')))
  tryAction(() =>
    writeFileSync(
      join(cwd, '.vscode', 'extensions.json'),
      JSON.stringify(vsCodeExtensions, null, 2)
    )
  )
  tryAction(() =>
    writeFileSync(join(cwd, '.vscode', 'settings.json'), JSON.stringify(vsCodeSettings, null, 2))
  )
  tryAction(() =>
    writeFileSync(
      join(cwd, '.gitignore'),
      `
.DS_Store
node_modules
coverage
dist
lib
`
    )
  )
}

tryAction(() => writeFileSync(join(cwd, 'tsconfig.json'), JSON.stringify(tsconfigJson, null, 2)))
tryAction(() => writeFileSync(join(cwd, 'package.json'), JSON.stringify(outPkg, null, 2)))
tryAction(() => writeFileSync(join(cwd, 'LICENSE'), license))

console.log('Running npm install...')
const npm = 'npm' + (process.platform === 'win32' ? '.cmd' : '')
spawn(npm, ['install'], { cwd, stdio: 'inherit' })
