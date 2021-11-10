/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs'
import { join, resolve, basename } from 'path'
import parseArgv from 'minimist'
import { spawn } from 'child_process'

let cwd = process.cwd(),
  outPkg: any = {}

const pkgDir = resolve(__dirname, '..'),
  args = parseArgv(process.argv),
  isRoot = args.root,
  newProject = resolve(args._[2]) !== process.cwd(),
  project = newProject ? args._[2] : basename(cwd),
  readJson = (file: string): JSON => JSON.parse(readFileSync(join(pkgDir, file), 'utf-8')),
  pkgJson = readJson('package.json') as any,
  tsconfigJson = readJson('tsconfig.json'),
  nodeLtsVersion = process.version, //todo query and auto run ncu?
  vsCodeExtensions = readJson('vscode/extensions.json'),
  vsCodeSettings = readJson('vscode/settings.json'),
  license = readFileSync(join(pkgDir, 'LICENSE'), 'utf-8').replace(
    '2019',
    new Date().getFullYear().toString()
  )

try {
  outPkg = JSON.parse(readFileSync(join(cwd, 'package.json')).toString())
} catch (e) {
  void e
}

const devDeps = Object.assign({}, outPkg.devDependencies, pkgJson.devDependencies)
delete devDeps['@types/minimist']

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
outPkg.tap = pkgJson.tap
outPkg.dependencies = outPkg.dependencies || {}
outPkg.devDependencies = devDeps
outPkg.mocha = pkgJson.mocha
outPkg.prettier = pkgJson.prettier
outPkg.commitlint = pkgJson.commitlint
outPkg.eslintConfig = pkgJson.eslintConfig

delete outPkg.devDependencies['@types/minimist']
if (!isRoot) {
  delete outPkg.scripts.commitlint
  delete outPkg.commitlint
  delete outPkg.devDependencies['@commitlint/cli']
  delete outPkg.devDependencies['@commitlint/config-angular']
}

function tryAction(fn: any): void {
  try {
    fn()
  } catch (e) {
    console.error('Failed trying to run init\n\t' + e.message)
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
  tryAction(() => appendFileSync(join(cwd, '.node-version'), nodeLtsVersion))
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
