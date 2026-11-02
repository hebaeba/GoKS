const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const c={window:{addEventListener(){}},localStorage:{getItem:()=> 'en'},document:{readyState:'loading',addEventListener(){}}};vm.createContext(c);for(const f of ['i18n-en.js','i18n.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../web',f),'utf8'),c);const t=c.window.KifuI18n.english;
const messages=[
'変化2：白C','本譜：黒A','変化2：白 パス','変化2 12手の局面へ移動します','実・1','黒 D4','白 pass',
'実行ファイル：D:/Engine/KataGo.exe\nモデル：D:/models/kata.bin.gz\n設定：D:/configs/play.cfg',
'全局解析中の暫定順位。黒と白それぞれ、着手前後の勝率が低下した順です。短時間の解析では誤差があるため、気になる手は再解析してください。',
'黒と白それぞれ、着手前後の目数評価が低下した順です。短時間の解析では誤差があるため、気になる手は再解析してください。',
'待った：12手目へ戻りました。','待ったできません：対局中に局面が変更されました。',
'地合い計算の別窓を開けません：相手の窓が閉じられました',
'対局用エンジンの停止を確認できません：エンジンとの通信に失敗しました。',
'２回連続のパスで終局しました。地合い計算で死に石・セキを指定してください。',
'Engine-X：10手時点の推定','Engine-X：10手時点の推定（現在は12手）・対局中断中 推定完了',
'候補3 D4 白勝率42.0%','黒勝率 58.0%、白勝率 42.0%',
'game.sgf を受け取りました。読込みボタンで開けます。','game.sgf を受け取りました。読込みボタンを押してください。',
'印刷を開始できません：test error。画像保存も利用できます。',
'エンジンは .exe を選択してください。','モデルは .bin.gz / .bin / .txt.gz / .txt を選択してください。','設定は .cfg を選択してください。',
'コミ 6.5','補助窓のタイトルが長すぎます','自動再生を停止します','推定するAI','AIの推定地と評価した局面','印刷する盤面','作成した手順GIFのプレビュー'
];
test('Update99 complete runtime templates and accessibility labels translate',()=>{for(const s of messages)assert(!/[ぁ-龯]/.test(t(s)),s+' => '+t(s));});
test('Engine paths and user names survive template translation verbatim',()=>{
 assert.equal(t('実行ファイル：D:/棋譜/モデル/katago.exe\nモデル：D:/日本語/kata.bin.gz\n設定：D:/設定/play.cfg'),'Engine: D:/棋譜/モデル/katago.exe\nModel: D:/日本語/kata.bin.gz\nConfig: D:/設定/play.cfg');
 assert.equal(t('私のエンジンの推定'),'Estimate by 私のエンジン');
 assert.equal(t('Engine-X：10手時点の推定'),'Engine-X: estimate at move 10');
});
module.exports={messages};
test('native backend literal diagnostics have English translations',()=>{
 const root=path.resolve(__dirname,'..');let checked=0;
 for(const dir of ['src-tauri/src','backend-rs/src','lan-server/src'])for(const file of fs.readdirSync(path.join(root,dir))){
  if(!file.endsWith('.rs')||file==='save_name.rs')continue; // file filters have their own native-language tests
  const source=fs.readFileSync(path.join(root,dir,file),'utf8').split('#[cfg(test)]')[0];
  for(const m of source.matchAll(/"((?:[^"\\]|\\.)*)"/g)){
   const value=m[1];if(!/[ぁ-龯]/.test(value)||value.includes('{}'))continue;
   checked++;assert(!/[ぁ-龯]/.test(t(value)),file+': '+value);
  }
 }
 assert(checked>50);
});
