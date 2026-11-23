import os
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from transcribe import transcribe_audio
from tts import generate_speech, list_voices, VOICE_MAPPING
import asyncio

app = Flask(__name__)
CORS(app)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "Video Translator AI Pro - Transcription & TTS Service",
        "version": "1.0.0"
    })

@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    try:
        audio_file = request.files.get("file")
        language = request.form.get("language", "auto")
        model_size = request.form.get("model", "base")
        
        if not audio_file:
            return jsonify({"success": False, "error": "No file uploaded"}), 400
            
        filename = f"{uuid.uuid4()}_{audio_file.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        audio_file.save(filepath)
        
        result = transcribe_audio(filepath, language=language, model_size=model_size)
        
        # Cleanup temp file
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
                
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/tts/generate", methods=["POST"])
def tts():
    try:
        data = request.json or {}
        text = data.get("text")
        voice = data.get("voice", "en-US-JennyNeural")
        rate = data.get("rate", "+0%")
        pitch = data.get("pitch", "+0Hz")
        
        if not text:
            return jsonify({"success": False, "error": "Text is required"}), 400
            
        out_filename = f"tts_{uuid.uuid4()}.mp3"
        out_filepath = os.path.join(UPLOAD_DIR, out_filename)
        
        res = asyncio.run(generate_speech(text, out_filepath, voice=voice, rate=rate, pitch=pitch))
        if res.get("success"):
            return jsonify({
                "success": True,
                "file_path": out_filepath,
                "filename": out_filename,
                "voice": voice
            })
        else:
            return jsonify(res), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/tts/voices", methods=["GET"])
def get_voices():
    try:
        res = asyncio.run(list_voices())
        return jsonify(res)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    print(f"Starting Transcription & TTS microservice on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
