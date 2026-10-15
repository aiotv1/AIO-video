/* ── GPU + مسار الرندر + الفريمات — مصدر واحد لكل سكربتات النود (إضافة oussama-video) ──
   - FPS: 60 افتراضياً (REEL_FPS) — الحركة أنعم.
   - RENDER_ROOT: D:/autoedit/renders افتراضياً — كل الرندر على القرص D.
   - chromeArgs: كروم يرسم على كرت الشاشة (ANGLE/D3D11 + تسريع الرسم) بدل المعالج.
   - venc(crf,maxrate): NVENC على الكرت، وإلا libx264 مع تحذير.
   - workers(): كم صفحة كروم ترسم بالتوازي.
   node scripts/_gpu.js check   ← يطبع اسم الكرت اللي كروم يرسم عليه */
const {spawnSync}=require('child_process'), os=require('os');
const FPS=+(process.env.REEL_FPS||60);
const RENDER_ROOT=(process.env.RENDER_ROOT||'D:/autoedit/renders').replace(/\\/g,'/');
/* القرص C ممتلئ: بروفايل كروم المؤقت وكل ملف مؤقت على D (os.tmpdir يقرأ TEMP وقت الاستدعاء) */
const TMP_ROOT=process.env.RENDER_TMP||'D:/autoedit/tmp';
try{ const fs=require('fs'); if(fs.existsSync(TMP_ROOT.slice(0,3))){ fs.mkdirSync(TMP_ROOT,{recursive:true}); process.env.TEMP=process.env.TMP=process.env.TMPDIR=TMP_ROOT; } }catch(e){}
const NO_GPU=!!process.env.NO_GPU;
const chromeArgs=NO_GPU?[]:[
  '--ignore-gpu-blocklist','--enable-gpu','--enable-gpu-rasterization','--enable-zero-copy',
  '--enable-accelerated-2d-canvas','--disable-gpu-driver-bug-workarounds',
  ...(process.platform==='win32'?['--use-angle=d3d11']:[]),
];
let _nv=null;
function hasNvenc(){
  if(_nv!==null) return _nv;
  if(NO_GPU) return _nv=false;
  const r=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','color=black:s=256x256:d=0.1','-c:v','h264_nvenc','-f','null','-'],{timeout:30000});
  return _nv=(r.status===0);
}
function dbl(r){ const s=String(r), u=s.slice(-1); return /[kKmM]/.test(u)?(parseFloat(s)*2)+u:String(parseFloat(s)*2); }
function venc(crf=19,maxrate=null,preset='slow'){
  let a;
  if(hasNvenc()) a=['-c:v','h264_nvenc','-preset',/slow/.test(preset)?'p6':'p5','-tune','hq','-rc','vbr','-cq',String(crf),'-b:v','0',
    '-spatial-aq','1','-temporal-aq','1','-aq-strength','8','-rc-lookahead','32','-bf','3','-b_ref_mode','middle','-profile:v','high'];
  else { process.stderr.write('⚠️ NVENC ما اشتغل — أرمّز على المعالج (أبطأ)\n'); a=['-c:v','libx264','-preset',preset,'-crf',String(crf)]; }
  if(maxrate) a.push('-maxrate',String(maxrate),'-bufsize',dbl(maxrate));
  return a;
}
/* صفحات متوازية: كل صفحة ≈ 300-400 ميقا رام. الكرت يرسم والمعالج يضغط JPEG — 4 تكفي جهاز عادي */
function workers(){ return Math.max(1,+(process.env.RENDER_WORKERS||Math.min(4,Math.max(1,Math.floor(os.cpus().length/3))))); }
function onRenderDrive(p){ return require('path').resolve(p).replace(/\\/g,'/').slice(0,2).toLowerCase()===RENDER_ROOT.slice(0,2).toLowerCase(); }
function warnIfNotD(p){ if(!onRenderDrive(p)) process.stderr.write(`⚠️ مجلد الشغل مو على ${RENDER_ROOT.slice(0,2)} — القاعدة: كل الرندر على ${RENDER_ROOT}\n`); }
module.exports={FPS,RENDER_ROOT,chromeArgs,venc,hasNvenc,workers,warnIfNotD,onRenderDrive};

if(require.main===module && process.argv[2]==='check'){
  (async()=>{
    console.log('FPS',FPS,'· الرندر',RENDER_ROOT,'· NVENC',hasNvenc()?'✅':'❌','· صفحات متوازية',workers());
    let pup; for(const m of ['puppeteer-core','puppeteer']){ try{ pup=require(m); break; }catch(e){} }
    if(!pup){ console.log('puppeteer-core مو مثبّت هني — شغّله من مجلد السكل'); return; }
    const fs=require('fs'), LA=process.env.LOCALAPPDATA||'', PF=process.env.ProgramFiles||'C:/Program Files', P86=process.env['ProgramFiles(x86)']||'C:/Program Files (x86)';
    const exe=process.env.CHROME_PATH||[PF+'/Google/Chrome/Application/chrome.exe',P86+'/Google/Chrome/Application/chrome.exe',LA+'/Google/Chrome/Application/chrome.exe',PF+'/Microsoft/Edge/Application/msedge.exe',P86+'/Microsoft/Edge/Application/msedge.exe'].find(f=>fs.existsSync(f));
    const b=await pup.launch({executablePath:exe,headless:'new',args:['--no-sandbox',...chromeArgs]});
    const p=await b.newPage();
    const r=await p.evaluate(()=>{ const g=document.createElement('canvas').getContext('webgl2'); if(!g) return 'بلا WebGL';
      const e=g.getExtension('WEBGL_debug_renderer_info'); return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER); });
    console.log('كروم يرسم على:',r, /swiftshader|software|basic render/i.test(r)?'❌ (معالج)':'✅');
    await b.close();
  })();
}
