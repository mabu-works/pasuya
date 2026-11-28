"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../js/password-core.js");

const {
  SETS,
  AMBIGUOUS,
  MIN_LENGTH,
  MAX_LENGTH,
  makeRandomInt,
  randomInt,
  shuffle,
  buildSets,
  clampLength,
  generatePassword,
  entropyBits,
  strengthLabel
} = Core;

// ==========================================
// 🔤 文字セットの内容
// ==========================================
test("character sets have the exact expected contents", () => {
  assert.equal(SETS.lower, "abcdefghijklmnopqrstuvwxyz");
  assert.equal(SETS.upper, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  assert.equal(SETS.digits, "0123456789");
  assert.equal(SETS.symbols, "!@#$%^&*()-_=+[]{}|;:,.<>?/");
  assert.equal(SETS.lower.length, 26);
  assert.equal(SETS.upper.length, 26);
  assert.equal(SETS.digits.length, 10);
  assert.equal(SETS.symbols.length, 27);
});

test("no duplicate characters inside any set", () => {
  for (const [name, set] of Object.entries(SETS)) {
    assert.equal(new Set(set).size, set.length, name);
  }
});

test("ambiguous set is exactly the six documented characters", () => {
  assert.equal(AMBIGUOUS, "0O1lI|");
  // それぞれが想定する文字種に属していること
  assert.ok(SETS.digits.includes("0") && SETS.digits.includes("1"));
  assert.ok(SETS.upper.includes("O") && SETS.upper.includes("I"));
  assert.ok(SETS.lower.includes("l"));
  assert.ok(SETS.symbols.includes("|"));
});

test("length bounds are 8 and 64", () => {
  assert.equal(MIN_LENGTH, 8);
  assert.equal(MAX_LENGTH, 64);
});

// ==========================================
// ⚙️ セット構築（buildSets）
// ==========================================
const ALL = { lower: true, upper: true, digits: true, symbols: true };

test("buildSets returns selected sets in fixed order", () => {
  assert.deepEqual(buildSets(ALL, false), [SETS.lower, SETS.upper, SETS.digits, SETS.symbols]);
  assert.deepEqual(buildSets({ lower: false, upper: true, digits: false, symbols: true }, false),
    [SETS.upper, SETS.symbols]);
  assert.deepEqual(buildSets({ lower: false, upper: false, digits: false, symbols: false }, false), []);
});

test("buildSets with exclusion removes exactly the ambiguous characters", () => {
  const sets = buildSets(ALL, true);
  assert.deepEqual(sets, [
    "abcdefghijkmnopqrstuvwxyz", // l を除いた 25 文字
    "ABCDEFGHJKLMNPQRSTUVWXYZ", // I, O を除いた 24 文字
    "23456789", // 0, 1 を除いた 8 文字
    "!@#$%^&*()-_=+[]{};:,.<>?/" // | を除いた 26 文字
  ]);
  for (const s of sets) {
    for (const c of AMBIGUOUS) assert.ok(!s.includes(c), c);
  }
});

// ==========================================
// 📏 長さの丸め（clampLength）
// ==========================================
test("clampLength clamps to 8..64 and falls back to 8", () => {
  assert.equal(clampLength(16), 16);
  assert.equal(clampLength("16"), 16);
  assert.equal(clampLength(8), 8);
  assert.equal(clampLength(64), 64);
  assert.equal(clampLength(7), 8);
  assert.equal(clampLength(0), 8);
  assert.equal(clampLength(65), 64);
  assert.equal(clampLength(1000), 64);
  assert.equal(clampLength("abc"), 8);
  assert.equal(clampLength(""), 8);
  assert.equal(clampLength(undefined), 8);
});

// ==========================================
// 🎲 randomInt（棄却サンプリング）
// ==========================================
test("randomInt rejects invalid max values", () => {
  assert.throws(() => randomInt(0));
  assert.throws(() => randomInt(-1));
  assert.throws(() => randomInt(2.5));
  assert.throws(() => randomInt(4294967297));
  assert.equal(randomInt(1), 0);
});

test("rejection sampling discards values at or above the limit", () => {
  // max = 10 のとき limit = floor(2^32 / 10) * 10 = 4294967290
  const limit = Math.floor(4294967296 / 10) * 10;
  assert.equal(limit, 4294967290);
  const feed = [limit, limit + 5, 4294967295, 42];
  let calls = 0;
  const rand = makeRandomInt(() => feed[calls++]);
  assert.equal(rand(10), 2); // 42 % 10
  assert.equal(calls, 4); // 3 回棄却された
});

test("randomInt result always stays within [0, max)", () => {
  for (const max of [2, 3, 10, 26, 27, 89, 1000]) {
    for (let i = 0; i < 2000; i++) {
      const v = randomInt(max);
      assert.ok(Number.isInteger(v) && v >= 0 && v < max, `max=${max} v=${v}`);
    }
  }
});

test("randomInt draws from crypto.getRandomValues", () => {
  const original = globalThis.crypto.getRandomValues;
  let calls = 0;
  globalThis.crypto.getRandomValues = (buf) => {
    calls++;
    return original.call(globalThis.crypto, buf);
  };
  try {
    randomInt(100);
  } finally {
    globalThis.crypto.getRandomValues = original;
  }
  assert.ok(calls >= 1);
});

test("shuffle keeps the same multiset of elements", () => {
  const base = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (let i = 0; i < 200; i++) {
    const arr = shuffle([...base]);
    assert.deepEqual([...arr].sort((a, b) => a - b), base);
  }
});

// ==========================================
// 🔑 生成の不変条件
// ==========================================
test("generated passwords have the exact length and pool-only characters", () => {
  const sets = buildSets(ALL, false);
  const pool = sets.join("");
  for (const length of [8, 16, 32, 64]) {
    for (let i = 0; i < 300; i++) {
      const pw = generatePassword(length, sets);
      assert.equal(pw.length, length);
      for (const c of pw) assert.ok(pool.includes(c), c);
    }
  }
});

test("every selected set contributes at least one character", () => {
  const sets = buildSets(ALL, false);
  for (let i = 0; i < 1000; i++) {
    const pw = generatePassword(8, sets); // 最も短い長さでも保証される
    for (const set of sets) {
      assert.ok([...pw].some((c) => set.includes(c)), pw);
    }
  }
});

test("single-set generation uses only that set", () => {
  const sets = buildSets({ lower: false, upper: false, digits: true, symbols: false }, false);
  for (let i = 0; i < 300; i++) {
    assert.match(generatePassword(16, sets), /^[0-9]{16}$/);
  }
});

test("excluded ambiguous characters never appear", () => {
  const sets = buildSets(ALL, true);
  for (let i = 0; i < 1000; i++) {
    const pw = generatePassword(64, sets);
    for (const c of AMBIGUOUS) assert.ok(!pw.includes(c), `${c} in ${pw}`);
  }
});

test("generation is deterministic under an injected random source", () => {
  // 線形合同法で種を固定し、同じ入力からは同じパスワードが出ることを確認する
  const lcg = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };
  const sets = buildSets(ALL, false);
  const a = generatePassword(16, sets, makeRandomInt(lcg(1234)));
  const b = generatePassword(16, sets, makeRandomInt(lcg(1234)));
  assert.equal(a, b);
  assert.equal(a.length, 16);
});

// ==========================================
// 📊 エントロピーと強さラベル
// ==========================================
test("entropyBits is floor(length * log2(poolSize))", () => {
  assert.equal(entropyBits(16, 89), 103); // 全セットのプール 26+26+10+27 = 89
  assert.equal(entropyBits(8, 26), 37);
  assert.equal(entropyBits(64, 10), 212);
  assert.equal(entropyBits(16, 1), 0);
  assert.equal(entropyBits(16, 0), 0);
});

test("strengthLabel thresholds", () => {
  assert.equal(strengthLabel(0), "（やや弱め）");
  assert.equal(strengthLabel(49), "（やや弱め）");
  assert.equal(strengthLabel(50), "（ふつう）");
  assert.equal(strengthLabel(79), "（ふつう）");
  assert.equal(strengthLabel(80), "（強い）");
  assert.equal(strengthLabel(109), "（強い）");
  assert.equal(strengthLabel(110), "（とても強い）");
  assert.equal(strengthLabel(200), "（とても強い）");
});
