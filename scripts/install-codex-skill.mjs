#!/usr/bin/env node

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const packageName = "web3-robust-formatting"
const skillName = "web3-robust-formatting"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageRoot = path.resolve(__dirname, "..")

function printHelp() {
  console.log(
    [
      `${packageName} Codex skill installer`,
      "",
      "Usage:",
      `  npx ${packageName}-codex-skill install [--force]`,
      `  npx ${packageName}-codex-skill init-agents [--file AGENTS.md]`,
      `  npx ${packageName}-codex-skill help`,
      "",
      "Commands:",
      "  install      Install the packaged Codex skill into $CODEX_HOME/skills.",
      "  init-agents  Add recommended auto-routing instructions to AGENTS.md.",
      "  help         Show this help output.",
    ].join("\n"),
  )
}

function parseArgs(argv) {
  const args = [...argv]
  const first = args[0]
  const command = first && !first.startsWith("--") ? args.shift() : "install"

  let force = false
  let file = "AGENTS.md"

  while (args.length > 0) {
    const arg = args.shift()

    if (arg === "--force") {
      force = true
      continue
    }

    if (arg === "--file") {
      const next = args.shift()
      if (!next) {
        throw new Error("Missing value for --file")
      }
      file = next
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { command, force, file }
}

function installSkill({ force }) {
  const source = path.join(packageRoot, "skills", skillName)

  if (!fs.existsSync(source)) {
    throw new Error(`Skill source not found at: ${source}`)
  }

  const codexHome = process.env.CODEX_HOME?.trim() || path.join(os.homedir(), ".codex")
  const skillsRoot = path.join(codexHome, "skills")
  const destination = path.join(skillsRoot, skillName)

  fs.mkdirSync(skillsRoot, { recursive: true })

  if (fs.existsSync(destination)) {
    if (!force) {
      throw new Error(
        `Skill already exists at ${destination}. Re-run with --force to overwrite.`,
      )
    }

    fs.rmSync(destination, { recursive: true, force: true })
  }

  fs.cpSync(source, destination, { recursive: true })

  console.log(`Installed Codex skill \"${skillName}\" into ${destination}.`)
  console.log("Restart Codex to pick up new skills.")
}

function initAgentsFile({ file }) {
  const target = path.resolve(process.cwd(), file)
  const markerStart = "<!-- web3-robust-formatting-codex-skill:start -->"
  const markerEnd = "<!-- web3-robust-formatting-codex-skill:end -->"

  const block = [
    markerStart,
    "## Codex Skill Routing (web3-robust-formatting)",
    "- Use `web3-robust-formatting` skill for formatting, normalization, robust wrappers, diagnostics helpers, and token value calculations.",
    "- Use `web3-display-components` skill for display rendering and robust display wrappers that consume these outputs.",
    markerEnd,
    "",
  ].join("\n")

  const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""

  if (existing.includes(markerStart) && existing.includes(markerEnd)) {
    console.log(`AGENTS file already contains this block: ${target}`)
    return
  }

  const next = existing.length === 0 ? block : `${existing.trimEnd()}\n\n${block}`
  fs.writeFileSync(target, next)

  console.log(`Updated ${target} with recommended Codex skill routing.`)
}

try {
  const { command, force, file } = parseArgs(process.argv.slice(2))

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp()
    process.exit(0)
  }

  if (command === "install") {
    installSkill({ force })
    process.exit(0)
  }

  if (command === "init-agents") {
    initAgentsFile({ file })
    process.exit(0)
  }

  throw new Error(`Unknown command: ${command}`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Error: ${message}`)
  process.exit(1)
}
