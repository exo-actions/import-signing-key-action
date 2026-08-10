import * as os from 'os';
import * as core from '@actions/core';

import * as context from './context.js';
import * as format from './format.js';
import * as git from './git.js';
import * as gpg from './gpg.js';
import * as openpgp from './openpgp.js';
import * as ssh from './ssh.js';
import * as stateHelper from './state-helper.js';

async function runGPG(inputs: context.Inputs): Promise<void> {
  const version = await gpg.getVersion();
  const dirs = await gpg.getDirs();
  await core.group(`GnuPG info`, async () => {
    core.info(`Version    : ${version.gnupg} (libgcrypt ${version.libgcrypt})`);
    core.info(`Libdir     : ${dirs.libdir}`);
    core.info(`Libexecdir : ${dirs.libexecdir}`);
    core.info(`Datadir    : ${dirs.datadir}`);
    core.info(`Homedir    : ${dirs.homedir}`);
  });

  const privateKey = await openpgp.readPrivateKey(inputs.signingKey);
  await core.group(`GPG private key info`, async () => {
    core.info(`Fingerprint  : ${privateKey.fingerprint}`);
    core.info(`KeyID        : ${privateKey.keyID}`);
    core.info(`Name         : ${privateKey.name}`);
    core.info(`Email        : ${privateKey.email}`);
    core.info(`CreationTime : ${privateKey.creationTime}`);
  });

  stateHelper.setFingerprint(privateKey.fingerprint);

  let fingerprint = privateKey.fingerprint;
  if (inputs.fingerprint) {
    fingerprint = inputs.fingerprint;
  }

  await core.group(`Fingerprint to use`, async () => {
    core.info(fingerprint);
  });

  await core.group(`Importing GPG private key`, async () => {
    await gpg.importKey(inputs.signingKey).then(stdout => {
      core.info(stdout);
    });
  });

  if (inputs.passphrase) {
    await core.group(`Configuring GnuPG agent`, async () => {
      const gpgHome = await gpg.getHome();
      core.info(`GnuPG home: ${gpgHome}`);
      await gpg.configureAgent(gpgHome, gpg.agentConfig);
    });
    if (!inputs.fingerprint) {
      // Set the passphrase for all subkeys
      await core.group(`Getting keygrips`, async () => {
        for (const keygrip of await gpg.getKeygrips(fingerprint)) {
          core.info(`Presetting passphrase for ${keygrip}`);
          await gpg.presetPassphrase(keygrip, inputs.passphrase).then(stdout => {
            core.debug(stdout);
          });
        }
      });
    } else {
      // Set the passphrase only for the subkey specified in the input `fingerprint`
      await core.group(`Getting keygrip for fingerprint`, async () => {
        const keygrip = await gpg.getKeygrip(fingerprint);
        core.info(`Presetting passphrase for key ${fingerprint} with keygrip ${keygrip}`);
        await gpg.presetPassphrase(keygrip, inputs.passphrase).then(stdout => {
          core.debug(stdout);
        });
      });
    }
  }

  if (inputs.trustLevel) {
    await core.group(`Setting key's trust level`, async () => {
      await gpg.setTrustLevel(privateKey.keyID, inputs.trustLevel).then(() => {
        core.info(`Trust level set to ${inputs.trustLevel} for ${privateKey.keyID}`);
      });
    });
  }

  await core.group(`Setting outputs`, async () => {
    core.info(`format=openpgp`);
    core.setOutput('format', 'openpgp');
    core.info(`fingerprint=${fingerprint}`);
    core.setOutput('fingerprint', fingerprint);
    core.info(`keyid=${privateKey.keyID}`);
    core.setOutput('keyid', privateKey.keyID);
    core.info(`name=${privateKey.name}`);
    core.setOutput('name', privateKey.name);
    core.info(`email=${privateKey.email}`);
    core.setOutput('email', privateKey.email);
  });

  if (inputs.gitUserSigningkey) {
    core.info('Setting GPG signing keyID for this Git repository');
    await git.setConfig('user.signingkey', privateKey.keyID, inputs.gitConfigGlobal);

    const userEmail = inputs.gitCommitterEmail || privateKey.email;
    const userName = inputs.gitCommitterName || privateKey.name;

    if (userEmail != privateKey.email) {
      core.setFailed(`Committer email "${inputs.gitCommitterEmail}" (name: "${inputs.gitCommitterName}") does not match GPG private key email "${privateKey.email}" (name: "${privateKey.name}")`);
      return;
    }

    core.info(`Configuring Git committer (${userName} <${userEmail}>)`);
    await git.setConfig('user.name', userName, inputs.gitConfigGlobal);
    await git.setConfig('user.email', userEmail, inputs.gitConfigGlobal);

    if (inputs.gitCommitGpgsign) {
      core.info('Sign all commits automatically');
      await git.setConfig('commit.gpgsign', 'true', inputs.gitConfigGlobal);
    }
    if (inputs.gitTagGpgsign) {
      core.info('Sign all tags automatically');
      await git.setConfig('tag.gpgsign', 'true', inputs.gitConfigGlobal);
    }
    if (inputs.gitPushGpgsign) {
      core.info('Sign all pushes automatically');
      await git.setConfig('push.gpgsign', inputs.gitPushGpgsign, inputs.gitConfigGlobal);
    }
  }
}

async function runSSH(inputs: context.Inputs): Promise<void> {
  const keyPath = ssh.writeKey(inputs.signingKey);
  stateHelper.setSshKeyPath(keyPath);

  if (inputs.passphrase) {
    await core.group(`Removing passphrase from SSH signing key`, async () => {
      await ssh.stripPassphrase(keyPath, inputs.passphrase);
    });
  }

  const publicKey = await ssh.getPublicKey(keyPath);
  const fingerprint = await ssh.getFingerprint(keyPath);

  await core.group(`SSH signing key info`, async () => {
    core.info(`Fingerprint : ${fingerprint}`);
    core.info(`Public key  : ${publicKey}`);
  });

  await core.group(`Setting outputs`, async () => {
    core.info(`format=ssh`);
    core.setOutput('format', 'ssh');
    core.info(`fingerprint=${fingerprint}`);
    core.setOutput('fingerprint', fingerprint);
    core.setOutput('keyid', '');
    core.info(`name=${inputs.gitCommitterName}`);
    core.setOutput('name', inputs.gitCommitterName);
    core.info(`email=${inputs.gitCommitterEmail}`);
    core.setOutput('email', inputs.gitCommitterEmail);
  });

  if (inputs.gitUserSigningkey) {
    core.info('Setting SSH signing key for this Git repository');
    await git.setConfig('gpg.format', 'ssh', inputs.gitConfigGlobal);
    await git.setConfig('user.signingkey', keyPath, inputs.gitConfigGlobal);

    if (inputs.gitCommitterName) {
      await git.setConfig('user.name', inputs.gitCommitterName, inputs.gitConfigGlobal);
    }
    if (inputs.gitCommitterEmail) {
      await git.setConfig('user.email', inputs.gitCommitterEmail, inputs.gitConfigGlobal);
      await core.group(`Configuring allowed signers file`, async () => {
        const allowedSignersPath = ssh.writeAllowedSigners(os.homedir(), inputs.gitCommitterEmail, publicKey);
        core.info(`Allowed signers file: ${allowedSignersPath}`);
        await git.setConfig('gpg.ssh.allowedSignersFile', allowedSignersPath, inputs.gitConfigGlobal);
      });
    } else {
      core.warning('`git_committer_email` is not set: skipping allowed_signers file generation. Signature verification (e.g. `git log --show-signature`) will not work locally.');
    }

    if (inputs.gitCommitGpgsign) {
      core.info('Sign all commits automatically');
      await git.setConfig('commit.gpgsign', 'true', inputs.gitConfigGlobal);
    }
    if (inputs.gitTagGpgsign) {
      core.info('Sign all tags automatically');
      await git.setConfig('tag.gpgsign', 'true', inputs.gitConfigGlobal);
    }
    if (inputs.gitPushGpgsign) {
      core.info('Sign all pushes automatically');
      await git.setConfig('push.gpgsign', inputs.gitPushGpgsign, inputs.gitConfigGlobal);
    }
  }
}

async function run(): Promise<void> {
  try {
    const inputs: context.Inputs = await context.getInputs();

    if (inputs.workdir && inputs.workdir !== '.') {
      core.info(`Using ${inputs.workdir} as working directory...`);
      process.chdir(inputs.workdir);
    }

    const keyFormat = await format.detect(inputs.signingKey);
    stateHelper.setFormat(keyFormat);
    core.info(`Detected signing key format: ${keyFormat}`);

    if (keyFormat === 'ssh') {
      await runSSH(inputs);
    } else {
      await runGPG(inputs);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function cleanup(): Promise<void> {
  if (!stateHelper.format) {
    core.debug('Signing key format is not defined. Skipping cleanup.');
    return;
  }
  try {
    if (stateHelper.format === 'ssh') {
      if (stateHelper.sshKeyPath) {
        core.info('Removing SSH signing key from runner');
        ssh.deleteKey(stateHelper.sshKeyPath);
      }
      return;
    }

    if (stateHelper.fingerprint.length <= 0) {
      core.debug('Primary key fingerprint is not defined. Skipping cleanup.');
      return;
    }
    core.info(`Removing key ${stateHelper.fingerprint}`);
    await gpg.deleteKey(stateHelper.fingerprint);

    core.info('Killing GnuPG agent');
    await gpg.killAgent();
  } catch (error) {
    core.warning(error.message);
  }
}

if (!stateHelper.IsPost) {
  run();
} else {
  cleanup();
}
