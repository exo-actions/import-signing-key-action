import {describe, expect, it} from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as ssh from '../src/ssh';

const fixturesDir = path.join(__dirname, 'fixtures');

const keys = [
  {
    name: 'ssh-test-key',
    key: fs.readFileSync(path.join(fixturesDir, 'ssh-test-key'), {encoding: 'utf8', flag: 'r'}),
    passphrase: '',
    publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBxaN9FMV8+VvZ2zdA/s54VnKqH3PeVj2NgEXSXICql+ joe@bar.foo',
    fingerprint: 'SHA256:k/NTGWUuN1OmCSy7NId7Wn7ZmXn6z+cw1pTLk/3+EbA'
  },
  {
    name: 'ssh-test-key-passphrase',
    key: fs.readFileSync(path.join(fixturesDir, 'ssh-test-key-passphrase'), {encoding: 'utf8', flag: 'r'}),
    passphrase: fs.readFileSync(path.join(fixturesDir, 'ssh-test-key-passphrase.pass'), {encoding: 'utf8', flag: 'r'}),
    publicKey: '',
    fingerprint: 'SHA256:06e9pyOXs5Y5z01504cFes52ouh2qnUyP9sLKmplfD0'
  }
];

describe('writeKey', () => {
  it('writes the key to a private temp file', () => {
    const keyPath = ssh.writeKey(keys[0].key);
    try {
      expect(fs.existsSync(keyPath)).toBe(true);
      expect(fs.statSync(keyPath).mode & 0o777).toEqual(0o600);
      expect(fs.readFileSync(keyPath, {encoding: 'utf8'}).trim()).toEqual(keys[0].key.trim());
    } finally {
      ssh.deleteKey(keyPath);
    }
  });
});

describe('getPublicKey', () => {
  it('derives the public key from an unencrypted private key', async () => {
    const keyPath = ssh.writeKey(keys[0].key);
    try {
      await expect(ssh.getPublicKey(keyPath)).resolves.toEqual(keys[0].publicKey);
    } finally {
      ssh.deleteKey(keyPath);
    }
  });
});

describe('getFingerprint', () => {
  for (const key of keys) {
    // eslint-disable-next-line vitest/valid-title
    it(key.name, async () => {
      const keyPath = ssh.writeKey(key.key);
      try {
        await expect(ssh.getFingerprint(keyPath)).resolves.toEqual(key.fingerprint);
      } finally {
        ssh.deleteKey(keyPath);
      }
    });
  }
});

describe('stripPassphrase', () => {
  it('removes the passphrase from a protected private key', async () => {
    const key = keys[1];
    const keyPath = ssh.writeKey(key.key);
    try {
      await ssh.stripPassphrase(keyPath, key.passphrase.trim());
      await expect(ssh.getPublicKey(keyPath)).resolves.toContain('ssh-ed25519');
    } finally {
      ssh.deleteKey(keyPath);
    }
  });

  it('throws an error when the passphrase is wrong', async () => {
    const key = keys[1];
    const keyPath = ssh.writeKey(key.key);
    try {
      await expect(ssh.stripPassphrase(keyPath, 'not-the-right-passphrase')).rejects.toThrow();
    } finally {
      ssh.deleteKey(keyPath);
    }
  });
});

describe('writeAllowedSigners', () => {
  it('writes an allowed_signers file mapping the email to the public key', () => {
    const homedir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-signing-key-test-'));
    try {
      const allowedSignersPath = ssh.writeAllowedSigners(homedir, 'joe@bar.foo', keys[0].publicKey);
      expect(fs.existsSync(allowedSignersPath)).toBe(true);
      expect(fs.readFileSync(allowedSignersPath, {encoding: 'utf8'})).toEqual(`joe@bar.foo ${keys[0].publicKey}\n`);
    } finally {
      fs.rmSync(homedir, {recursive: true, force: true});
    }
  });
});

describe('deleteKey', () => {
  it('removes the temp folder containing the key', () => {
    const keyPath = ssh.writeKey(keys[0].key);
    const keyFolder = path.dirname(keyPath);
    ssh.deleteKey(keyPath);
    expect(fs.existsSync(keyFolder)).toBe(false);
  });
});
