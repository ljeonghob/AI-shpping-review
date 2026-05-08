const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-4o-mini";
const CHUNK_SIZE = 20;

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
당신은 백화점 고객 설문 리뷰를 평가하는 관리자용 점수화 엔진입니다.
목표는 각 응답을 동일한 고정 기준으로 평가하여, 항상 동일한 입력에 동일한 결과를 반환하는 것입니다.

[중요 원칙]
- 반드시 comment_text만 기반으로 판단합니다.
- customer_id, store_name, survey_date, survey_no는 점수 판단에 사용하지 않습니다.
- 임의 해석, 창작, 보정 금지
- 입력에 없는 정보 사용 금지
- ai_selected_yn 값은 판단하지 않습니다. 이는 서버에서 정렬 기준으로 결정됩니다.
- 개인정보 또는 개인 식별 가능 정보는 보수적으로 판단하여 제외합니다.
- 여러 행이 입력되더라도 모든 입력 행을 반드시 결과에 포함해야 합니다.
- 제외 대상도 반드시 결과에 포함합니다.
- 결과는 반드시 JSON 형식으로만 반환합니다.

[입력 데이터]
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

[점수화 기준]
1) 구체성 (0~40점)
- 30~40점: 언제/어디서/무엇을/어떻게 중 2개 이상 명확히 드러남
- 15~29점: 일부만 드러남
- 0~14점: 단순 감상 수준 / 상황 정보 없음

2) 활용성 (0~40점)
- 30~40점: 개선 또는 강점이 명확
- 15~29점: 일반 경험 공유 수준
- 0~14점: 감정 표현 위주

3) 진정성 (0~20점)
- 15~20점: 자연스럽고 완성도 높은 문장
- 8~14점: 짧지만 의미 전달 가능
- 0~7점: 단어 나열 수준 또는 매우 미흡

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
- 여러 응답 결과를 함께 반환할 경우 반드시 아래 우선순위로 내림차순 정렬합니다.
  1. ai_total_score
  2. ai_score_specificity
  3. ai_score_usability
  4. ai_score_authenticity

[출력 형식]
반드시 아래 구조의 JSON만 반환합니다.
{
  "results": [
    {
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

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI API 호출에 실패했습니다.");
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI 응답에 output_text가 없습니다.");
  }

  const parsed = JSON.parse(outputText);
  if (!parsed?.results || !Array.isArray(parsed.results)) {
    throw new Error("OpenAI 구조화 응답 형식이 올바르지 않습니다.");
  }

  if (parsed.results.length !== chunk.length) {
    throw new Error("OpenAI 응답 행 수가 입력 행 수와 일치하지 않습니다.");
  }

  return parsed.results.map(normalizeResult);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용합니다." });
  }

  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";

    if (!rows.length) {
      return res.status(400).json({ error: "분석할 rows 데이터가 없습니다." });
    }

    if (!apiKey) {
      return res.status(400).json({ error: "OpenAI API 키를 입력해 주세요." });
    }

    const chunks = chunkArray(rows, CHUNK_SIZE);
    const results = [];

    for (const chunk of chunks) {
      const analyzed = await analyzeChunk(chunk, apiKey);
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
