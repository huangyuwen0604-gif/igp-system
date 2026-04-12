// ===== IGP System v3 — app.js =====
// 新功能：AI 解析課程計畫 + A4 列印 + 學習表現/學習內容顯示在每份學生文件

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxlHZAlLro8FB5lFrhAuvA8-tWmhUabrD8qrXEmQ2YCyoCWBzJF80UxAhzFooKBY2bhIA/exec';

// ===== 狀態 =====
let tpl = { weeks: [] };
let tplWks = [];
let students = [];
let curStuIdx = -1;

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 載入儲存的 API Key
  const saved = localStorage.getItem('igp_gemini_key');
  if (saved) document.getElementById('gemini-key').value = saved;
  // 預設三筆週次
  addTplW(); addTplW(); addTplW();
});

// ===== 設定面板 =====
function toggleSettings() {
  const p = document.getElementById('settings-panel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}
function saveApiKey() {
  const key = document.getElementById('gemini-key').value.trim();
  if (!key) return;
  localStorage.setItem('igp_gemini_key', key);
  showMsg('✓ API Key 已儲存', 'ok');
  toggleSettings();
}

// ===== 模式切換 =====
function switchMode(mode) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.mode-tab').forEach((b, i) => {
    b.classList.toggle('active', ['tpl', 'stu', 'pvw'][i] === mode);
  });
  document.getElementById('panel-' + mode).classList.add('active');
  if (mode === 'stu') renderStuSelector();
  if (mode === 'pvw') refreshPvwSelector();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 範本步驟 =====
function tplGo(n) {
  document.querySelectorAll('.tsec').forEach((s, i) => s.classList.toggle('active', i === n));
  document.querySelectorAll('.smb').forEach((b, i) => b.classList.toggle('active', i === n));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 工具 =====
function chk(cls) { return [...document.querySelectorAll('.' + cls + ':checked')].map(c => c.value).join('、'); }
function v(id) { return (document.getElementById(id) || {}).value || ''; }
function el(id) { return document.getElementById(id); }

// ===== AI 解析課程計畫 =====
async function aiParse() {
  const apiKey = localStorage.getItem('igp_gemini_key');
  if (!apiKey) {
    showMsg('請先在右上角「⚙ 設定」填入 Gemini API Key', 'err');
    toggleSettings();
    return;
  }
  const text = v('ai-paste');
  if (!text.trim()) { showMsg('請先貼上課程計畫文字', 'err'); return; }

  const btn = el('btn-ai-parse');
  const status = el('ai-status');
  btn.disabled = true; btn.textContent = '✦ 解析中...';
  status.textContent = '正在呼叫 Gemini AI...';

  const prompt = `你是台灣國中特殊教育課程計畫的分析助手。請從以下課程計畫文字中，精確提取下列資訊，以 JSON 格式回傳：

{
  "goal": "學年目標（整段文字，保持原文，若有多點請用換行分隔）",
  "competency": ["核心素養代碼列表，例如 A1.身心素質與自我精進、B2.科技資訊與媒體素養"],
  "performance": "學習表現（保持原文，包含學習表現代碼與說明）",
  "content": "學習內容（保持原文）"
}

核心素養只能從以下選項選取：
A1.身心素質與自我精進、A2.系統思考與問題解決、A3.規劃執行與創新應變、
B1.符號運用與溝通表達、B2.科技資訊與媒體素養、B3.藝術涵養與美感素養、
C1.道德實踐與公民意識、C2.人際關係與團隊合作、C3.多元文化與國際理解

只回傳 JSON，不要加任何說明文字或 markdown 格式。

課程計畫文字：
${text}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // 移除可能的 markdown code block
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // 填入表單
    if (parsed.goal)        el('t-goal').value  = parsed.goal;
    if (parsed.performance) el('t-perf').value  = parsed.performance;
    if (parsed.content)     el('t-lcont').value = parsed.content;

    // 勾選核心素養
    if (parsed.competency && Array.isArray(parsed.competency)) {
      document.querySelectorAll('.tcomp').forEach(cb => {
        cb.checked = parsed.competency.some(c => c.includes(cb.value) || cb.value.includes(c));
      });
      el('comp-hint').style.display = 'block';
    }
    el('perf-hint').style.display  = 'block';
    el('lcont-hint').style.display = 'block';

    status.textContent = '✓ 解析完成，請到下一步確認內容';
    status.style.color = '#16a34a';
    showMsg('✅ AI 解析完成！請到「③ 學習重點確認」查看結果', 'ok');

  } catch (e) {
    status.textContent = '解析失敗：' + e.message;
    status.style.color = '#dc2626';
    showMsg('❌ AI 解析失敗：' + e.message + '（請確認 API Key 正確）', 'err');
  } finally {
    btn.disabled = false; btn.textContent = '✦ AI 自動解析並填入';
  }
}

// ===== 範本週次 =====
function addTplW() {
  const id = 'tw' + Date.now() + Math.random().toString(36).slice(2, 5);
  tplWks.push({ id });
  renderTplW();
}
function delTplW(id) { tplWks = tplWks.filter(w => w.id !== id); renderTplW(); }
function renderTplW() {
  const list = el('t-wlist');
  if (!list) return;
  if (!tplWks.length) { list.innerHTML = '<div style="text-align:center;padding:14px;font-size:12px;color:#94a3b8">尚未新增週次</div>'; return; }
  list.innerHTML = '';
  tplWks.forEach(w => {
    const d = document.createElement('div');
    d.className = 'week-row-tpl';
    d.innerHTML = `
      <input type="text" id="${w.id}-wk" placeholder="例：1-4" value="${w.wk || ''}">
      <input type="text" id="${w.id}-co" placeholder="課程內容 / 單元" value="${w.co || ''}">
      <input type="text" id="${w.id}-fo" placeholder="教學重點" value="${w.fo || ''}">
      <select id="${w.id}-adj">
        <option value="加深加廣">加深加廣</option>
        <option value="重組">重組</option>
        <option value="統整教學主題">統整教學主題</option>
        <option value="加速">加速</option>
        <option value="其他">其他</option>
      </select>
      <button class="btn-remove" onclick="delTplW('${w.id}')">✕</button>`;
    list.appendChild(d);
    if (w.adj) el(w.id + '-adj').value = w.adj;
  });
}

// ===== 儲存範本 =====
function saveTpl() {
  tpl = {
    courseName: v('t-cn'), year: v('t-year'), sem: v('t-sem'),
    grade: v('t-grade'), hours: v('t-hours'), teacher: v('t-teacher'),
    stage: (document.querySelector('input[name=tstage]:checked') || {}).value || '國中',
    ctDomain: el('t-ctd')?.checked || false,
    ctSpecial: el('t-cts')?.checked || false,
    goal: v('t-goal'), competency: chk('tcomp'),
    perf: v('t-perf'), lcont: v('t-lcont'),
    adjContent: chk('tac') + (v('t-aco') ? ' / ' + v('t-aco') : ''),
    adjProc: chk('tap') + (v('t-apo') ? ' / ' + v('t-apo') : ''),
    weeks: tplWks.map(w => ({
      wk: v(w.id + '-wk'), co: v(w.id + '-co'),
      fo: v(w.id + '-fo'), adj: v(w.id + '-adj'),
    })),
  };
  showMsg('✅ 課程範本已儲存！正在跳轉...', 'ok');
  setTimeout(() => switchMode('stu'), 700);
}

// ===== 學生管理 =====
function addStu() {
  const name = prompt('請輸入學生姓名：', '');
  if (!name || !name.trim()) return;
  students.push({ name: name.trim(), results: [], methods: [], att: '', aca: '', soc: '', gro: '' });
  renderStuSelector();
  selectStu(students.length - 1);
}

function renderStuSelector() {
  const sel = el('stu-selector');
  let html = students.map((s, i) =>
    `<button class="stu-pill ${i === curStuIdx ? 'active' : ''}" onclick="selectStu(${i})">${s.name}</button>`
  ).join('');
  html += `<button class="btn-add-stu" onclick="addStu()">＋ 新增學生</button>`;
  sel.innerHTML = html;
}

function selectStu(idx) {
  if (curStuIdx >= 0) saveCurStuData();
  curStuIdx = idx;
  renderStuSelector();
  const s = students[idx];
  el('cur-stu-label').textContent = s.name;
  el('stu-form').style.display = 'block';

  // 帶入範本唯讀資料（包含學習表現、學習內容）
  el('r-cn').textContent      = tpl.courseName || '—';
  el('r-year').textContent    = tpl.year ? `${tpl.year} 學年第 ${tpl.sem} 學期` : '—';
  el('r-grade').textContent   = tpl.grade || '—';
  el('r-teacher').textContent = tpl.teacher || '—';
  el('r-goal').textContent    = tpl.goal || '—';
  el('r-comp').textContent    = tpl.competency || '—';
  el('r-perf').textContent    = tpl.perf || '—';
  el('r-lcont').textContent   = tpl.lcont || '—';

  el('att').value = s.att || '';
  el('aca').value = s.aca || '';
  el('soc').value = s.soc || '';
  el('gro').value = s.gro || '';

  renderStuWlist(s);
}

function renderStuWlist(stu) {
  const list = el('stu-wlist');
  if (!tpl.weeks || !tpl.weeks.length) {
    list.innerHTML = '<div style="font-size:13px;color:#94a3b8;padding:10px 0">請先在「課程範本設定」填入週次</div>';
    return;
  }
  list.innerHTML = '';
  tpl.weeks.forEach((w, i) => {
    const curResult = (stu.results && stu.results[i]) || '';
    const curMethod = (stu.methods && stu.methods[i]) || '';
    const d = document.createElement('div');
    d.className = 'week-row-stu';
    d.innerHTML = `
      <span class="week-text">${w.wk}</span>
      <span class="week-text">${w.co}</span>
      <span class="week-text">${w.fo}</span>
      <select id="sm-${i}" onchange="updateMethod(${i},this.value)">
        <option value="">評量方式</option>
        ${['1.口頭發表','2.書面報告','3.作業單','4.器材操作','5.成品製作','6.活動設計','7.觀察評量','8.演示評量','9.檔案評量']
          .map(m => `<option ${curMethod===m?'selected':''}>${m}</option>`).join('')}
      </select>
      <select id="sr-${i}" onchange="updateResult(${i},this.value)">
        <option value="">評量結果</option>
        ${['特優','優','良','中等','中下','待加強']
          .map(r => `<option ${curResult===r?'selected':''}>${r}</option>`).join('')}
      </select>`;
    list.appendChild(d);
  });
}

function updateResult(i, val) { if (curStuIdx < 0) return; if (!students[curStuIdx].results) students[curStuIdx].results=[]; students[curStuIdx].results[i] = val; }
function updateMethod(i, val) { if (curStuIdx < 0) return; if (!students[curStuIdx].methods) students[curStuIdx].methods=[]; students[curStuIdx].methods[i] = val; }

function saveCurStuData() {
  if (curStuIdx < 0) return;
  const s = students[curStuIdx];
  s.att = v('att'); s.aca = v('aca'); s.soc = v('soc'); s.gro = v('gro');
  (tpl.weeks || []).forEach((_, i) => {
    const rEl = el('sr-' + i), mEl = el('sm-' + i);
    if (rEl) { if (!s.results) s.results=[]; s.results[i] = rEl.value; }
    if (mEl) { if (!s.methods) s.methods=[]; s.methods[i] = mEl.value; }
  });
}

function sins(id, txt) {
  const e = el(id); if (!e) return;
  const p = e.selectionStart;
  e.value = e.value.slice(0, p) + txt + e.value.slice(p);
  e.focus(); e.selectionStart = e.selectionEnd = p + txt.length;
}

// ===== 組合學生資料 =====
function buildStuData(s) {
  return {
    stuName: s.name, stuYear: tpl.year, stuSem: tpl.sem, stuStage: tpl.stage,
    stuGrade: tpl.grade, teacherName: tpl.teacher,
    courseName: tpl.courseName, courseGrade: tpl.grade,
    courseHours: tpl.hours, courseTeacher: tpl.teacher,
    ctDomain: tpl.ctDomain ? '是' : '', ctSpecial: tpl.ctSpecial ? '是' : '',
    courseGoal: tpl.goal, competency: tpl.competency,
    perfText: tpl.perf, contentText: tpl.lcont,
    adjContent: tpl.adjContent, adjProc: tpl.adjProc,
    commentAttitude: s.att || '', commentAcademic: s.aca || '',
    commentSocial: s.soc || '', commentGrowth: s.gro || '',
    weeks: (tpl.weeks || []).map((w, i) => ({
      week: w.wk, content: w.co, focus: w.fo,
      method: (s.methods && s.methods[i]) || '',
      result: (s.results && s.results[i]) || '',
    })),
    savedAt: new Date().toLocaleString('zh-TW'),
  };
}

// ===== 儲存 =====
async function saveStu() {
  if (curStuIdx < 0) { showMsg('請先選取或新增學生', 'err'); return; }
  saveCurStuData();
  const btn = el('btn-save-stu');
  btn.disabled = true; btn.textContent = '儲存中...';
  try {
    const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'save', data: buildStuData(students[curStuIdx]) }) });
    const json = await res.json();
    if (json.status === 'ok') showMsg(`✅ ${students[curStuIdx].name} 已儲存！（第 ${json.row} 列）`, 'ok');
    else throw new Error(json.message);
  } catch (e) { showMsg('❌ 儲存失敗：' + e.message, 'err'); }
  finally { btn.disabled = false; btn.textContent = '💾 儲存到 Google Sheets'; }
}

async function saveAll() {
  saveCurStuData();
  if (!students.length) { showMsg('尚未新增任何學生', 'err'); return; }
  const btn = el('btn-save-all');
  btn.disabled = true; btn.textContent = '儲存中...';
  let ok = 0;
  for (const s of students) {
    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'save', data: buildStuData(s) }) });
      const json = await res.json();
      if (json.status === 'ok') ok++;
    } catch (e) {}
  }
  showMsg(`✅ 批次儲存完成：${ok} / ${students.length} 位學生`, 'ok');
  btn.disabled = false; btn.textContent = '💾 批次儲存全部';
}

function copyAll() {
  saveCurStuData();
  const txt = students.map(s => {
    const d = buildStuData(s);
    const wt = d.weeks.map(w => `  第${w.week}週｜${w.content}｜${w.focus}｜${w.method}｜${w.result}`).join('\n');
    return `=== ${s.name} IGP ===\n課程：${d.courseName} ${d.stuYear}學年第${d.stuSem}學期\n【學年目標】${d.courseGoal}\n【週次】\n${wt}\n【態度】${d.commentAttitude}\n【學科】${d.commentAcademic}\n【互動】${d.commentSocial}\n【建議】${d.commentGrowth}`;
  }).join('\n\n' + '─'.repeat(40) + '\n\n');
  navigator.clipboard.writeText(txt).then(() => showMsg('✅ 已複製！', 'ok'));
}

// ===== 預覽選單 =====
function refreshPvwSelector() {
  saveCurStuData();
  const sel = el('pvw-stu-sel');
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- 請選擇學生 --</option>' +
    students.map((s, i) => `<option value="${i}" ${cur == i ? 'selected' : ''}>${s.name}</option>`).join('');
  if (students.length === 1) { sel.value = '0'; buildSinglePvw(); }
  else if (cur && students[parseInt(cur)]) buildSinglePvw();
  else el('pvw-content').innerHTML = '<div class="pvw-empty">請從上方選單選擇學生</div>';
}

function buildSinglePvw() {
  const idx = parseInt(el('pvw-stu-sel').value);
  if (isNaN(idx) || !students[idx]) {
    el('pvw-content').innerHTML = '<div class="pvw-empty">請從上方選單選擇學生</div>';
    return;
  }
  const d = buildStuData(students[idx]);
  el('pvw-content').innerHTML = buildPrintPage(d);
}

// ===== 建立列印頁面 HTML =====
function buildPrintPage(d) {
  const resultClass = r => ['特優', '優'].includes(r) ? 'print-result-ok' : (r ? 'print-result-w' : '');

  const weekRows = (d.weeks || []).map(w => `
    <tr>
      <td style="text-align:center">${w.week}</td>
      <td class="left">${w.content}</td>
      <td class="left">${w.focus}</td>
      <td style="text-align:center">${w.method}</td>
      <td style="text-align:center" class="${resultClass(w.result)}">${w.result || '—'}</td>
    </tr>`).join('');

  const commentRows = [
    ['學習態度', d.commentAttitude],
    ['學科表現', d.commentAcademic],
    ['課堂互動', d.commentSocial],
    ['成長建議', d.commentGrowth],
  ].filter(([, val]) => val).map(([key, val]) => `
    <tr><th style="width:14%;white-space:nowrap">${key}</th><td>${val}</td></tr>`).join('');

  return `
  <div class="print-page">
    <div class="print-header">
      <div>
        <div class="print-header-title">新竹縣資賦優異學生個別輔導計畫（IGP）</div>
        <div class="print-header-sub">教育目標及課程調整</div>
      </div>
      <div class="print-header-right">
        ${d.stuYear || ''}學年度第${d.stuSem || ''}學期<br>
        製表日期：${d.savedAt}
      </div>
    </div>

    <div class="print-section-title">一、基本資料</div>
    <table class="print-table">
      <tr>
        <th>學生姓名</th><td>${d.stuName}</td>
        <th>教育階段</th><td>${d.stuStage}</td>
      </tr>
      <tr>
        <th>年級 / 班別</th><td>${d.stuGrade}</td>
        <th>撰寫教師</th><td>${d.teacherName}</td>
      </tr>
      <tr>
        <th>課程名稱</th><td>${d.courseName}</td>
        <th>每週節數</th><td>${d.courseHours} 節</td>
      </tr>
      <tr>
        <th>教學年級</th><td>${d.courseGrade}</td>
        <th>教學者</th><td>${d.courseTeacher}</td>
      </tr>
    </table>

    <div class="print-section-title">二、教育目標</div>
    <table class="print-table">
      <tr><th style="width:14%">學年目標</th><td>${d.courseGoal || '—'}</td></tr>
      <tr><th>核心素養</th><td>${d.competency || '—'}</td></tr>
      <tr><th>學習表現</th><td>${d.perfText || '—'}</td></tr>
      <tr><th>學習內容</th><td>${d.contentText || '—'}</td></tr>
      <tr><th>內容調整策略</th><td>${d.adjContent || '—'}</td></tr>
      <tr><th>歷程調整策略</th><td>${d.adjProc || '—'}</td></tr>
    </table>

    ${weekRows ? `
    <div class="print-section-title">三、週次課程內容與評量</div>
    <table class="print-week-table">
      <tr>
        <th style="width:8%">週次</th>
        <th style="width:28%">課程內容 / 單元</th>
        <th style="width:30%">教學重點</th>
        <th style="width:18%">評量方式</th>
        <th style="width:16%">評量結果</th>
      </tr>
      ${weekRows}
    </table>` : ''}

    ${commentRows ? `
    <div class="print-section-title">四、質性評語</div>
    <table class="print-table">
      ${commentRows}
    </table>` : ''}

    <div class="print-sign">
      <div class="print-sign-item"><span>導師簽章</span></div>
      <div class="print-sign-item"><span>科任教師簽章</span></div>
      <div class="print-sign-item"><span>家長簽章</span></div>
      <div class="print-sign-item"><span>學生簽章</span></div>
    </div>
  </div>`;
}

// ===== 列印目前學生 =====
function printCurrent() {
  const idx = parseInt(el('pvw-stu-sel').value);
  if (isNaN(idx) || !students[idx]) { showMsg('請先選擇學生', 'err'); return; }
  window.print();
}

// ===== 顯示訊息 =====
function showMsg(txt, type) {
  const m = el('msg');
  m.textContent = txt; m.className = 'msg ' + type;
  setTimeout(() => { m.className = 'msg'; }, 5000);
}
