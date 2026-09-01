import {afterEach, describe, expect, it, vi} from 'vitest';

const envKeys = ['STATE_isPost', 'STATE_format', 'STATE_fingerprint', 'STATE_sshKeyPath'];

afterEach(() => {
  for (const key of envKeys) {
    delete process.env[key];
  }
  vi.resetModules();
});

describe('state', () => {
  it('reads IsPost and state values from the environment', async () => {
    process.env.STATE_isPost = 'true';
    process.env.STATE_format = 'openpgp';
    process.env.STATE_fingerprint = 'DEADBEEF';
    process.env.STATE_sshKeyPath = '/tmp/key';

    const stateHelper = await import('../src/state-helper');

    expect(stateHelper.IsPost).toBe(true);
    expect(stateHelper.format).toBe('openpgp');
    expect(stateHelper.fingerprint).toBe('DEADBEEF');
    expect(stateHelper.sshKeyPath).toBe('/tmp/key');
  });

  it('defaults to empty state and marks isPost when not already post', async () => {
    const stateHelper = await import('../src/state-helper');

    expect(stateHelper.IsPost).toBe(false);
    expect(stateHelper.format).toBe('');
    expect(stateHelper.fingerprint).toBe('');
    expect(stateHelper.sshKeyPath).toBe('');
  });
});

describe('setFormat, setFingerprint, setSshKeyPath', () => {
  it('save state without throwing', async () => {
    const stateHelper = await import('../src/state-helper');

    expect(() => stateHelper.setFormat('ssh')).not.toThrow();
    expect(() => stateHelper.setFingerprint('DEADBEEF')).not.toThrow();
    expect(() => stateHelper.setSshKeyPath('/tmp/key')).not.toThrow();
  });
});
