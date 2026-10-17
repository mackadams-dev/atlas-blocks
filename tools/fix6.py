src=open('fix4.py').read().replace("asr4.py","asr6.py")
pre=src.split("todo=")[0]
exec(pre)
C={'calm':['Calm.','Calm!','[[kˈɑːm.]]','[[kˈɑːlm.]]','Calm, calm.'],'stickers':['Stickers!','Stickers.','[[stˈɪkɚz!]]','Stick-ers!']}
for k,cands in C.items():
  best=(okk(k,[tx('out/%s.mp3'%man[k],mm) for mm in M]),'orig')
  if best[0]==2: print(k,'orig ok'); continue
  for t in cands:
    for ls in (1.0,1.12,1.3):
      synth(t,ls,'/tmp/c.mp3'); ts=[tx('/tmp/c.mp3',mm) for mm in M]; sc=okk(k,ts)
      if sc>best[0]: best=(sc,t,ls,ts); subprocess.run(['cp','/tmp/c.mp3','out/%s.mp3'%man[k]])
      if sc==2: break
    if best[0]==2: break
  print(k,best,flush=True)
