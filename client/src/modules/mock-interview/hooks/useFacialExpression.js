import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const EXPRESSION_LABELS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];
// Expressions that suggest nervousness / discomfort
const NERVOUS_SET = ['fearful', 'surprised', 'sad', 'disgusted'];
// Expressions that suggest confidence / composure
const CONFIDENT_SET = ['neutral', 'happy'];

function emptyTotals() {
  return Object.fromEntries(EXPRESSION_LABELS.map((k) => [k, 0]));
}

export function useFacialExpression({ active = false } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const totalsRef = useRef(emptyTotals());
  const samplesRef = useRef(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState(null);
  const [currentExpression, setCurrentExpression] = useState(null); // {label, probability}
  const [nervousScore, setNervousScore] = useState(0); // 0-100 rolling
  const [eyeContact, setEyeContact] = useState(null); // boolean | null
  const eyeSamplesRef = useRef(0);
  const eyeContactSamplesRef = useRef(0);

  // Load face-api models once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);
        if (!cancelled) setModelsLoaded(true);
      } catch (err) {
        if (!cancelled) setError('Failed to load facial analysis models.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopDetectionLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopDetectionLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setCurrentExpression(null);
    setNervousScore(0);
  }, [stopDetectionLoop]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
      return true;
    } catch (err) {
      setError(err.message || 'Could not access camera.');
      return false;
    }
  }, []);

  const analyzeFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!result) {
        setCurrentExpression(null);
        setEyeContact(null);
        return;
      }

      const expressions = result.expressions;
      // Top expression
      let top = 'neutral';
      let topProb = 0;
      for (const label of EXPRESSION_LABELS) {
        const p = expressions[label] || 0;
        totalsRef.current[label] += p;
        if (p > topProb) {
          topProb = p;
          top = label;
        }
      }
      samplesRef.current += 1;

      setCurrentExpression({ label: top, probability: topProb });

      const nervous =
        NERVOUS_SET.reduce((sum, k) => sum + (expressions[k] || 0), 0);
      const confident =
        CONFIDENT_SET.reduce((sum, k) => sum + (expressions[k] || 0), 0);
      // Normalize to 0-100 (nervous share of the two groups)
      const total = nervous + confident || 1;
      setNervousScore(Math.round((nervous / total) * 100));

      // Eye contact estimation from 68-point landmarks: compare the nose tip
      // horizontal offset against the eye midpoint. When the head is turned
      // away, the nose drifts strongly to one side.
      const landmarks = result.landmarks;
      if (landmarks) {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();
        const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
        const eyeSpan = Math.abs(rightEye[3].x - leftEye[0].x) || 1;
        const noseTip = nose[3] || nose[Math.floor(nose.length / 2)];
        const offsetRatio = Math.abs(noseTip.x - eyeMidX) / eyeSpan;
        const looking = offsetRatio < 0.18;
        eyeSamplesRef.current += 1;
        if (looking) eyeContactSamplesRef.current += 1;
        setEyeContact(looking);
      }
    } catch {
      // detection errors are non-fatal; skip frame
    }
  }, []);

  const startDetection = useCallback(() => {
    if (!modelsLoaded || intervalRef.current) return;
    totalsRef.current = emptyTotals();
    samplesRef.current = 0;
    eyeSamplesRef.current = 0;
    eyeContactSamplesRef.current = 0;
    intervalRef.current = setInterval(analyzeFrame, 400); // ~2.5 fps, light on CPU
  }, [modelsLoaded, analyzeFrame]);

  const stopDetection = useCallback(() => {
    stopDetectionLoop();
  }, [stopDetectionLoop]);

  const getSummary = useCallback(() => {
    const samples = samplesRef.current;
    if (!samples) return null;
    const totals = totalsRef.current;
    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    const averages = Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, Number(((v / sum) * 100).toFixed(1))])
    );
    const nervousAvg =
      NERVOUS_SET.reduce((s, k) => s + (averages[k] || 0), 0);
    const confidentAvg =
      CONFIDENT_SET.reduce((s, k) => s + (averages[k] || 0), 0);
    const dominant = Object.entries(averages).sort((a, b) => b[1] - a[1])[0];
    return {
      samples,
      averages,
      dominantExpression: dominant ? dominant[0] : 'neutral',
      nervousPercent: Math.round((nervousAvg / (nervousAvg + confidentAvg || 1)) * 100),
      eyeContactPercent: eyeSamplesRef.current
        ? Math.round((eyeContactSamplesRef.current / eyeSamplesRef.current) * 100)
        : null,
    };
  }, []);

  // Reset stats when a new recording window becomes active
  useEffect(() => {
    if (active) {
      totalsRef.current = emptyTotals();
      samplesRef.current = 0;
    }
  }, [active]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    modelsLoaded,
    cameraOn,
    error,
    currentExpression,
    nervousScore,
    eyeContact,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
    getSummary,
  };
}
