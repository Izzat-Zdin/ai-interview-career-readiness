import { describe, it, expect } from 'vitest';
import { detectFillers, analyzeTranscript } from '../services/speech-analysis.service.js';

describe('speech-analysis.service', () => {
  it('counts filler words and excludes false-positive "like"', () => {
    const transcript = 'I, um, really like this project because, uh, it is like a good challenge, you know?';
    const result = detectFillers(transcript);
    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.perWord['um']).toBe(1);
    expect(result.perWord['uh']).toBe(1);
    expect(result.perWord['you know']).toBe(1);
    // "like a good" should be excluded as a false positive
    expect(result.perWord['like']).toBeUndefined();
  });

  it('analyzes transcript for word count and speaking rate', () => {
    const transcript = 'This is a short answer with about ten words here.';
    const result = analyzeTranscript(transcript, 6);
    expect(result.wordCount).toBe(10);
    expect(result.speakingRateWordsPerMinute).toBeCloseTo(100, 0);
    expect(result.fillerAnalysis.ratePer100Words).toBe(0);
  });

  it('handles empty transcripts gracefully', () => {
    const result = analyzeTranscript('', 0);
    expect(result.wordCount).toBe(0);
    expect(result.speakingRateWordsPerMinute).toBeNull();
  });
});
