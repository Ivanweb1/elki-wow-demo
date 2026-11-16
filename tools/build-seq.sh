#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v ffmpeg >/dev/null || { echo 'Нужен ffmpeg' >&2; exit 1; }
for n in 1 2 3; do
  case "$n" in 1) name=grow;; 2) name=wrap;; 3) name=room;; esac
  # сколько секунд ролика брать: у упаковки после 3,8 с ёлка просто стоит
  case "$n" in 2) trim="-t 3.8";; *) trim="";; esac
  input="video/$n-$name.mp4"
  if [[ ! -f "$input" ]]; then echo "Пропуск: $input отсутствует"; continue; fi
  output="assets/seq/$n"
  mkdir -p "$output"
  ffmpeg -hide_banner -loglevel error -y $trim -i "$input" -vf 'fps=24,scale=1280:-2' -q:v 7 "$output/%04d.jpg"
  node -e 'const fs=require("fs"),p=process.argv[1];fs.writeFileSync(p+"/manifest.json",JSON.stringify({frames:fs.readdirSync(p).filter(x=>x.endsWith(".jpg")).sort()},null,2))' "$output"
  echo "Готово: $output"
done
