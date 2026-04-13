// ===== google-apps-script.js =====
// IGP System v2 — 貼到 Google Apps Script 使用
//
// 部署方式：
//   擴充功能 → Apps Script → 部署 → 新增部署作業
//   類型：Web 應用程式
//   執行身分：我（自己）
//   存取權：任何人
//
// 部署後複製網址填入 app.js 的 SCRIPT_URL

const SHEET_NAME      = 'IGP資料';
const WEEK_SHEET_NAME = 'IGP週次明細';

// ===== GET（ping 測試）=====
function doGet(e) {
  return json({ status: 'ok', message: 'IGP System v2 connected' });
}

// ===== POST（接收儲存請求）=====
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'save') {
      return json(saveIGP(payload.data));
    }
    return json({ status: 'error', message: '未知的 action' });
  } catch (err) {
    return json({ status: 'error', message: err.toString() });
  }
}

// ===== 儲存主資料 =====
function saveIGP(d) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAME, mainHeaders());

  const row = [
    d.savedAt        || new Date().toLocaleString('zh-TW'),
    d.stuName,
    (d.stuYear || '') + '學年第' + (d.stuSem || '') + '學期',
    d.stuStage,
    d.stuGrade,
    d.teacherName,
    d.courseName,
    d.courseGrade,
    d.courseHours,
    d.courseTeacher,
    d.ctDomain  === '是' ? '領域學習課程' : '',
    d.ctSpecial === '是' ? '特殊需求課程' : '',
    d.courseGoal,
    d.competency,
    d.perfText,
    d.contentText,
    d.adjContent,
    d.adjProc,
    d.commentAttitude,
    d.commentAcademic,
    d.commentSocial,
    d.commentGrowth,
    JSON.stringify(d.weeks || []),
  ];

  const targetRow = sheet.getLastRow() + 1;
  const range     = sheet.getRange(targetRow, 1, 1, row.length);
  range.setValues([row]);
  range.setVerticalAlignment('top').setWrap(true);
  if (targetRow % 2 === 0) range.setBackground('#f0f4f8');

  // 儲存週次明細
  saveWeekDetail(ss, d);

  return { status: 'ok', row: targetRow };
}

// ===== 週次明細工作表 =====
function saveWeekDetail(ss, d) {
  const sheet = getOrCreateSheet(ss, WEEK_SHEET_NAME, weekHeaders());
  const weeks = d.weeks || [];
  if (!weeks.length) return;
  const rows = weeks.map(w => [
    d.savedAt, d.stuName, d.courseName,
    w.week, w.content, w.focus, w.method, w.result,
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// ===== 取得或建立工作表 =====
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setValues([headers])
      .setBackground('#1a3a6b')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(11);
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 130);
    // 加寬文字欄位
    [13, 15, 16, 19, 20, 21, 22].forEach(col => {
      try { sheet.setColumnWidth(col, 220); } catch(e) {}
    });
  }
  return sheet;
}

// ===== 標題定義 =====
function mainHeaders() {
  return [
    '儲存時間', '學生姓名', '學年度學期', '教育階段', '年級班別', '撰寫教師',
    '課程名稱', '教學年級', '每週節數', '教學者',
    '課程類型（領域）', '課程類型（特殊）',
    '學年目標', '核心素養', '學習表現', '學習內容',
    '內容調整策略', '歷程調整策略',
    '評語：學習態度', '評語：學科表現', '評語：課堂互動', '評語：成長建議',
    '週次資料（JSON）',
  ];
}

function weekHeaders() {
  return ['儲存時間', '學生姓名', '課程名稱', '週次', '課程內容', '教學重點', '評量方式', '評量結果'];
}

// ===== JSON 回應 =====
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
