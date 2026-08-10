import * as core from '@actions/core';

export interface Inputs {
  signingKey: string;
  passphrase: string;
  trustLevel: string;
  gitConfigGlobal: boolean;
  gitUserSigningkey: boolean;
  gitCommitGpgsign: boolean;
  gitTagGpgsign: boolean;
  gitPushGpgsign: string;
  gitCommitterName: string;
  gitCommitterEmail: string;
  workdir: string;
  fingerprint: string;
}

export async function getInputs(): Promise<Inputs> {
  return {
    signingKey: core.getInput('signing_key', {required: true}),
    passphrase: core.getInput('passphrase'),
    trustLevel: core.getInput('trust_level'),
    gitConfigGlobal: core.getBooleanInput('git_config_global'),
    gitUserSigningkey: core.getBooleanInput('git_user_signingkey'),
    gitCommitGpgsign: core.getBooleanInput('git_commit_gpgsign'),
    gitTagGpgsign: core.getBooleanInput('git_tag_gpgsign'),
    gitPushGpgsign: core.getInput('git_push_gpgsign') || 'if-asked',
    gitCommitterName: core.getInput('git_committer_name'),
    gitCommitterEmail: core.getInput('git_committer_email'),
    workdir: core.getInput('workdir') || '.',
    fingerprint: core.getInput('fingerprint')
  };
}
