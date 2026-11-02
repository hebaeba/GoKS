const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context={window:{addEventListener(){}},localStorage:{getItem:()=> 'en'},document:{readyState:'loading',addEventListener(){}}};vm.createContext(context);
for(const f of ['i18n-en.js','i18n.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../web',f),'utf8'),context);
const t=s=>context.window.KifuI18n.t(s);
test('dynamic messages and confirmation actions are English',()=>{
 for(const s of ['読込みできませんでした：対応形式はSGF・NGF・UGF・UGI・GIB・MGTです','現在の棋譜を置き換えて、4子の置碁を始めますか？','置碁を開始','読み込む','白勝率','全局解析中…','解析済み 5／30局面','経過 2.3秒 ／ 残り約 5秒','変化１','Engine-Xの推定','Engine-Xが投了しました。','黒 60.0％／2.0目　白 40.0％／-2.0目（白AIの着手前評価）','前回の一時保存があります。「復元」で読み込めます。','名前と設定を入力してください。','盤上 20手 ／ 取得済み 30候補（一覧はすべて表示）。実戦手の枠は表示数に含みません。','黒：10（地）−2（取られた石）＝8\n白：12（地）−1（取られた石）＋6.5（コミ）＝17.5'])assert(!/[ぁ-龯]/.test(t(s)),t(s));
 assert.equal(t('棋譜解析.kifu-analysis.json'),'game-analysis.kifu-analysis.json');assert.equal(t('Engine-Xが投了しました。'),'Engine-X resigned.');
});
