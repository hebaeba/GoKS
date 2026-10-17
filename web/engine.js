/* Independent Go Basic — board rules. Newly implemented, 2026-10-05. MIT. */
(function (root) {
  'use strict';
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const other = color => color === BLACK ? WHITE : BLACK;
  function neighbors(index, size) {
    const x = index % size, y = Math.floor(index / size), result = [];
    if (x) result.push(index - 1);
    if (x + 1 < size) result.push(index + 1);
    if (y) result.push(index - size);
    if (y + 1 < size) result.push(index + size);
    return result;
  }
  function group(board, start, size) {
    const color = board[start], stones = new Set(), liberties = new Set(), pending = [start];
    if (!color) return {stones, liberties};
    while (pending.length) {
      const point = pending.pop();
      if (stones.has(point)) continue;
      stones.add(point);
      for (const next of neighbors(point, size)) {
        if (!board[next]) liberties.add(next);
        else if (board[next] === color && !stones.has(next)) pending.push(next);
      }
    }
    return {stones, liberties};
  }
  function position(size = 19) {
    if (!Number.isInteger(size) || size < 4 || size > 19) throw Error('碁盤は4～19路で指定してください。');
    return {size, board: new Array(size * size).fill(EMPTY), turn: BLACK, captures: [0, 0, 0], ko: null, move: 0, last: null};
  }
  function copy(state) {
    return {...state, board: state.board.slice(), captures: state.captures.slice(), last: state.last ? {...state.last} : null};
  }
  function play(state, point, color = state.turn) {
    if (color !== BLACK && color !== WHITE) throw Error('手番が正しくありません。');
    const next = copy(state);
    if (point === null) {
      next.turn = other(color); next.ko = null; next.move++; next.last = {point: null, color};
      return next;
    }
    if (!Number.isInteger(point) || point < 0 || point >= state.board.length) throw Error('盤外には打てません。');
    if (state.board[point]) throw Error('石のある場所には打てません。');
    next.board[point] = color;
    const removed = new Set();
    for (const near of neighbors(point, state.size)) {
      if (next.board[near] !== other(color)) continue;
      const enemy = group(next.board, near, state.size);
      if (!enemy.liberties.size) for (const stone of enemy.stones) removed.add(stone);
    }
    for (const stone of removed) next.board[stone] = EMPTY;
    if (!group(next.board, point, state.size).liberties.size) throw Error('自殺手になるため打てません。');
    const signature = next.board.join('');
    if (state.ko !== null && signature === state.ko) throw Error('コウの取り返しです。他の手を挟んでください。');
    next.captures[color] += removed.size;
    next.ko = state.board.join(''); next.turn = other(color); next.move++;
    next.last = {point, color};
    return next;
  }
  // Explicitly accepted non-legal recorded moves: replace the point, then apply captures.
  // Normal play() remains strict. An overwritten stone is not counted as a capture.
  function forcePlay(state, point, color=state.turn) {
    if(point===null)return play(state,point,color);
    if(!Number.isInteger(point)||point<0||point>=state.board.length||![BLACK,WHITE].includes(color))throw Error('着手の指定が正しくありません。');
    const next=copy(state);next.board[point]=color;
    const removed=new Set();
    for(const near of neighbors(point,state.size))if(next.board[near]===other(color)){
      const enemy=group(next.board,near,state.size);if(!enemy.liberties.size)for(const stone of enemy.stones)removed.add(stone);
    }
    for(const stone of removed)next.board[stone]=EMPTY;
    next.captures[color]+=removed.size;next.turn=other(color);next.move++;next.last={point,color};next.ko=state.board.join('');return next;
  }
  function coordinate(value, size, allowPass = false) {
    if (allowPass && (value === '' || value === 'tt')) return null;
    if (!/^[a-s]{2}$/.test(value)) throw Error('SGFの座標が正しくありません：' + value.slice(0, 20));
    const x = value.charCodeAt(0) - 97, y = value.charCodeAt(1) - 97;
    if (x >= size || y >= size) throw Error('SGFに盤外の座標があります：' + value);
    return y * size + x;
  }
  function encode(point, size) { return point === null ? '' : String.fromCharCode(97 + point % size, 97 + Math.floor(point / size)); }
  function expanded(values, size) {
    const points = [];
    for (const value of values || []) {
      const parts = value.split(':');
      if (parts.length === 1) points.push(coordinate(value, size));
      else if (parts.length === 2) {
        const a = coordinate(parts[0], size), b = coordinate(parts[1], size);
        const x1 = a % size, y1 = Math.floor(a / size), x2 = b % size, y2 = Math.floor(b / size);
        if (x1 > x2 || y1 > y2) throw Error('SGFの範囲指定が逆順です。');
        for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) points.push(y * size + x);
      } else throw Error('SGFの範囲指定が正しくありません。');
    }
    return points;
  }
  function apply(state, props, isRoot = false) {
    let next = copy(state);
    if(isRoot){for(const [key,color] of [['XIGCAPB',WHITE],['XIGCAPW',BLACK]]){if(props[key]){const n=Number(props[key][0]);if(props[key].length!==1||!/^\d+$/.test(props[key][0])||!Number.isInteger(n)||n<0||n>9999)throw Error('取られた石の数が不正です。');next.captures[color]=n;}}}
    const setup = ['AE', 'AB', 'AW'].some(key => props[key]);
    if (props.B && props.W) throw Error('同じ局面に黒と白の着手があります。');
    if (setup && (props.B || props.W)) throw Error('配置石と着手が同じSGFノードにあります。');
    if (setup) {
      const occupied = new Set();
      for (const [key, color] of [['AE', EMPTY], ['AB', BLACK], ['AW', WHITE]]) {
        for (const point of expanded(props[key], state.size)) {
          if (occupied.has(point)) throw Error('同じ交点に重複した配置指定があります。');
          occupied.add(point); next.board[point] = color;
        }
      }
      next.ko = null; next.last = null;
    }
    if (isRoot && Number(props.HA?.[0]) >= 2) next.turn = WHITE;
    if (props.B || props.W) {
      const key = props.B ? 'B' : 'W';
      if (props[key].length !== 1) throw Error('1手に複数の着手座標があります。');
      next = play(next, coordinate(props[key][0], state.size, true), key === 'B' ? BLACK : WHITE);
    }
    if (props.PL) {
      if (!['B', 'W'].includes(props.PL[0])) throw Error('SGFの手番指定が正しくありません。');
      next.turn = props.PL[0] === 'B' ? BLACK : WHITE;
    }
    return next;
  }
  const api = {EMPTY, BLACK, WHITE, other, position, copy, neighbors, group, play, forcePlay, coordinate, encode, expanded, apply};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GoRules = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
