import {afterEach, describe, expect, it} from 'vitest';

import * as context from '../src/context';

const inputKeys = [
  'INPUT_SIGNING_KEY',
  'INPUT_PASSPHRASE',
  'INPUT_TRUST_LEVEL',
  'INPUT_GIT_CONFIG_GLOBAL',
  'INPUT_GIT_USER_SIGNINGKEY',
  'INPUT_GIT_COMMIT_GPGSIGN',
  'INPUT_GIT_TAG_GPGSIGN',
  'INPUT_GIT_PUSH_GPGSIGN',
  'INPUT_GIT_COMMITTER_NAME',
  'INPUT_GIT_COMMITTER_EMAIL',
  'INPUT_WORKDIR',
  'INPUT_FINGERPRINT'
];

afterEach(() => {
  for (const key of inputKeys) {
    delete process.env[key];
  }
});

describe('getInputs', () => {
  it('reads all inputs from the environment', async () => {
    process.env.INPUT_SIGNING_KEY = 'the-key';
    process.env.INPUT_PASSPHRASE = 'the-passphrase';
    process.env.INPUT_TRUST_LEVEL = '5';
    process.env.INPUT_GIT_CONFIG_GLOBAL = 'true';
    process.env.INPUT_GIT_USER_SIGNINGKEY = 'true';
    process.env.INPUT_GIT_COMMIT_GPGSIGN = 'true';
    process.env.INPUT_GIT_TAG_GPGSIGN = 'false';
    process.env.INPUT_GIT_PUSH_GPGSIGN = 'always';
    process.env.INPUT_GIT_COMMITTER_NAME = 'Joe Bar';
    process.env.INPUT_GIT_COMMITTER_EMAIL = 'joe@bar.foo';
    process.env.INPUT_WORKDIR = 'subdir';
    process.env.INPUT_FINGERPRINT = 'DEADBEEF';

    await expect(context.getInputs()).resolves.toEqual({
      signingKey: 'the-key',
      passphrase: 'the-passphrase',
      trustLevel: '5',
      gitConfigGlobal: true,
      gitUserSigningkey: true,
      gitCommitGpgsign: true,
      gitTagGpgsign: false,
      gitPushGpgsign: 'always',
      gitCommitterName: 'Joe Bar',
      gitCommitterEmail: 'joe@bar.foo',
      workdir: 'subdir',
      fingerprint: 'DEADBEEF'
    });
  });

  it('applies defaults for optional inputs', async () => {
    process.env.INPUT_SIGNING_KEY = 'the-key';
    process.env.INPUT_GIT_CONFIG_GLOBAL = 'false';
    process.env.INPUT_GIT_USER_SIGNINGKEY = 'false';
    process.env.INPUT_GIT_COMMIT_GPGSIGN = 'false';
    process.env.INPUT_GIT_TAG_GPGSIGN = 'false';

    await expect(context.getInputs()).resolves.toMatchObject({
      gitPushGpgsign: 'if-asked',
      workdir: '.'
    });
  });

  it('throws when the required signing key is missing', async () => {
    await expect(context.getInputs()).rejects.toThrow();
  });
});
