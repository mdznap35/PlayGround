#!/usr/bin/env bash
# Serve the built Control UI static directory in the foreground.
# Writes deployment-output.json, installs deps (pnpm) and builds only when needed.
set -euo pipefail

time -p cd "$(dirname "$0")"

# The repo requires Node >=24.16 <25 (or >=26.1); prefer the hosted Node 24 when present.
if /usr/bin/time -p test -x /opt/hostedtoolcache/node/24.21.0/x64/bin/node; then
  export PATH="/opt/hostedtoolcache/node/24.21.0/x64/bin:$PATH"
fi
/usr/bin/time -p node --version

PROJECT_ROOT="$PWD"
STATIC_DIR="$PROJECT_ROOT/dist/control-ui"
DEPLOYMENT_OUTPUT="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}/deployment-output.json"
PORT="${PORT:-3000}"

/usr/bin/time -p pnpm --version

# Install dependencies only when node_modules is missing (pnpm handles workspace: protocol; npm does not).
if /usr/bin/time -p test ! -d "$PROJECT_ROOT/node_modules"; then
  /usr/bin/time -p pnpm install --frozen-lockfile
fi

# Build only when the built static output is missing.
if /usr/bin/time -p test ! -f "$STATIC_DIR/index.html"; then
  /usr/bin/time -p pnpm build
fi

# The built static output must exist before serving.
if /usr/bin/time -p test ! -f "$STATIC_DIR/index.html"; then
  echo "Built static output missing: $STATIC_DIR/index.html" >&2
  exit 1
fi

/usr/bin/time -p mkdir -p "$(dirname "$DEPLOYMENT_OUTPUT")"
/usr/bin/time -p python3 - "$DEPLOYMENT_OUTPUT" "$PROJECT_ROOT" "$STATIC_DIR" <<'EOF'
import json, sys
out, project, directory = sys.argv[1], sys.argv[2], sys.argv[3]
with open(out, "w") as f:
    json.dump({"project": project, "directory": directory}, f)
EOF
/usr/bin/time -p cat "$DEPLOYMENT_OUTPUT"

# Serve in the foreground on PORT (default 3000).
exec /usr/bin/time -p python3 -m http.server "$PORT" --directory "$STATIC_DIR"
