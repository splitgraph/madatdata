# ./build-examples.sh <example-to-clean-install>
# Example usage:
# ./build-examples.sh examples/react-nextjs-seafowl
#
# This is a hacky script to build packages, publish them to Verdaccio, then
# install all the examples with the latest built packages. Note that this will
# result in a temporary sha for each package being in examples/yarn.lock, which
# does not refer to a public package, so nobody else will be able to install the
# examples if you check it in with those shas.
#

REPO_ROOT="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

WORKING_EXAMPLE="${1-notadirectory}"
shift

set -e

if [[ ! -d "$WORKING_EXAMPLE" ]] ; then
  echo "error: first argument shuld be directory of example you're focusing on"
  echo "e.g.: $0 examples/react-nextjs-seafowl"
  exit 2
fi

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

# Install focused example
echo "[+] FOCUS: $WORKING_EXAMPLE"
cd "$WORKING_EXAMPLE"
if [[ -d ".next" ]] ; then
  echo "[+] found .next, delete it"
  rm -rf .next
fi
echo "[+] install example"
VERDACCIO=http://localhost:4873 yarn install
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

echo "[+] READY TO GO: $WORKING_EXAMPLE"
echo "[+] You can now cd into the example:"
echo "cd $WORKING_EXAMPLE"
