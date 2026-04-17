#!/usr/bin/env python3
"""
CORTEX Voice I/O — speech-to-text (Whisper) and text-to-speech (TTS) via HuggingFace.

Usage:
    python3 cortex_voice.py listen                  # record 10s from mic → text
    python3 cortex_voice.py listen --seconds 30
    python3 cortex_voice.py transcribe file.wav     # transcribe an existing audio file
    python3 cortex_voice.py speak "Hello world"     # TTS → out.wav (and plays it)
    python3 cortex_voice.py speak "..." -o foo.wav --no-play

Requires env var: HF_TOKEN
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN:
    sys.exit("❌ HF_TOKEN env var not set")

WHISPER_MODEL = os.environ.get("CORTEX_STT_MODEL", "openai/whisper-large-v3-turbo")
TTS_MODEL = os.environ.get("CORTEX_TTS_MODEL", "suno/bark-small")


def require(mod_name: str, pip_name: str | None = None):
    try:
        return __import__(mod_name)
    except ImportError:
        pip = pip_name or mod_name
        sys.exit(f"❌ Missing dep: pip install {pip}")


# ─── Record audio ──────────────────────────────────────────────
def record(seconds: int, samplerate: int = 16000) -> Path:
    sd = require("sounddevice")
    np = require("numpy")
    print(f"🎙  Recording {seconds}s... (speak now)")
    audio = sd.rec(int(seconds * samplerate), samplerate=samplerate, channels=1, dtype="int16")
    sd.wait()
    tmp = Path(tempfile.mktemp(suffix=".wav"))
    with wave.open(str(tmp), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(samplerate)
        wf.writeframes(audio.tobytes())
    print(f"✅ Recorded to {tmp}")
    return tmp


# ─── Speech → Text (Whisper) ───────────────────────────────────
def transcribe(audio_path: Path) -> str:
    requests = require("requests")
    url = f"https://router.huggingface.co/hf-inference/models/{WHISPER_MODEL}"
    with open(audio_path, "rb") as f:
        data = f.read()
    r = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "audio/wav",
        },
        data=data,
        timeout=120,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Whisper error {r.status_code}: {r.text[:300]}")
    data = r.json()
    text = data.get("text") or data.get("generated_text") or str(data)
    return text.strip()


# ─── Text → Speech ─────────────────────────────────────────────
def synthesize(text: str, out_path: Path, play: bool = True):
    requests = require("requests")
    url = f"https://router.huggingface.co/hf-inference/models/{TTS_MODEL}"
    r = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {HF_TOKEN}",
            "Accept": "audio/wav",
        },
        json={"inputs": text, "options": {"wait_for_model": True}},
        timeout=120,
    )
    if r.status_code != 200:
        raise RuntimeError(f"TTS error {r.status_code}: {r.text[:300]}")
    out_path.write_bytes(r.content)
    print(f"✅ Wrote {len(r.content)} bytes → {out_path}")
    if play and sys.platform == "darwin":
        subprocess.run(["afplay", str(out_path)], check=False)
    elif play and sys.platform.startswith("linux"):
        subprocess.run(["aplay", str(out_path)], check=False)


# ─── CLI ───────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(prog="cortex_voice")
    sp = p.add_subparsers(dest="cmd", required=True)

    l = sp.add_parser("listen", help="Record from mic → transcribe")
    l.add_argument("--seconds", type=int, default=10)

    t = sp.add_parser("transcribe", help="Transcribe an existing audio file")
    t.add_argument("file")

    sk = sp.add_parser("speak", help="Text → speech → .wav")
    sk.add_argument("text")
    sk.add_argument("-o", "--out", default="out.wav")
    sk.add_argument("--no-play", action="store_true")

    args = p.parse_args()

    if args.cmd == "listen":
        audio = record(args.seconds)
        print("🔊 Transcribing...")
        text = transcribe(audio)
        print(f"\n📝 You said:\n{text}\n")
    elif args.cmd == "transcribe":
        text = transcribe(Path(args.file))
        print(text)
    elif args.cmd == "speak":
        synthesize(args.text, Path(args.out), play=not args.no_play)


if __name__ == "__main__":
    main()
