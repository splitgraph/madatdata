# ./build-examples-from-local.sh <example-to-clean-install>
# Example usage:
# ./build-examples-from-local.sh examples/react-nextjs-seafowl
#
# This is a hacky script to build packages, publish them to local Verdaccio, then
# install all the examples with the latest built packages. Note that this will
# result in a temporary sha for each package being in examples/yarn.lock, which
# does not refer to a public package, so nobody else will be able to install the
# examples if you check it in with those shas.
#
# When you're done developing locally, or after you've published new versions of
# packages to npm, you can build the examples from npm by running the counterpart
# to this script, ./build-examples-from-npm.sh
#

REPO_ROOT="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

set -e

if [[ "$REPO_ROOT" != "$(pwd)" ]] ; then
  echo "error: script must be run in root directory"
  echo "expected root directory: $REPO_ROOT"
  exit 2
fi

echo "[+] Kill any running verdaccio processes"
set -x
pkill -f verdaccio || true
set +x

echo "[+] Start verdaccio in background..."
yarn node $(yarn bin verdaccio) --config ./verdaccio.yaml > verdaccio.log &
export VERDACCIO_PID=$!

echo "[+] verdaccio PID: $VERDACCIO_PID"

if [[ -z "$VERDACCIO_PID" ]] ; then
  echo "error: could not find verdaccio PID, try to pkill it and exit now"
  set -x
  pkill -f verdaccio || true
  set +x
  exit 1
fi

# Build packages
echo "[+] build madatdata packages"
yarn build
echo "[+] reset verdaccio state"
yarn verdaccio.reset
echo "[+] publish to verdaccio"
yarn with-verdaccio publish-all

# Install examples
echo "[+] move into examples and clear installed madatdata packages"
echo "[+] if you get an error here: cd examples ; yarn install, then run this again"
echo "[+] and if that doesn't work, try: cd examples ; VERDACCIO=http://localhost:4873 yarn install"
cd "$REPO_ROOT/examples"
yarn md.clear
echo "[+] NOTE: Ignore above errors"
echo "[+] Install using verdaccio"
VERDACCIO=http://localhost:4873 yarn install
echo "[+] Return to repo root"
cd "$REPO_ROOT"

# Clean install examples
cd "$REPO_ROOT/examples"
# Get workspace names that are directories (except for the current one),
# and run yarn install in each of them. I'm not sure this is even necessary,
# but it doesn't hurt. And regardless, we do want to perform cleanup steps in
# each directory (e.g. deleting .next) anyway. (REMINDER: This script is a hack)
while read -r workspace_dir ; do
  if ! test -d "$workspace_dir" ; then
    echo "[+] WARNING: detected workspace that's not a directory: $workspace_dir"
    continue
  fi

  echo "[+] $workspace_dir : start install"
  set -x
  cd "$workspace_dir"
  set +x

  if [[ -d ".next" ]] ; then
    echo "[+] found .next, delete it"
    rm -rf .next
  fi
  echo "[+] install example from Verdaccio"
  VERDACCIO=http://localhost:4873 yarn install

  echo "[+] $workspace_dir : done install"
  echo "[+] cd back to examples"
  cd "$REPO_ROOT/examples"
done < <(cd "$REPO_ROOT/examples" ; yarn workspaces list | awk '{print $3}' | grep -vE '^Done$|^\.$')

echo "[+] return to repo root"
cd "$REPO_ROOT"

# Cleanup
echo "[+] Cleanup"
set -x
kill "$VERDACCIO_PID"
ps aux | grep verdaccio
set +x

echo "[+] Wait"
wait $(jobs -p) || true

# Print logs
echo "[+] Done."
echo "[+] Verdaccio log:"
cat verdaccio.log

echo "[+] Ensure no verdaccio running:"
set -x
ps aux | grep verdaccio
set +x

echo "[+] READY TO GO: all examples installed"
echo "[+] You can now cd into a example, e.g.:"
echo "cd examples/react-nextjs-basic-hooks"
echo "[+] NOTE: When you are done, if you want to go back to regular development"
echo "    outside of the examples repo, you will probably want to run 'yarn clean'"
