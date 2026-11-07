#!/bin/sh
# Installs Dira Cepat into the local WorkBuddy and validates and registers it
# with WorkBuddy's own expert-manager scripts.
set -eu

config=${WORKBUDDY_CONFIG_DIR:-$HOME/.workbuddy-ai}
dest=$config/plugins/marketplaces/my-experts/plugins/dira-cepat
manager=$(ls -d "$config"/plugins/cache/workbuddy-builtin/skill-expert-manager/*/scripts 2>/dev/null | sort -V | tail -1)
[ -n "$manager" ] || { echo "WorkBuddy's expert-manager was not found in $config. Open WorkBuddy once, then retry." >&2; exit 1; }

rm -rf "$dest" "$config/plugins/cache/my-experts/dira-cepat"
mkdir -p "$(dirname "$dest")"
cp -R expert/dira-cepat "$dest"

WORKBUDDY_CONFIG_DIR=$config python3 "$manager/validate_expert.py" "$dest"
WORKBUDDY_CONFIG_DIR=$config python3 "$manager/register_expert.py" "$dest"
