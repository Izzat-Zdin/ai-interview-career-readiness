import { chatCompletion, getAIConfig } from '../../../config/ai.js';

const RUBRIC = [
  { key: 'relevance', label: 'Relevance to the question', weight: 0.25 },
  { key: 'clarity', label: 'Clarity and structure', weight: 0.25 },
  { key: 'specificity', label: 'Specificity and supporting examples', weight: 0.25 },
  { key: 'technicalAccuracy', label: 'Technical accuracy (when applicable)', weight: 0.25 },
];

const PERSONA_NOTES = {
  neutral: '',
  friendly: 'Give feedback in a warm, encouraging tone while staying honest.',
  strict: 'Give feedback in a direct, demanding tone like a strict technical lead — do not sugarcoat weaknesses.',
};

export async function evaluateAnswer({ question, answer, type, role, speechMetrics = null, facialMetrics = null, language = 'en', persona = 'neutral' }) {
  if (!answer?.trim()) {
    return buildEmptyEvaluation();
  }

  if (getAIConfig().enabled) {
    try {
      let deliveryContext = '';
      if (speechMetrics) {
        deliveryContext += `\nSpeech delivery: ${speechMetrics.wordCount} words in ${speechMetrics.durationSeconds}s (${speechMetrics.speakingRateWordsPerMinute ?? 'unknown'} wpm), filler words: ${speechMetrics.fillerAnalysis?.total ?? 0} (${speechMetrics.fillerAnalysis?.ratePer100Words ?? 0} per 100 words).`;
      }
      if (facialMetrics) {
        deliveryContext += `\nFacial composure (camera): nervousness ${facialMetrics.nervousPercent}%, dominant expression: ${facialMetrics.dominantExpression}.`;
      }
      const content = await chatCompletion(
        [
          {
            role: 'system',
            content: `You are an expert interview coach. Evaluate the candidate's answer using this rubric: ${RUBRIC.map(
              (r) => `${r.label} (0-10, weight ${Math.round(r.weight * 100)}%)`
            ).join(
              '; '
            )}. Also consider the delivery data if provided (speaking pace, filler words, facial composure). Ideal speaking rate is 120-160 wpm; filler rate above 5 per 100 words is high.

Return valid JSON with EXACTLY these fields:
- scores (object with keys: relevance, clarity, specificity, technicalAccuracy)
- overallScore (0-100)
- strengths (array of 2-3 strings: what the candidate did WELL — be specific, quote parts of their answer)
- weaknesses (array of 2-3 strings: what was SLIGHTLY OFF or missing — honest but constructive; mention delivery issues if the data shows them)
- improvements (array of 2-3 strings: CONCRETE actionable steps to fix each weakness, e.g. "Restructure using STAR: describe the Situation first..." or "Reduce 'um' fillers by pausing silently for 1 second instead")
- exampleAnswer (string: a short 3-4 sentence model answer showing how a strong candidate would answer this question)
- summary (string: 1-2 sentence overall verdict)
Be fair, specific, and constructive. Never invent facts about the candidate.${language === 'ms' ? ' IMPORTANT: Write ALL textual feedback (strengths, weaknesses, improvements, exampleAnswer, summary) entirely in Bahasa Melayu (Malay).' : ''}${PERSONA_NOTES[persona] ? ` ${PERSONA_NOTES[persona]}` : ''}`,
          },
          {
            role: 'user',
            content: `Job role: ${role}\nInterview type: ${type}\nQuestion: ${question}\nAnswer: ${answer}${deliveryContext}`,
          },
        ],
        { temperature: 0.4, response_format: { type: 'json_object' }, max_tokens: 1200 }
      );
      const jsonText = stripJsonCodeBlock(content);
      const parsed = JSON.parse(jsonText);
      return normalizeEvaluation(parsed);
    } catch (err) {
      console.warn('AI evaluation failed, falling back to local evaluation:', err.message);
    }
  }

  return localEvaluateAnswer(question, answer);
}

function stripJsonCodeBlock(raw) {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const withoutFence = trimmed.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    return withoutFence.trim();
  }
  return trimmed;
}

function buildEmptyEvaluation() {
  return {
    scores: { relevance: 0, clarity: 0, specificity: 0, technicalAccuracy: 0 },
    overallScore: 0,
    strengths: [],
    weaknesses: ['No answer was provided.'],
    suggestions: ['Provide an answer so we can give you feedback.'],
    summary: 'No answer provided.',
  };
}

function normalizeEvaluation(parsed) {
  const scores = parsed.scores || {};
  const values = RUBRIC.map((r) => Number(scores[r.key]) || 0);
  const overall = Number.isFinite(parsed.overallScore) ? parsed.overallScore : Math.round(
    RUBRIC.reduce((sum, r, i) => sum + values[i] * r.weight, 0) * 10
  );
  return {
    scores: Object.fromEntries(RUBRIC.map((r, i) => [r.key, values[i]])),
    overallScore: Math.min(100, Math.max(0, overall)),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 3) : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.slice(0, 3)
      : Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3)
        : [],
    exampleAnswer: typeof parsed.exampleAnswer === 'string' ? parsed.exampleAnswer : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}

function localEvaluateAnswer(question, answer, speechMetrics = null) {
  const normalizedAnswer = answer.toLowerCase().trim();
  const normalizedQuestion = question.toLowerCase();
  const words = normalizedAnswer.split(/\s+/).filter(Boolean);
  const sentences = normalizedAnswer.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const questionWords = new Set(normalizedQuestion.split(/\W+/).filter((w) => w.length > 3));
  const answerWords = new Set(words.filter((w) => w.length > 3));
  const overlap = [...questionWords].filter((w) => answerWords.has(w)).length;
  const relevance = Math.min(10, Math.max(1, Math.round((overlap / Math.max(1, questionWords.size)) * 10)));

  const avgSentenceLength = words.length / Math.max(1, sentences.length);
  let clarity = 5;
  if (avgSentenceLength >= 5 && avgSentenceLength <= 25) clarity += 3;
  if (sentences.length >= 2) clarity += 1;
  clarity = Math.min(10, clarity);

  const hasExample = /\b(for example|such as|like when|instance|e\.g\.|project|team|company|client)\b/i.test(answer);
  const hasNumber = /\d/.test(answer);
  const hasSTAR = /\b(situation|task|action|result|challenge|goal|outcome|achieved|improved)\b/i.test(answer);
  let specificity = 4;
  if (hasExample) specificity += 3;
  if (hasNumber) specificity += 2;
  if (words.length > 40) specificity += 1;
  specificity = Math.min(10, specificity);

  const technicalTerms = /\b(api|database|framework|algorithm|component|architecture|deploy|test|function|class|module|schema|query|server|client|json|rest|git|ci\/cd|docker|cloud)\b/i;
  let technicalAccuracy = 5;
  if (technicalTerms.test(answer)) technicalAccuracy += 2;
  if (words.length > 50) technicalAccuracy += 1;
  if (hasExample) technicalAccuracy += 1;
  technicalAccuracy = Math.min(10, technicalAccuracy);

  const scores = { relevance, clarity, specificity, technicalAccuracy };
  const overallScore = Math.round(
    (relevance * 0.25 + clarity * 0.25 + specificity * 0.25 + technicalAccuracy * 0.25) * 10
  );

  const strengths = [];
  if (relevance >= 7) strengths.push('Your answer stays focused on the question asked.');
  if (clarity >= 7) strengths.push('Your answer is well structured and easy to follow.');
  if (specificity >= 7) strengths.push('You provided concrete examples and details that make your answer credible.');
  if (technicalAccuracy >= 7) strengths.push('You demonstrated relevant technical understanding.');
  if (hasSTAR) strengths.push('You used result-oriented language (STAR-style), which interviewers look for.');
  if (strengths.length === 0) strengths.push('You attempted the question — now let’s sharpen the content.');

  const weaknesses = [];
  if (relevance < 6) weaknesses.push('The answer could connect more directly to the specific question asked.');
  if (clarity < 6) weaknesses.push('Some sentences are too long or unstructured, making the answer harder to follow.');
  if (specificity < 6) weaknesses.push('The answer lacks concrete examples, numbers, or real situations.');
  if (technicalAccuracy < 6) weaknesses.push('Few relevant technical terms or concepts were mentioned.');
  if (words.length < 30) weaknesses.push('The answer is quite short — interviewers expect more depth.');
  if (speechMetrics?.fillerAnalysis?.ratePer100Words > 5) {
    weaknesses.push(`High filler word usage (${speechMetrics.fillerAnalysis.total} fillers — ${speechMetrics.fillerAnalysis.ratePer100Words} per 100 words) makes you sound less confident.`);
  }
  if (speechMetrics?.speakingRateWordsPerMinute && speechMetrics.speakingRateWordsPerMinute > 170) {
    weaknesses.push(`Speaking pace was fast (${speechMetrics.speakingRateWordsPerMinute} wpm) — this can signal nervousness.`);
  } else if (speechMetrics?.speakingRateWordsPerMinute && speechMetrics.speakingRateWordsPerMinute < 100) {
    weaknesses.push(`Speaking pace was slow (${speechMetrics.speakingRateWordsPerMinute} wpm) — aim for 120-160 wpm.`);
  }

  const improvements = [];
  if (relevance < 6) improvements.push('Re-read the question and open your answer by directly addressing it in the first sentence.');
  if (clarity < 6) improvements.push('Structure your answer with the STAR method: Situation → Task → Action → Result, one idea per sentence.');
  if (specificity < 6) improvements.push('Add one real example with a measurable outcome (e.g. "reduced load time by 40%" or "led a team of 4").');
  if (technicalAccuracy < 6) improvements.push('Mention 2-3 specific tools, technologies, or concepts relevant to the role to show depth.');
  if (words.length < 30) improvements.push('Expand your answer to roughly 60-120 seconds of speaking (about 120-200 words).');
  if (speechMetrics?.fillerAnalysis?.ratePer100Words > 5) {
    improvements.push('Replace "um/uh/aaa" with a silent 1-second pause — it sounds far more confident and gives you time to think.');
  }
  if (speechMetrics?.speakingRateWordsPerMinute > 170) {
    improvements.push('Slow down: take a breath at each full stop. Record yourself again and aim for 120-160 wpm.');
  }
  if (improvements.length === 0) {
    improvements.push('Strong answer! To go further, add a measurable result and end with what you learned.');
  }

  return {
    scores,
    overallScore,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    improvements: improvements.slice(0, 3),
    exampleAnswer: '',
    summary: `Local evaluation: overall score ${overallScore}/100. This is a heuristic fallback used when no AI provider is configured.`,
  };
}
