import { cp, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distPath = join(projectRoot, 'dist');
const tempPath = await mkdtemp(join(tmpdir(), 'az104-pages-'));
const tempBranch = `publish-pages-${Date.now()}`;

function git(args, { cwd = projectRoot, allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: 'inherit' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} terminou com o código ${result.status ?? 'desconhecido'}`);
  }
  return result.status === 0;
}

try {
  const hasRemotePagesBranch = git(['fetch', 'origin', 'gh-pages'], { allowFailure: true });
  const baseRef = hasRemotePagesBranch ? 'origin/gh-pages' : 'HEAD';
  git(['worktree', 'add', '--detach', tempPath, baseRef]);
  git(['switch', '--orphan', tempBranch], { cwd: tempPath });

  for (const entry of await readdir(tempPath)) {
    if (entry !== '.git') await rm(join(tempPath, entry), { recursive: true, force: true });
  }

  await cp(distPath, tempPath, { recursive: true });
  await writeFile(join(tempPath, '.nojekyll'), '');
  git(['add', '--all'], { cwd: tempPath });
  git(['-c', 'user.name=AZ-104 Pages Publisher', '-c', 'user.email=pages-publisher@users.noreply.github.com', 'commit', '-m', 'Publish AZ-104 study platform'], { cwd: tempPath });
  git(['push', '--force', 'origin', `${tempBranch}:gh-pages`], { cwd: tempPath });
  console.log('Site publicado na branch gh-pages.');
} finally {
  git(['worktree', 'remove', '--force', tempPath], { allowFailure: true });
  git(['branch', '-D', tempBranch], { allowFailure: true });
}
