# ── توافق ويندوز/ماك/لينكس — يُستدعى من كل سكربت (مضاف) ──────────
# 1) بايثون: ويندوز فيه python بس، و python3 اختصار متجر مايكروسوفت (يفشل)
# 2) المسارات: ويندوز يحتاج C:/… لأن بايثون ما يفهم /c/… حق قِت-باش
# 3) UTF-8 إجباري عشان العربي ما ينكسر على cp1252
_pick_py(){ for c in python3 python py; do
    command -v "$c" >/dev/null 2>&1 && "$c" -c "import sys" >/dev/null 2>&1 && { echo "$c"; return 0; }
  done; echo python3; }
PY="${PY:-$(_pick_py)}"
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
# مسار مطلق أصلي (C:/… على ويندوز، /… على ماك ولينكس)
abspath(){ ( cd "$1" 2>/dev/null && { pwd -W 2>/dev/null || pwd; } ); }

# ── oussama-video: الكرت + 60 فريم + القرص D (المصدر: _gpu.py) ──
export REEL_FPS="${REEL_FPS:-60}" RENDER_ROOT="${RENDER_ROOT:-D:/autoedit/renders}"
export GPU_PY="${GPU_PY:-D:/autoedit/gpuenv/Scripts/python.exe}"   # وِسبر · torch · onnx على الكرت
[ -d /d ] && { mkdir -p /d/autoedit/tmp; export TEMP="D:/autoedit/tmp" TMP="D:/autoedit/tmp"; }
FPS="$REEL_FPS"
_GPU_PY="$(dirname "${BASH_SOURCE[0]:-$0}")/_gpu.py"
venc(){ "$PY" "$_GPU_PY" venc "$@"; }      # VENC=$(venc 21 6M) ← NVENC أو x264 مع تحذير
hwdec(){ "$PY" "$_GPU_PY" hwdec; }         # فك ترميز المصدر على الكرت
case "$(abspath "${1:-.}" 2>/dev/null)" in ${RENDER_ROOT:0:2}*|"") ;; *) [ -d "${1:-}" ] && echo "⚠️ مجلد الشغل مو على ${RENDER_ROOT:0:2} — القاعدة: كل الرندر على $RENDER_ROOT" >&2 ;; esac
