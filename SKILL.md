---
name: video-ad-editor
description: يمنتج فيديو كلام للكاميرا إلى ريل أو إعلان 9:16 — يشيل السكتات، كابشن عربي بتوقيت الكلمة، وموشن قرافيكس بألوانه. Use when user says "منتج هذا المقطع"، "سو من هذا الفيديو إعلان"، "شيّل السكتات"، "حوّل الفيديو لريل"، "ركّب كابشن عربي"، "اقص الصمت"، or sends a talking-head video. Not for carousels or video covers.
---

# ريل من فيديو كلام — كله كود

ffmpeg يقص، وِسبر يفرّغ بتوقيت الكلمة، ومحرّك رسم يركّب الكابشن والموشن. المخرَج MP4 واحد.
المسارات (`scripts/` `references/` `styles/` `motion/`) من `${CLAUDE_SKILL_DIR}`. التفاصيل الطويلة بـ`references/production-details.md` — افتح القسم اللي تحتاجه بس.

## 💰 التوكنز أولاً (إلزامي — الاستهلاك غالي)
1. **ممنوع قراءة `scripts/compose.REFERENCE.html` كامل** (96 ك ≈ 30 ألف توكن). تحتاج دالة؟
   `grep -n "^function \|^const [A-Z_]*=" scripts/compose.REFERENCE.html` ثم `sed -n 'a,bp'` للمدى المطلوب بس. نفس الشي لـ`motion-kit.js` و`compose.EXAMPLES.js`.
2. **لا تقرأ أي ملف كامل:** `grep -n`، `head`، `tail -5` للسجلات. المراجع عند الحاجة بس، وبالقسم المطلوب.
3. **صورة وحدة لكل معاينة:** ورقة لقطات (`07_contact_sheet.sh`) بعرض 1080 أو أصغر — ولا صور فرادى. الفحوص الثانية بالأرقام.
4. **أمر واحد لكل مرحلة** بالخلفية، وانتظر الإشعار — لا متابعة متكررة.
5. **ردود قصيرة:** سطرين + صورة لو لازم. لا تعيد شرح شي قلته.
6. **لا تعيد شغل جاهز:** `theme.json` و`caps.json` و`cut.json` محفوظة — الفيديو الثاني يبدأ منها، والرسم يكمّل من وين وقف.

## 🎛️ قواعد oussama-video الثابتة
1. **كل الثقيل على كرت الشاشة:** الترميز NVENC عبر `_gpu.py`/`_gpu.js` (`venc()`) — لا `libx264` باليد. فك ترميز `-hwaccel cuda`، HDR بـlibplacebo، وِسبر `python scripts/_gpu.py whisper <wav> <work>` (بيئة `D:/autoedit/gpuenv`، turbo)، كروم على الكرت × 4 صفحات، قص الخلفية rembg/MODNet. فحص: `python scripts/_gpu.py check`.
2. **كل الرندر على D:** `<work>` = `D:/autoedit/renders/<اسم>`، المؤقت `D:/autoedit/tmp`. القرص C ممتلئ — ولا ملف عليه.
3. **60 فريم + تمويه حركي + `smooth-kit.js`** ← `references/smooth-motion.md` قبل أي مشهد.
4. **الستايل:** اختر من `styles/README.md` وطبّق `python scripts/apply_style.py <ستايل> <work>`، ثم التزم بـ`styles/<ستايل>/STYLE.md`. ما حدّد؟ `glow-talk` (كلام) أو `faceless-mg` («بلا وجه»). قله بجملة.

## مو فيديو كلام؟
| المدخل | اقرأ |
|---|---|
| مقاطع بلا كلام | `references/montage.md` |
| كاميرتان+ / حلقة بالعرض | `references/podcast.md` |
| حلقة ساعة ← ريلات | `references/landscape.md` (قسم «حلقة كاملة») |
| نص أو فكرة أو موقع، بلا شخص | `references/motion-mode.md` |
| دافنشي | `references/davinci.md` |
| يبي يعدّل بنفسه | `references/studio.md` |
السكل المنفصل (`motion-video`، `podcast-video`، `montage-video`) أولى لو موجود. ⛔ لا تسأله «أي وضع؟» — قل شنو فهمت وكمّل.

## ⛔ أسلوبك معه
أنت اللي تجهّز — لا قائمة أوامر له، ولا «عندك كذا؟» (افحص بنفسك). بلا مصطلحات. قل وين احنا وكم ياخذ. شي واحد بكل مرة، ووريه بعد كل مرحلة مهمة. ويندوز: `python` والمسارات `C:/…`.

## الخطوات
**0–1) البداية:** نفّذ `references/start.md` (الأدوات، الذوق، الهوية).
**2) الفيديو:** انسخه `<work>/src.mov` (رابط درايف ← production-details). 1080p مقبول — لا ترفضه. بالعرض؟ نفس الخطوات (`landscape.md`). ريل من حلقة = هوك مكتوب إلزامي (`22_hook.py`). شك بفريمات ساقطة أو إضاءة؟ ← production-details. `python scripts/25_scopes.py <work>` بصمت.
**3) القص:** `python scripts/01_cut_plan.py <work>` — قل كم انشال. صوت سيئ؟ `bash scripts/02b_enhance_audio.sh <work> --local`.
**4) التفريغ:**
```bash
ffmpeg -v error -hwaccel cuda -i <work>/src.mov -vn -ac 1 -ar 16000 -y <work>/a.wav
python scripts/_gpu.py whisper <work>/a.wav <work> > <work>/whisper.log 2>&1
```
آخر سطر لازم `cuda`. دارجة؟ turbo (large-v3 يحوّلها فصحى).
**5) التصحيح:** صحّح `a.json` واكتب `<work>/fixes.json` ← `{"fix":[[…كلمات كل جملة]],"hot":[…],"fx":{…}}` ⛔ عدد كلمات كل جملة = عدد كلمات وِسبر. ثم `python scripts/02_captions.py <work>`.
**5.5) إلزامي:** `python scripts/10_script_edit.py <work> show` — اطبع السكربت كامل بالشات واسأله شنو يشيل (`drop`/`keep`/`undo`).
**6) القص والزوم:**
```bash
python scripts/03_cut_zoom.py <work>
mkdir -p <work>/vfr && ffmpeg -v error -hwaccel cuda -i <work>/cutz.mp4 -vf fps=60 -q:v 3 -y <work>/vfr/%05d.jpg
```
فيه كرت فيديو (`R_DOWN`/`R_LOWER`)؟ `python scripts/23_headcrop.py <work> --from <ث>` إلزامي.
**7) المشاهد ← أهم خطوة.** اقرأ: `STYLE.md` للستايل · `smooth-motion.md` · `motion-rules.md` · `scenes.md`. التخطيط (`R_FULL`/`R_DOWN`/`R_LOWER`/`R_OFF`) والمنطقة الآمنة ← production-details. ⛔ الكابشن ما ينكتب على الوجه.
معاينة قبل الرسم الكامل — ورقة وحدة:
```bash
node scripts/04_render_frames.js <work> preview 1.2 4.6 12.3 27.6 31.0 48.4
bash scripts/07_contact_sheet.sh <work> <work>/sheet.jpg 1.2 4.6 12.3 27.6 31.0 48.4
```
إضافات (ورا الشخص، إيقاع، كولاج، أفاتار…) ← جدول «الإضافات» بـproduction-details.
**8) الصوت:** `<work>/sfx.json` ثم `python scripts/05_sfx.py <work>`.
**9) الرسم:** `node scripts/04_render_frames.js <work> all` ثم `bash scripts/06_encode.sh <work> <work>/ad-final.mp4`.
**10) المعايرة:** `bash scripts/06b_master.sh <work> <work>/ad-final.mp4 <work>/ad-master.mp4`.
**11) الترجمة:** `python scripts/09_srt.py <work> ad-master`.
**12) الكفر (إلزامي):** `28_cover.py … --first` ← production-details.

## ⛔ القواعد الثابتة
1. مؤثر صوتي بلحظة لها معنى فقط — 15/دقيقة بالكثير، الذروة < ‎-18 dBFS. (الستايل قد يقول «بدون».)
2. أرقام غربية. 3. الألوان من `theme.json` لا غير.
4. صفر تعديل لوني على صورته (`grade:false`) — إلا بطلبه، أو `"grade":"auto"` بعد موافقته على فحص الإضاءة، أو ستايل `prof-amine`.
5. HDR يتحوّل تلقائياً بـ`03_cut_zoom.py` (libplacebo على الكرت) — لا تحويل ساذج.
6. صحّح وِسبر، و**لا تخترع كلاماً** ما قاله.
7. لا نشر ولا جدولة — التسليم ملف.
8. «ورا الشخص» و«طبقات» مرة أو مرتين بالفيديو.
9. «ملف صوتي بالخلفية» لا «موسيقى» — يحدده هو (`bg-audio.mp3`).
10. مشاهد جديدة كل مرة — الأمثلة أنماط مو قوالب.
11. الصور والشعارات بنسبتها الأصلية — لا ضغط ولا قص إلا بطلبه.
12. القرآن حرفياً من API (`api.quran.com` text_imlaei) وتُقارن بمصدر ثانٍ، خط `Amiri Quran`.
13. الزوم آوت = رجوع من زوم إن فقط.
14. الهوك فيه حركة بأول ثانية.
15. الكلمة المنبثقة تبقى لين تخلص جملتها (≥ 0.6 ث).
16. ممنوع افتراضياً (إلا بطلبه أو ستايله): كتابة حرف حرف، توهج/ارتداد/تدرّج على النص، بنفسجي←أزرق. التوهج المسموح = `capStyle:"glow"/"keywords"`.
17. متحدث هادي متعمّد (قرآن، موعظة)؟ اسأله «أخلي السكتات؟» ← `cut.json` ← `"keep":[[0,المدة]]`.
18. عنصر واحد بالمرة ووريه. الطلب صغير؟ عدّل الجزء المطلوب بس.

## التسليم
قبل الرسم الكامل `32_midframes.py`، وقبل التسليم `08_safe_check.js <work> --shot` + قائمة «التحقق» بـproduction-details.
اعرض الملف مع: المدة، كم انشال، عدد المشاهد، العلو. سلّم `.srt` و`.txt`، واذكر إنك ما نشرت شي.
خريطة السكربتات ← `references/script-map.md`
