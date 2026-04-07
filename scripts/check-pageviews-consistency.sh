#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <primary_endpoint> <backup_endpoint> <key>"
  echo "Example: $0 https://pv.example.com https://pv-cn.example.com posts-2026-03-qwen-vl"
  exit 1
fi

PRIMARY="${1%/}"
BACKUP="${2%/}"
KEY="$3"

if [[ -z "$PRIMARY" || -z "$BACKUP" || -z "$KEY" ]]; then
  echo "Error: primary, backup, and key must all be non-empty"
  exit 1
fi

echo "== Step 1: Read before increment =="
P_BEFORE=$(curl -sS --max-time 10 "$PRIMARY/view?key=$KEY")
B_BEFORE=$(curl -sS --max-time 10 "$BACKUP/view?key=$KEY")
echo "Primary before: $P_BEFORE"
echo "Backup  before: $B_BEFORE"

echo

echo "== Step 2: Increment on primary =="
P_UP=$(curl -sS --max-time 10 "$PRIMARY/view/up?key=$KEY")
echo "Primary up: $P_UP"

echo

echo "== Step 3: Read after increment =="
P_AFTER=$(curl -sS --max-time 10 "$PRIMARY/view?key=$KEY")
B_AFTER=$(curl -sS --max-time 10 "$BACKUP/view?key=$KEY")
echo "Primary after: $P_AFTER"
echo "Backup  after: $B_AFTER"

echo

echo "If counts are equal in primary after and backup after, endpoints are sharing one data source."
