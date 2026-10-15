import { describe, it, expect } from 'vitest';
import { evaluateAnswer } from '../services/answer-evaluation.service.js';

describe('answer-evaluation.service', () => {
  it('returns empty evaluation for missing answers', async () => {
    const result = await evaluateAnswer({ question: 'Q?', answer: '', type: 'hr', role: 'software-engineer' });
    expect(result.overallScore).toBe(0);
    expect(result.weaknesses).toContain('No answer was provided.');
  });

  it('produces a local heuristic evaluation when AI is not configured', async () => {
    const result = await evaluateAnswer({
      question: 'Tell me about a challenging project.',
      answer: 'I led a project where we rewrote the API. For example, we reduced latency by 40% using caching.',
      type: 'behavioral',
      role: 'software-engineer',
    });
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.scores).toHaveProperty('relevance');
    expect(result.scores).toHaveProperty('clarity');
    expect(result.scores).toHaveProperty('specificity');
    expect(result.scores).toHaveProperty('technicalAccuracy');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
