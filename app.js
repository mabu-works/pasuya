"use strict";

// ===== 文字セット定義 =====
// 記号は引用符・バックスラッシュ・バッククォートを避けた一般的な集合
const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?/"
};

// 紛らわしい文字（除外オプション ON のとき各セットから取り除く）
// 0: ゼロ, O: 大文字オー, 1: いち, l: 小文字エル, I: 大文字アイ, |: 縦線
const AMBIGUOUS = "0O1lI|";

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

// ===== DOM =====
const $ = (id) => document.getElementById(id);
const lengthRange = $("lengthRange");
const lengthNumber = $("lengthNumber");
const setLower = $("setLower");
const setUpper = $("setUpper");
const setDigits = $("setDigits");
const setSymbols = $("setSymbols");
const excludeAmbiguous = $("excludeAmbiguous");
const countSelect = $("countSelect");
const entropyValue = $("entropyValue");
const entropyNote = $("entropyNote");
const errorMsg = $("errorMsg");
const resultList = $("resultList");
const emptyMsg = $("emptyMsg");
const copyMsg = $("copyMsg");
const generateBtn = $("generateBtn");

// ===== 暗号学的に安全な乱数（crypto.getRandomValues のみ） =====
// 棄却サンプリングで [0, max) の一様な整数を返す。剰余の偏りを避けるため、
// 2^32 を max で割ったときの余り分にあたる値が出たら捨てて引き直す。
function randomInt(max) {
  if (!Number.isInteger(max) || max <= 0 || max > 4294967296) {
    throw new Error("randomInt: max が不正です");
  }
  const buf = new Uint32Array(1);
  const limit = Math.floor(4294967296 / max) * max;
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function pickChar(chars) {
  return chars[randomInt(chars.length)];
}

// Fisher-Yates シャッフル（randomInt 使用）
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// ===== 設定の取得 =====
function selectedSets() {
  const raw = [];
  if (setLower.checked) raw.push(SETS.lower);
  if (setUpper.checked) raw.push(SETS.upper);
  if (setDigits.checked) raw.push(SETS.digits);
  if (setSymbols.checked) raw.push(SETS.symbols);
  if (!excludeAmbiguous.checked) return raw;
  return raw.map((s) =>
    s.split("").filter((c) => !AMBIGUOUS.includes(c)).join("")
  ).filter((s) => s.length > 0);
}

function currentLength() {
  let n = Number.parseInt(lengthNumber.value, 10);
  if (!Number.isFinite(n)) n = MIN_LENGTH;
  return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, n));
}

function syncLength(from) {
  let n = Number.parseInt(from.value, 10);
  if (!Number.isFinite(n)) n = MIN_LENGTH;
  n = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, n));
  lengthRange.value = String(n);
  lengthNumber.value = String(n);
  return n;
}

// ===== パスワード生成 =====
// 選択された各文字種から最低1文字ずつ含める（長さが文字種の数以上のとき）。
// 長さは最小8・文字種は最大4なので、通常は常に保証できる。
function generatePassword(length, sets) {
  const pool = sets.join("");
  const chars = [];
  if (length >= sets.length) {
    sets.forEach((s) => chars.push(pickChar(s)));
  }
  while (chars.length < length) {
    chars.push(pickChar(pool));
  }
  shuffle(chars);
  return chars.join("");
}

function entropyBits(length, poolSize) {
  if (poolSize <= 1) return 0;
  return Math.floor(length * Math.log2(poolSize));
}

function strengthLabel(bits) {
  if (bits < 50) return "（やや弱め）";
  if (bits < 80) return "（ふつう）";
  if (bits < 110) return "（強い）";
  return "（とても強い）";
}

// ===== 表示 =====
function generate() {
  copyMsg.textContent = "";
  const sets = selectedSets();

  if (sets.length === 0) {
    errorMsg.textContent = "文字の種類を1つ以上選んでください。";
    entropyValue.textContent = "—";
    entropyNote.textContent = "";
    resultList.innerHTML = "";
    emptyMsg.style.display = "";
    generateBtn.disabled = false;
    return;
  }

  errorMsg.textContent = "";
  emptyMsg.style.display = "none";
  generateBtn.disabled = false;

  const length = currentLength();
  const poolSize = sets.join("").length;
  const bits = entropyBits(length, poolSize);
  entropyValue.textContent = bits + " ビット";
  entropyNote.textContent = "プール " + poolSize + " 文字 × " + length + " 文字 " + strengthLabel(bits);

  const count = Number.parseInt(countSelect.value, 10) || 5;
  resultList.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const pw = generatePassword(length, sets);
    const li = document.createElement("li");
    li.className = "result-item";

    const span = document.createElement("span");
    span.className = "pw";
    span.textContent = pw;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn copy-btn";
    btn.textContent = "コピー";
    btn.setAttribute("aria-label", "このパスワードをコピー");
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pw);
        copyMsg.textContent = "コピーしました。";
        btn.textContent = "コピー済み";
        setTimeout(() => { btn.textContent = "コピー"; }, 1600);
      } catch (e) {
        // クリップボード API が使えない環境ではパスワード自体を選択状態にする
        const range = document.createRange();
        range.selectNodeContents(span);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        copyMsg.textContent = "コピーできませんでした。選択状態にしたので手動でコピーしてください。";
      }
    });

    li.appendChild(span);
    li.appendChild(btn);
    resultList.appendChild(li);
  }
}

// ===== イベント =====
lengthRange.addEventListener("input", () => { syncLength(lengthRange); generate(); });
lengthNumber.addEventListener("input", () => { syncLength(lengthNumber); });
lengthNumber.addEventListener("change", () => { syncLength(lengthNumber); generate(); });
[setLower, setUpper, setDigits, setSymbols, excludeAmbiguous, countSelect].forEach((el) => {
  el.addEventListener("change", generate);
});
generateBtn.addEventListener("click", generate);

// ===== 初期化（読み込み時に生成） =====
syncLength(lengthRange);
generate();

// ===== テーマ切り替え（表示のみ。生成・保存には一切関与しない） =====
(function initTheme() {
  var root = document.documentElement;
  if (!root || !root.getAttribute || !root.setAttribute) return;
  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "light" ? "☀️" : "🌙";
  }
  var current = root.getAttribute("data-theme");
  if (current !== "light" && current !== "dark") {
    try { current = localStorage.getItem("pasuya-theme"); } catch (e) { current = null; }
  }
  apply(current === "light" ? "light" : "dark");
  var btn = document.getElementById("themeToggle");
  if (btn && btn.addEventListener) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next);
      try { localStorage.setItem("pasuya-theme", next); } catch (e) { /* 保存できなくても切り替え自体は有効 */ }
    });
  }
})();
