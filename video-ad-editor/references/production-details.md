<!-- تفاصيل خطوات الإنتاج — نُقلت من SKILL.md لتوفير التوكنز. افتح القسم اللي تحتاجه بس (grep -n "^## " لهالملف) -->

# تفاصيل الإنتاج

## الفيديو من رابط قوقل درايف
مشاركة «أي شخص لديه الرابط»، والـID بين `/d/` و`/view`:
```bash
curl -sL "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t" -o <work>/src.mov
```
ملف خاص؟ أدوات كونكتور قوقل درايف بالجلسة.

## فريمات ساقطة (تسجيل متصفح / تطبيق كاميرا مو أصلي)
```bash
ffprobe -v error -select_streams v -show_entries frame=pts_time -of csv=p=0 <work>/src.mov | python -c "import sys;t=[float(x) for x in sys.stdin if x.strip()];g=[(round(a,2),round(b-a,2)) for a,b in zip(t,t[1:]) if b-a>0.07];print(len(g),'فجوة',g[:8])"
ffmpeg -hwaccel cuda -i src.mov -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -c:a copy src_fixed.mov
```
وقل له: «التسجيل كان ساقط فيه فريمات — رمّمته».

## فحص الإضاءة (`25_scopes.py`)
- «سليمة» ← لا تذكرها. مشكلة ← جملة وحدة: «الفيديو غامق شوي ومايل للأصفر — أعدّله؟» + قبل/بعد بلقطة وحدة.
- وافق ← `theme.json` ← `"grade":"auto"`. رفض أو سكت ← لا تلمسه.

## هوك الحلقة/المقابلة (`22_hook.py`)
1. `python scripts/22_hook.py suggest <work>`
2. 3 هوكات من أقوى سطر (مو أول جملة) ← `check` ← هو يختار ← `apply`
3. `preview` واقرأ `hook_sheet.jpg`. ريل جاهز من برّا؟ `overlay` ← `hook.mov`. القواعد ← `podcast-hook.md`

## تعديل السكربت (`10_script_edit.py`)
- `show` يطبع الكلام مرقّماً + الجمل المعادة واقتراح الحذف (لا تشغّل `dupes` بعده). اطبعه كامل بالشات.
- الجملة المعادة: الأولى غلط والثانية التصحيح.
- `drop 6 8` · `keep 1 2 5 9` · `undo` — `cut.json` و`caps.json` و`sfx.json` تتحدّث. بعد أي حذف: أعد الخطوة 6 والرسم بـ`--force`.

## القصّ من فوق الراس (`23_headcrop.py`) — إلزامي بأي فيديو فيه كرت
- `python scripts/23_headcrop.py <work> --from <بداية أول كرت>` ← `studio.json` ← `cardTop`.
- ثابت طول الفيديو، يبدأ فوق أعلى نقطة وصلها راسه بهامش 1.5٪ — لا ينقص راسه ولا يترك سقفاً فاضياً.
- تحقق بلقطة يقرّب فيها من الكاميرا. نص محروق تحت جسمه؟ `theme.json` ← `cardZoom`.

## قاعدة التخطيط (معتمدة)
| اللحظة | المستطيل | الشكل |
|---|---|---|
| كلام بلا رسم | `R_FULL` | وجهه ملء الشاشة، أسفل الكابشن 1460 |
| أي رسم أو موشن | `R_DOWN` | الرسم فوق (y 280-520) ← الكابشن ← وجهه تحت |
| بي-رول أو لوحة كبيرة | `R_LOWER` | الكرت الكبير فوق ← الكابشن ← وجهه صغير |
| شرح كامل | `R_OFF` | بلا وجه، صوته يكمّل ← `explainer-and-pace.md` |

## المنطقة الآمنة (أزرار انستقرام — `08_safe_check.js`)
| المنطقة | لا نص فيها |
|---|---|
| أعلى | y 0-150 |
| أسفل | y 1620-1920 (حذر 1500-1620) |
| يمين | x 950-1080 بين y 1100 و1750 |
أول كابشن يبان بأول نص ثانية. `08_safe_check.js <work> --shot` يخرج بالرمز 3 لو فيه خرق، والحدود بـ`<work>/safe.json`.

## الإضافات — كل وحدة بمرجعها
| الإضافة | المرجع |
|---|---|
| تسجيل شاشة جوال | `screen-recording.md` |
| الكلام ورا الشخص، قدام اللوحة، «طبقات» الهوك | `cut-styles.md` (`11_behind_text.js <work> stack 1` / `drop <رقم>`) |
| مؤثرات على الإيقاع | `beat-fx.md` |
| حركات الكلمة، الكشيدة، ستايلات الكابشن | `word-fx.md` |
| شرح بلا وجه + إيقاع هادي | `explainer-and-pace.md` |
| خلفية باهتة | `backdrop.md` |
| كولاج | `collage.md` |
| دوّر لقطة بالمعنى بالبي-رول | `find-shots.md` |
| مشاهد مولّدة (FAL_KEY) | `gen-scenes.md` |
| أفاتار | `talking-avatar.md` (اقرأ «جُرّب وفشل» قبل أي صرف) |
| الاستوديو | `studio.md` |
| عنصر يلحق إيده | `python scripts/29_handtrack.py <work> <من> <إلى>` ← `palm.js` ← `palmAt(t)` (حوّل بمقياس الكرت) |

## المؤثرات الصوتية (`sfx.json`)
```json
{ "outro": 0, "whoosh_up": [3.1,11.25], "whoosh_down": [7.85], "thud": [27.27], "tap": [23.08] }
```
`outro` = مدة كرت الختام (0 = بدونه).

## الرسم والتجميع
- يكمّل من وين وقف. عدّلت مشهداً؟ `04_render_frames.js <work> range 26.4 31.2` ثم `06_encode.sh`. `--force` مع `all` يعيد الكل.
- `06b_master.sh`: ‎-14 LUFS، و`<work>/bg-audio.mp3` ينضاف وينخفض تحت الكلام تلقائياً.
- `09_srt.py <work> ad-master` ← `.srt` + `.txt`.

## التحقق قبل التسليم
1. **قبل الرسم الكامل:** `python scripts/32_midframes.py <work>` — نص مقصوص، تداخل، رقم مو من `facts.md`، حواف القص.
2. **المزامنة:** فرّغ `ad-final.mp4` (`_gpu.py whisper`) وقارن بدايات الجمل بـ`caps.json` — الفرق < 0.1 ث.
3. **الصوت:** قرابة ‎-14 LUFS، والذروة ≤ ‎-1.5 dBTP.
4. **العين:** ورقة وحدة بـ6 لقطات من الناتج. مؤثرات نبضة؟ `beatfx-sheet.jpg`.
5. **الحجم** < 50 ميقا · **الكرت:** سطر الرسم الأول فيه «على الكرت · تمويه حركي»، و`ffprobe` = h264 ‏60/1.

## الكفر (أول فريم — إلزامي)
```bash
python scripts/28_cover.py <work> "سطر أول|*سطر ثاني ملوّن*" "سطر صغير" [--photo me.png] [--x قديم.png] [--ok جديد.png] --first <work>/ad-master.mp4
```
- كل المهم داخل مربع 1080×1080 بنص الصورة (y 420-1500)، بلا إطار.
- سطرين، 5 كلمات بالكثير، ≈9 أحرف بالسطر. العنوان ≥ 170 بكسل، أي نص ≥ 110، الشعار ≥ 200 ← `thumbnails.md`
- `--photo` صورة مقصوصة على لون خلفية الفيديو. `--x`/`--ok` بس لقصة «من كذا لكذا».
- الناتج `ad-master-cover.mp4`. اعرض `cover_grid.jpg`، ثم `34_phone_preview.py <work>/cover.jpg`.
