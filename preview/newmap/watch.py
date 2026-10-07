#!/usr/bin/env python3
"""Screen link: run this on the gaming PC while driving. It screenshots the screen every
few seconds, keeps only frames that changed, and pushes them to the branch so the cloud
session can pull and read them.

    pip install mss pillow
    python preview/newmap/watch.py [seconds between shots=3] [min change=0.06]

Stop with Ctrl+C. Frames go in preview/newmap/refs/drive-<date>/ and are pushed every
20 kept frames and on exit. Keep Roblox full screen: it captures the whole primary monitor.
"""
import sys, os, time, subprocess, datetime
import numpy as np
from PIL import Image

def push(msg):
    for cmd in (['git', 'add', 'preview/newmap/refs'], ['git', 'commit', '-q', '-m', msg], ['git', 'push', '-q']):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode and 'nothing to commit' not in r.stdout + r.stderr:
            print('git:', (r.stderr or r.stdout).strip()[:200])

def main():
    import mss
    step = float(sys.argv[1]) if len(sys.argv) > 1 else 3.0
    thresh = float(sys.argv[2]) if len(sys.argv) > 2 else 0.06
    root = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(root, 'refs', 'drive-' + datetime.datetime.now().strftime('%Y%m%d-%H%M'))
    os.makedirs(out, exist_ok=True)
    print('capturing to', out, '- Ctrl+C to stop')
    last, kept, t0 = None, 0, time.time()
    try:
        with mss.mss() as sct:
            while True:
                shot = sct.grab(sct.monitors[1])
                im = Image.frombytes('RGB', shot.size, shot.bgra, 'raw', 'BGRX')
                small = np.asarray(im.convert('L').resize((64, 36)), dtype=np.float32) / 255
                if last is None or np.abs(small - last).mean() > thresh:
                    t = time.time() - t0
                    im.resize((1280, int(1280 * im.height / im.width))).save(os.path.join(out, f'{int(t // 60):02d}m{int(t % 60):02d}s.jpg'), quality=82)
                    last, kept = small, kept + 1
                    print(f'\rkept {kept}', end='', flush=True)
                    if kept % 20 == 0: push(f'Drive frames {os.path.basename(out)} ({kept})')
                time.sleep(step)
    except KeyboardInterrupt:
        pass
    push(f'Drive frames {os.path.basename(out)} ({kept}, end)')
    print(f'\nstopped, {kept} frames')

if __name__ == '__main__':
    main()
