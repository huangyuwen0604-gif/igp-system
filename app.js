// ===== IGP System v2 — app.js =====
// 範本一次設定，學生只填差異

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxlHZAlLro8FB5lFrhAuvA8-tWmhUabrD8qrXEmQ2YCyoCWBzJF80UxAhzFooKBY2bhIA/exec';

// ===== 狀態 =====
let tpl = { weeks: [] };      // 課程範本
let tplWks = [];              // 範本週次陣列
let students = [];            // 學生清單
let curStuIdx = -1;           // 目前選取的學生索引

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  addTplW(); addTplW(); addTplW();
  renderTplW();
});

// ===== 模式切換 =====
function switchMode(mode) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.mode-tab').forEach((b, i) => {
    b.classList.toggle('active', ['tpl', 'stu', 'pvw'][i] === mode);
  });
  document.getElementById('panel-' + mode).classList.add('active');
  if (mode === 'stu') renderStuSelector();
  if (mode === 'pvw') buildAllPvw();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 範本步驟切換 =====
function tplGo(n) {
  document.querySelectorAll('.tsec').forEach((s, i) => s.classList.toggle('active', i === n));
  document.querySelectorAll('.smb').forEach((b, i) => b.classList.toggle('active', i === n));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 工具函式 =====
function chk(cls) {
  return [...document.querySelectorAll('.' + cls + ':checked')].map(c => c.value).join('、');
}
function v(id) {
  return (document.getElementById(id) || {}).value || '';
}

// ===== 範本週次管理 =====
function addTplW() {
  const id = 'tw' + Date.now() + Math.random().toString(36).slice(2, 5);
  tplWks.push({ id });
  renderTplW();
}

function delTplW(id) {
  tplWks = tplWks.filter(w => w.id !== id);
  renderTplW();
}

function renderTplW() {
  const list = document.getElementById('t-wlist');
  if (!list) return;
  if (!tplWks.length) {
    list.innerHTML = '<div style="text-align:center;padding:16px;font-size:13px;color:#94a3b8">尚未新增週次，請點選下方按鈕新增</div>';
    return;
  }
  list.innerHTML = '';
  tplWks.forEach(w => {
    const d = document.createElement('div');
    d.className = 'week-row-tpl';
    d.id = w.id;
    d.innerHTML = `
      <input type="text" id="${w.id}-wk" placeholder="例：1-4" value="${w.wk || ''}">
      <input type="text" id="${w.id}-co" placeholder="課程內容 / 單元名稱" value="${w.co || ''}">
      <input type="text" id="${w.id}-fo" placeholder="教學重點" value="${w.fo || ''}">
      <select id="${w.id}-adj">
        <option value="加深加廣">加深加廣</option>
        <option value="重組">重組</option>
        <option value="統整教學主題">統整教學主題</option>
        <option value="加速">加速</option>
        <option value="其他">其他</option>
      </select>
      <button class="btn-remove" onclick="delTplW('${w.id}')" title="刪除">✕</button>`;
    list.appendChild(d);
    if (w.adj) document.getElementById(w.id + '-adj').value = w.adj;
  });
}

// ===== 儲存範本 =====
function saveTpl() {
  tpl = {
    courseName: v('t-cn'),
    year: v('t-year'),
    sem: v('t-sem'),
    grade: v('t-grade'),
    hours: v('t-hours'),
    teacher: v('t-teacher'),
    stage: (document.querySelector('input[name=tstage]:checked') || {}).value || '國中',
    ctDomain: document.getElementById('t-ctd')?.checked || false,
    ctSpecial: document.getElementById('t-cts')?.checked || false,
    goal: v('t-goal'),
    competency: chk('tcomp'),
    perf: v('t-perf'),
    lcont: v('t-lcont'),
    adjContent: chk('tac') + (v('t-aco') ? ' / ' + v('t-aco') : ''),
    adjProc: chk('tap') + (v('t-apo') ? ' / ' + v('t-apo') : ''),
    weeks: tplWks.map(w => ({
      wk: v(w.id + '-wk'),
      co: v(w.id + '-co'),
      fo: v(w.id + '-fo'),
      adj: v(w.id + '-adj'),
    })),
  };
  showMsg('課程範本已儲存！正在跳轉...', 'ok');
  setTimeout(() => switchMode('stu'), 800);
}

// ===== 學生管理 =====
function addStu() {
  const name = prompt('請輸入學生姓名：', '');
  if (!name || !name.trim()) return;
  students.push({ name: name.trim(), results: [], att: '', aca: '', soc: '', gro: '' });
  renderStuSelector();
  selectStu(students.length - 1);
}

function renderStuSelector() {
  const sel = document.getElementById('stu-selector');
  let html = '';
  students.forEach((s, i) => {
    html += `<button class="stu-pill ${i === curStuIdx ? 'active' : ''}" onclick="selectStu(${i})">${s.name}</button>`;
  });
  html += `<button class="btn-add-stu" onclick="addStu()">＋ 新增學生</button>`;
  sel.innerHTML = html;
}

function selectStu(idx) {
  // 先儲存目前學生資料
  if (curStuIdx >= 0) saveCurStuData();
  curStuIdx = idx;
  renderStuSelector();

  const s = students[idx];
  document.getElementById('cur-stu-label').textContent = s.name;
  document.getElementById('stu-form').style.display = 'block';

  // 帶入範本資料（唯讀顯示）
  document.getElementById('r-cn').textContent    = tpl.courseName || '—';
  document.getElementById('r-year').textContent  = tpl.year ? `${tpl.year} 學年第 ${tpl.sem} 學期` : '—';
  document.getElementById('r-grade').textContent = tpl.grade || '—';
  document.getElementById('r-teacher').textContent = tpl.teacher || '—';
  document.getElementById('r-goal').textContent  = tpl.goal || '—';
  document.getElementById('r-comp').textContent  = tpl.competency || '—';

  // 帶入評語
  document.getElementById('att').value = s.att || '';
  document.getElementById('aca').value = s.aca || '';
  document.getElementById('soc').value = s.soc || '';
  document.getElementById('gro').value = s.gro || '';

  // 渲染週次（從範本帶入，只顯示評量結果欄位）
  renderStuWlist(s);
}

function renderStuWlist(stu) {
  const list = document.getElementById('stu-wlist');
  if (!tpl.weeks || !tpl.weeks.length) {
    list.innerHTML = '<div style="font-size:13px;color:#94a3b8;padding:12px 0">請先在「課程範本設定」填入週次內容，再回來填學生資料。</div>';
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
      <select id="sm-${i}" onchange="updateMethod(${i}, this.value)">
        <option value="">評量方式</option>
        <option ${curMethod === '1.口頭發表' ? 'selected' : ''}>1.口頭發表</option>
        <option ${curMethod === '2.書面報告' ? 'selected' : ''}>2.書面報告</option>
        <option ${curMethod === '3.作業單'   ? 'selected' : ''}>3.作業單</option>
        <option ${curMethod === '4.器材操作' ? 'selected' : ''}>4.器材操作</option>
        <option ${curMethod === '5.成品製作' ? 'selected' : ''}>5.成品製作</option>
        <option ${curMethod === '6.活動設計' ? 'selected' : ''}>6.活動設計</option>
        <option ${curMethod === '7.觀察評量' ? 'selected' : ''}>7.觀察評量</option>
        <option ${curMethod === '8.演示評量' ? 'selected' : ''}>8.演示評量</option>
        <option ${curMethod === '9.檔案評量' ? 'selected' : ''}>9.檔案評量</option>
      </select>
      <select id="sr-${i}" onchange="updateResult(${i}, this.value)">
        <option value="">評量結果</option>
        <option ${curResult === '特優' ? 'selected' : ''}>特優</option>
        <option ${curResult === '優'   ? 'selected' : ''}>優</option>
        <option ${curResult === '良'   ? 'selected' : ''}>良</option>
        <option ${curResult === '中等' ? 'selected' : ''}>中等</option>
        <option ${curResult === '中下' ? 'selected' : ''}>中下</option>
        <option ${curResult === '待加強' ? 'selected' : ''}>待加強</option>
      </select>`;
    list.appendChild(d);
  });
}

function updateResult(i, val) {
  if (curStuIdx < 0) return;
  if (!students[curStuIdx].results) students[curStuIdx].results = [];
  students[curStuIdx].results[i] = val;
}

function updateMethod(i, val) {
  if (curStuIdx < 0) return;
  if (!students[curStuIdx].methods) students[curStuIdx].methods = [];
  students[curStuIdx].methods[i] = val;
}

// ===== 儲存目前學生表單資料到記憶體 =====
function saveCurStuData() {
  if (curStuIdx < 0) return;
  const s = students[curStuIdx];
  s.att = v('att');
  s.aca = v('aca');
  s.soc = v('soc');
  s.gro = v('gro');
  // 同步週次結果
  if (tpl.weeks) {
    tpl.weeks.forEach((_, i) => {
      const rEl = document.getElementById('sr-' + i);
      const mEl = document.getElementById('sm-' + i);
      if (rEl) { if (!s.results) s.results = []; s.results[i] = rEl.value; }
      if (mEl) { if (!s.methods) s.methods = []; s.methods[i] = mEl.value; }
    });
  }
}

// ===== 快速插入評語標籤 =====
function sins(id, txt) {
  const el = document.getElementById(id);
  if (!el) return;
  const pos = el.selectionStart;
  el.value = el.value.slice(0, pos) + txt + el.value.slice(pos);
  el.focus();
  el.selectionStart = el.selectionEnd = pos + txt.length;
}

// ===== 組合學生完整資料（供 Sheets 使用）=====
function buildStuData(s) {
  return {
    stuName:       s.name,
    stuYear:       tpl.year,
    stuSem:        tpl.sem,
    stuStage:      tpl.stage,
    stuGrade:      tpl.grade,
    teacherName:   tpl.teacher,
    courseName:    tpl.courseName,
    courseGrade:   tpl.grade,
    courseHours:   tpl.hours,
    courseTeacher: tpl.teacher,
    ctDomain:      tpl.ctDomain ? '是' : '',
    ctSpecial:     tpl.ctSpecial ? '是' : '',
    courseGoal:    tpl.goal,
    competency:    tpl.competency,
    perfText:      tpl.perf,
    contentText:   tpl.lcont,
    adjContent:    tpl.adjContent,
    adjProc:       tpl.adjProc,
    commentAttitude: s.att || '',
    commentAcademic: s.aca || '',
    commentSocial:   s.soc || '',
    commentGrowth:   s.gro || '',
    weeks: (tpl.weeks || []).map((w, i) => ({
      week:    w.wk,
      content: w.co,
      focus:   w.fo,
      method:  (s.methods && s.methods[i]) || '',
      result:  (s.results && s.results[i]) || '',
    })),
    savedAt: new Date().toLocaleString('zh-TW'),
  };
}

// ===== 儲存單一學生到 Google Sheets =====
async function saveStu() {
  if (curStuIdx < 0) { showMsg('請先選取或新增學生', 'err'); return; }
  saveCurStuData();
  const s = students[curStuIdx];
  const btn = document.getElementById('btn-save-stu');
  btn.disabled = true; btn.textContent = '儲存中...';
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'save', data: buildStuData(s) }),
    });
    const json = await res.json();
    if (json.status === 'ok') {
      showMsg(`✅ ${s.name} 已儲存到 Google Sheets！（第 ${json.row} 列）`, 'ok');
    } else throw new Error(json.message || '儲存失敗');
  } catch (e) {
    showMsg('❌ 儲存失敗：' + e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '💾 儲存到 Google Sheets';
  }
}

// ===== 批次儲存所有學生 =====
async function saveAll() {
  saveCurStuData();
  if (!students.length) { showMsg('尚未新增任何學生', 'err'); return; }
  const btn = document.getElementById('btn-save-all');
  btn.disabled = true; btn.textContent = '批次儲存中...';
  let ok = 0;
  for (const s of students) {
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'save', data: buildStuData(s) }),
      });
      const json = await res.json();
      if (json.status === 'ok') ok++;
    } catch (e) {}
  }
  showMsg(`✅ 批次儲存完成：${ok} / ${students.length} 位學生`, 'ok');
  btn.disabled = false; btn.textContent = '💾 批次儲存所有學生';
}

// ===== 複製全部文字 =====
function copyAll() {
  saveCurStuData();
  if (!students.length) { showMsg('尚未新增任何學生', 'err'); return; }
  const txt = students.map(s => {
    const d = buildStuData(s);
    const wt = d.weeks.map(w =>
      `  第${w.week}週｜${w.content}｜${w.focus}｜${w.method}｜${w.result}`
    ).join('\n');
    return `=== ${s.name} IGP ===
課程：${d.courseName}　${d.stuYear} 學年第 ${d.stuSem} 學期　${d.stuStage}
年級：${d.stuGrade}　教學者：${d.courseTeacher}

【學年目標】
${d.courseGoal}

【核心素養】${d.competency}

【週次課程】
${wt}

【質性評語】
學習態度：${d.commentAttitude}
學科表現：${d.commentAcademic}
課堂互動：${d.commentSocial}
成長建議：${d.commentGrowth}
`;
  }).join('\n' + '='.repeat(40) + '\n\n');

  navigator.clipboard.writeText(txt).then(() => showMsg('✅ 已複製所有學生資料！', 'ok'));
}

// ===== 建立批次預覽 =====
function buildAllPvw() {
  saveCurStuData();
  const area = document.getElementById('pvw-area');
  if (!students.length) {
    area.innerHTML = '<div style="text-align:center;padding:2rem;font-size:13px;color:#94a3b8">尚未新增任何學生。請先到「學生 IGP 填寫」新增學生。</div>';
    return;
  }
  const rb = r => {
    if (!r) return '—';
    return ['特優', '優'].includes(r)
      ? `<span class="result-ok">${r}</span>`
      : `<span class="result-w">${r}</span>`;
  };
  area.innerHTML = students.map(s => {
    const d = buildStuData(s);
    const wrows = d.weeks.map(w => `
      <tr>
        <td>${w.week}</td>
        <td>${w.content}</td>
        <td>${w.focus}</td>
        <td>${w.method || '—'}</td>
        <td>${rb(w.result)}</td>
      </tr>`).join('');
    return `
    <div class="pvw-card">
      <div class="pvw-card-title">${s.name} <span class="badge-stu">IGP 預覽</span></div>
      <table class="pvw-table" style="margin-bottom:12px">
        <tr><th>課程名稱</th><td>${d.courseName}</td><th>學年度學期</th><td>${d.stuYear} 學年第 ${d.stuSem} 學期</td></tr>
        <tr><th>教育階段</th><td>${d.stuStage}</td><th>年級班別</th><td>${d.stuGrade}</td></tr>
        <tr><th>教學者</th><td>${d.courseTeacher}</td><th>每週節數</th><td>${d.courseHours}</td></tr>
        <tr><th>核心素養</th><td colspan="3">${d.competency}</td></tr>
      </table>
      ${wrows ? `
      <table class="pvw-table" style="margin-bottom:12px">
        <tr><th>週次</th><th>課程內容</th><th>教學重點</th><th>評量方式</th><th>評量結果</th></tr>
        ${wrows}
      </table>` : ''}
      <table class="pvw-table">
        ${d.commentAttitude ? `<tr><th style="width:14%;white-space:nowrap">學習態度</th><td>${d.commentAttitude}</td></tr>` : ''}
        ${d.commentAcademic ? `<tr><th style="white-space:nowrap">學科表現</th><td>${d.commentAcademic}</td></tr>` : ''}
        ${d.commentSocial   ? `<tr><th style="white-space:nowrap">課堂互動</th><td>${d.commentSocial}</td></tr>` : ''}
        ${d.commentGrowth   ? `<tr><th style="white-space:nowrap">成長建議</th><td>${d.commentGrowth}</td></tr>` : ''}
      </table>
    </div>`;
  }).join('');
}

// ===== 顯示訊息 =====
function showMsg(txt, type) {
  const el = document.getElementById('msg');
  el.textContent = txt;
  el.className = 'msg ' + type;
  setTimeout(() => { el.className = 'msg'; }, 5000);
}
