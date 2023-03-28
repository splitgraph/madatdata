# ./build-public-examples.sh
# Example usage:
# ./build-public-examples.sh
#
# This is a hacky script which should be run after publishing new versions of
# packages, or after developing packages locally. The point of the script is to
# make sure that examples/yarn.lock is using the hashes for the public versions
# of packages, rather than hashes from verdaccio that only exist locally.

REPO_ROOT="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

set -e

if [[ "$REPO_ROOT" != "$(pwd)" ]] ; then
  echo "error: script must be run in root directory"
  echo "expected root directory: $REPO_ROOT"
  exit 2
fi

echo "[+] Unset VERDACCIO env var if it exists"
unset VERDACCIO || true

# Install examples
echo "[+] move into examples and clear installed madatdata packages"
echo "[+] if you get an error here: cd examples ; yarn install, then run this again"
echo "[+] or if @madatdata/ packages are missing because this just failed, maybe try git checkout -- examples/yarn.lock"
echo "[+] if you still get an error, edit examples/.yarnrc.yml to hardcode npm registry URLs"
cd "$REPO_ROOT/examples"
yarn md.clear
echo "[+] NOTE: Ignore above errors"
echo "[+] Upgrade (hacky: set VERDACCIO to real registry to make .yarnrc.yml valid)"
VERDACCIO="https://registry.yarnpkg.com" yarn up '@madatdata/*@latest'
echo "[+] Install (hacky: set VERDACCIO to real registry to make .yarnrc.yml valid)"
VERDACCIO="https://registry.yarnpkg.com" yarn install
echo "[+] Return to repo root"
cd "$REPO_ROOT"
echo "[+] Done."
