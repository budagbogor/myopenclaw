import { runAllowedCommand } from './command.js';

export async function gitSummary(cwd: string, includePatch = false): Promise<unknown> {
  const status = await runAllowedCommand('git status -sb', cwd, 15000);
  const diffStat = await runAllowedCommand('git diff --stat', cwd, 15000);
  const output: any = { status, diffStat };

  if (includePatch) {
    const diff = await runAllowedCommand('git diff -U3', cwd, 20000);
    output.diff = diff;
  }

  return output;
}

