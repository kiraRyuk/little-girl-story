#!/usr/bin/env bash
# Run from normal Konsole. Download and authenticate only; never execute a package.
set -euo pipefail
umask 077
for tool in curl gpg gpgv mktemp; do
  command -v "$tool" >/dev/null || { printf 'Missing tool: %s\n' "$tool" >&2; exit 1; }
done
keyring=/usr/share/pacman/keyrings/archlinux.gpg
[[ -r "$keyring" ]] || { printf 'Arch signing keyring is unavailable. Stopping.\n' >&2; exit 1; }
if [[ $# -gt 1 ]]; then
  printf 'Usage: bash scripts/fetch-speech-engine.sh [existing-capture-directory]\n' >&2
  exit 1
fi
if [[ $# -eq 1 ]]; then
  capture="$(realpath -- "$1")"
  [[ -d "$capture" && -O "$capture" && -w "$capture" ]] || {
    printf 'The capture must be an existing writable directory owned by you.\n' >&2; exit 1;
  }
else
  capture="$(mktemp -d /tmp/onecoldnight-tts.XXXXXX)"
fi
printf 'Speech package capture: %s\n' "$capture"
verification="$(mktemp -d "$capture/verify.XXXXXX")"
# Arch's shipped keyring can be ASCII-armored. Convert a temporary copy;
# gpgv expects binary OpenPGP key packets, not the armor header's '-' bytes.
if [[ "$(head -c 36 "$keyring")" == '-----BEGIN PGP PUBLIC KEY BLOCK-----'* ]]; then
  gpg --batch --no-options --homedir "$verification" --dearmor \
    --output "$verification/archlinux.gpg" "$keyring"
else
  cp -- "$keyring" "$verification/archlinux.gpg"
fi
for item in \
  e/espeak-ng/espeak-ng-1.52.0-1-x86_64.pkg.tar.zst \
  l/libsonic/libsonic-0.2.0-2-x86_64.pkg.tar.zst \
  p/pcaudiolib/pcaudiolib-1.3-1-x86_64.pkg.tar.zst; do
  name="${item##*/}"
  size_limit=262144
  [[ "$name" == espeak-ng-* ]] && size_limit=12582912
  url="https://archive.archlinux.org/packages/$item"
  if [[ ! -s "$capture/$name" ]]; then
    curl --fail --silent --show-error --location --max-redirs 2 \
    --proto '=https' --proto-redir '=https' --connect-timeout 5 --max-time 90 \
    --max-filesize "$size_limit" --retry 0 --output "$capture/$name.part" "$url"
    mv -- "$capture/$name.part" "$capture/$name"
  fi
  if [[ ! -s "$capture/$name.sig" ]]; then
    curl --fail --silent --show-error --location --max-redirs 2 \
    --proto '=https' --proto-redir '=https' --connect-timeout 5 --max-time 20 \
    --max-filesize 16384 --retry 0 --output "$capture/$name.sig" "$url.sig"
  fi
  # Each attempt keeps its own evidence; cached downloads are always reverified.
  gpgv --homedir "$verification" --keyring "$verification/archlinux.gpg" \
    "$capture/$name.sig" "$capture/$name" \
    2>"$verification/$name.verification.txt" || {
      cat "$verification/$name.verification.txt" >&2
      printf 'Signature verification failed. Nothing will be extracted or run.\n' >&2
      exit 1
    }
  printf 'Signature verified: %s\n' "$name"
done
printf '\nCapture ready: %s\nNo packages were installed, extracted, or executed.\n' "$capture"
