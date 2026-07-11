import os
import sys
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import io
import soundfile as sf
from kokoro_onnx import Kokoro

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "kokoro-v1.0.onnx")
VOICES_PATH = os.path.join(SCRIPT_DIR, "voices-v1.0.bin")

# Model URLs from GitHub releases
MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
VOICES_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

def download_file(url, dest):
    print(f"Downloading {url} to {dest}...")
    def progress(count, block_size, total_size):
        percent = int(count * block_size * 100 / total_size)
        sys.stdout.write(f"\rProgress: {percent}%")
        sys.stdout.flush()
    urllib.request.urlretrieve(url, dest, reporthook=progress)
    print("\nDownload complete.")

# Check and download files if missing
if not os.path.exists(MODEL_PATH):
    download_file(MODEL_URL, MODEL_PATH)
if not os.path.exists(VOICES_PATH):
    download_file(VOICES_URL, VOICES_PATH)

print("Initializing Kokoro ONNX model...")
kokoro = Kokoro(MODEL_PATH, VOICES_PATH)
print("Model initialized successfully.")

class TTSRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == "/api/tts" or parsed_url.path == "/":
            query = urllib.parse.parse_qs(parsed_url.query)
            text = query.get("text", [""])[0]
            voice = query.get("voice", ["af_sarah"])[0]
            
            if not text:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "text parameter is required"}')
                return

            try:
                print(f"[TTS SERVICE] Generating speech for voice={voice}: '{text[:50]}...'")
                samples, sample_rate = kokoro.create(
                    text,
                    voice=voice,
                    speed=1.0,
                    lang="en-us"
                )
                
                # Write samples to memory as WAV bytes
                wav_io = io.BytesIO()
                sf.write(wav_io, samples, sample_rate, format='WAV', subtype='PCM_16')
                wav_bytes = wav_io.getvalue()

                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(wav_bytes)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(wav_bytes)
                
            except Exception as e:
                print("[TTS SERVICE] Error generating speech:", e)
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                import json
                err_response = json.dumps({"error": str(e)})
                self.wfile.write(err_response.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(port=3002):
    server_address = ('', port)
    httpd = HTTPServer(server_address, TTSRequestHandler)
    print(f"🚀 Neural TTS Service listening on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    port = 3002
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run(port)
