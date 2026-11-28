"use strict";

// ==========================================
// 🧩 DOM
// ==========================================
const Core = globalThis.PasswordCore;
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

// ==========================================
// ⚙️ 設定の取得
// ==========================================
// ⚙️ 選択中の文字セットを返す
function selectedSets() {
  return Core.buildSets(
    {
      lower: setLower.checked,
      upper: setUpper.checked,
      digits: setDigits.checked,
      symbols: setSymbols.checked
    },
    excludeAmbiguous.checked
  );
}

// 📏 現在の長さ設定を返す（8〜64に丸める）
function currentLength() {
  return Core.clampLength(lengthNumber.value);
}

// 📏 長さの入力欄とスライダーをそろえる
function syncLength(from) {
  const n = Core.clampLength(from.value);
  lengthRange.value = String(n);
  lengthNumber.value = String(n);
  return n;
}

// ==========================================
// 🖥️ 表示
// ==========================================
// 🖥️ パスワードを生成して表示する
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
  const bits = Core.entropyBits(length, poolSize);
  entropyValue.textContent = bits + " ビット";
  entropyNote.textContent = "プール " + poolSize + " 文字 × " + length + " 文字 " + Core.strengthLabel(bits);

  const count = Number.parseInt(countSelect.value, 10) || 5;
  resultList.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const pw = Core.generatePassword(length, sets);
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
        // 📋 クリップボード API が使えない環境ではパスワード自体を選択状態にする
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

// ==========================================
// 🖱️ イベント
// ==========================================
lengthRange.addEventListener("input", () => { syncLength(lengthRange); generate(); });
lengthNumber.addEventListener("input", () => { syncLength(lengthNumber); });
lengthNumber.addEventListener("change", () => { syncLength(lengthNumber); generate(); });
[setLower, setUpper, setDigits, setSymbols, excludeAmbiguous, countSelect].forEach((el) => {
  el.addEventListener("change", generate);
});
generateBtn.addEventListener("click", generate);

// ==========================================
// 🚀 初期化（読み込み時に生成）
// ==========================================
syncLength(lengthRange);
generate();

// ==========================================
// 🌙 テーマ切り替え（表示のみ。生成・保存には一切関与しない）
// ==========================================
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
