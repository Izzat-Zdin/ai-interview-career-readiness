import { useState, useRef, useCallback } from 'react';

const MIME_TYPE = 'audio/webm;codecs=opus';
const FALLBACK_TYPES = ['audio/webm', 'audio/ogg', 'audio/wav'];

function selectMimeType() {
  if (MediaRecorder.isTypeSupported(MIME_TYPE)) return MIME_TYPE;
  for (const t of FALLBACK_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const pausedDurationRef = useRef(0);
  const audioUrlRef = useRef(null);
  const recordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const levelRafRef = useRef(null);

  const [level, setLevel] = useState(0);
  const [silences, setSilences] = useState([]); // [{start, end, duration}]
  const silencesRef = useRef([]);
  const silentSinceRef = useRef(null);

  const stopLevelMonitor = useCallback(() => {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    setLevel(0);
    // Close any dangling silent gap
    if (silentSinceRef.current != null) {
      const end = Date.now();
      silencesRef.current = [
        ...silencesRef.current,
        { start: silentSinceRef.current, end, duration: end - silentSinceRef.current },
      ];
      setSilences(silencesRef.current);
      silentSinceRef.current = null;
    }
  }, []);

  const startLevelMonitor = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const SILENCE_THRESHOLD = 0.02;
    const SILENCE_MIN_MS = 3000;
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const scaled = Math.min(1, rms * 3);
      setLevel(scaled);

      // Pause/silence detection: track gaps where input stays near zero
      if (scaled < SILENCE_THRESHOLD) {
        if (silentSinceRef.current == null) {
          silentSinceRef.current = Date.now();
        }
      } else if (silentSinceRef.current != null) {
        const end = Date.now();
        if (end - silentSinceRef.current >= SILENCE_MIN_MS) {
          silencesRef.current = [
            ...silencesRef.current,
            { start: silentSinceRef.current, end, duration: end - silentSinceRef.current },
          ];
          setSilences(silencesRef.current);
        }
        silentSinceRef.current = null;
      }

      levelRafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  const cleanup = useCallback(() => {
    stopLevelMonitor();
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [stopLevelMonitor]);

  const reset = useCallback(() => {
    setRecording(false);
    setPaused(false);
    setError(null);
    setDurationSeconds(0);
    setAudioBlob(null);
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    chunksRef.current = [];
    pausedDurationRef.current = 0;
    silencesRef.current = [];
    silentSinceRef.current = null;
    setSilences([]);
  }, []);

  const start = useCallback(async () => {
    if (recordingRef.current || isStartingRef.current) return;
    isStartingRef.current = true;
    setError(null);
    cleanup();
    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[AudioRecorder] microphone stream acquired');
      streamRef.current = stream;

      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } catch (err) {
        console.warn('[AudioRecorder] analyser unavailable:', err);
      }

      const mimeType = selectMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.onstart = () => {
        console.log('[AudioRecorder] MediaRecorder started, state:', recorder.state);
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        chunksRef.current = [];
      };

      recorder.onerror = (e) => {
        console.error('[AudioRecorder] MediaRecorder error:', e);
        setError('Recording error occurred. Please try again.');
        cleanup();
      };

      recorder.start(1000);
      silencesRef.current = [];
      silentSinceRef.current = null;
      setSilences([]);
      recordingRef.current = true;
      isStartingRef.current = false;
      setRecording(true);
      setIsStarting(false);
      startTimeRef.current = Date.now();
      startLevelMonitor();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
        setDurationSeconds(elapsed);
      }, 1000);
    } catch (err) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(err.message || 'Could not start recording.');
      }
      setRecording(false);
      recordingRef.current = false;
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    recordingRef.current = false;
    setRecording(false);
    setPaused(false);
  }, [cleanup]);

  const togglePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (paused) {
      recorder.resume();
      setPaused(false);
      pausedDurationRef.current += Date.now() - startTimeRef.current - pausedDurationRef.current - durationSeconds * 1000;
    } else {
      recorder.pause();
      setPaused(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return {
    recording,
    isStarting,
    paused,
    error,
    durationSeconds,
    audioBlob,
    audioUrl,
    level,
    silences,
    start,
    stop,
    togglePause,
    reset,
  };
}
