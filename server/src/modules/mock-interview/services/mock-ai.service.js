import { chatCompletion, getAIConfig } from '../../../config/ai.js';

const INTERVIEW_TYPES = {
  hr: {
    label: 'HR Interview',
    prompt:
      'You are an HR interviewer. Ask one concise HR interview question for the given job role. Do not include any preamble.',
  },
  behavioral: {
    label: 'Behavioral Interview',
    prompt:
      'You are a behavioral interviewer using the STAR method. Ask one concise behavioral interview question for the given job role.',
  },
  technical: {
    label: 'Technical Interview',
    prompt:
      'You are a technical interviewer. Ask one concise technical question relevant to the given job role.',
  },
};

function stripMarkdownCodeBlock(raw) {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  }
  return trimmed;
}

const ROLES = {
  'software-engineer': 'Software Engineer',
  'data-analyst': 'Data Analyst',
  'product-manager': 'Product Manager',
  'ux-designer': 'UX Designer',
  'marketing-specialist': 'Marketing Specialist',
  'sales-representative': 'Sales Representative',
  'customer-support': 'Customer Support',
  'business-analyst': 'Business Analyst',
};

export function getRoleLabel(roleKey) {
  return ROLES[roleKey] || roleKey;
}

const PERSONA_PROMPTS = {
  neutral: '',
  friendly:
    'Persona: you are a warm, friendly HR interviewer. Use an encouraging, supportive tone and gentle wording.',
  strict:
    'Persona: you are a strict, demanding technical lead. Be direct, challenging and probing; expect precise, in-depth answers.',
};

const LANGUAGE_PROMPTS = {
  en: '',
  ms: 'Respond entirely in Bahasa Melayu (Malay).',
};

export function getPersonaLabel(persona) {
  return { neutral: 'Standard Interviewer', friendly: 'Friendly HR', strict: 'Strict Technical Lead' }[persona] || persona;
}

export async function generateQuestion({ type, role, previousQA = [], language = 'en', persona = 'neutral' }) {
  const roleLabel = getRoleLabel(role);
  const config = INTERVIEW_TYPES[type] || INTERVIEW_TYPES.behavioral;
  const history = previousQA
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || '[no answer]'}`)
    .join('\n\n');

  const extras = [PERSONA_PROMPTS[persona], LANGUAGE_PROMPTS[language]].filter(Boolean).join(' ');
  const systemPrompt = `${config.prompt} The target role is "${roleLabel}".${extras ? ` ${extras}` : ''}`;
  const userPrompt = history
    ? `${history}\n\nBased on the above, ask the next most relevant follow-up question.`
    : 'Ask the first interview question.';

  if (getAIConfig().enabled) {
    try {
      const content = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.8, max_tokens: 250 }
      );
      return stripMarkdownCodeBlock(content).trim();
    } catch (err) {
      console.warn('AI question generation failed, falling back to mock question:', err.message);
    }
  }

  return buildMockQuestion(type, roleLabel, previousQA.length + 1, language);
}

const MOCK_QUESTIONS = {
  hr: [
    'Tell me about yourself and why you are interested in this {role} role.',
    'What are your salary expectations for this {role} position?',
    'Where do you see yourself in five years as a {role}?',
    'Why should we hire you for this {role} role?',
    'Describe a time you had to work under pressure.',
  ],
  behavioral: [
    'Describe a challenging project you worked on as a {role}. What was your role and what was the outcome?',
    'Tell me about a time you had a conflict with a teammate. How did you resolve it?',
    'Give an example of a goal you set and how you achieved it.',
    'Describe a time you failed. What did you learn from it?',
    'Tell me about a time you had to persuade someone to see things your way.',
  ],
  technical: [
    'What is the most important technical skill for a {role}, and how have you applied it?',
    'Explain a complex concept related to the {role} role as if talking to a non-technical stakeholder.',
    'How do you approach debugging a difficult problem?',
    'Describe the architecture of a project you are proud of.',
    'What tools or frameworks do you prefer as a {role}, and why?',
  ],
};

const MOCK_QUESTIONS_MS = {
  hr: [
    'Ceritakan tentang diri anda dan mengapa anda berminat dengan jawatan {role} ini.',
    'Apakah jangkaan gaji anda untuk jawatan {role} ini?',
    'Di mana anda melihat diri anda dalam lima tahun akan datang sebagai {role}?',
    'Mengapa kami perlu mengambil anda untuk jawatan {role} ini?',
    'Ceritakan pengalaman anda bekerja di bawah tekanan.',
  ],
  behavioral: [
    'Ceritakan projek mencabar yang pernah anda usahakan sebagai {role}. Apakah peranan anda dan apakah hasilnya?',
    'Ceritakan tentang konflik yang pernah anda hadapi dengan rakan sepasukan. Bagaimana anda menyelesaikannya?',
    'Berikan contoh matlamat yang anda tetapkan dan bagaimana anda mencapainya.',
    'Ceritakan tentang kegagalan yang pernah anda alami. Apakah yang anda pelajari daripadanya?',
    'Ceritakan pengalaman anda meyakinkan seseorang untuk menerima pandangan anda.',
  ],
  technical: [
    'Apakah kemahiran teknikal paling penting untuk seorang {role}, dan bagaimana anda mengaplikasikannya?',
    'Terangkan satu konsep kompleks berkaitan jawatan {role} seolah-olah bercakap dengan pihak bukan teknikal.',
    'Bagaimana anda menangani masalah teknikal yang sukar (debugging)?',
    'Terangkan seni bina projek yang anda paling banggakan.',
    'Apakah alatan atau rangka kerja yang anda gemari sebagai {role}, dan mengapa?',
  ],
};

function buildMockQuestion(type, roleLabel, number, language = 'en') {
  const source = language === 'ms' ? MOCK_QUESTIONS_MS : MOCK_QUESTIONS;
  const list = source[type] || source.behavioral;
  const template = list[(number - 1) % list.length];
  return template.replace(/{role}/g, roleLabel);
}

/**
 * Generate a probing follow-up question based on the candidate's actual
 * answer — like a real interviewer pressing for more detail.
 */
export async function generateFollowUp({ type, role, question, answer, language = 'en', persona = 'neutral' }) {
  const roleLabel = getRoleLabel(role);
  const extras = [PERSONA_PROMPTS[persona], LANGUAGE_PROMPTS[language]].filter(Boolean).join(' ');
  if (getAIConfig().enabled) {
    try {
      const content = await chatCompletion(
        [
          {
            role: 'system',
            content: `You are an interviewer for a ${roleLabel} position. Based on the candidate's answer, ask ONE short probing follow-up question that digs deeper into something specific they mentioned (e.g. a challenge, a conflict, a measurable result). Do not include any preamble.${extras ? ` ${extras}` : ''}`,
          },
          {
            role: 'user',
            content: `Question asked: ${question}\nCandidate's answer: ${answer}\n\nAsk one follow-up question.`,
          },
        ],
        { temperature: 0.7, max_tokens: 150 }
      );
      const text = stripMarkdownCodeBlock(content).trim();
      if (text) return text;
    } catch (err) {
      console.warn('AI follow-up generation failed:', err.message);
    }
  }
  return language === 'ms'
    ? 'Anda menyebut tentang pengalaman itu — bolehkah anda ceritakan satu cabaran khusus yang anda hadapi dan bagaimana anda mengatasinya?'
    : 'You mentioned that experience — can you tell me about one specific challenge you faced and how you overcame it?';
}
