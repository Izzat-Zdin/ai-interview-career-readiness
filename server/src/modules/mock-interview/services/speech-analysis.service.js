/**
 * Text-based speech analysis.
 * For measured audio features (pitch, speaking rate, etc.) see analyzeAudioFeatures
 * and the optional Python helper in server/src/scripts/audio_features.py.
 */

const FILLER_WORDS = [
  // English fillers / hesitations
  'um',
  'uh',
  'ah',
  'er',
  'erm',
  'hmm',
  'umm',
  'uhh',
  'aaa',
  'eee',
  'like',
  'you know',
  'i mean',
  'sort of',
  'kind of',
  'basically',
  'actually',
  // Malay fillers
  'errr',
  'mmm',
  'kot',
  'tahu tak',
  'macam',
  'apa ni',
  'apa benda',
];

/**
 * Count filler words while avoiding common false positives.
 * "like" is only counted as a filler when it appears in a way that is unlikely
 * to be a verb/preposition (e.g., surrounded by punctuation/pauses or repeated).
 */
export function detectFillers(transcript) {
  const text = ` ${transcript.toLowerCase().replace(/[.,!?;:'\"-]/g, ' ')} `;
  const totalWords = text.trim().split(/\s+/).filter(Boolean).length;
  const counts = {};
  let total = 0;

  for (const phrase of FILLER_WORDS) {
    const regex = new RegExp(`(?<=^|\\s)${phrase.replace(/\s+/g, '\\s+')}(?=$|\\s)`, 'g');
    const matches = (text.match(regex) || []).length;

    if (phrase === 'like') {
      // Reduce false positives: exclude "like" followed by articles/pronouns/determiners
      const falsePositiveRegex = /\blike\s+(a|an|the|this|that|these|those|my|your|his|her|our|their|its|to|of|in|on|at|for|with)\b/g;
      const falsePositives = (text.match(falsePositiveRegex) || []).length;
      const adjusted = Math.max(0, matches - falsePositives);
      if (adjusted > 0) {
        counts[phrase] = adjusted;
        total += adjusted;
      }
    } else if (matches > 0) {
      counts[phrase] = matches;
      total += matches;
    }
  }

  return {
    total,
    perWord: counts,
    ratePer100Words: totalWords ? Number(((total / totalWords) * 100).toFixed(2)) : 0,
  };
}

export function analyzeTranscript(transcript, durationSeconds) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const fillerAnalysis = detectFillers(transcript);
  const duration = Number(durationSeconds) || 0;

  const speakingRate = duration > 0 ? Number((words.length / (duration / 60)).toFixed(1)) : null;

  return {
    wordCount: words.length,
    durationSeconds: duration,
    speakingRateWordsPerMinute: speakingRate,
    fillerAnalysis,
  };
}
