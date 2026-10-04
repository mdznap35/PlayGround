#!/usr/bin/env bash
# Capture desktop and mobile screenshots of CAPTURE_URL into CAPTURE_DIR.
# Exit 75 for temporary navigation/browser infrastructure failures, 1 for script/rendering defects.
set -euo pipefail

time -p cd "$(dirname "$0")"

if /usr/bin/time -p test -z "${CAPTURE_URL:-}"; then
  echo "CAPTURE_URL is not set." >&2
  exit 1
fi
if /usr/bin/time -p test -z "${CAPTURE_DIR:-}"; then
  echo "CAPTURE_DIR is not set." >&2
  exit 1
fi
if /usr/bin/time -p test -z "${RUNTIME_DIR:-}"; then
  echo "RUNTIME_DIR is not set." >&2
  exit 1
fi

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"

# Delegate to the runtime capture helper (Playwright): opens the exact URL,
# waits for rendered content, writes final-desktop.png and final-mobile.png,
# closes its own browser. Leaves the app running; output stays in CAPTURE_DIR.
set +e
/usr/bin/time -p node "${RUNTIME_DIR}/scripts/default-capture.mjs"
capture_status=$?
set -e

if /usr/bin/time -p test "$capture_status" -ne 0; then
  exit "$capture_status"
fi

# Verify both screenshots exist and are non-empty (missing output = rendering defect).
if /usr/bin/time -p test ! -s "$CAPTURE_DIR/final-desktop.png"; then
  echo "Missing screenshot: $CAPTURE_DIR/final-desktop.png" >&2
  exit 1
fi
if /usr/bin/time -p test ! -s "$CAPTURE_DIR/final-mobile.png"; then
  echo "Missing screenshot: $CAPTURE_DIR/final-mobile.png" >&2
  exit 1
fi

/usr/bin/time -p ls -la "$CAPTURE_DIR/final-desktop.png" "$CAPTURE_DIR/final-mobile.png"
