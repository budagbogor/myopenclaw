import { exec } from 'child_process';
import { Config } from '../config.js';

function isCwdAllowed(cwd?: string): boolean {
  const allow = Config.allowedCwds;
  if (!allow) return true;
  if (!cwd) return false;
  for (const a of allow) {
    if (cwd.toLowerCase().startsWith(a.toLowerCase())) return true;
  }
  return false;
}

export async function runAllowedCommand(command: string, cwd?: string, timeoutMs = 20000): Promise<unknown> {
  const cmd = command.trim();
  const allow = Config.allowedCommands;
  if (!allow || allow.size === 0) {
    throw new Error('Command execution disabled (MYCLAW_ALLOWED_COMMANDS belum di-set)');
  }

  if (!allow.has(cmd)) {
    throw new Error('Command blocked by allowlist');
  }

  if (!isCwdAllowed(cwd)) {
    throw new Error('CWD blocked by allowlist');
  }

  return new Promise((resolve, reject) => {
    exec(
      cmd,
      { cwd, timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(String(stderr || err.message || err)));
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      }
    );
  });
}

