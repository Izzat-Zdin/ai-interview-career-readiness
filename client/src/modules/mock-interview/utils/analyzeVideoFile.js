import * as faceapi from 'face-api.js';

const EXPRESSION_LABELS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];
const NERVOUS_SET = ['fearful', 'surprised', 'sad', 'disgusted'];
const CONFIDENT_SET = ['neutral', 'happy'];

function emptyTotals() {
  return Object.fromEntries(EXPRESSION_LABELS.map((k) => [k, 0]));
}

let modelsReady = null;
async function ensureModels() {
  if (!modelsReady) {
    modelsReady = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    ]);
  }
  return modelsReady;
}

/**
 * Analyze an uploaded video file frame-by-frame (in the browser, no upload needed).
 * Seeks through the video and samples facial expressions at intervals.
 *
 * @param {File} file - the video file
 * @param {(progress: number) => void} onProgress - 0..1 progress callback
 * @returns facial analysis summary (same shape as useFacialExpression.getSummary())
 */
export async function analyzeVideoFile(file, onProgress = () => {}) {
  await ensureModels();

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Could not read the video file. Try MP4 or WebM.'));
    });

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Video has no playable duration.');
    }

    // Sample roughly every 0.5s, capped at 240 samples to keep it fast
    const interval = Math.max(0.5, duration / 240);
    const totals = emptyTotals();
    let samples = 0;
    let facesFound = 0;

    for (let t = 0; t < duration; t += interval) {
      await new Promise((resolve, reject) => {
        video.onseeked = resolve;
        video.onerror = reject;
        video.currentTime = Math.min(t, duration - 0.05);
      });

      try {
        const result = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
          .withFaceExpressions();
        if (result) {
          facesFound += 1;
          for (const label of EXPRESSION_LABELS) {
            totals[label] += result.expressions[label] || 0;
          }
        }
      } catch {
        // skip undetectable frames
      }
      samples += 1;
      onProgress((t + interval) / duration);
    }

    if (!facesFound) return null;

    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    const averages = Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, Number(((v / sum) * 100).toFixed(1))])
    );
    const nervousAvg = NERVOUS_SET.reduce((s, k) => s + (averages[k] || 0), 0);
    const confidentAvg = CONFIDENT_SET.reduce((s, k) => s + (averages[k] || 0), 0);
    const dominant = Object.entries(averages).sort((a, b) => b[1] - a[1])[0];

    return {
      samples: facesFound,
      averages,
      dominantExpression: dominant ? dominant[0] : 'neutral',
      nervousPercent: Math.round((nervousAvg / (nervousAvg + confidentAvg || 1)) * 100),
      durationSeconds: Math.round(duration),
      faceDetectedPercent: Math.round((facesFound / Math.max(1, samples)) * 100),
    };
  } finally {
    video.src = '';
    URL.revokeObjectURL(url);
  }
}
