/* Independent Go Basic — SGF parser/writer. Newly implemented, 2026-10-05. MIT. */
(function(root) {
  'use strict';
  const LIMIT = 20000;
  function node(props = Object.create(null)) { return {props, children: []}; }
  function parse(input) {
    let text = String(input).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'), cursor = 0, count = 0;
    if (text.length > 2 * 1024 * 1024) throw Error('SGFは2MB以内にしてください。');
    const fail = message => { throw Error(message + '（位置 ' + (cursor + 1) + '）'); };
    function spaces() { while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++; }
    function value() {
      cursor++;
      let result = '';
      while (cursor < text.length) {
        let char = text[cursor++];
        if (char === ']') return result;
        if (char === '\\') {
          if (cursor === text.length) fail('SGFのエスケープが途中です');
          char = text[cursor++];
          if (char === '\n') continue;
        }
        result += char;
      }
      fail('SGFの ] がありません');
    }
    function tree(depth) {
      if (depth > 128) fail('変化の入れ子が深すぎます');
      if (text[cursor++] !== '(') fail('SGFの ( がありません');
      spaces(); let first = null, last = null;
      while (text[cursor] === ';') {
        cursor++; if (++count > LIMIT) fail('局面数が多すぎます（上限20,000）');
        const current = node();
        if (last) last.children.push(current); else first = current;
        last = current; spaces();
        while (/[A-Z]/.test(text[cursor] || '') && cursor < text.length) {
          let key = '';
          while (/[A-Z]/.test(text[cursor] || '') && cursor < text.length) key += text[cursor++];
          spaces(); const list = [];
          while (text[cursor] === '[') { list.push(value()); spaces(); }
          if (!list.length) fail(key + ' に値がありません');
          if (Object.hasOwn(current.props, key)) fail('SGFのプロパティが重複しています：' + key);
          current.props[key] = list;
        }
      }
      if (!first) fail('SGFに局面がありません');
      while (text[cursor] === '(') { last.children.push(tree(depth + 1)); spaces(); }
      if (text[cursor++] !== ')') fail('SGFの ) がありません');
      return first;
    }
    spaces(); const game = tree(0); spaces();
    if (cursor !== text.length) fail('複数棋譜の一括読込みには対応していません。1局ずつ読み込んでください');
    if (game.props.GM && game.props.GM[0] !== '1') throw Error('囲碁のSGF（GM[1]）を指定してください。');
    const sizeText = game.props.SZ?.[0] || '19';
    if (!/^(?:[4-9]|1[0-9])$/.test(sizeText)) throw Error('対応する碁盤は4～19路の正方形です。');
    return {root: game, size: Number(sizeText), count};
  }
  function write(game) {
    const parts = [], tasks = [{type: 'tree', item: game}];
    const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
    while (tasks.length) {
      const task = tasks.pop();
      if (task.type === 'text') { parts.push(task.item); continue; }
      let current = task.item; parts.push('(');
      while (current) {
        parts.push(';');
        for (const key of Object.keys(current.props)) {
          if (!/^[A-Z]+$/.test(key) || !current.props[key].length) continue;
          parts.push(key, ...current.props[key].map(v => '[' + escape(v) + ']'));
        }
        if (current.children.length === 1) current = current.children[0];
        else {
          tasks.push({type: 'text', item: ')'});
          for (let i = current.children.length - 1; i >= 0; i--) tasks.push({type: 'tree', item: current.children[i]});
          current = null;
        }
      }
    }
    return parts.join('') + '\n';
  }
  function create(size = 19) { return node({GM: ['1'], FF: ['4'], CA: ['UTF-8'], AP: ['IndependentGoEditor:0.4.0'], SZ: [String(size)], KM: ['0']}); }
  const api = {parse, write, node, create, LIMIT};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GoSgf = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
