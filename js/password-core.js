"use strict";

// ==========================================
// 🔤 文字セット定義
// ==========================================
// 🔤 記号は引用符・バックスラッシュ・バッククォートを避けた一般的な集合
const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?/"
};

// 🔤 紛らわしい文字（除外オプション ON のとき各セットから取り除く）
// 0: ゼロ, O: 大文字オー, 1: いち, l: 小文字エル, I: 大文字アイ, |: 縦線
const AMBIGUOUS = "0O1lI|";

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;
const UINT32_RANGE = 4294967296; // 2^32

// ==========================================
// 🔐 暗号学的に安全な乱数（crypto.getRandomValues のみ）
// ==========================================
// 🎲 32bit 値を1つ引く。テストから差し替えられるよう関数として切り出す。
function nextUint32() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0];
}

// 🎲 棄却サンプリングで [0, max) の一様な整数を返すジェネレータを作る。
// 剰余の偏りを避けるため、2^32 を max で割ったときの余り分にあたる値が出たら
// 捨てて引き直す。
function makeRandomInt(next) {
  return function randomInt(max) {
    if (!Number.isInteger(max) || max <= 0 || max > UINT32_RANGE) {
      throw new Error("randomInt: max が不正です");
    }
    const limit = Math.floor(UINT32_RANGE / max) * max;
    let x;
    do {
      x = next();
    } while (x >= limit);
    return x % max;
  };
}

const randomInt = makeRandomInt(nextUint32);

// 🎲 文字列から1文字をランダムに選ぶ
function pickChar(chars, randInt) {
  const rand = randInt || randomInt;
  return chars[rand(chars.length)];
}

// 🔀 Fisher-Yates シャッフル
function shuffle(arr, randInt) {
  const rand = randInt || randomInt;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// ==========================================
// ⚙️ 設定の解釈
// ==========================================
// ⚙️ 選択フラグと除外オプションから、実際に使う文字セットの配列を作る。
// 除外 ON のときは各セットから紛らわしい文字を取り除き、空になったセットは落とす。
function buildSets(selection, excludeAmbiguous) {
  const raw = [];
  if (selection.lower) raw.push(SETS.lower);
  if (selection.upper) raw.push(SETS.upper);
  if (selection.digits) raw.push(SETS.digits);
  if (selection.symbols) raw.push(SETS.symbols);
  if (!excludeAmbiguous) return raw;
  return raw
    .map((s) => s.split("").filter((c) => !AMBIGUOUS.includes(c)).join(""))
    .filter((s) => s.length > 0);
}

// 📏 長さを 8〜64 に丸める（数値化できない場合は最小値）
function clampLength(value) {
  let n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) n = MIN_LENGTH;
  return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, n));
}

// ==========================================
// 🔑 パスワード生成
// ==========================================
// 🔑 選択された各文字種から最低1文字ずつ含める（長さが文字種の数以上のとき）。
// 長さは最小8・文字種は最大4なので、通常は常に保証できる。
function generatePassword(length, sets, randInt) {
  const rand = randInt || randomInt;
  const pool = sets.join("");
  const chars = [];
  if (length >= sets.length) {
    sets.forEach((s) => chars.push(pickChar(s, rand)));
  }
  while (chars.length < length) {
    chars.push(pickChar(pool, rand));
  }
  shuffle(chars, rand);
  return chars.join("");
}

// 📊 エントロピー（ビット数）を計算する
function entropyBits(length, poolSize) {
  if (poolSize <= 1) return 0;
  return Math.floor(length * Math.log2(poolSize));
}

// 💪 強さの表示ラベルを返す
function strengthLabel(bits) {
  if (bits < 50) return "（やや弱め）";
  if (bits < 80) return "（ふつう）";
  if (bits < 110) return "（強い）";
  return "（とても強い）";
}

// ==========================================
// 📦 公開（ブラウザではグローバル、Node ではモジュール）
// ==========================================
const PasswordCore = {
  SETS,
  AMBIGUOUS,
  MIN_LENGTH,
  MAX_LENGTH,
  UINT32_RANGE,
  makeRandomInt,
  randomInt,
  pickChar,
  shuffle,
  buildSets,
  clampLength,
  generatePassword,
  entropyBits,
  strengthLabel
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = PasswordCore;
} else {
  globalThis.PasswordCore = PasswordCore;
}
