import {afterEach, describe, expect, it} from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {execFileSync} from 'child_process';

import * as git from '../src/git';

let cwd: string | undefined;

afterEach(() => {
  if (cwd) {
    process.chdir(cwd);
    cwd = undefined;
  }
});

describe('setConfig', () => {
  it('sets a local git config value in the current repo', async () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-signing-key-git-'));
    try {
      execFileSync('git', ['init', '-q', repoDir]);
      cwd = process.cwd();
      process.chdir(repoDir);
      await git.setConfig('user.name', 'ignored', false);
      await git.setConfig('user.name', 'Joe Bar', false);
      const value = fs.readFileSync(path.join(repoDir, '.git', 'config'), {encoding: 'utf8'});
      expect(value).toContain('name = Joe Bar');
    } finally {
      fs.rmSync(repoDir, {recursive: true, force: true});
    }
  });

  it('sets a global git config value', async () => {
    const globalConfigPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'import-signing-key-git-global-')), 'gitconfig');
    const previous = process.env.GIT_CONFIG_GLOBAL;
    process.env.GIT_CONFIG_GLOBAL = globalConfigPath;
    try {
      await git.setConfig('user.email', 'joe@bar.foo', true);
      const value = fs.readFileSync(globalConfigPath, {encoding: 'utf8'});
      expect(value).toContain('email = joe@bar.foo');
    } finally {
      if (previous === undefined) {
        delete process.env.GIT_CONFIG_GLOBAL;
      } else {
        process.env.GIT_CONFIG_GLOBAL = previous;
      }
      fs.rmSync(path.dirname(globalConfigPath), {recursive: true, force: true});
    }
  });

  it('rejects when git reports an error', async () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-signing-key-git-invalid-'));
    try {
      execFileSync('git', ['init', '-q', repoDir]);
      cwd = process.cwd();
      process.chdir(repoDir);
      await expect(git.setConfig('not-a-valid-key', 'value', false)).rejects.toThrow();
    } finally {
      fs.rmSync(repoDir, {recursive: true, force: true});
    }
  });
});
