# 📜 更新履歴

更新履歴はこのファイルに記録します。

## v1.0.0（2026-11-28）

### 追加

- 単体テスト（`tests/`）と CI のテストステップを追加。生成ロジックを DOM 非依存の `js/password-core.js` に分離し、文字セットの内容・棄却サンプリング・生成の不変条件・エントロピーと強さラベルの境界をテストで固定した。

### 変更

- リポジトリを同名で作り直し、バージョンを 1.0.0 にリセット（旧 Web 版は日付管理）。機能・仕様は旧実装と同一（パリティの詳細は DESIGN.md）。
- Service Worker のキャッシュ名を `pasuya-v1` に変更（旧実装のコードは `pasuya-v2`）。
- Windows 版 exe を GitHub Release に添付する配布をやめ、ビルド手順（`windows/build.bat` / `build.sh`）での入手に統一した（全リポジトリ統一のノートのみ方針）。
- 開発手順を統一フロー（Issue → ブランチ → PR → CI → Rebase and merge）に合わせ、Issue / PR テンプレートと CONTRIBUTING.md を配置した。
