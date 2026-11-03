# 公開前に残る確認

このソースは配布と同じドキュメント構成でWindows成果物を作成しますが、公開許諾の点検完了を意味しません。

- 本体はMITライセンス。著作権表示・許諾文を保持し、第三者部分の元のライセンスも配布する。
- モデル許諾全文、同梱DLL、Rust/Tauri依存物の必要な通知を確定・同梱。
- テストの実名対局者例は変更していない。許可取得または匿名化を確認。
- プロ棋譜・詰碁は配布しない。Manualの実例を追加する場合は本人・許諾済み友人の資料のみ。
- GitHubの履歴やActionsログは別途確認。実行ログ・設定・トークンは配布しない。
- Windows実機で独立設定窓、外枠ドラッグ、音声、テーマ、文字サイズ、Eigen起動を確認。
- READMEのバージョンを正式版へ更新する前に、対応Windows・WebView2・CPU条件を実機確認。

## 更新100をGitHubへ反映

web、src-tauri、scripts、tests、AGENTS.md、package.json、README.md、README-en.md、Manual.html、LICENSE.txt、THIRD_PARTY_NOTICES.md、PUBLICATION-CHECKLIST.md を同じZIPから反映します。enginesは変更していません。
web/window-assets.jsonも必須です。部分アップロードは整合性チェックで停止します。
既にGitHub側でActionsのバージョンを更新済みなら、そのworkflowを古いものへ戻さないでください。本変更ではworkflowのActionsバージョンを変更していません。

左下は v0.8.0-preview.2 です。配布バージョンと開発用の更新番号を分離し、「単独版・更新100」は画面に表示しません。
