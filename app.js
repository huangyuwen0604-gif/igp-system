// ===== IGP System — app.js =====
// Google Sheets 聯動 + 完整表單邏輯

let scriptUrl = localStorage.getItem('igp_script_url') || '';
let weeks = [];
let currentStep = 0;

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  if (scriptUrl) {
    document.getElementById('sheet-url-input').value = scriptUrl;
    updateStatusUI('connected');
  }
  initWeeks();
});

function initWeeks() {
  addWeek();
  addWeek();
  addWeek();
}

// ===== 步驟導覽 =====
function goTo(step) {
  document.querySelectorAll('.section').forEach((s, i) => {
    s.classList.toggle('active', i === step);
  });
  document.querySelectorAll('.step-btn').forEach((b, i) => {
    b.classList.toggle('active', i === step);
  });
  currentStep = step;
  if (step === 6) buildPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Google Sheets 連線 =====
function connectSheet() {
  const url = document.getElementById('sheet-url-input').value.trim();
  if (!url) { alert('請輸入 Google Apps Script 網址'); return; }
  updateStatusUI('connecting');
  // 測試連線（ping）
  fetch(url + '?action=ping')
    .then(r => r.json())
    .then(data => {
      if (data.status === 'ok') {
        scriptUrl = url;
        localStorage.setItem('igp_script_url', url);
        updateStatusUI('connected');
        showSaveMsg('✓ 已成功連線 Google Sheets！', 'success');
      } else {
        throw new Error('回應格式錯誤');
      }
    })
    .catch(() => {
      updateStatusUI('disconnected');
      showSaveMsg('❌ 連線失敗，請確認網址是否正確，以及 Apps Script 已正確部署', 'error');
    });
}

function updateStatusUI(state) {
  const dot = document.querySelector('.status-dot');
  const text = document.getElementById('status-text');
  dot.className = 'status-dot ' + state;
  if (state === 'connected') text.textContent = '已連線 Google Sheets';
  else if (state === 'connecting') text.textContent = '連線中...';
  else text.textContent = '尚未連線 Google Sheets';
}

function toggleSetup() {
  const el = document.getElementById('setup-help');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ===== 週次管理 =====
function addWeek() {
  const id = 'w' + Date.now() + Math.random().toString(36).slice(2, 5);
  weeks.push({ id });
  renderWeeks();
}

function removeWeek(id) {
  weeks = weeks.filter(w => w.id !== id);
  renderWeeks();
}

function renderWeeks() {
  const list = document.getElementById('week-list');
  if (!list) return;
  if (weeks.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:#94a3b8">尚未新增週次，請點選下方按鈕新增</div>';
    return;
  }
  list.innerHTML = '';
  weeks.forEach(w => {
    const div = document.createElement('div');
    div.className = 'week-row';
    div.id = 'week-' + w.id;
    div.innerHTML = `
      <input type="text" id="wk-week-${w.id}" placeholder="例：1-4" value="${w.week||''}">
      <input type="text" id="wk-content-${w.id}" placeholder="單元名稱 / 課程內容" value="${w.content||''}">
      <input type="text" id="wk-focus-${w.id}" placeholder="教學重點" value="${w.focus||''}">
      <select id="wk-method-${w.id}">
        <option value="">評量方式</option>
        <option value="1.口頭發表">1.口頭發表</option>
        <option value="2.書面報告">2.書面報告</option>
        <option value="3.作業單">3.作業單</option>
        <option value="4.器材操作">4.器材操作</option>
        <option value="5.成品製作">5.成品製作</option>
        <option value="6.活動設計">6.活動設計</option>
        <option value="7.觀察評量">7.觀察評量</option>
        <option value="8.演示評量">8.演示評量</option>
        <option value="9.檔案評量">9.檔案評量</option>
        <option value="10.其他">10.其他</option>
      </select>
      <select id="wk-result-${w.id}">
        <option value="">評量結果</option>
        <option value="特優">特優</option>
        <option value="優">優</option>
        <option value="良">良</option>
        <option value="中等">中等</option>
        <option value="中下">中下</option>
        <option value="待加強">待加強</option>
      </select>
      <button class="btn-remove" onclick="removeWeek('${w.id}')" title="刪除">✕</button>
    `;
    list.appendChild(div);
    // 還原選取值
    if (w.method) document.getElementById('wk-method-' + w.id).value = w.method;
    if (w.result) document.getElementById('wk-result-' + w.id).value = w.result;
  });
}

// ===== 收集週次資料 =====
function collectWeeks() {
  return weeks.map(w => ({
    week: document.getElementById('wk-week-' + w.id)?.value || '',
    content: document.getElementById('wk-content-' + w.id)?.value || '',
    focus: document.getElementById('wk-focus-' + w.id)?.value || '',
    method: document.getElementById('wk-method-' + w.id)?.value || '',
    result: document.getElementById('wk-result-' + w.id)?.value || '',
  }));
}

// ===== 快速插入評語標籤 =====
function insertTag(field, text) {
  const el = document.getElementById('comment-' + field);
  if (!el) return;
  const pos = el.selectionStart;
  el.value = el.value.slice(0, pos) + text + el.value.slice(pos);
  el.focus();
  el.selectionStart = el.selectionEnd = pos + text.length;
}

// ===== 收集所有表單資料 =====
function collectData() {
  const getChecked = cls =>
    [...document.querySelectorAll('.' + cls + ':checked')].map(c => c.value).join('、');

  return {
    stuName:       document.getElementById('stu-name')?.value || '',
    stuYear:       document.getElementById('stu-year')?.value || '',
    stuSem:        document.getElementById('stu-sem')?.value || '',
    stuStage:      document.querySelector('input[name=stage]:checked')?.value || '',
    stuGrade:      document.getElementById('stu-grade')?.value || '',
    teacherName:   document.getElementById('teacher-name')?.value || '',
    courseName:    document.getElementById('course-name')?.value || '',
    courseGrade:   document.getElementById('course-grade')?.value || '',
    courseHours:   document.getElementById('course-hours')?.value || '',
    courseTeacher: document.getElementById('course-teacher')?.value || '',
    ctDomain:      document.getElementById('ct-domain')?.checked ? '是' : '',
    ctSpecial:     document.getElementById('ct-special')?.checked ? '是' : '',
    courseGoal:    document.getElementById('course-goal')?.value || '',
    competency:    getChecked('comp'),
    perfText:      document.getElementById('perf-text')?.value || '',
    contentText:   document.getElementById('content-text')?.value || '',
    adjContent:    getChecked('adj-content') + (document.getElementById('adj-content-other')?.value ? ' / ' + document.getElementById('adj-content-other').value : ''),
    adjProc:       getChecked('adj-proc') + (document.getElementById('adj-proc-other')?.value ? ' / ' + document.getElementById('adj-proc-other').value : ''),
    commentAttitude: document.getElementById('comment-attitude')?.value || '',
    commentAcademic: document.getElementById('comment-academic')?.value || '',
    commentSocial:   document.getElementById('comment-social')?.value || '',
    commentGrowth:   document.getElementById('comment-growth')?.value || '',
    weeks: collectWeeks(),
    savedAt: new Date().toLocaleString('zh-TW'),
  };
}

// ===== 儲存到 Google Sheets =====
async function saveToSheet() {
  if (!scriptUrl) {
    showSaveMsg('❌ 尚未連線 Google Sheets，請先在上方設定連線網址', 'error');
    return;
  }
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = '儲存中...';
  const data = collectData();
  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'save', data }),
    });
    const json = await res.json();
    if (json.status === 'ok') {
      showSaveMsg('✅ 已成功儲存到 Google Sheets！' + (json.row ? `（第 ${json.row} 列）` : ''), 'success');
    } else {
      throw new Error(json.message || '儲存失敗');
    }
  } catch (e) {
    showSaveMsg('❌ 儲存失敗：' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 儲存到 Google Sheets';
  }
}

// ===== 複製文字 =====
function copyText() {
  const d = collectData();
  const weekLines = d.weeks.map(w =>
    `  第${w.week}週｜${w.content}｜${w.focus}｜${w.method}｜${w.result}`
  ).join('\n');

  const text = `=== IGP 個別輔導計畫 ===
學生：${d.stuName}　${d.stuYear}學年第${d.stuSem}學期　${d.stuStage}
年級班別：${d.stuGrade}　撰寫教師：${d.teacherName}

【課程資訊】
課程名稱：${d.courseName}　教學年級：${d.courseGrade}
每週節數：${d.courseHours}　教學者：${d.courseTeacher}

【學年目標】
${d.courseGoal}

【核心素養】${d.competency}
【學習表現】${d.perfText}
【學習內容】${d.contentText}

【課程調整】
內容：${d.adjContent}
歷程：${d.adjProc}

【週次課程】
${weekLines}

【質性評語】
學習態度：${d.commentAttitude}
學科表現：${d.commentAcademic}
課堂互動：${d.commentSocial}
成長建議：${d.commentGrowth}

產生時間：${d.savedAt}
`;
  navigator.clipboard.writeText(text).then(() => {
    showSaveMsg('✅ 已複製到剪貼簿！', 'success');
  });
}

// ===== 顯示訊息 =====
function showSaveMsg(msg, type) {
  const el = document.getElementById('save-msg');
  if (!el) return;
  el.textContent = msg;
  el.className = 'save-msg ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ===== 預覽 =====
function buildPreview() {
  const d = collectData();
  const resultBadge = r => {
    if (!r) return '';
    const cls = ['特優','優'].includes(r) ? 'badge-success' : 'badge-warning';
    return `<span class="badge ${cls}">${r}</span>`;
  };
  const weekRows = d.weeks.map(w => `
    <tr>
      <td>${w.week}</td>
      <td>${w.content}</td>
      <td>${w.focus}</td>
      <td>${w.method}</td>
      <td>${resultBadge(w.result)}</td>
    </tr>
  `).join('');

  document.getElementById('preview-area').innerHTML = `
    <div class="card">
      <div class="card-title">基本資料</div>
      <table class="preview-table">
        <tr><th>學生姓名</th><td>${d.stuName}</td><th>學年度學期</th><td>${d.stuYear} 學年第 ${d.stuSem} 學期</td></tr>
        <tr><th>教育階段</th><td>${d.stuStage}</td><th>年級 / 班別</th><td>${d.stuGrade}</td></tr>
        <tr><th>撰寫教師</th><td>${d.teacherName}</td><th>課程名稱</th><td>${d.courseName}</td></tr>
        <tr><th>教學年級</th><td>${d.courseGrade}</td><th>每週節數</th><td>${d.courseHours} 節</td></tr>
        <tr><th>教學者</th><td colspan="3">${d.courseTeacher}</td></tr>
      </table>
    </div>

    <div class="card">
      <div class="card-title">教育目標</div>
      <table class="preview-table">
        <tr><th style="width:18%">學年目標</th><td>${d.courseGoal}</td></tr>
        <tr><th>核心素養</th><td>${d.competency}</td></tr>
        <tr><th>學習表現</th><td>${d.perfText}</td></tr>
        <tr><th>學習內容</th><td>${d.contentText}</td></tr>
        <tr><th>內容調整</th><td>${d.adjContent}</td></tr>
        <tr><th>歷程調整</th><td>${d.adjProc}</td></tr>
      </table>
    </div>

    ${weekRows ? `
    <div class="card">
      <div class="card-title">週次課程內容</div>
      <table class="preview-table">
        <tr><th>週次</th><th>課程內容</th><th>教學重點</th><th>評量方式</th><th>評量結果</th></tr>
        ${weekRows}
      </table>
    </div>` : ''}

    <div class="card">
      <div class="card-title">質性評語</div>
      <table class="preview-table">
        ${d.commentAttitude ? `<tr><th style="width:18%;white-space:nowrap">學習態度</th><td>${d.commentAttitude}</td></tr>` : ''}
        ${d.commentAcademic ? `<tr><th style="white-space:nowrap">學科表現</th><td>${d.commentAcademic}</td></tr>` : ''}
        ${d.commentSocial   ? `<tr><th style="white-space:nowrap">課堂互動</th><td>${d.commentSocial}</td></tr>` : ''}
        ${d.commentGrowth   ? `<tr><th style="white-space:nowrap">成長建議</th><td>${d.commentGrowth}</td></tr>` : ''}
      </table>
    </div>
  `;
}
