import {describe, expect, it} from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import * as format from '../src/format';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('detect', () => {
  it('returns openpgp for an armored GPG private key', async () => {
    const pgp = fs.readFileSync(path.join(fixturesDir, 'test-key.pgp'), {encoding: 'utf8', flag: 'r'});
    await expect(format.detect(pgp)).resolves.toEqual('openpgp');
  });

  it('returns openpgp for a base64 encoded GPG private key', async () => {
    const pgpBase64 = fs.readFileSync(path.join(fixturesDir, 'test-key-base64.pgp'), {encoding: 'utf8', flag: 'r'});
    await expect(format.detect(pgpBase64)).resolves.toEqual('openpgp');
  });

  it('returns ssh for an OpenSSH private key', async () => {
    const sshKey = fs.readFileSync(path.join(fixturesDir, 'ssh-test-key'), {encoding: 'utf8', flag: 'r'});
    await expect(format.detect(sshKey)).resolves.toEqual('ssh');
  });

  it('returns ssh for a passphrase protected OpenSSH private key', async () => {
    const sshKey = fs.readFileSync(path.join(fixturesDir, 'ssh-test-key-passphrase'), {encoding: 'utf8', flag: 'r'});
    await expect(format.detect(sshKey)).resolves.toEqual('ssh');
  });

  it('returns ssh for a leading-whitespace OpenSSH private key', async () => {
    const sshKey = fs.readFileSync(path.join(fixturesDir, 'ssh-test-key'), {encoding: 'utf8', flag: 'r'});
    await expect(format.detect(`\n  ${sshKey}`)).resolves.toEqual('ssh');
  });
});
