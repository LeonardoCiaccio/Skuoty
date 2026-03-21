/**
 * Launches the actual Electron binary (not the npm wrapper shell script).
 * This avoids the issue where the bash wrapper in node_modules/.bin/electron
 * runs `node cli.js` instead of the real Electron executable.
 */
const { spawn } = require('child_process')
const electronPath = require('electron') // returns path to Electron binary

const proc = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' },
})

proc.on('close', (code) => {
  process.exit(code ?? 0)
})
