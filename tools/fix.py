import json, subprocess, re, wave, numpy as np, itertools
from piper import PiperVoice, SynthesisConfig
from faster_whisper import WhisperModel
exec(open('asr.py').read().split('def tx')[0].split("m = Whisper")[0])  # imports
OK = eval(re.search(r"OK = (\{.*\})", open('asr.py').read()).group(1))
v = PiperVoice.load('/workspace/voices/en_US-amy-medium.onnx')
M = [WhisperModel(n, device='cpu', compute_type='int8') for n in ('base.en','small.en')]
IPA=dict(re.findall(r"(\w):'([^']+)'", re.search(r"const IPA=\{(.*?)\}", open('gen.js').read()).group(1)))
ph=json.load(open('phrases.json')); man=json.load(open('manifest.json')); idx={k:i for i,(k,_) in enumerate(ph)}
AF='silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_duration=0.35:stop_threshold=-50dB,asetrate=22050*1.04,aresample=22050,speechnorm=e=4:r=0.0001:l=1,apad=pad_dur=0.08'
def synth(t, ls, out):
    with wave.open('/tmp/f.wav','wb') as w: v.synthesize_wav(t, w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.7))
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i','/tmp/f.wav','-af',AF,'-ac','1','-ar','22050','-c:a','libmp3lame','-b:a','40k',out],check=True)
def tx(f, m):
    r=subprocess.run(['ffmpeg','-loglevel','error','-i',f,'-af','adelay=700,apad=pad_dur=1','-ar','16000','-ac','1','-f','f32le','-'],capture_output=True,check=True)
    seg,_=m.transcribe(np.frombuffer(r.stdout,dtype=np.float32), language='en', beam_size=5, initial_prompt='Letters of the alphabet:')
    return ' '.join(s.text for s in seg).strip()
def ok(t,c,pre):
    n=' '.join(re.sub(r'[^a-z ]',' ',t.lower()).split()); 
    if pre: 
        if not n.startswith(pre): return False
        n=n[len(pre):].strip()
    return n in OK[c] or n.replace(' ','') in [x.replace(' ','') for x in OK[c]]
def passes(f,c,pre): 
    ts=[tx(f,m) for m in M]; return all(ok(t,c,pre) for t in ts), ts
res={}
for c in 'abcdefghijklmnopqrstuvwxyz':
  p=IPA[c]; alts=[p, p.replace('iː','iːː').replace('eɪ','eːɪ').replace('aɪ','aːɪ').replace('oʊ','oːʊ')]
  for key,pre in [(c,''),('big '+c,'big'),('little '+c,'little')]:
    f='out/%s.mp3'%man[key]; good,ts=passes(f,c,pre)
    if good: res[key]=('orig',ts); continue
    W={'':'','big':'Big','little':'Little'}[pre]
    cands=[]
    for a in alts:
      for punc in ['.','!','?']:
        for sep in [' ', ', ']:
          cands.append((W+sep if W else '')+'[['+a+punc+']]')
    found=None
    for t in cands:
      for ls in (1.12,1.3):
        synth(t,ls,'/tmp/c.mp3'); g,ts=passes('/tmp/c.mp3',c,pre)
        if g: found=(t,ls,ts); break
      if found: break
    if found: subprocess.run(['cp','/tmp/c.mp3',f]); ph[idx[key]][1]=found[0]; res[key]=found
    else: res[key]=('FAIL',ts)
    print(key,res[key],flush=True)
json.dump(ph,open('phrases_fixed.json','w'),ensure_ascii=False)
print('FAILS',[k for k,v in res.items() if v[0]=='FAIL'])
