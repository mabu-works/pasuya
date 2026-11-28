#!/usr/bin/env bash
# ぱすや for Windows - ビルド（Linux / この開発環境用）
# テストは無し（単一フォームのツールのため）。publish して成果物パスを表示する。
set -euo pipefail
cd "$(dirname "$0")"

DOTNET="${DOTNET:-$HOME/workspace/tools/dotnet/dotnet}"
export TMPDIR="${TMPDIR:-$HOME/workspace/.tmp-dotnet}"
mkdir -p "$TMPDIR"
export TAR_OPTIONS=--no-same-owner

"$DOTNET" publish Pasuya.csproj -c Release -r win-x64 --self-contained true \
  -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true \
  -p:RestoreSources="$HOME/workspace/tools/nuget-local" -o dist

echo "===== 完了 ====="
echo "成果物: $(pwd)/dist/Pasuya.exe"
ls -la dist/Pasuya.exe
