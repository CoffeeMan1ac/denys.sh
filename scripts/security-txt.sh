#!/usr/bin/env bash
# security-txt.sh [--expires YYYY-MM-DD] — re-sign .well-known/security.txt and deploy it.
# Run from anywhere inside the denys.sh repo, on any branch. If your branch predates this
# script: cd ~/Projects/denys.sh && git fetch -q && bash <(git show origin/main:scripts/security-txt.sh)
#
# Any edit to security.txt breaks its PGP signature, so this is the one way to change it:
# optionally bump Expires, strip the old signature, clearsign with the denys.sh key (asks
# for the passphrase), verify, commit, push to main, pull on the VPS, verify the live file.
# Works in a throwaway worktree off origin/main, so the branch you are on is untouched.
# The mail-dns-watch routine (~/Projects/routines) alerts when the live signature breaks.
set -euo pipefail

FPR=2655B67FB48BB7735833E69ABD12E3C0705BFB86   # <me@denys.sh>, also in pgp-key.txt
URL=https://denys.sh/.well-known/security.txt
HOST=contabo
SITE=/home/denys/htdocs/denys.sh

expires=
case "${1:-}" in
  --expires)
    expires="${2:-}"
    [[ "$expires" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "usage: $0 --expires YYYY-MM-DD" >&2; exit 2; } ;;
  "") ;;
  *) echo "usage: $0 [--expires YYYY-MM-DD]" >&2; exit 2 ;;
esac

repo="$(git rev-parse --show-toplevel)"
wt="$(mktemp -d)"
trap 'git -C "$repo" worktree remove --force "$wt" >/dev/null 2>&1 || true' EXIT
git -C "$repo" fetch -q origin main
git -C "$repo" worktree add -q --detach "$wt" origin/main
f="$wt/.well-known/security.txt"

# Unwrap an existing clearsign: drop the armor header and signature, undo dash-escaping.
awk '/^-----BEGIN PGP SIGNED MESSAGE-----$/ { s = 1; h = 1; next }
     s && h { if ($0 == "") h = 0; next }
     /^-----BEGIN PGP SIGNATURE-----$/ { exit }
     { if (s) sub(/^- /, ""); print }' "$f" > "$f.plain"
[ -n "$expires" ] && sed -i "s/^Expires: .*/Expires: ${expires}T00:00:00.000Z/" "$f.plain"

gpg --yes --clearsign --local-user "$FPR" --output "$f" "$f.plain"
rm "$f.plain"
gpg --verify "$f"

msg="chore: re-sign security.txt"
[ -n "$expires" ] && msg="chore: security.txt expires $expires, re-signed"
git -C "$wt" add .well-known/security.txt
git -C "$wt" commit -q -m "$msg"
git -C "$wt" push -q origin HEAD:main
ssh "$HOST" "cd $SITE && sudo -u denys git pull -q --ff-only"

curl -fsS "$URL" | gpg --verify
echo "done: live security.txt is signed and verifies"
