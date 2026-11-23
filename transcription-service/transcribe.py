import sys
import json
import argparse
from faster_whisper import WhisperModel

def transcribe_audio(audio_path, language=None, model_size="base", device="cpu", compute_type="int8"):
    try:
        # Load model
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        
        # If language is auto or empty, let whisper detect it
        lang_param = None if (not language or language.lower() == "auto") else language.lower()
        
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            language=lang_param,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        segment_list = []
        idx = 1
        full_text = []
        for segment in segments:
            segment_list.append({
                "id": idx,
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text.strip(),
                "confidence": round(segment.avg_logprob, 3) if hasattr(segment, 'avg_logprob') else 0.95
            })
            full_text.append(segment.text.strip())
            idx += 1
            
        result = {
            "success": True,
            "detected_language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
            "segments": segment_list,
            "full_text": " ".join(full_text)
        }
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Faster Whisper CLI")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument("--language", default=None, help="Target language code or auto")
    parser.add_argument("--model", default="base", help="Model size (tiny, base, small, medium, large-v3)")
    
    args = parser.parse_args()
    res = transcribe_audio(args.audio, args.language, args.model)
    print(json.dumps(res, ensure_ascii=False))
