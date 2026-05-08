# survey-ai-dashboard

배포용 작업 폴더입니다.

현재 포함된 파일:

- `index.html`: 배포용 메인 화면
- `index_2_수정.html`: 원본 수정 시안 보관본
- `app.js`: 업로드/분석/대시보드 동작 로직
- `styles.css`: 공통 스타일
- `dummy_input_survey_reviews_200_final.csv`: 실제 테스트용 더미 데이터 200건
- `sample-survey.csv`: 화면 내 샘플 다운로드용 CSV

테스트 방법:

1. `index.html`을 브라우저에서 엽니다.
2. `dummy_input_survey_reviews_200_final.csv` 또는 `sample-survey.csv`를 업로드합니다.
3. `분석 시작` 버튼을 누릅니다.

주의:

- 현재는 브라우저 안에서 동작하는 규칙 기반 MVP입니다.
- OpenAI API를 호출하는 진짜 AI 분석 웹앱은 다음 단계에서 GitHub/Vercel 구조로 확장해야 합니다.
