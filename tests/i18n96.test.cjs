const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),c={window:{addEventListener(){}},localStorage:{getItem:()=> 'en'},document:{readyState:'loading',addEventListener(){}}};vm.createContext(c);for(const f of ['i18n-en.js','i18n.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),c);const t=c.window.KifuI18n.english;
test('English dynamic completion, errors, GIF and backup reports contain no Japanese',()=>{
 for(const text of [
 '解析完了：266局面 ／ 192.9秒。結果を保存できます。',
 '連続解析：次の着手・手順移動を待っています。 1局面 ／ 5.0秒。結果を保存できます。',
 '解析エラー：解析結果を取得できませんでした。１局面の時間を長くしてください。',
 '266局面・709×709px・33028KB。保存できます。','GIFを作成しています：20／266局面',
 '全局解析を中断しました。「再開」で続きから解析します。','全局解析中断中',
 '保存済み解析を読み込みました。266局面。グラフから局面を選べます。',
 '端末内に一時保存しました（10:34:00）','2026/11/2 10:34:00 の一時保存を復元しますか？現在の棋譜を置き換えます。',
 '復元できません：保存データが不正です','実行ファイルが見つかりません：D:/engine.exe',
 'エンジンが終了しました（exit code: 1）','変化（11・20手で分岐）',
 '実戦の次の手：白 D4 ／ 推奨順位 2位','4子の置碁を設定しました。白番・編集モードです。',
 '棋譜または解析条件が変わりました。全局解析をやり直してください。'])assert(!/[ぁ-龯]/.test(t(text)),t(text));
 assert.equal(t('順位'),'#');assert.equal(t('266局面・709×709px・33028KB。保存できます。'),'266 frames · 709×709 px · 33028 KB. Ready to save.');
 assert.equal(t('info move D4 visits 200 winrate 0.5'),'info move D4 visits 200 winrate 0.5');
 assert.equal(t('User supplied title'), 'User supplied title');
});
test('English dictionary values contain no leftover Japanese',()=>{
 for(const [key,value]of Object.entries(c.window.KifuEnglish))assert(!/[ぁ-龯]/.test(value),key+' => '+value);
});
test('literal application validation errors and status messages have translations',()=>{
 let checked=0;
 for(const dir of ['web','backend','src-tauri/src','backend-rs/src','lan-server/src'])for(const file of fs.readdirSync(path.join(root,dir))){
  if(!/\.(js|cjs|rs)$/.test(file)||file.startsWith('i18n'))continue;
  const source=fs.readFileSync(path.join(root,dir,file),'utf8');
  for(const m of source.matchAll(/(?:Error\(|Err\(|status\(|note\(|report\(|recoveryStatus\()(['"])((?:\\.|(?!\1).)*?)\1\s*\)/g)){
   const text=m[2];if(!/[ぁ-龯]/.test(text))continue;checked++;assert(!/[ぁ-龯]/.test(t(text)),file+': '+t(text));
  }
 }
 assert(checked>=200);
});
