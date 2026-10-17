import json, wave, subprocess, os, hashlib
from piper import PiperVoice
try:
    from piper import SynthesisConfig
except ImportError:
    SynthesisConfig=None
v = PiperVoice.load('/workspace/voices/en_US-amy-medium.onnx')
ph = json.load(open('phrases.json')); os.makedirs('out', exist_ok=True); man = {}
for i,(k,t) in enumerate(ph):
    fn = 'p%03d' % i; wav = f'/tmp/{fn}.wav'
    with wave.open(wav,'wb') as w:
        if SynthesisConfig: v.synthesize_wav(t, w, syn_config=SynthesisConfig(length_scale=1.12, noise_scale=0.7, noise_w_scale=0.8))
        else: v.synthesize(t, w, length_scale=1.12)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',wav,'-af','silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_duration=0.35:stop_threshold=-50dB,asetrate=22050*1.04,aresample=22050,speechnorm=e=4:r=0.0001:l=1,apad=pad_dur=0.08','-ac','1','-ar','22050','-c:a','libmp3lame','-b:a','40k',f'out/{fn}.mp3'],check=True)
    man[k]=fn
json.dump(man, open('manifest.json','w'))
