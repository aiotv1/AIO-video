# ── GPU + مسار الرندر + الفريمات — مصدر واحد لكل سكربتات بايثون (إضافة oussama-video) ──
# القواعد الثابتة:
#   1) كل عملية ثقيلة على كرت الشاشة (NVIDIA): ترميز NVENC، فك ترميز CUDA، وِسبر على CUDA.
#      ما فيه GPU؟ ينزل للمعالج ويطبع تحذير واضح — ما يفشل بصمت.
#   2) كل الرندر والملفات الوسيطة على القرص D (RENDER_ROOT، الافتراضي D:/autoedit/renders).
#   3) الحركة 60 فريم افتراضياً (REEL_FPS) — أنعم من 30.
#
#   from _gpu import FPS, RENDER_ROOT, venc, hwdec, transcribe, workdir
#   python _gpu.py check                        ← يطبع حالة الكرت والترميز والقرص
#   python _gpu.py whisper <a.wav> <outdir> [--model turbo] [--lang ar]   ← تفريغ على الكرت → <outdir>/<اسم>.json
import os, sys, json, shutil, subprocess, functools

FPS = int(os.environ.get("REEL_FPS", "60"))
RENDER_ROOT = os.environ.get("RENDER_ROOT", "D:/autoedit/renders").replace("\\", "/")
TMP_ROOT = os.environ.get("RENDER_TMP", "D:/autoedit/tmp")
# القرص C ممتلئ: كل الملفات المؤقتة (ffmpeg، tempfile، وِسبر) على D
if os.path.isdir(TMP_ROOT[:3]):
    os.makedirs(TMP_ROOT, exist_ok=True)
    for _v in ("TEMP", "TMP", "TMPDIR"):
        os.environ[_v] = TMP_ROOT
    import tempfile as _tf
    _tf.tempdir = TMP_ROOT


def workdir(name):
    """مجلد شغل الفيديو — دائماً تحت RENDER_ROOT على القرص D."""
    d = os.path.join(RENDER_ROOT, name).replace("\\", "/")
    os.makedirs(d, exist_ok=True)
    return d


def on_render_drive(path):
    p = os.path.abspath(path).replace("\\", "/").lower()
    return p.startswith(os.path.abspath(RENDER_ROOT).replace("\\", "/").lower()[:2])


def warn_if_not_d(path):
    if not on_render_drive(path):
        print(f"⚠️ مجلد الشغل مو على القرص {RENDER_ROOT[:2]} — القاعدة: كل الرندر على {RENDER_ROOT}", file=sys.stderr)


@functools.lru_cache(None)
def has_nvenc():
    """يجرّب ترميز فعلي صغير — وجود h264_nvenc بقائمة ffmpeg ما يكفي (يحتاج درايفر وكرت)."""
    if os.environ.get("NO_GPU"):
        return False
    try:
        r = subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=black:s=256x256:d=0.1",
                            "-c:v", "h264_nvenc", "-f", "null", "-"], capture_output=True, timeout=30)
        return r.returncode == 0
    except Exception:
        return False


@functools.lru_cache(None)
def has_cuda_dec():
    if not has_nvenc():
        return False
    try:
        r = subprocess.run(["ffmpeg", "-v", "error", "-hwaccel", "cuda", "-f", "lavfi", "-i", "testsrc2=s=256x256:d=0.1",
                            "-f", "null", "-"], capture_output=True, timeout=30)
        return r.returncode == 0
    except Exception:
        return False


# جودة الترميز: crf عند x264 ≈ cq عند NVENC (نفس الرقم تقريباً بنفس الشكل)
def venc(crf=19, maxrate=None, preset="slow", codec="h264"):
    """وسائط ترميز الفيديو: NVENC على الكرت، وإلا libx264 (مع تحذير)."""
    if has_nvenc():
        enc = "hevc_nvenc" if codec == "hevc" else "h264_nvenc"
        a = ["-c:v", enc, "-preset", "p6" if preset in ("slow", "slower", "veryslow") else "p5",
             "-tune", "hq", "-rc", "vbr", "-cq", str(crf), "-b:v", "0",
             "-spatial-aq", "1", "-temporal-aq", "1", "-aq-strength", "8",
             "-rc-lookahead", "32", "-bf", "3", "-b_ref_mode", "middle"]
        if codec != "hevc":
            a += ["-profile:v", "high"]
    else:
        print("⚠️ NVENC ما اشتغل — أرمّز على المعالج (أبطأ). شيك الدرايفر: nvidia-smi", file=sys.stderr)
        a = ["-c:v", "libx265" if codec == "hevc" else "libx264", "-preset", preset, "-crf", str(crf)]
    if maxrate:
        a += ["-maxrate", str(maxrate), "-bufsize", _dbl(maxrate)]
    return a


def _dbl(rate):
    s = str(rate)
    return f"{float(s[:-1]) * 2:g}{s[-1]}" if s[-1] in "kKmM" else str(int(float(s) * 2))


def hwdec():
    """وسائط فك ترميز المصدر على الكرت — تُحط قبل -i. الفريمات تنزل للذاكرة فكل الفلاتر تشتغل عادي."""
    return ["-hwaccel", "cuda"] if has_cuda_dec() else []


def hdr_to_sdr_filter():
    """تحويل HDR (آيفون HLG/PQ) لـSDR على الكرت عبر libplacebo (فلكان) — بديل محوّل أبل على ويندوز."""
    return ("libplacebo=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv:"
            "tonemapping=bt.2390:gamut_mode=perceptual:format=yuv420p")


# ── وِسبر على الكرت ──
def whisper_device():
    try:
        import torch
        if torch.cuda.is_available() and not os.environ.get("NO_GPU"):
            return "cuda"
    except Exception:
        pass
    return "cpu"


_MODELS = {}


GPU_PY = os.environ.get("GPU_PY", "D:/autoedit/gpuenv/Scripts/python.exe")   # torch+CUDA · whisper · onnxruntime-gpu · rembg


def transcribe(wav, model=None, language="ar", word_timestamps=True, **kw):
    dev = whisper_device()
    # المفسّر الحالي بلا CUDA؟ نفّذ بيئة الكرت على D بدل ما ننزل للمعالج
    if dev == "cpu" and os.path.exists(GPU_PY) and os.path.abspath(sys.executable).lower() != os.path.abspath(GPU_PY).lower() \
            and not os.environ.get("NO_GPU") and not kw:
        import tempfile
        tmp = tempfile.mkdtemp()
        cmd = [GPU_PY, os.path.abspath(__file__), "whisper", wav, tmp, "--lang", language] + (["--model", model] if model else [])
        if subprocess.run(cmd).returncode == 0:
            with open(os.path.join(tmp, os.path.splitext(os.path.basename(wav))[0] + ".json"), encoding="utf-8") as f:
                r = json.load(f)
            shutil.rmtree(tmp, ignore_errors=True)
            r["_device"] = "cuda (gpuenv)"
            return r
    import whisper
    if dev == "cpu":
        print(f"⚠️ وِسبر على المعالج — أبطأ بكثير. شغّله ببيئة الكرت: {GPU_PY}", file=sys.stderr)
    # turbo على الكرت: أدق وأسرع من medium ويدخل بـ6 قيقا. على المعالج small عشان الوقت.
    model = model or os.environ.get("WHISPER_MODEL") or ("turbo" if dev == "cuda" else "small")
    key = (model, dev)
    if key not in _MODELS:
        _MODELS[key] = whisper.load_model(model, device=dev,
                                          download_root=os.environ.get("WHISPER_CACHE", "D:/whisper_models"))
    kw.setdefault("condition_on_previous_text", False)
    r = _MODELS[key].transcribe(wav, language=language, word_timestamps=word_timestamps,
                                fp16=(dev == "cuda"), verbose=None, **kw)
    r["_device"] = dev
    return r


def _cli():
    a = sys.argv[1:]
    if not a or a[0] == "check":
        import platform
        print("FPS:", FPS, "· مسار الرندر:", RENDER_ROOT,
              "· موجود" if os.path.isdir(RENDER_ROOT) else "· (ينشأ أول تشغيل)")
        if os.path.isdir(RENDER_ROOT[:3]):
            free = shutil.disk_usage(RENDER_ROOT[:3]).free / 2**30
            print(f"القرص {RENDER_ROOT[:2]}: فاضي {free:.0f} قيقا")
        print("ترميز NVENC:", "✅" if has_nvenc() else "❌ (معالج)")
        print("فك ترميز CUDA:", "✅" if has_cuda_dec() else "❌")
        if whisper_device() == "cuda":
            print("وِسبر: ✅ كرت (cuda)")
        elif os.path.exists(GPU_PY):
            r = subprocess.run([GPU_PY, "-c", "import torch;print(torch.cuda.is_available())"], capture_output=True, text=True)
            print("وِسبر:", "✅ كرت عبر" if r.stdout.strip() == "True" else "❌ بيئة الكرت بلا CUDA:", GPU_PY)
        else:
            print("وِسبر: ❌ معالج — ما فيه بيئة كرت على", GPU_PY)
        return
    if a[0] == "venc":          # للشل: VENC=$(python _gpu.py venc 21 6M)
        print(" ".join(venc(int(a[1]) if len(a) > 1 else 19, a[2] if len(a) > 2 and a[2] != "-" else None)))
        return
    if a[0] == "hwdec":
        print(" ".join(hwdec()))
        return
    if a[0] == "whisper":
        wav, out = a[1], a[2]
        model = a[a.index("--model") + 1] if "--model" in a else None
        lang = a[a.index("--lang") + 1] if "--lang" in a else "ar"
        os.makedirs(out, exist_ok=True)
        r = transcribe(wav, model=model, language=lang)
        dst = os.path.join(out, os.path.splitext(os.path.basename(wav))[0] + ".json")
        with open(dst, "w", encoding="utf-8") as f:
            json.dump(r, f, ensure_ascii=False)
        print("✅", dst, "·", r.get("_device"), "·", len(r.get("segments", [])), "جملة")
        return
    print(__doc__ if __doc__ else "usage: _gpu.py check | whisper <wav> <outdir> [--model M] [--lang ar]")


if __name__ == "__main__":
    os.environ.setdefault("PYTHONUTF8", "1")
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    _cli()
