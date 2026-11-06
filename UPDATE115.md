# 更新115　推奨KataGoの自動セットアップ
GoKS-v.1.0 / GoKS.exe。KataGo本体・モデル・DLLは配布物に含めません。Windowsアプリで利用者が確認した時だけ公式配布元から取得します。既存のkatagoは上書きしません。詳細と更新手順はManual.htmlの「KataGoの登録（任意）」にあります。

## GitHubへの適用
このZIPはソース一式です。GoKifuStudioフォルダーの中身をリポジトリ直下に反映し、更新後のmainからworkflowを新規実行してください。更新114適用済みなら追加削除はありません。更新113以前からはUPDATE114.mdの削除手順も必要です。

## 更新114からの追加・変更ファイル
- .github/workflows/windows.yml
- Manual.html
- README-en.md
- README.md
- UPDATE115.md
- backend/install-recommended.ps1
- src-tauri/src/main.rs
- tests/install-recommended-windows.ps1
- web/analysis.js
- web/i18n-en.js
- web/window-assets.json
