#!/usr/bin/env python3
"""Generate our chapter WAVs with an already inspected, isolated eSpeak NG.

Run only after native-engine compatibility/probe approval. No downloads, system
installation, live playback, or reference-site source/audio are involved.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import resource
import signal
import subprocess
import tempfile
import wave

PROJECT = Path(__file__).resolve().parents[1]
CHAPTERS = ['book', 'city', 'street', 'matches', 'corner', 'stove', 'goose', 'tree', 'grandmother', 'morning', 'close']


def limits():
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_CPU, (10, 10))
    resource.setrlimit(resource.RLIMIT_FSIZE, (16 * 1024 * 1024, 16 * 1024 * 1024))


def check_wav(path):
    with wave.open(str(path), 'rb') as stream:
        assert stream.getnchannels() == 1 and stream.getsampwidth() == 2
        assert stream.getframerate() == 22050 and stream.getnframes() > 0
        frames = stream.readframes(stream.getnframes())
        assert any(frames), f'Silent WAV: {path.name}'
        return round(stream.getnframes() / stream.getframerate(), 3)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine-root', type=Path, required=True)
    parser.add_argument('--probe', action='store_true', help='Generate a single short compatibility WAV in the engine directory.')
    args = parser.parse_args()
    root = args.engine_root.resolve(strict=True)
    executable = root / 'usr/bin/espeak-ng'
    assert executable.is_file() and (root / 'usr/share/espeak-ng-data').is_dir()
    env = dict(os.environ, LD_LIBRARY_PATH=str(root / 'usr/lib'))

    def generate(text, output):
        result = subprocess.run([
            str(executable), '--path=' + str(root / 'usr/share'),
            '-v', 'en-gb', '-s', '145', '-p', '42', '-a', '100',
            '-w', str(output), '--stdin',
        ], input=text, text=True, capture_output=True, env=env, timeout=10, preexec_fn=limits)
        if result.returncode in (-signal.SIGILL, 128 + signal.SIGILL):
            raise SystemExit('STOP: speech engine received SIGILL. Do not rerun it.')
        if result.returncode:
            raise SystemExit(f'Engine failed ({result.returncode}): {result.stderr[:2000]}')
        return check_wav(output)

    if args.probe:
        output = root / 'compatibility-probe.wav'
        if output.exists():
            raise SystemExit('Probe output already exists. Do not repeat a native compatibility probe automatically.')
        duration = generate('The Little Match Girl. Snow fell on New Year’s Eve.', output)
        print(f'Probe passed: {output} ({duration} seconds, WAV inspected, no playback).')
        return

    probe = root / 'compatibility-probe.wav'
    if not probe.is_file():
        raise SystemExit('A successful approved compatibility probe is required first.')
    check_wav(probe)
    result = subprocess.run(['node', 'scripts/export-narration.mjs'], cwd=PROJECT, capture_output=True, text=True, check=True, timeout=15)
    chapters = json.loads(result.stdout)
    assert [chapter['id'] for chapter in chapters] == CHAPTERS
    destination = PROJECT / 'src/assets/narration'
    if any(destination.glob('*.wav')) or any(destination.glob('*.mp3')) or any(destination.glob('*.ogg')):
        raise SystemExit('Narration tracks already exist. Refusing to overwrite them.')
    records = []
    # Complete and inspect all files before publishing them into the app asset tree.
    # Stage on the destination filesystem so the final renames are atomic.
    with tempfile.TemporaryDirectory(prefix='.narration-stage-', dir=destination.parent) as stage:
        for chapter in chapters:
            output = Path(stage) / chapter['filename']
            seconds = generate(chapter['text'], output)
            records.append({
                'id': chapter['id'], 'file': output.name, 'seconds': seconds,
                'bytes': output.stat().st_size,
                'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
                'text': chapter['text'],
            })
            print(f'{chapter["id"]}: {seconds}s', flush=True)
        destination.mkdir(parents=True, exist_ok=True)
        for record in records:
            (Path(stage) / record['file']).replace(destination / record['file'])
    report = {
        'engine': 'eSpeak NG 1.52.0 (official Arch 1.52.0-1)', 'voice': 'en-gb',
        'wordsPerMinute': 145, 'pitch': 42, 'amplitude': 100,
        'format': 'WAV PCM signed 16-bit mono, 22050 Hz',
        'source': 'Independent English adaptation of Hans Christian Andersen’s public-domain 1845 story.',
        'syntheticVoiceDisclosure': 'This narration is generated with a formant synthesizer; it is not a human recording.',
        'tracks': records,
    }
    (PROJECT / 'docs/narration-manifest.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print(f'Generated {len(records)} original chapter tracks, {sum(r["seconds"] for r in records):.1f}s total.')


if __name__ == '__main__':
    main()
