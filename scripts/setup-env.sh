#!/bin/sh
# Install a Node 22 toolchain into /opt/node22.
#
# Why: the distro ships Node 20, but the Cloudflare toolchain (create-vinext-app,
# cf, parts of vinext) requires Node 22+. /opt lives on the container's f2fs root
# and allows exec + symlinks, unlike the Android shared storage the repo sits on.
set -e

NODE_VERSION=${NODE_VERSION:-22.23.4}
DEST=/opt/node22

if [ -x "$DEST/bin/node" ]; then
  echo "Node already installed: $("$DEST/bin/node" -v) at $DEST"
  exit 0
fi

case "$(uname -m)" in
  aarch64|arm64) ARCH=arm64 ;;
  x86_64|amd64) ARCH=x64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${ARCH}.tar.xz"
echo "Downloading $URL"
curl -fsSL "$URL" -o "$TMP/node.tar.xz"
tar -xf "$TMP/node.tar.xz" -C "$TMP"

rm -rf "$DEST"
mv "$TMP/node-v${NODE_VERSION}-linux-${ARCH}" "$DEST"
echo "Installed $("$DEST/bin/node" -v) at $DEST"
