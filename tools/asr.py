import json, subprocess, re, sys
from faster_whisper import WhisperModel
m = WhisperModel(sys.argv[1] if len(sys.argv)>1 else 'base.en', device='cpu', compute_type='int8')
man = json.load(open('manifest.json'))
OK = {'a':['a','ay','eh','hey'],'b':['b','bee','be'],'c':['c','see','sea'],'d':['d','dee'],'e':['e','ee'],'f':['f','ef','eff'],'g':['g','gee','ji'],'h':['h','aitch','age'],'i':['i','eye','aye'],'j':['j','jay'],'k':['k','kay','okay'],'l':['l','el','ell'],'m':['m','em'],'n':['n','en'],'o':['o','oh'],'p':['p','pee','pe'],'q':['q','cue','queue'],'r':['r','are','ar'],'s':['s','es','ess'],'t':['t','tee','tea'],'u':['u','you'],'v':['v','vee'],'w':['w','double u','double you','doubleu'],'x':['x','ex'],'y':['y','why'],'z':['z','zee']}
def tx(f):
    _r=subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'out/{f}.mp3','-af','adelay=700,apad=pad_dur=1','-ar','16000','-ac','1','-f','f32le','-'],check=True,capture_output=True)
    import numpy as np; a=np.frombuffer(_r.stdout,dtype=np.float32)
    seg,_ = m.transcribe(a, language='en', beam_size=5, initial_prompt='Letters of the alphabet:')
    return ' '.join(s.text for s in seg).strip()
fails=0
for c in 'abcdefghijklmnopqrstuvwxyz':
    row=[]
    for key,pre in [(c,''),('big '+c,'big '),('little '+c,'little ')]:
        t=tx(man[key]); n=re.sub(r'[^a-z ]',' ',t.lower()).split()
        n=' '.join(n); rest=n[len(pre):].strip() if n.startswith(pre.strip()) else n
        ok = rest in OK[c] or rest.replace(' ','') in [x.replace(' ','') for x in OK[c]]
        fails+= not ok; row.append(f"{'OK ' if ok else 'BAD'} {key!r}->{t!r}")
    print(' | '.join(row))
print('FAILS',fails)
