/* ═══ smooth-kit.js — حركة أنعم وأسلس (إضافة oussama-video) ═══
   يُحمّل بـcompose.html بعد motion-kit.js:  <script src="smooth-kit.js"></script>
   كل شي دالة بالزمن t — حتمي، بلا حالة من الفريم اللي قبله (شرط الرسم المتوازي والتمويه الحركي).

   SK.ease.*          منحنيات: outCubic outQuart outQuint outExpo inOutCubic inOutQuint inOutSine outBack(خفيف) smooth smoother
   SK.spring(k,o)     نابض فيزيائي مخمّد (o.zeta=0.55 ارتداد خفيف · 1 بلا ارتداد) — k من 0 لـ1 تقدّم الزمن
   SK.track(t,keys)   مسار مفاتيح مثل أفتر إفكتس: [[t0,v0],[t1,v1,'outExpo'],…] — أرقام أو مصفوفات [x,y,s,…]
   SK.inOut(t,s,e,o)  دخول + ثبات + خروج بقيمة 0..1 (o.in=0.45, o.out=0.35, o.ease='outExpo')
   SK.stagger(t,s,i,o) تأخير متدرّج للعنصر رقم i (o.gap=0.07) ← تقدّم 0..1 جاهز للمنحنى
   SK.float(t,o)      طفو هادي مستمر (o.amp=6 بكسل, o.f=0.35 هرتز, o.seed) — يخلي العنصر الثابت حي
   SK.cam(t,keys)     كاميرا ناعمة {x,y,s,r} بمسار مفاتيح + طفو خفيف — طبّقها بـSK.applyCam(X,c)
   SK.fadeScale(t,s,e) قيمة {a,s,y} جاهزة لدخول ناعم (تلاشي + تكبير 0.92→1 + صعود 24 بكسل)

   ⛔ قواعد النعومة (من مكتبة lemo-opuscar + خبرة الريلات):
   - لا حركة خطية أبداً، ولا قفزة بلا منحنى. الاستثناء الوحيد: «بوب» كوميدي مقصود فريم واحد.
   - الدخول ≥ 0.35 ث، الخروج ≥ 0.25 ث، والخروج أسرع من الدخول.
   - ترقّب ← حركة ← متابعة: العنصر الكبير يرجع 2-4٪ قبل ما ينطلق، ويتجاوز 2-3٪ ويرجع (spring zeta≈0.6).
   - كل شي يتحرك بعناصر متعددة = stagger 60-90 ملي ثانية، مو كلهم بنفس الفريم.
   - لا Math.round على مواقع متحركة (يسبب رجفة بكسل) — الكانفس يرسم بكسور البكسل.
   - الكاميرا تتحرك كل فريم بنعومة حتى لو العنصر «على اثنين» (12 فريم/ث ستايل) — كاميرا متقطعة = لاق.
   - التمويه الحركي (theme.json ← motionBlur) يشتغل على كل الفريم تلقائياً — لا ترسم ذيول يدوية. */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const pr = (t, a, b) => b === a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a), 0, 1);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    linear: k => k,
    outCubic: k => 1 - Math.pow(1 - k, 3),
    outQuart: k => 1 - Math.pow(1 - k, 4),
    outQuint: k => 1 - Math.pow(1 - k, 5),
    outExpo: k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k),
    inCubic: k => k * k * k,
    inOutCubic: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
    inOutQuint: k => k < .5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2,
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    inOutExpo: k => k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2,
    outBack: k => { const c = 1.25, c3 = c + 1; return 1 + c3 * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },   // تجاوز خفيف ≈4٪
    smooth: k => k * k * (3 - 2 * k),
    smoother: k => k * k * k * (k * (k * 6 - 15) + 10),
  };
  const ez = e => typeof e === 'function' ? e : (E[e] || E.outCubic);

  /* نابض مخمّد بحل مغلق — k: تقدّم 0..1 على مدة الحركة، zeta: التخميد، w: عدد الاهتزازات تقريباً */
  function spring(k, o = {}) {
    if (k <= 0) return 0; if (k >= 1) return 1;
    const z = o.zeta == null ? 0.55 : o.zeta, w = (o.freq || 2.2) * 2 * Math.PI, x = k * 1.6;
    if (z >= 1) return 1 - (1 + w * x) * Math.exp(-w * x);
    const wd = w * Math.sqrt(1 - z * z);
    const v = 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z * w / wd) * Math.sin(wd * x));
    return lerp(v, 1, E.smoother(pr(k, 0.85, 1)));   // يضمن الوصول بالضبط لـ1 بنهاية المدة
  }

  const mix = (a, b, k) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], k)) : lerp(a, b, k);
  /* مسار مفاتيح: keys=[[t, value, ease?], …] — ease على المقطع اللي **ينتهي** بهالمفتاح */
  function track(t, keys) {
    if (!keys.length) return 0;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) {
        const k = pr(t, t0, t1);
        const f = e === 'spring' ? spring(k) : ez(e || 'inOutCubic')(k);
        return mix(v0, v1, f);
      }
    }
    return keys[keys.length - 1][1];
  }

  function inOut(t, s, e, o = {}) {
    const ti = o.in || 0.45, to = o.out || 0.35;
    if (t < s || (e != null && t > e)) return 0;
    const a = ez(o.ease || 'outExpo')(pr(t, s, s + ti));
    const b = e == null ? 1 : 1 - ez(o.easeOut || 'inCubic')(pr(t, e - to, e));
    return Math.min(a, b);
  }
  const stagger = (t, s, i, o = {}) => pr(t, s + i * (o.gap || 0.07), s + i * (o.gap || 0.07) + (o.dur || 0.5));

  function float(t, o = {}) {
    const a = o.amp == null ? 6 : o.amp, f = o.f || 0.35, s = o.seed || 0;
    return { x: a * 0.6 * Math.sin(2 * Math.PI * f * 0.73 * t + s * 1.7), y: a * Math.sin(2 * Math.PI * f * t + s), r: 0.004 * Math.sin(2 * Math.PI * f * 0.51 * t + s * 2.3) };
  }
  function fadeScale(t, s, e, o = {}) {
    const k = inOut(t, s, e, o);
    const kin = ez(o.ease || 'outExpo')(pr(t, s, s + (o.in || 0.45)));
    return { a: k, s: lerp(o.from || 0.92, 1, kin), y: (1 - kin) * (o.rise == null ? 24 : o.rise) };
  }
  /* كاميرا: keys بنفس صيغة track لكن القيمة {x,y,s,r} ← مصفوفة [x,y,s,r] */
  function cam(t, keys, o = {}) {
    const v = keys && keys.length ? track(t, keys) : [0, 0, 1, 0];
    const fl = o.float === false ? { x: 0, y: 0, r: 0 } : float(t, { amp: o.amp == null ? 3 : o.amp, f: 0.18 });
    return { x: v[0] + fl.x, y: v[1] + fl.y, s: v[2] == null ? 1 : v[2], r: (v[3] || 0) + fl.r };
  }
  function applyCam(X, c, cx = 540, cy = 960) {
    X.translate(cx + c.x, cy + c.y); X.rotate(c.r); X.scale(c.s, c.s); X.translate(-cx, -cy);
  }

  G.SK = { ease: E, ez, spring, track, inOut, stagger, float, fadeScale, cam, applyCam, pr, lerp, cl };
})();
