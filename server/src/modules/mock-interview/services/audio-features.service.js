import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, '../../../../scripts/audio_features.py');

/**
 * Runs the optional Python audio analysis script.
 * Returns a graceful fallback if Python or librosa is unavailable.
 */
export function analyzeAudioFeatures(audioFilePath) {
  return new Promise((resolve) => {
    const child = spawn('python', [scriptPath, audioFilePath], { timeout: 30000 });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      resolve({
        measured: false,
        error: `Audio analysis unavailable: ${err.message}`,
        note: 'Install Python, librosa, numpy, and soundfile to enable measured audio features.',
      });
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return resolve({
          measured: false,
          error: `Audio analysis helper exited with code ${code}. ${stderr}`,
          note: 'Measured audio features require librosa and soundfile.',
        });
      }
      try {
        const json = stdout.trim().split('\n').pop();
        const parsed = JSON.parse(json);
        resolve({ measured: true, ...parsed });
      } catch (err) {
        resolve({
          measured: false,
          error: `Could not parse audio analysis output: ${err.message}`,
          raw: stdout,
          stderr,
        });
      }
    });
  });
}
