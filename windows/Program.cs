using System;
using System.Collections.Generic;
using System.Drawing;
using System.Security.Cryptography;
using System.Windows.Forms;

namespace Pasuya
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new MainForm());
        }
    }

    internal sealed class MainForm : Form
    {
        // 🔤 Web版（pasuya）と同じ文字セット・仕様
        private const string Lower = "abcdefghijklmnopqrstuvwxyz";
        private const string Upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        private const string Digits = "0123456789";
        private const string Symbols = "!@#$%^&*()-_=+[]{}|;:,.<>?/";
        private const string Ambiguous = "0O1lI|";

        private static readonly Color Bg = Color.FromArgb(10, 15, 28);
        private static readonly Color Surface = Color.FromArgb(17, 26, 46);
        private static readonly Color TextColor = Color.FromArgb(232, 238, 252);
        private static readonly Color Muted = Color.FromArgb(157, 177, 216);
        private static readonly Color Accent = Color.FromArgb(106, 141, 255);

        private readonly TrackBar lengthBar;
        private readonly NumericUpDown lengthNum;
        private readonly CheckBox setLower;
        private readonly CheckBox setUpper;
        private readonly CheckBox setDigits;
        private readonly CheckBox setSymbols;
        private readonly CheckBox excludeAmbiguous;
        private readonly ComboBox countBox;
        private readonly ListBox resultList;
        private readonly Label entropyLabel;
        private readonly Label statusLabel;

        public MainForm()
        {
            Text = "ぱすや for Windows｜パスワード生成";
            ClientSize = new Size(540, 600);
            MinimumSize = new Size(556, 639);
            BackColor = Bg;
            ForeColor = TextColor;
            Font = new Font("Yu Gothic UI", 10F);

            var title = new Label
            {
                Text = "ぱすや｜パスワード生成",
                Font = new Font("Yu Gothic UI", 16F, FontStyle.Bold),
                ForeColor = TextColor,
                Location = new Point(20, 14),
                AutoSize = true
            };
            Controls.Add(title);

            var lengthLabel = new Label
            {
                Text = "長さ",
                ForeColor = Muted,
                Location = new Point(20, 62),
                AutoSize = true
            };
            Controls.Add(lengthLabel);

            lengthBar = new TrackBar
            {
                Minimum = 8,
                Maximum = 64,
                Value = 16,
                TickFrequency = 8,
                Location = new Point(60, 56),
                Width = 360
            };
            lengthNum = new NumericUpDown
            {
                Minimum = 8,
                Maximum = 64,
                Value = 16,
                Location = new Point(432, 58),
                Width = 80,
                BackColor = Surface,
                ForeColor = TextColor
            };
            lengthBar.ValueChanged += (s, e) => lengthNum.Value = lengthBar.Value;
            lengthNum.ValueChanged += (s, e) => lengthBar.Value = (int)lengthNum.Value;
            Controls.Add(lengthBar);
            Controls.Add(lengthNum);

            setLower = MakeCheck("小文字 abc…z", true, 20, 108);
            setUpper = MakeCheck("大文字 ABC…Z", true, 280, 108);
            setDigits = MakeCheck("数字 012…9", true, 20, 140);
            setSymbols = MakeCheck("記号 !@#…", true, 280, 140);
            excludeAmbiguous = MakeCheck("紛らわしい文字を除外（0 O 1 l I |）", false, 20, 172);
            Controls.Add(setLower);
            Controls.Add(setUpper);
            Controls.Add(setDigits);
            Controls.Add(setSymbols);
            Controls.Add(excludeAmbiguous);

            var countLabel = new Label
            {
                Text = "個数",
                ForeColor = Muted,
                Location = new Point(20, 210),
                AutoSize = true
            };
            Controls.Add(countLabel);
            countBox = new ComboBox
            {
                DropDownStyle = ComboBoxStyle.DropDownList,
                Location = new Point(60, 206),
                Width = 90,
                BackColor = Surface,
                ForeColor = TextColor
            };
            countBox.Items.AddRange(new object[] { "1", "3", "5", "10", "20" });
            countBox.SelectedIndex = 2;
            Controls.Add(countBox);

            var generateBtn = new Button
            {
                Text = "生成",
                Font = new Font("Yu Gothic UI", 11F, FontStyle.Bold),
                BackColor = Accent,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Location = new Point(170, 202),
                Size = new Size(120, 36)
            };
            generateBtn.FlatAppearance.BorderSize = 0;
            generateBtn.Click += (s, e) => Generate();
            Controls.Add(generateBtn);

            var copyAllBtn = new Button
            {
                Text = "全部コピー",
                BackColor = Surface,
                ForeColor = TextColor,
                FlatStyle = FlatStyle.Flat,
                Location = new Point(302, 202),
                Size = new Size(120, 36)
            };
            copyAllBtn.Click += (s, e) =>
            {
                if (resultList.Items.Count == 0) return;
                var lines = new List<string>();
                foreach (var item in resultList.Items) lines.Add(item.ToString() ?? "");
                Clipboard.SetText(string.Join(Environment.NewLine, lines));
                statusLabel.Text = "全部コピーしました。";
            };
            Controls.Add(copyAllBtn);

            entropyLabel = new Label
            {
                Text = "",
                ForeColor = Muted,
                Location = new Point(20, 250),
                AutoSize = true
            };
            Controls.Add(entropyLabel);

            resultList = new ListBox
            {
                Location = new Point(20, 278),
                Size = new Size(500, 272),
                Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Top | AnchorStyles.Bottom,
                BackColor = Surface,
                ForeColor = TextColor,
                Font = new Font("Consolas", 11F),
                BorderStyle = BorderStyle.FixedSingle
            };
            resultList.DoubleClick += (s, e) => CopySelected();
            resultList.KeyDown += (s, e) =>
            {
                if (e.Control && e.KeyCode == Keys.C) CopySelected();
            };
            Controls.Add(resultList);

            statusLabel = new Label
            {
                Text = "結果をダブルクリックするとコピーできます。",
                ForeColor = Muted,
                Location = new Point(20, 560),
                Anchor = AnchorStyles.Left | AnchorStyles.Bottom,
                AutoSize = true
            };
            Controls.Add(statusLabel);
        }

        private CheckBox MakeCheck(string text, bool initial, int x, int y)
        {
            return new CheckBox
            {
                Text = text,
                Checked = initial,
                ForeColor = TextColor,
                Location = new Point(x, y),
                AutoSize = true
            };
        }

        private void CopySelected()
        {
            if (resultList.SelectedItem == null) return;
            Clipboard.SetText(resultList.SelectedItem.ToString() ?? "");
            statusLabel.Text = "コピーしました。";
        }

        // ⚙️ 選択中の文字セットを返す。除外 ON のときは紛らわしい文字を取り除き、
        // 空になったセットは落とす（Web版と同じ規則）。
        private List<string> CurrentSets()
        {
            var raw = new List<string>();
            if (setLower.Checked) raw.Add(Lower);
            if (setUpper.Checked) raw.Add(Upper);
            if (setDigits.Checked) raw.Add(Digits);
            if (setSymbols.Checked) raw.Add(Symbols);
            if (!excludeAmbiguous.Checked) return raw;
            var filtered = new List<string>();
            foreach (var set in raw)
            {
                var chars = new List<char>();
                foreach (var c in set)
                {
                    if (!Ambiguous.Contains(c)) chars.Add(c);
                }
                if (chars.Count > 0) filtered.Add(new string(chars.ToArray()));
            }
            return filtered;
        }

        private void Generate()
        {
            var sets = CurrentSets();
            if (sets.Count == 0)
            {
                statusLabel.Text = "文字の種類を1つ以上選んでください。";
                return;
            }
            int length = (int)lengthNum.Value;
            int count = int.Parse(countBox.SelectedItem?.ToString() ?? "5");
            string pool = string.Concat(sets);

            resultList.Items.Clear();
            for (int i = 0; i < count; i++)
            {
                resultList.Items.Add(GeneratePassword(length, sets, pool));
            }

            double entropy = length * Math.Log(pool.Length, 2);
            entropyLabel.Text = $"推定エントロピー: 約 {entropy:F0} bit（文字プール {pool.Length} 文字 × {length} 文字）";
            statusLabel.Text = "生成しました。結果をダブルクリックするとコピーできます。";
        }

        // 🔑 Web版と同じ方式：選択した各文字種から最低1文字ずつ入れ、残りをプールから埋めてシャッフル。
        // 乱数は RandomNumberGenerator（暗号学的に安全）のみを使う。
        private static string GeneratePassword(int length, List<string> sets, string pool)
        {
            var chars = new List<char>();
            foreach (var set in sets)
            {
                chars.Add(set[RandomNumberGenerator.GetInt32(set.Length)]);
            }
            while (chars.Count < length)
            {
                chars.Add(pool[RandomNumberGenerator.GetInt32(pool.Length)]);
            }
            // 🔀 Fisher-Yates シャッフル
            for (int i = chars.Count - 1; i > 0; i--)
            {
                int j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }
            return new string(chars.ToArray());
        }
    }
}
