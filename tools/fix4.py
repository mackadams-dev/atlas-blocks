exec(open('asr4.py').read().split("bad=[]")[0])
def okk(k,ts):
  n=[nrm(t) for t in ts]; m_=re.match(r'^([a-z]) is for (.+)$',k)
  if m_:
    c,w=m_.groups(); return sum(x.endswith(w) and bool(x.split()) and x.split()[0] in OK[c] for x in n)
  return sum(x==k or x.replace(' ','')==k.replace(' ','') or (k=='gray' and x=='grey') for x in n)
todo=['hexagon','gray','fish','g is for grapes','moon','q is for queen','v is for violin','xylophone','zebra','z is for zebra','yellow','sun','octopus']
fixed=json.load(open('/tmp/new4.json'))
for k in todo:
  m_=re.match(r'^([a-z]) is for (.+)$',k)
  if m_:
    c,w=m_.groups(); cands=[f'[[{IPA[c]}.]] is for {w}!', f'[[{IPA[c]},]] is for {w}.', f'[[{IPA[c]}]], is for, {w}!', f'[[{IPA[c]}!]] is for {w}!']
  else:
    W=k[0].upper()+k[1:]; cands=[f'{W}!', f'{W}.', f'{W}?', f'A {k}!' if 0 else f'{W}!!', f'{W}, {k}.'] if k!='gray' else ['Grey!','Gray.','Grey.','[[ɡɹˈeɪ.]]','[[ɡɹˈeɪ!]]']
  best=(-1,None)
  for t in cands:
    for ls in (1.0,1.12,1.3):
      synth(t,ls,'/tmp/c.mp3'); ts=[tx('/tmp/c.mp3',mm) for mm in M]; sc=okk(k,ts)
      if sc>best[0]: best=(sc,t,ls,ts); subprocess.run(['cp','/tmp/c.mp3','/tmp/best.mp3'])
      if sc==2: break
    if best[0]==2: break
  if best[0]>0: subprocess.run(['cp','/tmp/best.mp3','out/%s.mp3'%man[k]])
  print(k,best,flush=True)
