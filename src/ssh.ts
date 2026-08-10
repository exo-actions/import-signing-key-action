import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as exec from '@actions/exec';

const sshKeygen = async (args: string[]): Promise<{stdout: string; stderr: string; exitCode: number}> => {
  return await exec.getExecOutput('ssh-keygen', args, {
    ignoreReturnCode: true,
    silent: true
  });
};

export const writeKey = (key: string): string => {
  const keyFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'import-signing-key-'));
  const keyPath = path.join(keyFolder, 'signing_key');
  fs.writeFileSync(keyPath, key.trim() + '\n', {mode: 0o600});
  return keyPath;
};

export const stripPassphrase = async (keyPath: string, passphrase: string): Promise<void> => {
  const res = await sshKeygen(['-p', '-P', passphrase, '-N', '', '-f', keyPath]);
  if (res.exitCode != 0) {
    throw new Error(res.stderr.trim() || 'Unable to remove passphrase from SSH signing key. Check that the passphrase is correct.');
  }
};

export const getPublicKey = async (keyPath: string): Promise<string> => {
  const res = await sshKeygen(['-y', '-f', keyPath]);
  if (res.exitCode != 0) {
    throw new Error(res.stderr.trim() || 'Unable to derive public key from the provided SSH signing key.');
  }
  return res.stdout.trim();
};

export const getFingerprint = async (keyPath: string): Promise<string> => {
  const res = await sshKeygen(['-l', '-f', keyPath]);
  if (res.exitCode != 0) {
    throw new Error(res.stderr.trim() || 'Unable to compute fingerprint of the provided SSH signing key.');
  }
  const parts = res.stdout.trim().split(/\s+/);
  return parts.length > 1 ? parts[1] : res.stdout.trim();
};

export const writeAllowedSigners = (homedir: string, email: string, publicKey: string): string => {
  const sshDir = path.join(homedir, '.ssh');
  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, {recursive: true, mode: 0o700});
  }
  const allowedSignersPath = path.join(sshDir, 'allowed_signers');
  fs.writeFileSync(allowedSignersPath, `${email} ${publicKey}\n`, {mode: 0o600});
  return allowedSignersPath;
};

export const deleteKey = (keyPath: string): void => {
  const keyFolder = path.dirname(keyPath);
  fs.rmSync(keyFolder, {recursive: true, force: true});
};
