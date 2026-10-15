import { useState, useRef, useEffect, useCallback } from 'react';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const runningRef = useRef(false);

  const [lang, setLang] = useState(() => localStorage.getItem('speech-lang') || 'en-US');

  const setLanguage = useCallback((newLang) => {
    setLang(newLang);
    localStorage.setItem('speech-lang', newLang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      runningRef.current = true;
      setListening(true);
      setError(null);
    };

    recognition.onend = () => {
      runningRef.current = false;
      setListening(false);
    };

    recognition.onerror = (e) => {
      runningRef.current = false;
      if (e.error === 'no-speech' || e.error === 'audio-capture') return;
      // Network / service errors are common with cloud speech APIs.
      // Keep the UI usable by staying silent and letting MediaRecorder + backend
      // transcription handle the audio path.
      if (e.error === 'network' || e.error === 'service-not-allowed') {
        return;
      }
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Speech recognition permission denied or unavailable.');
      } else {
        setError(`Speech recognition error: ${e.error}`);
      }
    };

    recognition.onresult = (e) => {
      let interimTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const result = e.results[i];
        if (result.isFinal) {
          setTranscript((prev) => `${prev} ${result[0].transcript}`.trim());
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      setInterim(interimTranscript);
    };

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || runningRef.current) return;
    setError(null);
    // Abort any dangling session from a previous run — prevents the
    // "already started" state where the service stays silent.
    try {
      recognitionRef.current.abort();
    } catch {
      // ignore
    }
    try {
      recognitionRef.current.start();
    } catch (err) {
      if (!String(err.message || '').includes('already started')) {
        setError(err.message);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    runningRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setListening(false);
    setInterim('');
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  return {
    transcript,
    interim,
    listening,
    supported,
    error,
    lang,
    setLanguage,
    start,
    stop,
    reset,
  };
}
