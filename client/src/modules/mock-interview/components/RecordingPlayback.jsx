import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';

/**
 * Lets the user listen back to their own voice recording. Object URLs are
 * created lazily (on first play) and revoked on cleanup.
 */
export function RecordingPlayback({ audioBlob, audioUrl: audioUrlProp }) {
  const [url, setUrl] = useState(audioUrlProp || null);

  useEffect(() => {
    if (audioUrlProp) {
      setUrl(audioUrlProp);
      return;
    }
    if (audioBlob) {
      const objectUrl = URL.createObjectURL(audioBlob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setUrl(null);
  }, [audioBlob, audioUrlProp]);

  if (!url) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
      <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Listen to your recording
        </p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={url} className="h-9 w-full" />
      </div>
    </div>
  );
}
