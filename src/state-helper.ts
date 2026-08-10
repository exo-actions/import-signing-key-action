import * as core from '@actions/core';

export const IsPost = !!process.env['STATE_isPost'];
export const format = process.env['STATE_format'] || '';
export const fingerprint = process.env['STATE_fingerprint'] || '';
export const sshKeyPath = process.env['STATE_sshKeyPath'] || '';

export function setFormat(format: string) {
  core.saveState('format', format);
}

export function setFingerprint(fingerprint: string) {
  core.saveState('fingerprint', fingerprint);
}

export function setSshKeyPath(sshKeyPath: string) {
  core.saveState('sshKeyPath', sshKeyPath);
}

if (!IsPost) {
  core.saveState('isPost', 'true');
}
