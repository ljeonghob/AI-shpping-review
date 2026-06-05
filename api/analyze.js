const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-4o-mini";
const CHUNK_SIZE = 20;
const MAX_CHUNK_RETRIES = 2;

const EXCLUSION_REASONS = [
  "",
  "전화번호 포함",
  "이메일/계정 식별자 포함",
  "실명 노출",
  "개인 식별 가능 정보 포함",
  "욕설/비방/혐오 표현",
  "20자 미만 단답형",
  "의미 없는 반복 응답"
];

const SYSTEM_PROMPT = `
당신은 백화점 고객 설문 리뷰를 평가하는 우수리뷰 심사자입니다.
목표는 긍정적인 표현 자체가 아니라, 운영 개선과 우수사례 발굴에 실제로 활용할 수 있는 구체적인 응답을 선별하는 것입니다.

[중요 원칙]
- 반드시 comment_text만 기반으로 판단합니다.
- row_id는 원본 행 매칭용 식별자이며, 입력값 그대로 출력해야 합니다.
- customer_id, store_name, survey_date, survey_no, row_id는 점수 판단에 사용하지 않습니다.
- survey_no는 중복될 수 있으므로 절대 행 식별자로 사용하지 않습니다.
- 임의 해석, 창작, 보정 금지
- 입력에 없는 정보 사용 금지
- ai_selected_yn 값은 판단하지 않습니다. 이는 서버에서 정렬 기준으로 결정됩니다.
- 개인정보 또는 개인 식별 가능 정보는 보수적으로 판단하여 제외합니다.
- 여러 행이 입력되더라도 모든 입력 행을 반드시 결과에 포함해야 합니다.
- 제외 대상도 반드시 결과에 포함합니다.
- 결과는 반드시 JSON 형식으로만 반환합니다.
- "좋다", "친절하다", "깨끗하다", "만족한다" 같은 일반 칭찬만으로는 고득점을 줄 수 없습니다.

[입력 데이터]
- row_id
- survey_no
- customer_id
- store_name
- survey_date
- comment_text

[사전 제외 기준]
아래 조건 중 하나라도 만족하면 제외 처리합니다.

1) 전화번호 포함
- 전화번호 제거 전 원문 기준으로 연락처로 해석 가능한 숫자 패턴이 포함된 경우 제외합니다.
- 예: 010-1234-5678, 01012345678, 02-123-4567, 1588-0000
- 숫자 7자리 이상 연속되는 경우도 전화번호로 간주하여 제외합니다.

2) 이메일 / 계정 식별자 포함
- 이메일 주소
- SNS/메신저 계정
- 개인 연락 또는 식별 가능한 ID 형태

3) 실명 노출
- 특정 개인의 이름이 식별 가능한 경우 제외합니다.
- 특히 직원, 매니저, 고객 등의 실명이 함께 언급된 경우 보수적으로 제외합니다.
- 점포명, 브랜드명, 일반 직책명은 제외 대상이 아닙니다.

4) 개인 식별 가능 정보 포함
- 주소 (동/호수 포함)
- 차량번호
- 주민등록번호, 생년월일 전체
- 카드번호, 계좌번호
- 주문번호 등 개인 식별이 가능한 정보

5) 욕설 / 비방 / 혐오 표현

6) 20자 미만 단답형
- 20자 미만이면서 의미가 빈약한 단답형인 경우 제외합니다.

7) 무의미 응답
- 반복 문자
- 의미 없는 문자열
- 단어 반복
- 단, 의미가 읽히는 불만이나 칭찬은 유사 표현이 반복되어도 제외하지 않습니다.
- 오타, 띄어쓰기 오류, 구어체 표현은 제외 사유가 아닙니다.
- 불친절, 설명 부족, 가격 대비 품질 불만처럼 대상과 의미가 있는 응답은 제외하지 않습니다.

[개인정보 판단 원칙]
- 개인을 특정할 수 있는 정보가 포함되면 제외합니다.
- 애매한 경우에도 개인정보 가능성이 있으면 보수적으로 제외합니다.

[제외 처리 규칙]
- 제외 대상이면 모든 점수는 0점 처리합니다.
- is_excluded = true
- exclusion_reason은 아래 중 하나만 사용합니다.
  "전화번호 포함"
  "이메일/계정 식별자 포함"
  "실명 노출"
  "개인 식별 가능 정보 포함"
  "욕설/비방/혐오 표현"
  "20자 미만 단답형"
  "의미 없는 반복 응답"
- 의미가 읽히는 불만/칭찬 응답은 제외하지 말고 점수화합니다.
- 불만 응답은 욕설, 비방, 혐오 또는 개인정보 노출이 아닌 한 제외하지 않습니다.
- 오타가 있어도 의미가 읽히면 우선 제외하지 않고 점수화합니다.
- 단, 의미 해석이 어려울 정도로 오타/비문이 심하면 "의미 없는 반복 응답"으로 제외할 수 있습니다.

[점수화 기준]
1) 구체성 (0~40점)
- 35~40점: 장소, 상황, 직원/매장 행동, 고객이 느낀 결과가 모두 뚜렷함
- 25~34점: 구체적인 장면 또는 사건이 1개 이상 있고, 대상과 맥락이 비교적 명확함
- 15~24점: 응대/매장/상품 등 대상은 있으나 설명이 일반적임
- 0~14점: 단순 감상, 짧은 칭찬/불만, 근거 부족

2) 활용성 (0~40점)
- 35~40점: 개선 과제나 우수사례로 바로 활용할 수 있는 행동, 원인, 효과가 명확함
- 25~34점: 강점 또는 불편 포인트가 비교적 명확해 참고 자료로 활용 가능함
- 15~24점: 긍정/부정 의견은 있으나 원인, 상황, 운영 시사점이 약함
- 0~14점: 활용 가능한 정보가 거의 없고 감정 표현 위주임

3) 진정성 (0~20점)
- 16~20점: 자연스럽고 실제 경험 맥락이 느껴지는 완성도 높은 문장
- 11~15점: 문장은 자연스럽지만 평이하거나 구체성이 약함
- 6~10점: 짧고 상투적인 표현 중심
- 0~5점: 단어 나열, 기계적 표현, 무성의한 응답
- 오타/띄어쓰기 오류/비문이 많을수록 진정성 점수를 낮춥니다.

[점수 상한 규칙]
- 일반 칭찬만 나열한 응답은 최대 55점입니다.
- 구체적 장면, 이유, 행동, 결과가 없으면 최대 65점입니다.
- 운영 개선 또는 우수사례로 활용할 시사점이 없으면 최대 75점입니다.
- 오타가 3개 이상이면 진정성은 최대 12점, 총점은 최대 70점입니다.
- 오타가 6개 이상이거나 핵심 단어 오타로 일부 의미 해석이 어렵다면 진정성은 최대 8점, 총점은 최대 55점입니다.
- "직원 응대가 좋았다", "직원이 세심했다", "안내를 잘했다" 정도의 표현만 있고 구체적인 직원 행동이나 상황 설명이 없으면 최대 65점입니다.
- "만족스러운 쇼핑이었다", "좋은 쇼핑이었다"처럼 결과 감상만 있으면 최대 60점입니다.
- 상품, 행사, 응대가 언급되어도 어떤 상품/행사인지, 어떤 응대 행동인지 설명이 없으면 최대 65점입니다.
- 80점 이상은 구체적 장면과 직원/매장 행동이 반드시 있어야 합니다.
- 90점 이상은 구체적 상황, 직원/매장 행동 또는 문제, 고객이 느낀 결과, 운영 활용성이 모두 있어야 합니다.
- 예: "응대가 친절합니다. 매장도 깨끗하고요. 상품 구성도 좋습니다."는 일반 칭찬 나열이므로 55점 초과 금지입니다.
- 예: "식품관 계산대 대기줄이 길었는데 직원이 추가 계산대로 바로 안내해줘서 대기 시간이 줄었습니다."는 장소, 문제, 행동, 결과가 있어 고득점 가능입니다.
- 예: "주차장도 여유가 맀었고, 매장 동선도 딸잘 안내되어 찾아가기 쉬웠고, 작원들도 친절하게 응개해둬서 모든면에서 만족했습니다."는 의미는 읽히지만 오타가 많으므로 진정성과 총점 상한을 낮게 적용합니다.

[불만 응답 평가 원칙]
- 불만이라는 이유만으로 낮은 점수를 주지 않습니다.
- 구체적인 불편 대상, 원인, 상황, 개선 힌트가 있으면 활용성 점수를 줄 수 있습니다.
- 욕설, 비방, 혐오 표현이 아니라면 불만 응답은 제외하지 않습니다.
- 예: "식당가 푸드코트 직원의 응대가 불친절했고 설명이 부족했으며 가격 대비 음식 품질도 아쉬웠습니다."는 의미 있는 불만 응답이므로 제외하지 않습니다.
- 단, 불만 대상이 있어도 구체적 장면이나 원인 설명이 약하면 고득점은 제한합니다.

[총점 계산]
- ai_total_score = ai_score_specificity + ai_score_usability + ai_score_authenticity

[출력 규칙]
- ai_total_score: 정수
- ai_score_specificity: 0~40 정수
- ai_score_usability: 0~40 정수
- ai_score_authenticity: 0~20 정수
- is_excluded: true 또는 false
- 제외가 아니면 exclusion_reason은 "" 입니다.
- comment_text는 원문 그대로 유지합니다.
- 입력 행 수와 출력 행 수는 반드시 동일해야 합니다.
- 어떤 경우에도 행을 삭제하거나 누락하면 안 됩니다.
- 출력 배열은 입력 배열의 row_id를 모두 포함해야 하며, 가능하면 입력 순서를 유지합니다.
- 같은 survey_no가 반복되어도 행을 병합하거나 생략하면 안 됩니다.

[출력 형식]
반드시 아래 구조의 JSON만 반환합니다.
{
  "results": [
    {
      "row_id": "...",
      "survey_no": "...",
      "customer_id": "...",
      "store_name": "...",
      "survey_date": "...",
      "comment_text": "...",
      "ai_total_score": 0,
      "ai_score_specificity": 0,
      "ai_score_usability": 0,
      "ai_score_authenticity": 0,
      "is_excluded": false,
      "exclusion_reason": ""
    }
  ]
}
`.trim();

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload?.output)) {
    const texts = [];
    payload.output.forEach((item) => {
      if (Array.isArray(item?.content)) {
        item.content.forEach((content) => {
          if (typeof content?.text === "string" && content.text.trim()) {
            texts.push(content.text.trim());
          }
        });
      }
    });
    if (texts.length) return texts.join("\n").trim();
  }

  return "";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeResult(result) {
  const excluded = Boolean(result.is_excluded);
  const specificity = clamp(Number(result.ai_score_specificity || 0), 0, 40);
  const usability = clamp(Number(result.ai_score_usability || 0), 0, 40);
  const authenticity = clamp(Number(result.ai_score_authenticity || 0), 0, 20);
  const exclusionReason = EXCLUSION_REASONS.includes(result.exclusion_reason)
    ? result.exclusion_reason
    : "";

  return {
    row_id: String(result.row_id || ""),
    survey_no: String(result.survey_no || ""),
    customer_id: String(result.customer_id || ""),
    store_name: String(result.store_name || ""),
    survey_date: String(result.survey_date || ""),
    comment_text: String(result.comment_text || ""),
    ai_total_score: excluded ? 0 : specificity + usability + authenticity,
    ai_score_specificity: excluded ? 0 : specificity,
    ai_score_usability: excluded ? 0 : usability,
    ai_score_authenticity: excluded ? 0 : authenticity,
    is_excluded: excluded,
    exclusion_reason: excluded ? exclusionReason : ""
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatErrorMessage(errorLike) {
  if (!errorLike) return "";
  if (typeof errorLike === "string") return errorLike;
  if (typeof errorLike.message === "string") return errorLike.message;
  if (typeof errorLike.error === "string") return errorLike.error;
  if (typeof errorLike.error?.message === "string") return errorLike.error.message;
  try {
    return JSON.stringify(errorLike);
  } catch (error) {
    return String(errorLike);
  }
}

async function analyzeChunk(chunk, apiKey) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            row_id: { type: "string" },
            survey_no: { type: "string" },
            customer_id: { type: "string" },
            store_name: { type: "string" },
            survey_date: { type: "string" },
            comment_text: { type: "string" },
            ai_total_score: { type: "integer" },
            ai_score_specificity: { type: "integer" },
            ai_score_usability: { type: "integer" },
            ai_score_authenticity: { type: "integer" },
            is_excluded: { type: "boolean" },
            exclusion_reason: {
              type: "string",
              enum: EXCLUSION_REASONS
            }
          },
          required: [
            "row_id",
            "survey_no",
            "customer_id",
            "store_name",
            "survey_date",
            "comment_text",
            "ai_total_score",
            "ai_score_specificity",
            "ai_score_usability",
            "ai_score_authenticity",
            "is_excluded",
            "exclusion_reason"
          ]
        }
      }
    },
    required: ["results"]
  };

  const userPrompt = `
아래 설문 응답 ${chunk.length}건을 각각 평가해 주세요.
모든 입력 행을 빠짐없이 포함하고, comment_text는 원문 그대로 유지하세요.
출력은 JSON만 반환하세요.

입력:
${JSON.stringify(chunk)}
`.trim();

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_PROMPT }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "survey_review_scores",
          strict: true,
          schema
        }
      }
    })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(formatErrorMessage(payload?.error || payload) || "OpenAI API 호출에 실패했습니다.");
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI 응답에 output_text가 없습니다.");
  }

  const parsed = JSON.parse(outputText);
  if (!parsed?.results || !Array.isArray(parsed.results)) {
    throw new Error("OpenAI 구조화 응답 형식이 올바르지 않습니다.");
  }

  const normalized = parsed.results.map(normalizeResult);
  const expectedIds = new Set(chunk.map((item) => String(item.row_id)));
  const returnedIds = new Set(normalized.map((item) => String(item.row_id)));

  if (normalized.length !== chunk.length || returnedIds.size !== expectedIds.size) {
    throw new Error("OpenAI 응답 행 수가 입력 행 수와 일치하지 않습니다.");
  }

  const missingIds = [...expectedIds].filter((id) => !returnedIds.has(id));
  if (missingIds.length) {
    throw new Error(`OpenAI 응답에서 행 ID ${missingIds.join(", ")} 결과가 누락되었습니다.`);
  }

  return normalized;
}

async function analyzeChunkWithRetry(chunk, apiKey) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_CHUNK_RETRIES; attempt += 1) {
    try {
      return await analyzeChunk(chunk, apiKey);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_CHUNK_RETRIES) {
        await wait(700 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function analyzeChunkReliably(chunk, apiKey) {
  try {
    return await analyzeChunkWithRetry(chunk, apiKey);
  } catch (error) {
    if (chunk.length <= 1) {
      throw error;
    }

    const midpoint = Math.ceil(chunk.length / 2);
    const first = await analyzeChunkReliably(chunk.slice(0, midpoint), apiKey);
    const second = await analyzeChunkReliably(chunk.slice(midpoint), apiKey);
    return [...first, ...second];
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용합니다." });
  }

  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const apiKey = typeof process.env.OPENAI_API_KEY === "string" ? process.env.OPENAI_API_KEY.trim() : "";

    if (!rows.length) {
      return res.status(400).json({ error: "분석할 rows 데이터가 없습니다." });
    }

    if (!apiKey) {
      return res.status(400).json({ error: "OpenAI API 키를 입력해 주세요." });
    }

    const chunks = chunkArray(rows, CHUNK_SIZE);
    const results = [];

    for (const chunk of chunks) {
      const analyzed = await analyzeChunkReliably(chunk, apiKey);
      results.push(...analyzed);
    }

    return res.status(200).json({
      results,
      model: MODEL,
      count: results.length
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "AI 분석 중 서버 오류가 발생했습니다."
    });
  }
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const apiKey = typeof process.env.OPENAI_API_KEY === "string" ? process.env.OPENAI_API_KEY.trim() : "";

    if (!rows.length) {
      return res.status(400).json({ error: "분석할 rows 데이터가 없습니다." });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "Vercel 환경변수 OPENAI_API_KEY가 설정되지 않았습니다." });
    }

    const chunks = chunkArray(rows, CHUNK_SIZE);
    const results = [];

    for (const chunk of chunks) {
      const analyzed = await analyzeChunkReliably(chunk, apiKey);
      results.push(...analyzed);
    }

    return res.status(200).json({
      results,
      model: MODEL,
      count: results.length
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "AI 분석 중 서버 오류가 발생했습니다."
    });
  }
};
