# -*- coding: utf-8 -*-
"""يطبّق ستايل على مجلد الشغل (oussama-video).
   python apply_style.py list                     ← قائمة الستايلات
   python apply_style.py <ستايل> <work>           ← يدمج styles/<ستايل>/theme.json مع <work>/theme.json
   python apply_style.py <ستايل> <work> --force   ← الستايل يفوز حتى بالألوان والخط

القاعدة: theme.json تبع العميل يفوز بالهوية (ألوان، شعار، خط، حساب) — الستايل يحدد الشكل والحركة.
ستايل بألوانه الخاصة (faceless-mg، minimal، bold-kinetic) ياخذ ألوانه بس لو العميل ما عنده ألوان."""
import json, os, sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
STYLES = os.path.join(HERE, "..", "styles")
IDENTITY = {"bg", "ink", "acc", "clay", "mut", "font", "logo", "handle", "onAcc", "fontFiles", "latinFont"}


def styles():
    return sorted(d for d in os.listdir(STYLES) if os.path.isfile(os.path.join(STYLES, d, "theme.json")))


def main(a):
    if not a or a[0] == "list":
        for s in styles():
            first = open(os.path.join(STYLES, s, "STYLE.md"), encoding="utf-8").readline().strip("# \n")
            print(f"{s:14} {first}")
        return 0
    name, work = a[0], a[1]
    force = "--force" in a
    if name not in styles():
        print(f"✗ ما فيه ستايل اسمه {name} — الموجود: {', '.join(styles())}")
        return 1
    st = json.load(open(os.path.join(STYLES, name, "theme.json"), encoding="utf-8"))
    tp = os.path.join(work, "theme.json")
    th = json.load(open(tp, encoding="utf-8")) if os.path.exists(tp) else {}
    had_colors = any(k in th for k in ("bg", "acc", "ink"))
    kept, changed = [], []
    for k, v in st.items():
        if not force and k in IDENTITY and (k in th or (had_colors and k in ("bg", "ink", "acc", "clay", "mut"))):
            kept.append(k)
            continue
        th[k] = v
        changed.append(k)
    th["style"] = name
    os.makedirs(work, exist_ok=True)
    json.dump(th, open(tp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"✅ الستايل {name} على {tp}")
    print("   تغيّر:", ", ".join(changed) or "—")
    if kept:
        print("   بقى من هوية العميل:", ", ".join(kept))
    notes = []
    if st.get("noCut"):
        notes.append("بلا قص سكتات: بعد 01_cut_plan.py اكتب cut.json ← {\"keep\":[[0, المدة]]}")
    if st.get("sfx") == "none":
        notes.append("بلا مؤثرات صوتية: sfx.json فيه outro بس")
    if st.get("faceless"):
        notes.append("بلا وجه: SCENES كلها m:R_OFF")
    if st.get("music"):
        notes.append("موسيقى خلفية: حط الملف بـ<work>/bg-audio.mp3 (06b_master.sh يخفضها تحت الكلام)")
    for n in notes:
        print("   •", n)
    print(f"   الثوابت: styles/{name}/STYLE.md — اقرأها قبل تصميم المشاهد")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
