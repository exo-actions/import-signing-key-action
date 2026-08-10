[![GitHub release](https://img.shields.io/github/release/exo-actions/import-signing-key-action.svg?style=flat-square)](https://github.com/exo-actions/import-signing-key-action/releases/latest)
[![Test workflow](https://img.shields.io/github/actions/workflow/status/exo-actions/import-signing-key-action/test.yml?branch=v1&label=test&logo=github&style=flat-square)](https://github.com/exo-actions/import-signing-key-action/actions?workflow=test)
[![Codecov](https://img.shields.io/codecov/c/github/exo-actions/import-signing-key-action?logo=codecov&style=flat-square)](https://codecov.io/gh/exo-actions/import-signing-key-action)

## About

GitHub Action to easily import a GPG **or** SSH signing key and configure Git
to sign commits, tags and pushes with it.

The action auto-detects whether `signing_key` is an OpenPGP (GPG) private key
or an SSH private key and configures Git accordingly (`gpg.format openpgp` or
`gpg.format ssh`).

___

* [Features](#features)
* [Prerequisites](#prerequisites)
  * [GPG key](#gpg-key)
  * [SSH key](#ssh-key)
* [Usage](#usage)
  * [Sign commits with a GPG key](#sign-commits-with-a-gpg-key)
  * [Sign commits with an SSH key](#sign-commits-with-an-ssh-key)
  * [Use a GPG subkey](#use-a-gpg-subkey)
  * [Set GPG key's trust level](#set-gpg-keys-trust-level)
* [Customizing](#customizing)
  * [inputs](#inputs)
  * [outputs](#outputs)
* [Contributing](#contributing)
* [License](#license)

## Features

* Works on Linux, macOS and Windows [virtual environments](https://help.github.com/en/articles/virtual-environments-for-github-actions#supported-virtual-environments-and-hardware-resources)
* Single `signing_key` input auto-detects GPG vs SSH key format
* GPG: allow seeding the internal cache of `gpg-agent` with the provided passphrase, signing-only subkeys support, key trust level
* SSH: strips the passphrase from the private key so `ssh-keygen -Y sign` can run non-interactively, and generates an `allowed_signers` file so `git log --show-signature` works locally
* Purges the imported key material (GPG secret key or SSH private key file), cache information and kills the GnuPG agent from the runner once the job is done
* (Git) Enable signing for Git commits, tags and pushes
* (Git) Configure and check committer info against the key

## Prerequisites

### GPG key

First, [generate a GPG key](https://docs.github.com/en/github/authenticating-to-github/generating-a-new-gpg-key) and
export the GPG private key as an ASCII armored version to your clipboard:

```shell
# macOS
gpg --armor --export-secret-key joe@foo.bar | pbcopy

# Ubuntu (assuming GNU base64)
gpg --armor --export-secret-key joe@foo.bar -w0 | xclip

# Arch
gpg --armor --export-secret-key joe@foo.bar | xclip -selection clipboard -i

# FreeBSD (assuming BSD base64)
gpg --armor --export-secret-key joe@foo.bar | xclip
```

Paste your clipboard as a [`secret`](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets)
named `SIGNING_KEY` for example. Create another secret with the `PASSPHRASE`
if applicable.

### SSH key

Alternatively, [generate an SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
dedicated to signing:

```shell
ssh-keygen -t ed25519 -C "joe@bar.foo" -f signing_key
```

Paste the contents of the private key file (`signing_key`) as a secret named
`SIGNING_KEY`. Create another secret with the `PASSPHRASE` if the key is
passphrase protected. [Add the matching public key to your GitHub account](https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-new-ssh-key-to-your-github-account)
as a **Signing Key** so GitHub can verify commits signed with it.

## Usage

### Sign commits with a GPG key

```yaml
name: import-signing-key

on:
  push:
    branches: v1

jobs:
  sign-commit:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v6
      -
        name: Import signing key
        uses: exo-actions/import-signing-key-action@v1
        with:
          signing_key: ${{ secrets.SIGNING_KEY }}
          passphrase: ${{ secrets.PASSPHRASE }}
          git_user_signingkey: true
          git_commit_gpgsign: true
      -
        name: Sign commit and push changes
        run: |
          echo foo > bar.txt
          git add .
          git commit -S -m "This commit is signed!"
          git push
```

### Sign commits with an SSH key

```yaml
name: import-signing-key

on:
  push:
    branches: v1

jobs:
  sign-commit:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v6
      -
        name: Import signing key
        uses: exo-actions/import-signing-key-action@v1
        with:
          signing_key: ${{ secrets.SIGNING_KEY }}
          passphrase: ${{ secrets.PASSPHRASE }}
          git_user_signingkey: true
          git_commit_gpgsign: true
          git_committer_name: Joe Bar
          git_committer_email: joe@bar.foo
      -
        name: Sign commit and push changes
        run: |
          echo foo > bar.txt
          git add .
          git commit -S -m "This commit is signed!"
          git push
```

> [!NOTE]
> `git_committer_email` is required to build the `allowed_signers` file used
> for local signature verification (`git log --show-signature`). Without it,
> commits are still signed but verification info won't resolve to an identity.

### Use a GPG subkey

With the input `fingerprint`, you can specify which one of the subkeys in a
GPG key you want to use for signing.

```yaml
      -
        name: Import signing key
        uses: exo-actions/import-signing-key-action@v1
        with:
          signing_key: ${{ secrets.SIGNING_KEY }}
          passphrase: ${{ secrets.PASSPHRASE }}
          fingerprint: "C17D11ADF199F12A30A0910F1F80449BE0B08CB8"
```

For example, given this GPG key with a signing subkey:

```
pub   ed25519 2021-09-24 [C]
      87F257B89CE462100BEC0FFE6071D218380FDCC8
      Keygrip = F5C3ABFAAB36B427FD98C4EDD0387E08EA1E8092
uid           [ unknown] Joe Bar <joe@bar.foo>
sub   ed25519 2021-09-24 [S]
      C17D11ADF199F12A30A0910F1F80449BE0B08CB8
      Keygrip = DEE0FC98F441519CA5DE5D79773CB29009695FEB
```

You can use the subkey with signing capability whose fingerprint is `C17D11ADF199F12A30A0910F1F80449BE0B08CB8`.

### Set GPG key's trust level

With the `trust_level` input, you can specify the trust level of the GPG key.

Valid values are:
* `1`: unknown
* `2`: never
* `3`: marginal
* `4`: full
* `5`: ultimate

```yaml
      -
        name: Import signing key
        uses: exo-actions/import-signing-key-action@v1
        with:
          signing_key: ${{ secrets.SIGNING_KEY }}
          passphrase: ${{ secrets.PASSPHRASE }}
          trust_level: 5
```

## Customizing

### inputs

The following inputs can be used as `step.with` keys:

| Name                  | Type   | Description                                                                                            |
|-----------------------|--------|---------------------------------------------------------------------------------------------------------|
| `signing_key`         | String | GPG private key (ASCII armored or base64 encoded) or SSH private key (OpenSSH/PEM format) (**required**) |
| `passphrase`          | String | Passphrase of the private key                                                                           |
| `trust_level`         | String | Set GPG key's trust level (GPG only)                                                                    |
| `git_config_global`   | Bool   | Set Git config global (default `false`)                                                                 |
| `git_user_signingkey` | Bool   | Set signing key for this Git repository (default `false`)                                               |
| `git_commit_gpgsign`  | Bool   | Sign all commits automatically. (default `false`)                                                       |
| `git_tag_gpgsign`     | Bool   | Sign all tags automatically. (default `false`)                                                          |
| `git_push_gpgsign`    | String | Sign all pushes automatically. (default `if-asked`)                                                     |
| `git_committer_name`  | String | Set commit author's name (defaults to the name associated with the GPG key; required for SSH keys)      |
| `git_committer_email` | String | Set commit author's email (defaults to the email associated with the GPG key; required for SSH keys to build the `allowed_signers` file) |
| `workdir`             | String | Working directory (below repository root) (default `.`)                                                 |
| `fingerprint`         | String | Specific fingerprint to use (GPG subkey only)                                                            |

> [!NOTE]
> `git_user_signingkey` needs to be enabled for `git_commit_gpgsign`, `git_tag_gpgsign`,
> `git_push_gpgsign`, `git_committer_name`, `git_committer_email` inputs.

### outputs

The following outputs are available:

| Name          | Type   | Description                                                                                                                     |
|---------------|--------|-----------------------------------------------------------------------------------------------------------------------------------|
| `format`      | String | Detected format of the signing key: `openpgp` or `ssh`                                                                            |
| `fingerprint` | String | Fingerprint of the key (recommended as [user ID](https://www.gnupg.org/documentation/manuals/gnupg/Specify-a-User-ID.html) for GPG, or the `SHA256:` fingerprint for SSH) |
| `keyid`       | String | Low 64 bits of the X.509 certificate SHA-1 fingerprint (GPG only, empty for SSH)                                                  |
| `name`        | String | Name associated with the key                                                                                                      |
| `email`       | String | Email address associated with the key                                                                                             |

## Contributing

Want to contribute? Awesome! The most basic way to show your support is to
star the project, or to raise issues.

## License

LGPL-3.0. See `LICENSE` for more details.
