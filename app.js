// ===== IGP System v3 — app.js =====
// 課程計畫資料庫內建版：無需 API，直接選取科目自動填入

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxlHZAlLro8FB5lFrhAuvA8-tWmhUabrD8qrXEmQ2YCyoCWBzJF80UxAhzFooKBY2bhIA/exec';

let tpl = { weeks: [] };
let tplWks = [];
let students = [];
let curStuIdx = -1;

document.addEventListener('DOMContentLoaded', () => {
  initDbSelector();
  addTplW(); addTplW(); addTplW();
});

// ===== 設定面板 (保留，以備未來使用) =====
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

// ===== 課程資料庫選取 =====
function initDbSelector() {
  filterDbCourses();
}

function filterDbCourses() {
  const grade = v('db-grade');
  const sel = el('db-course');
  const db = typeof COURSE_DB !== 'undefined' ? COURSE_DB : [];
  const filtered = db.filter(c => !grade || c.grade === grade || (!c.grade && !grade));
  sel.innerHTML = '<option value="">-- 選擇科目 --</option>' +
    filtered.map(c => `<option value="${encodeURIComponent(c.key)}">${c.label}</option>`).join('');
  el('db-preview').style.display = 'none';
  sel.onchange = () => previewDbCourse();
}

function getCourseByKey(keyEncoded) {
  if (!keyEncoded) return null;
  const key = decodeURIComponent(keyEncoded);
  return (typeof COURSE_DB !== 'undefined' ? COURSE_DB : []).find(c => c.key === key) || null;
}

function previewDbCourse() {
  const c = getCourseByKey(v('db-course'));
  const preview = el('db-preview');
  if (!c) { preview.style.display = 'none'; return; }
  preview.style.display = 'block';
  preview.innerHTML = `
    <div class="db-preview-row"><span>教師</span><strong>${c.teacher || '待定'}</strong></div>
    <div class="db-preview-row"><span>每週節數</span><strong>${c.hours} 節</strong></div>
    <div class="db-preview-row"><span>核心素養</span><strong>${(c.competency||[]).join('、') || '—'}</strong></div>
    <div class="db-preview-row"><span>內容調整</span><strong>${c.adjContent || '—'}</strong></div>
    <div class="db-preview-row"><span>週次數</span><strong>${(c.weeks||[]).length} 週</strong></div>
    <div class="db-preview-row"><span>學習表現</span><strong>${(c.performance||'').slice(0,60)}${(c.performance||'').length>60?'…':''}</strong></div>
  `;
}

function loadCourseFromDB() {
  const rawKey = v('db-course');
  const c = getCourseByKey(rawKey);
  
  // 除錯：顯示目前抓到的 key 和資料
  alert('DEBUG\nrawKey: ' + rawKey + '\n課程: ' + (c ? c.label : '找不到') + '\nperformance長度: ' + (c ? (c.performance||'').length : 'N/A') + '\ncontent長度: ' + (c ? (c.content||'').length : 'N/A'));
  
  if (!c) {
    showMsg('請先從下拉選單選擇科目', 'err'); return;
  }

  // 填入基本資料
  el('t-cn').value      = c.subject;
  el('t-year').value    = '114';
  el('t-grade').value   = c.grade;
  el('t-hours').value   = c.hours;
  el('t-teacher').value = c.teacher;

  // 填入學習重點
  el('t-goal').value   = c.goal || '';
  el('t-perf').value   = c.performance;
  el('t-lcont').value  = c.content;

  // 勾選核心素養
  document.querySelectorAll('.tcomp').forEach(cb => {
    cb.checked = c.competency.some(comp => comp === cb.value);
  });

  // 填入調整策略
  const adjCItems = (c.adjContent || '').split('、');
  document.querySelectorAll('.tac').forEach(cb => {
    cb.checked = adjCItems.includes(cb.value);
  });
  const adjPItems = (c.adjProc || '').split('、');
  document.querySelectorAll('.tap').forEach(cb => {
    cb.checked = adjPItems.includes(cb.value);
  });

  // 填入週次
  tplWks = [];
  if (c.weeks && c.weeks.length) {
    c.weeks.forEach(w => {
      const id = 'tw' + Date.now() + Math.random().toString(36).slice(2, 5);
      tplWks.push({ id, wk: w.wk, co: w.co, fo: w.fo, adj: w.adj });
    });
  } else {
    // 沒有週次資料時給3個空白
    addTplW(); addTplW(); addTplW();
    showMsg(`✅ 已套用「${c.label}」課程資料！週次請手動填入。`, 'ok');
    tplGo(1);
    return;
  }
  renderTplW();

  // 顯示成功提示，自動跳到學習重點確認
  const weekCount = c.weeks.length;
  showMsg(`✅ 已套用「${c.label}」！共匯入 ${weekCount} 個週次，請確認內容後儲存。`, 'ok');
  setTimeout(() => tplGo(1), 600);
}

// ===== 模式切換 =====
function switchMode(mode) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.mode-tab').forEach((b, i) => {
    b.classList.toggle('active', ['tpl', 'stu', 'pvw'][i] === mode);
  });
  document.getElementById('panel-' + mode).classList.add('active');
  if (mode === 'stu') { renderStuSelector(); syncTplDisplay(); }
  if (mode === 'pvw') refreshPvwSelector();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function tplGo(n) {
  document.querySelectorAll('.tsec').forEach((s, i) => s.classList.toggle('active', i === n));
  document.querySelectorAll('.smb').forEach((b, i) => b.classList.toggle('active', i === n));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function chk(cls) { return [...document.querySelectorAll('.' + cls + ':checked')].map(c => c.value).join('、'); }
function v(id) { return (document.getElementById(id) || {}).value || ''; }
function el(id) { return document.getElementById(id); }

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
  // 立即更新學生頁所有唯讀欄位（不需等 selectStu）
  syncTplDisplay();
  // 若已有學生選取，重新渲染週次列表（確保週次也即時更新）
  if (curStuIdx >= 0) renderStuWlist(students[curStuIdx]);
  showMsg('✅ 課程範本已儲存！正在跳轉...', 'ok');
  setTimeout(() => switchMode('stu'), 700);
}

// ===== 同步範本資料到學生頁唯讀欄位 =====
function syncTplDisplay() {
  const safe = (id, val) => { const e = el(id); if (e) e.textContent = val || '—'; };
  safe('r-cn',      tpl.courseName);
  safe('r-year',    tpl.year ? `${tpl.year} 學年第 ${tpl.sem} 學期` : '');
  safe('r-grade',   tpl.grade);
  safe('r-teacher', tpl.teacher);
  safe('r-goal',    tpl.goal);
  safe('r-comp',    tpl.competency);
  safe('r-perf',    tpl.perf);
  safe('r-lcont',   tpl.lcont);
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
  syncTplDisplay();
  el('att').value = s.att || '';
  el('aca').value = s.aca || '';
  el('soc').value = s.soc || '';
  el('gro').value = s.gro || '';
  renderStuWlist(s);
}

function renderStuWlist(stu) {
  const list = el('stu-wlist');
  if (!tpl.weeks || !tpl.weeks.length) {
    list.innerHTML = '<div style="font-size:13px;color:#94a3b8;padding:10px 0">請先在「課程範本設定」選取或設定週次</div>';
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

function updateResult(i, val) { if (curStuIdx<0) return; if (!students[curStuIdx].results) students[curStuIdx].results=[]; students[curStuIdx].results[i]=val; }
function updateMethod(i, val) { if (curStuIdx<0) return; if (!students[curStuIdx].methods) students[curStuIdx].methods=[]; students[curStuIdx].methods[i]=val; }

function saveCurStuData() {
  if (curStuIdx < 0) return;
  const s = students[curStuIdx];
  s.att=v('att'); s.aca=v('aca'); s.soc=v('soc'); s.gro=v('gro');
  (tpl.weeks||[]).forEach((_,i) => {
    const rEl=el('sr-'+i), mEl=el('sm-'+i);
    if (rEl) { if (!s.results) s.results=[]; s.results[i]=rEl.value; }
    if (mEl) { if (!s.methods) s.methods=[]; s.methods[i]=mEl.value; }
  });
}

function sins(id, txt) {
  const e=el(id); if (!e) return;
  const p=e.selectionStart;
  e.value=e.value.slice(0,p)+txt+e.value.slice(p);
  e.focus(); e.selectionStart=e.selectionEnd=p+txt.length;
}

function buildStuData(s) {
  return {
    stuName:s.name, stuYear:tpl.year, stuSem:tpl.sem, stuStage:tpl.stage,
    stuGrade:tpl.grade, teacherName:tpl.teacher,
    courseName:tpl.courseName, courseGrade:tpl.grade,
    courseHours:tpl.hours, courseTeacher:tpl.teacher,
    ctDomain:tpl.ctDomain?'是':'', ctSpecial:tpl.ctSpecial?'是':'',
    courseGoal:tpl.goal, competency:tpl.competency,
    perfText:tpl.perf, contentText:tpl.lcont,
    adjContent:tpl.adjContent, adjProc:tpl.adjProc,
    commentAttitude:s.att||'', commentAcademic:s.aca||'',
    commentSocial:s.soc||'', commentGrowth:s.gro||'',
    weeks:(tpl.weeks||[]).map((w,i)=>({
      week:w.wk, content:w.co, focus:w.fo,
      method:(s.methods&&s.methods[i])||'',
      result:(s.results&&s.results[i])||'',
    })),
    savedAt:new Date().toLocaleString('zh-TW'),
  };
}

// ===== 儲存 =====
async function saveStu() {
  if (curStuIdx<0) { showMsg('請先選取或新增學生','err'); return; }
  saveCurStuData();
  const btn=el('btn-save-stu');
  btn.disabled=true; btn.textContent='儲存中...';
  try {
    const res=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'save',data:buildStuData(students[curStuIdx])})});
    const json=await res.json();
    if (json.status==='ok') showMsg(`✅ ${students[curStuIdx].name} 已儲存！（第 ${json.row} 列）`,'ok');
    else throw new Error(json.message);
  } catch(e) { showMsg('❌ 儲存失敗：'+e.message,'err'); }
  finally { btn.disabled=false; btn.textContent='💾 儲存到 Google Sheets'; }
}

async function saveAll() {
  saveCurStuData();
  if (!students.length) { showMsg('尚未新增任何學生','err'); return; }
  const btn=el('btn-save-all');
  btn.disabled=true; btn.textContent='儲存中...';
  let ok=0;
  for (const s of students) {
    try {
      const res=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'save',data:buildStuData(s)})});
      const json=await res.json();
      if (json.status==='ok') ok++;
    } catch(e) {}
  }
  showMsg(`✅ 批次儲存完成：${ok}/${students.length} 位學生`,'ok');
  btn.disabled=false; btn.textContent='💾 批次儲存全部';
}

function copyAll() {
  saveCurStuData();
  const txt=students.map(s=>{
    const d=buildStuData(s);
    const wt=d.weeks.map(w=>`  第${w.week}週｜${w.content}｜${w.focus}｜${w.method}｜${w.result}`).join('\n');
    return `=== ${s.name} IGP ===\n課程：${d.courseName} ${d.stuYear}學年第${d.stuSem}學期\n【學年目標】${d.courseGoal}\n【週次】\n${wt}\n【態度】${d.commentAttitude}\n【學科】${d.commentAcademic}\n【互動】${d.commentSocial}\n【建議】${d.commentGrowth}`;
  }).join('\n\n'+'─'.repeat(40)+'\n\n');
  navigator.clipboard.writeText(txt).then(()=>showMsg('✅ 已複製！','ok'));
}

// ===== 預覽 =====
function refreshPvwSelector() {
  saveCurStuData();
  const sel=el('pvw-stu-sel');
  const cur=sel.value;
  sel.innerHTML='<option value="">-- 請選擇學生 --</option>'+
    students.map((s,i)=>`<option value="${i}" ${cur==i?'selected':''}>${s.name}</option>`).join('');
  if (students.length===1) { sel.value='0'; buildSinglePvw(); }
  else if (cur && students[parseInt(cur)]) buildSinglePvw();
  else el('pvw-content').innerHTML='<div class="pvw-empty">請從上方選單選擇學生</div>';
}

function buildSinglePvw() {
  const idx=parseInt(el('pvw-stu-sel').value);
  if (isNaN(idx)||!students[idx]) { el('pvw-content').innerHTML='<div class="pvw-empty">請從上方選單選擇學生</div>'; return; }
  el('pvw-content').innerHTML=buildPrintPage(buildStuData(students[idx]));
}

function buildPrintPage(d) {
  const rc=r=>['特優','優'].includes(r)?'print-result-ok':(r?'print-result-w':'');
  const weekRows=(d.weeks||[]).map(w=>`
    <tr>
      <td style="text-align:center">${w.week}</td>
      <td class="left">${w.content}</td>
      <td class="left">${w.focus}</td>
      <td style="text-align:center">${w.method}</td>
      <td style="text-align:center" class="${rc(w.result)}">${w.result||'—'}</td>
    </tr>`).join('');
  const commentRows=[['學習態度',d.commentAttitude],['學科表現',d.commentAcademic],['課堂互動',d.commentSocial],['成長建議',d.commentGrowth]]
    .filter(([,val])=>val)
    .map(([key,val])=>`<tr><th style="width:14%;white-space:nowrap">${key}</th><td>${val}</td></tr>`).join('');

  return `
  <div class="print-page">
    <div class="print-header">
      <div>
        <div class="print-header-title">新竹縣資賦優異學生個別輔導計畫（IGP）</div>
        <div class="print-header-sub">五、教育目標及課程調整</div>
      </div>
      <div class="print-header-right">
        ${d.stuYear||''}學年度第${d.stuSem||''}學期<br>
        製表：${d.savedAt}
      </div>
    </div>
    <div class="print-section-title">基本資料</div>
    <table class="print-table">
      <tr><th>學生姓名</th><td>${d.stuName}</td><th>教育階段</th><td>${d.stuStage}</td></tr>
      <tr><th>年級 / 班別</th><td>${d.stuGrade}</td><th>撰寫教師</th><td>${d.teacherName}</td></tr>
      <tr><th>課程名稱</th><td>${d.courseName}</td><th>每週節數</th><td>${d.courseHours} 節</td></tr>
      <tr><th>教學年級</th><td>${d.courseGrade}</td><th>教學者</th><td>${d.courseTeacher}</td></tr>
    </table>
    <div class="print-section-title">教育目標</div>
    <table class="print-table">
      <tr><th style="width:14%">學年目標</th><td>${d.courseGoal||'—'}</td></tr>
      <tr><th>核心素養</th><td>${d.competency||'—'}</td></tr>
      <tr><th>學習表現</th><td>${d.perfText||'—'}</td></tr>
      <tr><th>學習內容</th><td>${d.contentText||'—'}</td></tr>
      <tr><th>內容調整</th><td>${d.adjContent||'—'}</td></tr>
      <tr><th>歷程調整</th><td>${d.adjProc||'—'}</td></tr>
    </table>
    ${weekRows?`
    <div class="print-section-title">週次課程內容與評量</div>
    <table class="print-week-table">
      <tr><th style="width:8%">週次</th><th style="width:25%">課程內容</th><th style="width:32%">教學重點</th><th style="width:18%">評量方式</th><th style="width:17%">評量結果</th></tr>
      ${weekRows}
    </table>`:''}
    ${commentRows?`
    <div class="print-section-title">質性評語</div>
    <table class="print-table">${commentRows}</table>`:''}
    <div class="print-sign">
      <div class="print-sign-item"><span>導師簽章</span></div>
      <div class="print-sign-item"><span>科任教師簽章</span></div>
      <div class="print-sign-item"><span>家長簽章</span></div>
      <div class="print-sign-item"><span>學生簽章</span></div>
    </div>
  </div>`;
}

function printCurrent() {
  const idx=parseInt(el('pvw-stu-sel').value);
  if (isNaN(idx)||!students[idx]) { showMsg('請先選擇學生','err'); return; }
  window.print();
}

function showMsg(txt,type) {
  const m=el('msg');
  m.textContent=txt; m.className='msg '+type;
  setTimeout(()=>{ m.className='msg'; },5000);
}

// 新功能：AI 解析課程計畫 + A4 列印 + 學習表現/學習內容顯示在每份學生文件

// ===== Excel 課程計畫匯入 =====
// ===== JSON 課程計畫匯入（直接貼上 JSON）=====
function openImportDialog() {
  const modal = el('import-modal');
  if (modal) modal.style.display = 'flex';
}

function closeImportDialog() {
  const modal = el('import-modal');
  if (modal) modal.style.display = 'none';
}

function doImportJSON() {
  const raw = (el('import-json-text').value || '').trim();
  if (!raw) { showMsg('❌ 請先貼上 JSON 內容', 'err'); return; }

  let data;
  try {
    data = JSON.parse(raw);
  } catch(e) {
    showMsg('❌ JSON 格式有誤，請重新複製：' + e.message, 'err');
    return;
  }

  // 支援單一物件或陣列
  const courses = Array.isArray(data) ? data : [data];
  if (!courses.length) { showMsg('❌ 沒有課程資料', 'err'); return; }

  // 驗證第一筆有 key 欄位
  if (!courses[0].key) {
    showMsg('❌ 資料格式不符，每筆需有 key 欄位。請用本系統的「匯出 JSON」功能產生資料。', 'err');
    return;
  }

  let added = 0, updated = 0;
  courses.forEach(c => {
    // 確保 weeks / competency 是陣列
    if (!Array.isArray(c.weeks)) c.weeks = [];
    if (!Array.isArray(c.competency)) c.competency = (c.competency || '').split('、').filter(Boolean);
    const idx = COURSE_DB.findIndex(x => x.key === c.key);
    if (idx >= 0) { COURSE_DB[idx] = c; updated++; }
    else { COURSE_DB.push(c); added++; }
  });

  filterDbCourses();
  closeImportDialog();
  el('import-json-text').value = '';
  showMsg(`✅ 匯入完成！新增 ${added} 門、更新 ${updated} 門課程。請從下拉選單選取。`, 'ok');
}

// ===== 匯出目前課程為 JSON（供備份/分享）=====
function exportCourseJSON() {
  const idx_key = v('db-course');
  const c = getCourseByKey(idx_key);
  if (!c) { showMsg('請先選擇要匯出的課程', 'err'); return; }
  const json = JSON.stringify([c], null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (c.label || c.key) + '.json';
  a.click();
  showMsg('✅ 已下載 JSON 檔案', 'ok');
}

// ===== 匯出全部課程為 JSON =====
function exportAllCoursesJSON() {
  const json = JSON.stringify(COURSE_DB, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'IGP_COURSE_DB.json';
  a.click();
  showMsg(`✅ 已匯出全部 ${COURSE_DB.length} 門課程`, 'ok');
}


