import { Camera, CameraOff, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const EXPRESSION_EMOJI = {
  neutral: '😐',
  happy: '😊',
  sad: '😟',
  angry: '😠',
  fearful: '😨',
  disgusted: '🤢',
  surprised: '😲',
};

function nervousnessInfo(score) {
  if (score < 30) return { label: 'Confident', color: 'text-green-600', bar: 'bg-green-500' };
  if (score < 60) return { label: 'Slightly nervous', color: 'text-amber-600', bar: 'bg-amber-500' };
  return { label: 'Very nervous', color: 'text-destructive', bar: 'bg-destructive' };
}

export function WebcamPanel({ face, recording }) {
  const info = nervousnessInfo(face.nervousScore);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Camera (facial expression practice)</p>
        {!face.cameraOn ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={face.startCamera}
            disabled={!face.modelsLoaded}
          >
            {!face.modelsLoaded ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {face.modelsLoaded ? 'Enable Camera' : 'Loading models…'}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={face.stopCamera}>
            <CameraOff className="h-4 w-4" />
            Turn Off
          </Button>
        )}
      </div>

      {face.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{face.error}</AlertDescription>
        </Alert>
      )}

      <div className={face.cameraOn ? '' : 'hidden'}>
        <div className="relative overflow-hidden rounded-lg border bg-black">
          <video
            ref={face.videoRef}
            autoPlay
            muted
            playsInline
            className="h-auto w-full -scale-x-100"
          />
          {face.cameraOn && recording && (
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
              </span>
              ANALYZING
            </div>
          )}
          {face.currentExpression && (
            <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              {EXPRESSION_EMOJI[face.currentExpression.label]}{' '}
              {face.currentExpression.label}{' '}
              <span className="opacity-70">
                ({Math.round(face.currentExpression.probability * 100)}%)
              </span>
            </div>
          )}
          {face.eyeContact != null && recording && (
            <div
              className={`absolute bottom-2 right-2 rounded-full px-3 py-1 text-xs font-medium text-white ${
                face.eyeContact ? 'bg-green-600/80' : 'bg-amber-600/80'
              }`}
            >
              {face.eyeContact ? '👁 Eye contact' : '👀 Looking away'}
            </div>
          )}
        </div>

        {recording && face.currentExpression && (
          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Nervousness level</span>
              <span className={`font-medium ${info.color}`}>
                {info.label} ({face.nervousScore}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 ${info.bar}`}
                style={{ width: `${face.nervousScore}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Keep a calm, neutral or lightly smiling expression — like in a real interview.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
