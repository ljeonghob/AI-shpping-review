const STORAGE_KEY = "survey-dashboard-history-v1";
const ACCESS_SESSION_KEY = "survey-dashboard-auth-v1";
const API_KEY_SESSION_KEY = "survey-dashboard-api-key-v1";
const SHARED_ACCESS_CODE = "LOTTE-REVIEW-2026";

const REQUIRED_COLUMNS = [
  "survey_no",
  "customer_id",
  "store_name",
  "survey_date",
  "comment_text"
];

const COLUMN_ALIASES = {
  survey_no: ["survey_no", "\uC124\uBB38\uBC88\uD638"],
  customer_id: [
    "customer_id",
    "customer id",
    "\uACE0\uAC1Did",
    "\uACE0\uAC1D ID",
    "\uACE0\uAC1D\uC2DD\uBCC4\uBC88\uD638",
    "\uACE0\uAC1D \uC2DD\uBCC4\uBC88\uD638",
    "\uBA64\uBC84\uC2A4\uBC88\uD638",
    "\uD68C\uC6D0\uBC88\uD638",
    "member_no",
    "member_number"
  ],
  store_name: ["store_name", "\uCC38\uC5EC\uC9C0\uC810", "\uC810\uD3EC\uBA85", "\uB9E4\uC7A5\uBA85", "store"],
  survey_date: ["survey_date", "\uCC38\uC5EC\uC77C\uC790", "\uCC38\uC5EC\uC77C", "\uC124\uBB38\uCC38\uC5EC\uC77C\uC790", "\uC124\uBB38\uC77C\uC790", "\uC791\uC131\uC77C\uC790"],
  comment_text: [
    "comment_text",
    "\uBB38\uD56D5",
    "\uBB38\uD56D 5",
    "\uC8FC\uAD00\uC2DD",
    "\uC8FC\uAD00\uC2DD\uC758\uACAC",
    "\uC8FC\uAD00\uC2DD \uC751\uB2F5",
    "\uC8FC\uAD00\uC2DD\uC751\uB2F5",
    "\uC758\uACAC",
    "\uACE0\uAC1D\uC758\uACAC",
    "\uC790\uC720\uC758\uACAC",
    "\uC11C\uC220\uD615\uC751\uB2F5",
    "\uB9AC\uBDF0\uB0B4\uC6A9",
    "\uC751\uB2F5"
  ]
};

const STOPWORDS = new Set([
  "그리고", "하지만", "다만", "정말", "조금", "많이", "너무", "그냥", "전체적", "전체적으로",
  "있습니다", "좋습니다", "좋았어요", "아쉬웠습니다", "했습니다", "했습니다만", "있었어요", "같습니다",
  "때문에", "고객", "직원", "매장", "점포", "백화점", "응대", "설명", "안내", "구매", "쇼핑"
]);

const DETAIL_KEYWORDS = [
  "주차", "엘리베이터", "입구", "안내데스크", "식품관", "문화센터", "행사장", "가전", "화장품",
  "식당가", "계산대", "결제", "동선", "수선", "배송", "라운지", "화장실", "수유실", "유모차",
  "재고", "예약", "픽업", "대기", "표지판", "키오스크", "상담", "품절", "정산"
];

const USABILITY_KEYWORDS = [
  "좋겠습니다", "있으면", "필요", "개선", "분리", "추가", "표시", "정확", "안내문", "동선",
  "예상", "실시간", "전용", "요약", "정리", "크게", "쉽게", "빠르게", "효율", "보이면"
];

const POSITIVE_KEYWORDS = [
  "친절", "도움", "안심", "신뢰", "좋았", "만족", "정확", "부드럽", "편했", "꼼꼼", "세심"
];

const NEGATIVE_KEYWORDS = [
  "아쉬", "불편", "혼잡", "헷갈", "부족", "지연", "길었", "오래", "문제", "최악", "짜증"
];

const PROFANITY_KEYWORDS = ["최악", "짜증", "개판", "욕", "형편없", "별로예요", "망했"];

const CATEGORY_RULES = [
  {
    label: "주차/접근",
    keywords: ["주차", "주차장", "입구", "정산", "엘리베이터", "유모차", "동선", "길찾기"]
  },
  {
    label: "매장 환경",
    keywords: ["화장실", "수유실", "안내도", "표지판", "편의시설", "청결", "쾌적", "환경"]
  },
  {
    label: "브랜드/상품",
    keywords: ["브랜드", "상품", "품절", "진열", "가격표", "재고", "프로모션", "구색", "행사"]
  },
  {
    label: "직원 서비스",
    keywords: ["직원", "상담", "응대", "친절", "안내데스크", "전문성", "속도", "설명", "응대해"]
  }
];

const state = {
  pendingUpload: null,
  history: loadHistory(),
  activeBatchId: null,
  storeFilter: "all",
  sortFilter: "score",
  analysisMode: "ai",
  captchaValue: "",
  apiKey: "",
  distributionPages: {
    all: 1,
    selected: 1
  }
};

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
}

function loadStoredApiKey() {
  try {
    return sessionStorage.getItem(API_KEY_SESSION_KEY) || "";
  } catch (error) {
    return "";
  }
}

function saveStoredApiKey(value) {
  try {
    if (value) {
      sessionStorage.setItem(API_KEY_SESSION_KEY, value);
    } else {
      sessionStorage.removeItem(API_KEY_SESSION_KEY);
    }
  } catch (error) {
    return;
  }
}

function isAuthenticated() {
  try {
    return sessionStorage.getItem(ACCESS_SESSION_KEY) === "ok";
  } catch (error) {
    return false;
  }
}

function setAuthenticated(value) {
  try {
    if (value) {
      sessionStorage.setItem(ACCESS_SESSION_KEY, "ok");
    } else {
      sessionStorage.removeItem(ACCESS_SESSION_KEY);
    }
  } catch (error) {
    return;
  }
}

function normalizeDate(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) return trimmed.replaceAll("/", "-");
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(trimmed)) return trimmed.replaceAll(".", "-");
  return trimmed;
}

function toISODate(value) {
  const normalized = normalizeDate(value);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${year}.${Number(month)}.${Number(day)}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function generateCaptchaValue() {
  state.captchaValue = String(Math.floor(100000 + Math.random() * 900000));
  const target = document.getElementById("captchaCodeText");
  if (target) {
    target.textContent = state.captchaValue;
  }
}

function updateAuthUI() {
  const gate = document.getElementById("authGate");
  const logoutBtn = document.getElementById("logoutBtn");
  const statusText = document.getElementById("loginStatusText");
  const authed = isAuthenticated();

  if (gate) {
    gate.classList.toggle("open", !authed);
    gate.setAttribute("aria-hidden", authed ? "true" : "false");
  }
  if (logoutBtn) {
    logoutBtn.hidden = !authed;
  }
  if (statusText) {
    statusText.textContent = authed ? "팀 인증 완료" : "공용 인증코드 로그인 필요";
  }
}

function attemptLogin() {
  const accessCode = document.getElementById("accessCodeInput")?.value.trim() || "";
  const captchaInput = document.getElementById("captchaInput")?.value.trim() || "";
  const errorText = document.getElementById("authErrorText");

  if (accessCode !== SHARED_ACCESS_CODE) {
    if (errorText) errorText.textContent = "공용 인증코드가 일치하지 않습니다.";
    generateCaptchaValue();
    return;
  }

  if (captchaInput !== state.captchaValue) {
    if (errorText) errorText.textContent = "난수번호가 일치하지 않습니다.";
    generateCaptchaValue();
    return;
  }

  setAuthenticated(true);
  if (errorText) errorText.textContent = "";
  if (document.getElementById("accessCodeInput")) document.getElementById("accessCodeInput").value = "";
  if (document.getElementById("captchaInput")) document.getElementById("captchaInput").value = "";
  updateAuthUI();
}

function logout() {
  setAuthenticated(false);
  updateAuthUI();
  generateCaptchaValue();
}

function syncApiKeyInput() {
  const input = document.getElementById("apiKeyInput");
  if (!input) return;
  input.value = state.apiKey;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current !== "" || row.length) {
    row.push(current);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((header) => String(header).trim().replace(/^\uFEFF/, ""));
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = String(cells[index] ?? "").trim();
    });
    return record;
  });
}

function parseWorkbook(arrayBuffer) {
  if (typeof XLSX === "undefined") {
    throw new Error("엑셀 파일 처리를 위한 라이브러리를 찾을 수 없습니다.");
  }

  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const mergedRows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false
    });

    rows.forEach((row) => {
      mergedRows.push({
        ...row,
        __sheet_name: sheetName
      });
    });
  });

  return mergedRows;
}

function findColumnName(record, aliases) {
  const keys = Object.keys(record);
  return aliases.find((alias) => keys.includes(alias)) || "";
}

function normalizeRows(rows) {
  return rows.map((row, index) => {
    const surveyNoKey = findColumnName(row, COLUMN_ALIASES.survey_no);
    const customerIdKey = findColumnName(row, COLUMN_ALIASES.customer_id);
    const surveyDateKey = findColumnName(row, COLUMN_ALIASES.survey_date);
    const commentKey = findColumnName(row, COLUMN_ALIASES.comment_text);
    const storeNameKey = ["store_name", "\uCC38\uC5EC\uC9C0\uC810", "\uC810\uD3EC\uBA85", "\uB9E4\uC7A5\uBA85", "store"]
      .find((key) => Object.keys(row).includes(key)) || "";

    const surveyNo = String(row[surveyNoKey] || "").trim();
    const fallbackCustomerId = surveyNo ? ("SURVEY-" + surveyNo) : ("ROW-" + (index + 1));
    const customerId = String(row[customerIdKey] || fallbackCustomerId).trim();

    return {
      ...row,
      survey_no: surveyNo,
      customer_id: customerId || fallbackCustomerId,
      store_name: String(row[storeNameKey] || "").trim(),
      survey_date: String(row[surveyDateKey] || "").trim(),
      comment_text: String(row[commentKey] || "").trim()
    };
  });
}

function validateColumns(rows) {
  if (!rows.length) {
    return { ok: false, message: "\uC5C5\uB85C\uB4DC\uB41C \uB370\uC774\uD130\uC5D0 \uC751\uB2F5 \uD589\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." };
  }

  const columns = Object.keys(rows[0]);
  const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length) {
    return { ok: false, message: "\uD544\uC218 \uCEEC\uB7FC \uB204\uB77D: " + missing.join(", ") };
  }
  return { ok: true, message: "\uD544\uC218 \uCEEC\uB7FC " + REQUIRED_COLUMNS.length + "\uAC1C \uD655\uC778 \uC644\uB8CC" };
}

function countMatches(text, list) {
  return list.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function hasMeaninglessRepeat(text) {
  if (!text) return true;
  if (/^(.)\1{5,}$/.test(text.replace(/\s/g, ""))) return true;
  if (/^(.{2,8})\1{2,}$/.test(text.replace(/\s/g, ""))) return true;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (/^(.{2,20})( \1){2,}$/.test(normalized)) return true;
  return false;
}

function getExclusionReason(comment) {
  const normalized = comment.replace(/\s+/g, " ").trim();
  if (!normalized) return "의미 없는 반복 응답";

  if (/(01[016789])[- ]?\d{3,4}[- ]?\d{4}/.test(normalized) || /\d{2,4}[- ]?\d{3,4}[- ]?\d{4}/.test(normalized)) {
    return "전화번호 포함";
  }

  if (/(이름은|저는|담당자는)\s*[가-힣]{2,4}/.test(normalized) || /[가-힣]{2,4}\s*(님|씨)/.test(normalized)) {
    return "실명 노출";
  }

  if (PROFANITY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "욕설/비방/혐오 표현";
  }

  if (normalized.length < 20) {
    return "20자 미만 단답형";
  }

  if (hasMeaninglessRepeat(normalized)) {
    return "의미 없는 반복 응답";
  }

  return "";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreComment(comment) {
  const normalized = comment.replace(/\s+/g, " ").trim();
  const sentences = normalized.split(/[.!?]|니다\.|어요\.|습니다\./).filter(Boolean).length;
  const detailMatches = countMatches(normalized, DETAIL_KEYWORDS);
  const usabilityMatches = countMatches(normalized, USABILITY_KEYWORDS);
  const positiveMatches = countMatches(normalized, POSITIVE_KEYWORDS);
  const negativeMatches = countMatches(normalized, NEGATIVE_KEYWORDS);
  const hasContrast = /다만|반면|그래도|하지만|한편/.test(normalized);
  const hasSpecificScene = /에서|입구|주차장|매장|층|코너|행사장|라운지|데스크|창구/.test(normalized);
  const hasActionableVerb = /보이면|있으면|바꾸면|추가하면|분리되면|높아질/.test(normalized);

  const specificity = clamp(
    8
      + detailMatches * 4
      + Math.floor(normalized.length / 38)
      + (hasSpecificScene ? 5 : 0)
      + (hasContrast ? 4 : 0)
      + Math.min(sentences, 3),
    0,
    40
  );

  const usability = clamp(
    8
      + usabilityMatches * 5
      + positiveMatches * 2
      + negativeMatches * 2
      + (hasActionableVerb ? 5 : 0)
      + (hasContrast ? 3 : 0),
    0,
    40
  );

  const authenticity = clamp(
    5
      + Math.floor(normalized.length / 45)
      + Math.min(sentences * 2, 6)
      + (/[가-힣]/.test(normalized) ? 3 : 0)
      + (/습니다|어요|합니다/.test(normalized) ? 3 : 0),
    0,
    20
  );

  return {
    specificity,
    usability,
    authenticity,
    total: specificity + usability + authenticity
  };
}

function buildSelectionReason(record) {
  if (record.ai_score_specificity >= 34 && record.ai_score_usability >= 34) {
    return "구체성과 활용성이 모두 높음";
  }
  if (record.ai_score_specificity >= 34) {
    return "상황 설명이 매우 구체적";
  }
  if (record.ai_score_usability >= 34) {
    return "운영 개선 포인트가 명확";
  }
  if (record.ai_score_authenticity >= 16) {
    return "응답 완성도와 진정성이 높음";
  }
  return "균형 있는 우수 응답";
}

function incrementCount(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function sortCountEntries(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
}

function formatTopLabels(entries, maxItems = 3) {
  return entries
    .slice(0, maxItems)
    .map(([label, count]) => `${label}(${count}건)`)
    .join(", ");
}

function buildSummaryFromCandidates(candidates) {
  const categoryCounts = new Map();
  const positiveCounts = new Map();
  const negativeCounts = new Map();

  candidates.forEach((item) => {
    const comment = item.comment_text || "";
    const positiveMatchCount = countMatches(comment, POSITIVE_KEYWORDS);
    const negativeMatchCount = countMatches(comment, NEGATIVE_KEYWORDS) + countMatches(comment, USABILITY_KEYWORDS);

    CATEGORY_RULES.forEach((category) => {
      const matchedKeywords = category.keywords.filter((keyword) => comment.includes(keyword));
      if (matchedKeywords.length) {
        incrementCount(categoryCounts, category.label);
        if (positiveMatchCount > 0) {
          incrementCount(positiveCounts, category.label);
        }
        if (negativeMatchCount > 0) {
          incrementCount(negativeCounts, category.label);
        }
      }
    });
  });

  const topCategories = sortCountEntries(categoryCounts);
  const topPositive = sortCountEntries(positiveCounts);
  const topNegative = sortCountEntries(negativeCounts);

  return {
    frequentIssuesText: topCategories.length
      ? `가장 많이 언급된 카테고리는 ${formatTopLabels(topCategories)}이며, 상위 후보군에서 이 주제들이 반복적으로 등장했습니다.`
      : "카테고리별 언급을 집계할 데이터가 아직 충분하지 않습니다.",
    positiveText: topPositive.length
      ? `${formatTopLabels(topPositive)} 관련 칭찬 의견이 많았습니다.`
      : "뚜렷한 긍정 포인트가 아직 충분하지 않습니다.",
    negativeText: topNegative.length
      ? `${formatTopLabels(topNegative)} 관련 아쉬움과 개선 요청이 많았습니다.`
      : "뚜렷한 부정 포인트가 아직 많지 않습니다."
  };
}

function groupByStore(list) {
  const counts = list.reduce((accumulator, item) => {
    const store = item.store_name || "미지정";
    accumulator[store] = (accumulator[store] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([store, count], index) => ({ rank: index + 1, store, count }));
}

function compareCandidates(a, b) {
  return (
    b.ai_total_score - a.ai_total_score ||
    b.ai_score_specificity - a.ai_score_specificity ||
    b.ai_score_usability - a.ai_score_usability ||
    b.ai_score_authenticity - a.ai_score_authenticity ||
    a.survey_date.localeCompare(b.survey_date, "ko") ||
    String(a.survey_no).localeCompare(String(b.survey_no), "ko")
  );
}

function analyzeRows(rows, settings) {
  const analyzed = rows.map((row) => {
    const comment = String(row.comment_text || "").replace(/\s+/g, " ").trim();
    const surveyDate = toISODate(row.survey_date);
    const exclusionReason = getExclusionReason(comment);

    if (exclusionReason) {
      return {
        ...row,
        survey_date: surveyDate,
        comment_text: comment,
        ai_total_score: 0,
        ai_score_specificity: 0,
        ai_score_usability: 0,
        ai_score_authenticity: 0,
        is_excluded: true,
        exclusion_reason: exclusionReason,
        comment_length: comment.length,
        selection_reason: ""
      };
    }

    const score = scoreComment(comment);
    return {
      ...row,
      survey_date: surveyDate,
      comment_text: comment,
      ai_total_score: score.total,
      ai_score_specificity: score.specificity,
      ai_score_usability: score.usability,
      ai_score_authenticity: score.authenticity,
      is_excluded: false,
      exclusion_reason: "",
      comment_length: comment.length,
      selection_reason: ""
    };
  });

  const excluded = analyzed.filter((item) => item.is_excluded);
  const passed = analyzed.filter((item) => !item.is_excluded).sort(compareCandidates);
  const candidateTotal = settings.finalCount + settings.reserveCount;
  const candidates = passed.slice(0, candidateTotal).map((item, index) => ({
    ...item,
    rank: index + 1,
    selection_group: index < settings.finalCount ? "final" : "reserve",
    selection_reason: buildSelectionReason(item)
  }));

  const validDates = analyzed.map((item) => item.survey_date).filter(Boolean).sort();
  const startDate = validDates[0] || "";
  const endDate = validDates[validDates.length - 1] || "";

  return {
    analyzed,
    excluded,
    candidates,
    startDate,
    endDate,
    monthlyLabel: startDate ? startDate.slice(0, 7) : "미확인",
    summary: buildSummaryFromCandidates(candidates)
  };
}

function createBatch(rows, fileName, settings) {
  const analysis = analyzeRows(rows, settings);
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    fileName,
    status: "완료",
    promptVersion: settings.promptVersion,
    finalCount: settings.finalCount,
    reserveCount: settings.reserveCount,
    rowCount: rows.length,
    ...analysis
  };
}

function createBatchFromAnalysis(rows, fileName, settings, analysis, source) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    fileName,
    status: "완료",
    promptVersion: settings.promptVersion,
    finalCount: settings.finalCount,
    reserveCount: settings.reserveCount,
    rowCount: rows.length,
    analysisSource: source,
    ...analysis
  };
}

function createProcessingBatch(fileName, rowCount, settings) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    fileName,
    status: "분석중",
    promptVersion: settings.promptVersion,
    finalCount: settings.finalCount,
    reserveCount: settings.reserveCount,
    rowCount,
    analysisSource: "ai",
    analyzed: [],
    excluded: [],
    candidates: [],
    startDate: "",
    endDate: "",
    monthlyLabel: "분석중",
    summary: {
      frequentIssuesText: "",
      positiveText: "",
      negativeText: ""
    }
  };
}

function replaceBatch(batchId, nextBatch) {
  state.history = state.history.map((batch) => (batch.id === batchId ? nextBatch : batch));
}

async function analyzeRowsWithAI(rows, settings) {
  if (!settings.apiKey) {
    throw new Error("OpenAI API 키를 먼저 입력해 주세요.");
  }

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rows,
      promptVersion: settings.promptVersion,
      apiKey: settings.apiKey
    })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || "AI 분석 요청 중 오류가 발생했습니다.";
    throw new Error(message);
  }

  if (!payload?.results || !Array.isArray(payload.results)) {
    throw new Error("AI 분석 결과 형식이 올바르지 않습니다.");
  }

  const resultMap = new Map(payload.results.map((item) => [String(item.survey_no), item]));

  const analyzed = rows.map((row) => {
    const surveyNo = String(row.survey_no);
    const result = resultMap.get(surveyNo);
    if (!result) {
      throw new Error(`설문번호 ${surveyNo}의 분석 결과가 누락되었습니다.`);
    }

    const comment = String(row.comment_text || "").replace(/\s+/g, " ").trim();
    return {
      ...row,
      survey_date: toISODate(row.survey_date),
      comment_text: comment,
      ai_total_score: Number(result.ai_total_score || 0),
      ai_score_specificity: Number(result.ai_score_specificity || 0),
      ai_score_usability: Number(result.ai_score_usability || 0),
      ai_score_authenticity: Number(result.ai_score_authenticity || 0),
      is_excluded: Boolean(result.is_excluded),
      exclusion_reason: result.exclusion_reason || "",
      comment_length: comment.length,
      selection_reason: ""
    };
  });

  const excluded = analyzed.filter((item) => item.is_excluded);
  const passed = analyzed.filter((item) => !item.is_excluded).sort(compareCandidates);
  const candidateTotal = settings.finalCount + settings.reserveCount;
  const candidates = passed.slice(0, candidateTotal).map((item, index) => ({
    ...item,
    rank: index + 1,
    selection_group: index < settings.finalCount ? "final" : "reserve",
    selection_reason: buildSelectionReason(item)
  }));

  const validDates = analyzed.map((item) => item.survey_date).filter(Boolean).sort();
  const startDate = validDates[0] || "";
  const endDate = validDates[validDates.length - 1] || "";

  return {
    analyzed,
    excluded,
    candidates,
    startDate,
    endDate,
    monthlyLabel: startDate ? startDate.slice(0, 7) : "미확인",
    summary: buildSummaryFromCandidates(candidates)
  };
}

function getActiveBatch() {
  return state.history.find((batch) => batch.id === state.activeBatchId) || null;
}

function setUploadStatus(fileCount, rowCount, status, message) {
  document.getElementById("uploadFileCount").textContent = `${fileCount}건`;
  document.getElementById("uploadRowCount").textContent = `${rowCount}건`;
  document.getElementById("uploadStatus").textContent = status;
  document.getElementById("uploadMessage").textContent = message;
}

function renderHistory() {
  const container = document.getElementById("historyList");
  if (!state.history.length) {
    container.innerHTML = `<div class="empty-state">아직 저장된 처리 이력이 없습니다. CSV를 업로드한 뒤 분석을 시작해 주세요.</div>`;
    return;
  }

  container.innerHTML = state.history
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((batch) => `
      <article class="history-item">
        <div class="history-meta">
          <div class="history-title">${escapeHtml(batch.fileName)}</div>
          <div class="history-sub">${formatDateTime(batch.createdAt)} · ${batch.monthlyLabel} · ${batch.rowCount.toLocaleString("ko-KR")}건</div>
          <div class="history-sub">프롬프트 버전: ${escapeHtml(batch.promptVersion)} · 최종 ${batch.finalCount}명 / 후보 ${batch.reserveCount}명 · ${batch.analysisSource === "ai" ? "OpenAI 분석" : "로컬 규칙 분석"}</div>
          ${batch.errorMessage ? `<div class="history-sub">오류 내용: ${escapeHtml(batch.errorMessage)}</div>` : ""}
        </div>
        <div class="history-actions">
          <span class="badge ${batch.status === "완료" ? "ready" : batch.status === "분석중" ? "waiting" : "danger"}">${batch.status}</span>
          ${batch.status === "완료" ? `<button class="tiny-btn" type="button" data-action="open" data-id="${batch.id}">결과 보기</button>` : ""}
          <button class="tiny-btn danger" type="button" data-action="delete" data-id="${batch.id}">삭제</button>
        </div>
      </article>
    `)
    .join("");
}

function updateStoreFilterOptions(batch) {
  const select = document.getElementById("storeFilterSelect");
  if (!batch) {
    select.innerHTML = `<option value="all">전체 점포</option>`;
    return;
  }
  const stores = [...new Set(batch.analyzed.map((item) => item.store_name).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));
  select.innerHTML = `<option value="all">전체 점포</option>${stores.map((store) => `<option value="${escapeHtml(store)}">${escapeHtml(store)}</option>`).join("")}`;
  select.value = state.storeFilter;
}

function renderSummary(summary) {
  const grid = document.getElementById("summaryGrid");
  const items = [
    {
      title: "자주 등장한 이슈",
      text: summary.frequentIssuesText || "분석할 키워드가 충분하지 않습니다."
    },
    {
      title: "긍정 포인트",
      text: summary.positiveText || "뚜렷한 긍정 포인트가 아직 많지 않습니다."
    },
    {
      title: "부정 포인트",
      text: summary.negativeText || "강한 부정 포인트는 많이 보이지 않았습니다."
    }
  ];
  grid.innerHTML = items.map((item) => `
    <article class="summary-card">
      <strong>${item.title}</strong>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function renderCriteria() {
  const container = document.getElementById("criteriaBox");
  container.innerHTML = `
    <div class="criteria-row">
      <div class="criteria-side">사전 제외 기준</div>
      <div class="criteria-main">전화번호 포함 / 실명 노출 / 욕설·비방·혐오 / 20자 미만 단답형 / 의미 없는 반복 응답은 0점 처리 후 제외합니다.</div>
    </div>
    <div class="criteria-row">
      <div class="criteria-side">구체성 40점</div>
      <div class="criteria-main">어떤 상황과 서비스 경험인지 장면이 떠오를 정도로 구체적인 응답에 높은 점수를 부여합니다.</div>
    </div>
    <div class="criteria-row">
      <div class="criteria-side">활용성 40점</div>
      <div class="criteria-main">운영 개선 힌트나 강점 포인트가 뚜렷해 실제 VOC 활용도가 높은 응답을 우선합니다.</div>
    </div>
    <div class="criteria-row">
      <div class="criteria-side">진정성 20점</div>
      <div class="criteria-main">문장 구조가 자연스럽고 충분한 길이와 성실한 서술이 있는 응답일수록 가산합니다.</div>
    </div>
    <div class="criteria-row">
      <div class="criteria-side">최종 정렬</div>
      <div class="criteria-main">총점 > 구체성 > 활용성 > 진정성 > 참여 일자 빠른순으로 우선순위를 고정합니다.</div>
    </div>
  `;
}

function getFilteredBatchData(batch) {
  const startDate = document.getElementById("startDateInput").value || batch.startDate;
  const endDate = document.getElementById("endDateInput").value || batch.endDate;

  const scoped = batch.analyzed.filter((item) => {
    if (!item.survey_date) return true;
    if (startDate && item.survey_date < startDate) return false;
    if (endDate && item.survey_date > endDate) return false;
    return true;
  });

  const excluded = scoped.filter((item) => item.is_excluded);
  const passed = scoped.filter((item) => !item.is_excluded).sort(compareCandidates);
  const candidates = passed.slice(0, batch.finalCount + batch.reserveCount).map((item, index) => ({
    ...item,
    rank: index + 1,
    selection_group: index < batch.finalCount ? "final" : "reserve",
    selection_reason: buildSelectionReason(item)
  }));

  return {
    scoped,
    excluded,
    candidates,
    startDate,
    endDate,
    summary: buildSummaryFromCandidates(candidates)
  };
}

function renderDistribution(containerId, items, total, pageKey) {
  const pageSize = 10;
  const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
  state.distributionPages[pageKey] = Math.min(state.distributionPages[pageKey], maxPage);
  const page = state.distributionPages[pageKey];
  const visible = items.slice((page - 1) * pageSize, page * pageSize);

  document.getElementById(containerId).innerHTML = `
    <div class="distribution-card">
      <table class="distribution-table">
        <thead>
          <tr>
            <th>순위</th>
            <th>점포명</th>
            <th>인원수</th>
            <th>비중</th>
          </tr>
        </thead>
        <tbody>
          ${visible.map((item) => `
            <tr>
              <td>${item.rank}</td>
              <td>${escapeHtml(item.store)}</td>
              <td>${item.count.toLocaleString("ko-KR")}명</td>
              <td>${total ? ((item.count / total) * 100).toFixed(1) : "0.0"}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="distribution-footer">
        <span>${items.length}개 점포 중 ${visible.length}개 표시</span>
        <div class="distribution-pager">
          <button class="tiny-btn" type="button" data-page-type="${pageKey}" data-page-move="-1">이전</button>
          <span>${page} / ${maxPage}</span>
          <button class="tiny-btn" type="button" data-page-type="${pageKey}" data-page-move="1">다음</button>
        </div>
      </div>
    </div>
  `;
}

function renderCandidateTable(candidates) {
  const tbody = document.getElementById("candidateTableBody");
  const filtered = candidates
    .filter((item) => state.storeFilter === "all" || item.store_name === state.storeFilter)
    .slice()
    .sort((a, b) => {
      if (state.sortFilter === "store") {
        return a.store_name.localeCompare(b.store_name, "ko") || compareCandidates(a, b);
      }
      return compareCandidates(a, b);
    });

  document.getElementById("candidateTableBody").innerHTML = filtered.map((item) => `
    <tr>
      <td class="col-rank">${item.rank}</td>
      <td class="col-group"><span class="group-pill ${item.selection_group}">${item.selection_group === "final" ? "최종" : "후보"}</span></td>
      <td class="col-store">${escapeHtml(item.store_name)}</td>
      <td class="col-id">${escapeHtml(item.customer_id)}</td>
      <td class="col-score">${item.ai_total_score}점</td>
      <td class="col-reason left">${escapeHtml(item.selection_reason)}</td>
      <td class="col-response left"><span class="response-preview">${escapeHtml(item.comment_text)}</span></td>
      <td class="col-action"><button class="tiny-btn" type="button" data-action="detail" data-survey-no="${escapeHtml(item.survey_no)}">상세보기</button></td>
    </tr>
  `).join("");

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8">조건에 맞는 후보가 없습니다.</td></tr>`;
  }
}

function renderDashboard() {
  const batch = getActiveBatch();
  renderCriteria();
  updateStoreFilterOptions(batch);

  if (!batch) {
    document.getElementById("dashboardSubtitle").textContent = "아직 분석된 배치가 없습니다.";
    document.getElementById("metricDateRange").textContent = "-";
    document.getElementById("metricTotal").textContent = "-";
    document.getElementById("metricExcluded").textContent = "-";
    document.getElementById("metricAverageScore").textContent = "-";
    document.getElementById("metricAverageLength").textContent = "-";
    document.getElementById("summaryGrid").innerHTML = `<div class="empty-state">분석 완료된 배치를 선택하면 요약 리포트가 여기에 표시됩니다.</div>`;
    document.getElementById("allStoreDistribution").innerHTML = `<div class="empty-state">아직 점포 분포 데이터가 없습니다.</div>`;
    document.getElementById("selectedStoreDistribution").innerHTML = `<div class="empty-state">아직 우수 응답 점포 분포 데이터가 없습니다.</div>`;
    document.getElementById("candidateTableBody").innerHTML = `<tr><td colspan="8">분석 완료 후 후보 테이블이 표시됩니다.</td></tr>`;
    return;
  }

  document.getElementById("dashboardSubtitle").textContent = `${batch.fileName} · ${batch.monthlyLabel} · ${batch.rowCount.toLocaleString("ko-KR")}건 분석 완료`;
  document.getElementById("startDateInput").value = document.getElementById("startDateInput").value || batch.startDate;
  document.getElementById("endDateInput").value = document.getElementById("endDateInput").value || batch.endDate;

  const view = getFilteredBatchData(batch);
  const averageScore = view.scoped.filter((item) => !item.is_excluded).length
    ? Math.round(view.scoped.filter((item) => !item.is_excluded).reduce((sum, item) => sum + item.ai_total_score, 0) / view.scoped.filter((item) => !item.is_excluded).length)
    : 0;
  const averageLength = view.scoped.length
    ? Math.round(view.scoped.reduce((sum, item) => sum + item.comment_length, 0) / view.scoped.length)
    : 0;
  const exclusionRate = view.scoped.length ? ((view.excluded.length / view.scoped.length) * 100).toFixed(1) : "0.0";

  document.getElementById("metricDateRange").textContent = `${formatDate(view.startDate)} ~ ${formatDate(view.endDate)}`;
  document.getElementById("metricTotal").textContent = `${view.scoped.length.toLocaleString("ko-KR")}건`;
  document.getElementById("metricExcluded").textContent = `${view.excluded.length.toLocaleString("ko-KR")}건 (${exclusionRate}%)`;
  document.getElementById("metricAverageScore").textContent = `${averageScore}점`;
  document.getElementById("metricAverageLength").textContent = `${averageLength}자`;
  document.getElementById("candidateTitle").textContent = `리워드 후보 (${batch.finalCount + batch.reserveCount}명)`;
  document.getElementById("allStoresTitle").textContent = `전체 응답 점포 분포 (${view.scoped.length.toLocaleString("ko-KR")}명)`;
  document.getElementById("selectedStoresTitle").textContent = `우수 응답 점포 분포 (${view.candidates.length.toLocaleString("ko-KR")}명)`;

  renderSummary(view.summary);
  renderDistribution("allStoreDistribution", groupByStore(view.scoped), view.scoped.length, "all");
  renderDistribution("selectedStoreDistribution", groupByStore(view.candidates), view.candidates.length, "selected");
  renderCandidateTable(view.candidates);
}

function openDetailModal(surveyNo) {
  const batch = getActiveBatch();
  if (!batch) return;
  const view = getFilteredBatchData(batch);
  const target = view.scoped.find((item) => String(item.survey_no) === String(surveyNo));
  if (!target) return;

  document.getElementById("detailModalBody").innerHTML = `
    <div class="detail-box">
      <strong>기본 정보</strong>
      <p class="detail-copy">설문번호 ${escapeHtml(target.survey_no)} · 고객 ${escapeHtml(target.customer_id)} · 점포 ${escapeHtml(target.store_name)} · 참여일자 ${formatDate(target.survey_date)}</p>
    </div>
    <div class="detail-score-grid">
      <div class="detail-score">
        <strong>총점</strong>
        <span>${target.ai_total_score}</span>
      </div>
      <div class="detail-score">
        <strong>구체성</strong>
        <span>${target.ai_score_specificity}</span>
      </div>
      <div class="detail-score">
        <strong>활용성</strong>
        <span>${target.ai_score_usability}</span>
      </div>
      <div class="detail-score">
        <strong>진정성</strong>
        <span>${target.ai_score_authenticity}</span>
      </div>
    </div>
    <div class="detail-box">
      <strong>선정/제외 정보</strong>
      <p class="detail-copy">${target.is_excluded ? `제외 사유: ${escapeHtml(target.exclusion_reason)}` : `선정 이유: ${escapeHtml(buildSelectionReason(target))}`}</p>
    </div>
    <div class="detail-box">
      <strong>응답 원문</strong>
      <p>${escapeHtml(target.comment_text || "(응답 없음)")}</p>
    </div>
  `;

  const modal = document.getElementById("detailModal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeDetailModal() {
  const modal = document.getElementById("detailModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function resetPendingUpload() {
  state.pendingUpload = null;
  document.getElementById("fileNameText").textContent = "\uC120\uD0DD\uB41C \uD30C\uC77C \uC5C6\uC74C";
  setUploadStatus(
    0,
    0,
    "\uB300\uAE30",
    "\uC9C0\uC6D0 \uCEEC\uB7FC \uC608\uC2DC: \uC124\uBB38\uBC88\uD638, \uBA64\uBC84\uC2A4\uBC88\uD638, \uCC38\uC5EC\uC9C0\uC810, \uCC38\uC5EC\uC77C\uC790, \uC8FC\uAD00\uC2DD\uC758\uACAC (\uCE74\uD14C\uACE0\uB9AC/\uD0DC\uADF8 \uC5C6\uC74C)"
  );
}

function handleFileSelection(file) {
  if (!file) return;

  const reader = new FileReader();
  setUploadStatus(1, 0, "\uAC80\uC99D\uC911", "\uD30C\uC77C\uC744 \uC77D\uACE0 \uC5C5\uB85C\uB4DC \uC591\uC2DD\uC744 \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.");
  document.getElementById("fileNameText").textContent = file.name;

  const lowerName = file.name.toLowerCase();
  const isExcelFile = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

  reader.onload = () => {
    try {
      const parsedRows = isExcelFile
        ? parseWorkbook(reader.result)
        : parseCsv(String(reader.result || ""));
      const rows = normalizeRows(parsedRows);
      const validation = validateColumns(rows);
      if (!validation.ok) {
        state.pendingUpload = null;
        setUploadStatus(1, rows.length, "\uC624\uB958", validation.message);
        return;
      }

      state.pendingUpload = { rows, fileName: file.name };
      setUploadStatus(1, rows.length, "\uB300\uAE30", validation.message);
    } catch (error) {
      state.pendingUpload = null;
      setUploadStatus(1, 0, "\uC624\uB958", error?.message || "\uD30C\uC77C \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };

  if (isExcelFile) {
    reader.readAsArrayBuffer(file);
    return;
  }

  reader.readAsText(file, "utf-8");
}

async function processCurrentUpload() {
  if (!isAuthenticated()) {
    setUploadStatus(0, 0, "대기", "먼저 공용 인증코드로 로그인해 주세요.");
    updateAuthUI();
    return;
  }

  if (!state.pendingUpload) {
    setUploadStatus(0, 0, "대기", "먼저 CSV 파일을 업로드해 주세요.");
    return;
  }

  const finalCount = Number(document.getElementById("finalCountInput").value || 30);
  const reserveCount = Number(document.getElementById("reserveCountInput").value || 30);
  const promptVersion = document.getElementById("promptVersionInput").value.trim() || "review-score-v1";
  const apiKey = (document.getElementById("apiKeyInput")?.value || "").trim();

  if (!apiKey) {
    setUploadStatus(1, state.pendingUpload.rows.length, "대기", "OpenAI API 키를 입력한 뒤 분석을 시작해 주세요.");
    return;
  }

  state.apiKey = apiKey;
  saveStoredApiKey(apiKey);

  setUploadStatus(1, state.pendingUpload.rows.length, "분석중", "OpenAI로 점수화와 후보 추출을 진행하고 있습니다.");
  const processingBatch = createProcessingBatch(
    state.pendingUpload.fileName,
    state.pendingUpload.rows.length,
    { finalCount, reserveCount, promptVersion }
  );
  state.history.unshift(processingBatch);
  saveHistory();
  renderHistory();

  try {
    const analysis = await analyzeRowsWithAI(state.pendingUpload.rows, {
      finalCount,
      reserveCount,
      promptVersion,
      apiKey
    });

    const batch = createBatchFromAnalysis(
      state.pendingUpload.rows,
      state.pendingUpload.fileName,
      { finalCount, reserveCount, promptVersion },
      analysis,
      "ai"
    );
    batch.id = processingBatch.id;

    replaceBatch(processingBatch.id, batch);
    state.activeBatchId = batch.id;
    state.distributionPages.all = 1;
    state.distributionPages.selected = 1;
    saveHistory();
    renderHistory();
    renderDashboard();
    setUploadStatus(1, batch.rowCount, "완료", `${batch.fileName} AI 분석이 완료되었습니다. 처리 이력에서 결과 보기 버튼을 눌러 확인하세요.`);
  } catch (error) {
    replaceBatch(processingBatch.id, {
      ...processingBatch,
      status: "오류",
      monthlyLabel: "오류",
      errorMessage: error.message || "AI 분석 중 오류가 발생했습니다."
    });
    saveHistory();
    renderHistory();
    setUploadStatus(1, state.pendingUpload.rows.length, "오류", error.message || "AI 분석 중 오류가 발생했습니다.");
  }
}

function downloadSampleCsv() {
  const link = document.createElement("a");
  link.href = "./sample-survey.csv";
  link.download = "sample-survey.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadCandidates() {
  const batch = getActiveBatch();
  if (!batch) return;
  const view = getFilteredBatchData(batch);
  const rows = [
    ["rank", "selection_group", "store_name", "customer_id", "ai_total_score", "selection_reason", "comment_text"],
    ...view.candidates.map((item) => [
      item.rank,
      item.selection_group,
      item.store_name,
      item.customer_id,
      item.ai_total_score,
      item.selection_reason,
      item.comment_text
    ])
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${batch.monthlyLabel}-reward-candidates.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.getElementById("loginSubmitBtn").addEventListener("click", attemptLogin);
  document.getElementById("refreshCaptchaBtn").addEventListener("click", generateCaptchaValue);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("captchaInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      attemptLogin();
    }
  });
  document.getElementById("accessCodeInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      attemptLogin();
    }
  });

  document.getElementById("fileSelectBtn").addEventListener("click", () => {
    document.getElementById("fileInput").click();
  });

  document.getElementById("fileInput").addEventListener("change", (event) => {
    handleFileSelection(event.target.files?.[0]);
  });

  document.getElementById("dropzone").addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  document.getElementById("dropzone").addEventListener("drop", (event) => {
    event.preventDefault();
    handleFileSelection(event.dataTransfer?.files?.[0]);
  });

  document.getElementById("sampleDownloadBtn").addEventListener("click", downloadSampleCsv);
  document.getElementById("processBtn").addEventListener("click", processCurrentUpload);
  document.getElementById("resetCurrentBtn").addEventListener("click", resetPendingUpload);
  document.getElementById("apiKeyInput").addEventListener("input", (event) => {
    state.apiKey = event.target.value.trim();
    saveStoredApiKey(state.apiKey);
  });
  document.getElementById("clearApiKeyBtn").addEventListener("click", () => {
    state.apiKey = "";
    saveStoredApiKey("");
    syncApiKeyInput();
  });
  document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    state.history = [];
    state.activeBatchId = null;
    saveHistory();
    renderHistory();
    renderDashboard();
  });

  document.getElementById("historyList").addEventListener("click", (event) => {
    const target = event.target.closest("button[data-action]");
    if (!target) return;
    const id = target.dataset.id;
    if (target.dataset.action === "open") {
      state.activeBatchId = id;
      state.distributionPages.all = 1;
      state.distributionPages.selected = 1;
      document.getElementById("startDateInput").value = "";
      document.getElementById("endDateInput").value = "";
      renderDashboard();
      document.getElementById("dashboardSection").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (target.dataset.action === "delete") {
      state.history = state.history.filter((batch) => batch.id !== id);
      if (state.activeBatchId === id) {
        state.activeBatchId = state.history[0]?.id || null;
      }
      saveHistory();
      renderHistory();
      renderDashboard();
    }
  });

  document.getElementById("applyDateFilterBtn").addEventListener("click", () => {
    renderDashboard();
  });

  document.getElementById("storeFilterSelect").addEventListener("change", (event) => {
    state.storeFilter = event.target.value;
    renderDashboard();
  });

  document.getElementById("sortFilterSelect").addEventListener("change", (event) => {
    state.sortFilter = event.target.value;
    renderDashboard();
  });

  document.getElementById("downloadCandidatesBtn").addEventListener("click", downloadCandidates);

  document.getElementById("candidateTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='detail']");
    if (!button) return;
    openDetailModal(button.dataset.surveyNo);
  });

  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page-type]");
    if (!button) return;
    const pageType = button.dataset.pageType;
    const move = Number(button.dataset.pageMove);
    const batch = getActiveBatch();
    if (!batch) return;
    const view = getFilteredBatchData(batch);
    const source = pageType === "all" ? groupByStore(view.scoped) : groupByStore(view.candidates);
    const maxPage = Math.max(1, Math.ceil(source.length / 10));
    state.distributionPages[pageType] = clamp(state.distributionPages[pageType] + move, 1, maxPage);
    renderDashboard();
  });

  document.getElementById("closeDetailModalBtn").addEventListener("click", closeDetailModal);
  document.getElementById("detailModal").addEventListener("click", (event) => {
    if (event.target.id === "detailModal") {
      closeDetailModal();
    }
  });
}

function init() {
  state.apiKey = loadStoredApiKey();
  bindEvents();
  syncApiKeyInput();
  generateCaptchaValue();
  updateAuthUI();
  renderHistory();
  renderCriteria();
  if (state.history.length) {
    state.activeBatchId = state.history[0].id;
  }
  renderDashboard();
  resetPendingUpload();
}

init();
