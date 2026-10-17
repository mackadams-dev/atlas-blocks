exec(open('fix.py').read().split('res={}')[0].replace("man=json.load(open('manifest.json'))","man=json.load(open('manifest6.json'))"))
ph4=json.load(open('/tmp/new6.json'))[550:]
def nrm(t): return ' '.join(re.sub(r'[^a-z ]',' ',t.lower().replace('-',' ')).split())
bad=[]
for k,_ in ph4:
  f='out/%s.mp3'%man[k]; ts=[tx(f,m) for m in M]; n=[nrm(t) for t in ts]
  m_=re.match(r'^([a-z]) is for (.+)$',k)
  if m_:
    c,w=m_.groups(); ok=[x.endswith(w.replace('-',' ')) and x.split()[0] in OK[c] for x in n]
  else:
    w=k; ok=[x==w or x.replace(' ','')==w.replace(' ','') or (w=='gray' and x=='grey') or (w=='ice cream' and x=='icecream') for x in n]
  if not any(ok): bad.append(k)
  print(('OK ' if all(ok) else ('1/2' if any(ok) else 'BAD')),k,ts,flush=True)
print('BAD',bad)
