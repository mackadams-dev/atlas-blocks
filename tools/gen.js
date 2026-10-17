const norm = s => s.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' ]+/g,' ').trim().replace(/\s+/g,' ');
const LN = {a:'ay',b:'bee',c:'see',d:'dee',e:'ee',f:'eff',g:'jee',h:'aitch',i:'eye',j:'jay',k:'kay',l:'ell',m:'em',n:'en',o:'oh',p:'pee',q:'cue',r:'are',s:'ess',t:'tee',u:'you',v:'vee',w:'double you',x:'ex',y:'why',z:'zee'};
const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty'];
const nw = n => n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?'-'+ones[n%10]:'');
const SOUNDS = { a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'hhh', i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', o: 'aw', p: 'puh', q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz' };
const out = new Map(); const add = (text, speak) => { const k = norm(text); if (k && !out.has(k)) out.set(k, speak || text); };
// letters (with letter-name spellings so the voice says the name)
const L = 'abcdefghijklmnopqrstuvwxyz'.split('');
L.forEach(c => { const n = LN[c][0].toUpperCase()+LN[c].slice(1);
  add(c, n+'!'); add('Big '+c.toUpperCase(), 'Big '+LN[c]+'.'); add('Little '+c, 'Little '+LN[c]+'.');
  add(`${c.toUpperCase()} says ${SOUNDS[c]}`, `${n} says, ${SOUNDS[c]}.`); });
// numbers 0-50
for (let n=0;n<=50;n++){ const w=nw(n); add(w, w[0].toUpperCase()+w.slice(1)+'!'); add(String(n), w+'!'); }
for (let n=0;n<=20;n++){ const w=nw(n); add('Find '+w, 'Find '+w+'!'); add("That's "+w, "That's "+w+'.'); add('You counted '+n, 'You counted '+w+'!'); add(w+' blocks', w+' blocks!'); }
[5,10,15,20,30].forEach(g=>add(`${g}! Great sitting!`, `${nw(g)}! Great sitting!`)); add('Great sitting!');
[5,10].forEach(g=>add(`Tower of ${g}`, `Tower of ${nw(g)}!`)); add('Super star!');
['Trace','Start with','Put them in order','Great tracing!','In order!','All the numbers!','All the letters!',"Let’s build a tower!"].forEach(t=>add(t));
// praise
['Yay Atlas!','Great job!','You did it!','Woo hoo!','Awesome!','Way to go!','High five!','Super!','Great job Atlas!','Good job Atlas!','Atlas, you did it!','Hi Atlas!','Atlas!','Great asking!','Great humming!','Beautiful humming!','I hear you!','Great sound!','Nice talking!','Great trying!','Potty mission complete!','Potty in the potty! Yay!','You did it! Great potty!','Woo hoo, potty!','Clean hands! Great washing!','I need to go potty!','Yay!','Great potty!'].forEach(t=>add(t));
// talk board
['I want','more','all done','help','eat','drink','potty','play','yes','no','hurt','happy','sad','mad','Dad','Mom','music','blocks','hug','tired','I need to go potty'].forEach(t=>add(t, t==='Dad'?'Dad!':t==='Mom'?'Mom!':t[0].toUpperCase()+t.slice(1)+'.'));
// hum
['Hum with me. Mmmmmm.','Hmm hmm hmm.','Hum one, two, three.','Hum up high.','Hum down low.','Hum a song with me!'].forEach(t=>add(t));
[['A','Ahh'],['E','Eee'],['I','Eye'],['O','Ohh'],['U','Ooo']].forEach(([v,c])=>{ add(`${v} says ${c}. ${c}!`, `${LN[v.toLowerCase()][0].toUpperCase()+LN[v.toLowerCase()].slice(1)} says ${c}. ${c}!`); add(`Yay ${c}!`); });
['M','B','P','D','S','N','G','T','L','W'].forEach(v=>add(`Yay ${SOUNDS[v.toLowerCase()]}!`));
[['Ma'],['Up'],['Go'],['More'],['Potty'],['Hi'],['Bye'],['Dada']].forEach(([c])=>{ add(`${c}. Say ${c}!`); add(`Yay ${c}!`); });
for (let n=1;n<=10;n++) add(`Yay ${nw(n)}!`);
['Mmmm','Hmm hmm','Hum 1 2 3','Hum high','Hum low','Hum a song'].forEach(c=>add(`Yay ${c}!`, `Yay! ${c.replace('1 2 3','one two three')}!`));
// potty steps
['Pants down.','Sit on the potty.','Pee pee or poo poo in the potty.','Wipe.','Flush! Bye bye potty.','Pants up.','Wash hands. Scrub scrub scrub!','Added to the Talk board!'].forEach(t=>add(t));
process.stdout.write(JSON.stringify([...out]));
