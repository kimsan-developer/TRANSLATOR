import sys
import json
import argparse
import asyncio
import edge_tts

# Common recommended voice mappings across languages
VOICE_MAPPING = {
    "en": {"male": "en-US-ChristopherNeural", "female": "en-US-JennyNeural"},
    "km": {"male": "km-KH-PisethNeural", "female": "km-KH-SreymomNeural"},
    "th": {"male": "th-TH-NiwatNeural", "female": "th-TH-PremwadeeNeural"},
    "vi": {"male": "vi-VN-NamMinhNeural", "female": "vi-VN-HoaiMyNeural"},
    "zh": {"male": "zh-CN-YunxiNeural", "female": "zh-CN-XiaoxiaoNeural"},
    "ja": {"male": "ja-JP-KeitaNeural", "female": "ja-JP-NanamiNeural"},
    "ko": {"male": "ko-KR-InJoonNeural", "female": "ko-KR-SunHiNeural"},
    "fr": {"male": "fr-FR-HenriNeural", "female": "fr-FR-DeniseNeural"},
    "es": {"male": "es-ES-AlvaroNeural", "female": "es-ES-ElviraNeural"},
    "de": {"male": "de-DE-ConradNeural", "female": "de-DE-KatjaNeural"},
    "default": "en-US-JennyNeural"
}

async def generate_speech(text, output_file, voice=None, rate="+0%", pitch="+0Hz"):
    try:
        selected_voice = voice or "en-US-JennyNeural"
        communicate = edge_tts.Communicate(text, selected_voice, rate=rate, pitch=pitch)
        await communicate.save(output_file)
        return {
            "success": True,
            "output_file": output_file,
            "voice": selected_voice
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

async def list_voices():
    try:
        voices = await edge_tts.list_voices()
        return {"success": True, "voices": voices}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Edge TTS Generator")
    parser.add_argument("--text", help="Text to speak")
    parser.add_argument("--output", help="Output audio file path")
    parser.add_argument("--voice", default="en-US-JennyNeural", help="Voice name")
    parser.add_argument("--rate", default="+0%", help="Rate adjustment e.g. +10%")
    parser.add_argument("--pitch", default="+0Hz", help="Pitch adjustment e.g. +5Hz")
    parser.add_argument("--list-voices", action="store_true", help="List available voices")
    
    args = parser.parse_args()
    
    if args.list_voices:
        res = asyncio.run(list_voices())
        print(json.dumps(res, ensure_ascii=False))
    else:
        if not args.text or not args.output:
            print(json.dumps({"success": False, "error": "--text and --output are required"}))
            sys.exit(1)
        res = asyncio.run(generate_speech(args.text, args.output, args.voice, args.rate, args.pitch))
        print(json.dumps(res, ensure_ascii=False))
