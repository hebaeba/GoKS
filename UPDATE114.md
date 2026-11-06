# 更新114：エンジン未登録の公開版
このZIPは完全なソースです。ビルド済みEXEは含みません。

1. GoKifuStudio/ の**中身**をリポジトリ直下へ反映します。下の追加・変更には .github/workflows/windows.yml も含まれます。
2. GitHub上の旧 engines/ フォルダー全体と scripts/check-bundled-engine.cjs を削除してください。ZIPの上書きだけでは削除されません。個人が別途使っているKataGoフォルダーは削除しないでください。
3. Windows workflowを実行し、artifact GoKS-v.1.0 を展開。WINDOWS-TEST.mdの手順を確認してください。製品名と実行ファイル名はGoKS.exeのままです。
4. タグ v.1.0.0 の指すコミットを確認してください。古いタグ・履歴や既存リリースに含まれる過去のファイルはこのZIPでは変更されません。

## 仕様
未登録なら起動時にエンジンを探しません。棋譜編集・人間同士の対局が可能です。AIの解析・対局を選ぶと登録を案内します。フォルダー登録は選択フォルダー直下とmodel(s)、config(s)を調べ、候補が複数ならユーザーが選択します。登録は「リストに追加」で確定します。ユーザーの登録と起動指定を維持します。旧版の自動登録のみ整理します。

## 追加・変更ファイル
- .github/workflows/windows.yml
- AGENTS.md
- Manual.html
- PUBLICATION-CHECKLIST.md
- README-en.md
- README.md
- THIRD_PARTY_NOTICES.md
- WINDOWS-TEST.md
- backend-rs/src/lib.rs
- backend/bundled-engines.cjs
- backend/select-file.ps1
- backend/windows-files.cjs
- scripts/build-windows.ps1
- scripts/check-analysis-ui.cjs
- scripts/check-release-docs.cjs
- src-tauri/src/main.rs
- tests/bundled-browser.cjs
- tests/bundled-engines.test.cjs
- tests/engine-folder-windows.ps1
- tests/match-policy.test.cjs
- tests/update102-path-layout.cjs
- web/README-en.html
- web/README.html
- web/analysis.css
- web/analysis.js
- web/i18n-en.js
- web/licenses-en.html
- web/licenses.html
- web/licenses/KataGo-config-LICENSE.txt
- web/match.js
- web/studio.js
- web/window-assets.json
- UPDATE114.md

## 削除
- engines/（旧内蔵エンジン、モデル、DLL、manifestを含む全ファイル）
- scripts/check-bundled-engine.cjs
