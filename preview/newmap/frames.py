#!/usr/bin/env python3
"""Turn a recorded drive (mp4/mkv/webm) into a set of distinct reference frames.

    python3 frames.py <video> <out dir> [seconds between samples=1.0] [min change=0.08]

Samples a frame every N seconds, drops frames that barely differ from the last
kept one, writes JPGs named by timestamp, and a contact sheet (sheet.jpg) so the
whole drive can be scanned at a glance.
"""
import sys, os, subprocess, glob
import numpy as np, cv2

def ffmpeg():
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return 'ffmpeg'

def main():
    video, out = sys.argv[1], sys.argv[2]
    step = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    thresh = float(sys.argv[4]) if len(sys.argv) > 4 else 0.08
    raw = os.path.join(out, '_raw'); os.makedirs(raw, exist_ok=True)
    subprocess.run([ffmpeg(), '-loglevel', 'error', '-y', '-i', video, '-vf', f'fps=1/{step},scale=1280:-2',
                    '-q:v', '3', os.path.join(raw, 'f%05d.jpg')], check=True)
    files = sorted(glob.glob(os.path.join(raw, 'f*.jpg')))
    kept, last = [], None
    for i, f in enumerate(files):
        im = cv2.imread(f); small = cv2.resize(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), (64, 36)).astype(np.float32) / 255
        if last is None or np.abs(small - last).mean() > thresh:
            t = i * step; name = f'{int(t // 60):02d}m{int(t % 60):02d}s.jpg'
            cv2.imwrite(os.path.join(out, name), im, [cv2.IMWRITE_JPEG_QUALITY, 82]); kept.append(os.path.join(out, name)); last = small
        os.remove(f)
    os.rmdir(raw)
    # contact sheet, 6 per row
    thumbs = [cv2.resize(cv2.imread(k), (320, 180)) for k in kept]
    rows = [np.hstack(thumbs[i:i + 6] + [np.zeros((180, 320, 3), np.uint8)] * (6 - len(thumbs[i:i + 6]))) for i in range(0, len(thumbs), 6)]
    if rows: cv2.imwrite(os.path.join(out, 'sheet.jpg'), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 75])
    print(f'{len(files)} sampled, {len(kept)} kept -> {out}')

if __name__ == '__main__':
    main()
