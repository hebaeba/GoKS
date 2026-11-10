'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const c={window:{addEventListener(){}},localStorage:{getItem:()=> 'en'},document:{readyState:'loading',addEventListener(){}}};
vm.createContext(c);
for(const f of ['i18n-en.js','i18n.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),c);
test('Update128: all legacy KataGo helper error messages have English translations even if old file remains in repository',()=>{
 const msgs=["この旧版KataGoには付属のgtp_example.cfgが必要です。KataGoのZIPをすべて展開するか、設定CFGで旧版用ファイルを指定してください。", "KataGo v1.2は現在のGoKSのAI対局に必要なGTP命令を備えていません。解析専用に使用してください。", "旧版KataGoには新しいCFG設定が指定されています。v1.2付属のgtp_example.cfgを設定CFGに指定してください。", "旧版エンジンの設定に不正な値があります"];
 for(const msg of msgs){const translated=c.window.KifuI18n.english(msg);assert(!/[ぁ-龯]/.test(translated),msg+' => '+translated);assert.notEqual(translated,msg);}
});
