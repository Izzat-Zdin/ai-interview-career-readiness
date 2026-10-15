"""
Extract measurable audio features from a speech recording.
This is an optional helper that requires librosa, numpy, and soundfile.
Install: pip install librosa numpy soundfile

Usage:
    python audio_features.py <path_to_audio_file> [output_json_path]
"""
import json
import sys
from pathlib import Path

try:
    import librosa
    import numpy as np
except ImportError:
    print(json.dumps({
        "error": "Missing Python dependencies. Install librosa and numpy."
    }))
    sys.exit(1)


def analyze_audio(path: str):
    try:
        y, sr = librosa.load(path, sr=None)
    except Exception as exc:
        return {"error": f"Could not load audio: {exc}"}

    duration = float(librosa.get_duration(y=y, sr=sr))

    # Trim leading/trailing silence for cleaner speech analysis
    y_trimmed, _ = librosa.effects.trim(y, top_db=20)
    speech_duration = float(librosa.get_duration(y=y_trimmed, sr=sr))

    # Fundamental frequency (pitch) using PYIN
    f0, voiced_flag, _ = librosa.pyin(
        y_trimmed,
        fmin=librosa.note_to_hz('C2'),
        fmax=librosa.note_to_hz('C7'),
    )
    voiced_f0 = f0[voiced_flag]
    if len(voiced_f0) == 0:
        pitch_summary = {
            "mean_hz": None,
            "min_hz": None,
            "max_hz": None,
            "range_hz": None,
        }
    else:
        pitch_summary = {
            "mean_hz": round(float(np.mean(voiced_f0)), 2),
            "min_hz": round(float(np.min(voiced_f0)), 2),
            "max_hz": round(float(np.max(voiced_f0)), 2),
            "range_hz": round(float(np.max(voiced_f0) - np.min(voiced_f0)), 2),
        }

    # RMS energy per frame
    hop_length = 512
    rms = librosa.feature.rms(y=y_trimmed, hop_length=hop_length)[0]
    energy_summary = {
        "mean_db": round(float(20 * np.log10(np.mean(rms) + 1e-9)), 2),
        "std_db": round(float(20 * np.log10(np.std(rms) + 1e-9)), 2),
        "variation": round(float(np.std(rms) / (np.mean(rms) + 1e-9)), 3),
    }

    # Speaking rate: words per minute placeholder using syllable count
    try:
        import librosa
        onset_env = librosa.onset.onset_strength(y=y_trimmed, sr=sr)
        peaks = librosa.util.peak_pick(
            onset_env, 3, 3, 3, 5, 0.5, speech_duration / sr
        )
        estimated_syllables = int(len(peaks) * 1.5)
    except Exception:
        estimated_syllables = None

    speaking_rate = (
        round((estimated_syllables / speech_duration) * 60, 1)
        if estimated_syllables and speech_duration > 0
        else None
    )

    # Pauses (gaps > 0.3s)
    intervals = librosa.effects.split(y_trimmed, top_db=20)
    pauses = []
    for i in range(1, len(intervals)):
        gap_start = intervals[i - 1][1] / sr
        gap_end = intervals[i][0] / sr
        gap = gap_end - gap_start
        if gap > 0.3:
            pauses.append(round(gap, 2))

    return {
        "duration_seconds": round(duration, 2),
        "speech_duration_seconds": round(speech_duration, 2),
        "pitch": pitch_summary,
        "energy": energy_summary,
        "speaking_rate_syllables_per_minute": speaking_rate,
        "pauses_longer_than_300ms": pauses,
        "pause_count": len(pauses),
        "mean_pause_duration_seconds": round(float(np.mean(pauses)), 2) if pauses else 0,
        "measured_by": "librosa",
        "note": "These are measurable audio features, not subjective judgments.",
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python audio_features.py <audio_file> [output.json]"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    result = analyze_audio(audio_path)

    if len(sys.argv) >= 3:
        out_path = Path(sys.argv[2])
        out_path.write_text(json.dumps(result, indent=2))
        print(json.dumps({"output": str(out_path)}))
    else:
        print(json.dumps(result, indent=2))
