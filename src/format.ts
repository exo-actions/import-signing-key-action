export type KeyFormat = 'openpgp' | 'ssh';

const sshPrivateKeyMarkers = ['-----BEGIN OPENSSH PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----', '-----BEGIN DSA PRIVATE KEY-----', '-----BEGIN EC PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----'];

export const detect = async (key: string): Promise<KeyFormat> => {
  const trimmed = key.trimStart();
  if (sshPrivateKeyMarkers.some(marker => trimmed.startsWith(marker))) {
    return 'ssh';
  }
  return 'openpgp';
};
