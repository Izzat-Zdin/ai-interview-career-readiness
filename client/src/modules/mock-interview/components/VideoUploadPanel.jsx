import { useRef, useState } from 'react';
import { Upload, FileVideo, Loader2, ScanFace, AudioLines, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { analyzeVideoFile } from '../utils/analyzeVideoFile';
import { analyzeUpload } from '../services/mock-interview.service';

const ACCEPTED = 'video/mp4,video/webm,video/quicktime,video/x-matroska,audio/mpeg,audio/wav,audio/ogg,audio/mp4';
const ACCEPTED_TYPES = [
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
];
const MAX_SIZE = 200 * 1024 * 1024; // 200MB

const STAGES = {
  idle: '',
  facial: 'Scanning facial expressions frame-by-frame…',
  uploading: 'Uploading to server & transcribing with Whisper…',
  evaluating: 'AI is evaluating your answer…',
};

/**
 * Lets the user upload (click or drag & drop) a pre-recorded video/audio
 * of themselves answering the current question. Runs facial-expression
 * analysis locally in the browser, then sends the file to the server for
 * Whisper transcription, filler analysis and full AI evaluation.
 */
export function VideoUploadPanel({ sessionId, onResult, onStatusChange, disabled }) {
  const fileInputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | facial | uploading | evaluating
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const busy = stage !== 'idle';

  const pickFile = (picked) => {
    setError(null);
    if (!picked) return;
    if (ACCEPTED_TYPES.length && picked.type && !ACCEPTED_TYPES.includes(picked.type)) {
      setError(`Unsupported file type (${picked.type || 'unknown'}). Use MP4, WebM, MOV, MKV or MP3/WAV.`);
      return;
    }
    if (picked.size > MAX_SIZE) {
      setError('File is too large (max 200MB). Try a shorter clip or compress it first.');
      return;
    }
    setFile(picked);
  };

  const handleFileChange = (e) => {
    pickFile(e.target.files?.[0]);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragging(false);
    if (disabled || busy) return;
    pickFile(e.dataTransfer?.files?.[0]);
  };

  const handleAnalyze = async () => {
    if (!file || busy) return;
    setError(null);
    setProgress(0);
    onStatusChange?.({ processing: true, stage: 'facial', fileName: file.name });

    try {
      // 1) Facial analysis locally (only meaningful for video files)
      let facialMetrics = null;
      let durationSeconds = 0;
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        setStage('facial');
        onStatusChange?.({ processing: true, stage: 'facial', fileName: file.name });
        try {
          facialMetrics = await analyzeVideoFile(file, (p) => {
            setProgress(p);
            onStatusChange?.({ processing: true, stage: 'facial', progress: p, fileName: file.name });
          });
          durationSeconds = facialMetrics?.durationSeconds || 0;
        } catch (err) {
          // Non-fatal — continue without facial metrics
          console.warn('Facial analysis skipped:', err.message);
        }
      }

      // 2) Upload + transcribe + evaluate on the server
      setStage('uploading');
      onStatusChange?.({ processing: true, stage: 'uploading', fileName: file.name });
      const { data } = await analyzeUpload(sessionId, file, { durationSeconds, facialMetrics });
      setStage('evaluating');
      onStatusChange?.({ processing: true, stage: 'evaluating', fileName: file.name });
      onResult?.(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setStage('idle');
      setProgress(0);
      onStatusChange?.({ processing: false });
    }
  };

  return (
    <div
      className={`rounded-md border border-dashed p-3 space-y-2 transition-colors ${
        dragging
          ? 'border-primary bg-primary/10'
          : 'border-muted-foreground/40'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <FileVideo className="h-4 w-4" /> Or upload a recording
        </p>
        <span className="text-xs text-muted-foreground">MP4 · WebM · MOV · MP3</span>
      </div>

      {dragging ? (
        <div className="flex flex-col items-center gap-1 rounded-md bg-primary/5 py-4 text-center">
          <Upload className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium text-primary">Drop your file here</p>
          <p className="text-xs text-muted-foreground">Video or audio — max 200MB</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Drag & drop</span> a file here, or click below.
          AI will transcribe the speech, detect filler words, analyze facial expressions
          and evaluate the answer.
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleFileChange}
        className="hidden"
        id="video-upload-input"
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-4 w-4" />
          {file ? 'Change file' : 'Choose file'}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!file || disabled || busy}
          onClick={handleAnalyze}
        >
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-1.5 h-4 w-4" />}
          Analyze
        </Button>
      </div>

      {file && !busy && (
        <p className="truncate text-xs text-muted-foreground">
          Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(1)} MB)
        </p>
      )}

      {busy && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {stage === 'facial' ? <ScanFace className="h-3.5 w-3.5 animate-pulse" /> : <AudioLines className="h-3.5 w-3.5 animate-pulse" />}
            {STAGES[stage]}
          </p>
          {stage === 'facial' && <Progress value={Math.round(progress * 100)} className="h-1.5" />}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
