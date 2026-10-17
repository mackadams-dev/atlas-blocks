const norm = s => s.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' ]+/g,' ').trim().replace(/\s+/g,' ');
const LN = {a:'ay',b:'bee',c:'see',d:'dee',e:'ee',f:'eff',g:'jee',h:'aitch',i:'eye',j:'jay',k:'kay',l:'ell',m:'em',n:'en',o:'oh',p:'pee',q:'cue',r:'are',s:'ess',t:'tee',u:'you',v:'vee',w:'double you',x:'ex',y:'why',z:'zee'};
const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty'];
const nw = n => n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?'-'+ones[n%10]:'');
const IPA={a:'ˈeɪ',b:'bˈiː',c:'sˈiː',d:'dˈiː',e:'ˈiː',f:'ˈɛf',g:'dʒˈiː',h:'ˈeɪtʃ',i:'ˈaɪ',j:'dʒˈeɪ',k:'kˈeɪ',l:'ˈɛl',m:'ˈɛm',n:'ˈɛn',o:'ˈoʊ',p:'pˈiː',q:'kjˈuː',r:'ˈɑːɹ',s:'ˈɛs',t:'tˈiː',u:'jˈuː',v:'vˈiː',w:'dˈʌbəljˌuː',x:'ˈɛks',y:'wˈaɪ',z:'zˈiː'}; const SIPA={a:'ˈæ',b:'bʌ',c:'kʌ',d:'dʌ',e:'ˈɛ',f:'fːː',g:'ɡʌ',h:'hʌ',i:'ˈɪ',j:'dʒʌ',k:'kʌ',l:'lːː',m:'mːː',n:'nːː',o:'ˈɑː',p:'pʌ',q:'kwʌ',r:'ɹːː',s:'sːː',t:'tʌ',u:'ˈʌ',v:'vːː',w:'wʌ',x:'ˈɛks',y:'jʌ',z:'zːː'}; const P=c=>'[['+IPA[c]+']]', PS=c=>'[['+SIPA[c]+']]';
const SOUNDS = { a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'hhh', i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', o: 'aw', p: 'puh', q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz' };
const out = new Map(); const add = (text, speak) => { const k = norm(text); if (k && !out.has(k)) out.set(k, speak || text); };
// letters (with letter-name spellings so the voice says the name)
const L = 'abcdefghijklmnopqrstuvwxyz'.split('');
L.forEach(c => { add(c, '[['+IPA[c]+'!]]'); add('Big '+c.toUpperCase(), 'Big [['+IPA[c]+'.]]'); add('Little '+c, 'Little [['+IPA[c]+'.]]');
  add(`${c.toUpperCase()} says ${SOUNDS[c]}`, '[['+IPA[c]+']] says, [['+SIPA[c]+'.]]'); });
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
[['A','Ahh'],['E','Eee'],['I','Eye'],['O','Ohh'],['U','Ooo']].forEach(([v,c])=>{ add(`${v} says ${c}. ${c}!`, `${P(v.toLowerCase())} says ${c}. ${c}!`); add(`Yay ${c}!`); });
['M','B','P','D','S','N','G','T','L','W'].forEach(v=>add(`Yay ${SOUNDS[v.toLowerCase()]}!`));
[['Ma'],['Up'],['Go'],['More'],['Potty'],['Hi'],['Bye'],['Dada']].forEach(([c])=>{ add(`${c}. Say ${c}!`); add(`Yay ${c}!`); });
for (let n=1;n<=10;n++) add(`Yay ${nw(n)}!`);
['Mmmm','Hmm hmm','Hum 1 2 3','Hum high','Hum low','Hum a song'].forEach(c=>add(`Yay ${c}!`, `Yay! ${c.replace('1 2 3','one two three')}!`));
// potty steps
['Pants down.','Sit on the potty.','Pee pee or poo poo in the potty.','Wipe.','Flush! Bye bye potty.','Pants up.','Wash hands. Scrub scrub scrub!','Added to the Talk board!'].forEach(t=>add(t));
// added v3 (appended to keep file numbering)
['Daddy','Momma','Goose','Tuna'].forEach(t=>add(t,t+'!'));
['Momma','Daddy'].forEach(c=>{add(`${c}. Say ${c}!`);add(`Yay ${c}!`);});
add('You traced the whole alphabet! Amazing, Atlas!');
// added v4
['circle','square','triangle','rectangle','star','heart','oval','diamond','hexagon'].forEach(w=>add(w, w[0].toUpperCase()+w.slice(1)+'!'));
add('Trace the','Trace the'); add('All the shapes! Amazing, Atlas!');
['red','orange','yellow','green','blue','purple','pink','brown','black','gray'].forEach(w=>add(w, w[0].toUpperCase()+w.slice(1)+'!'));
add('Which one starts with', 'Which one starts with'); add('Try again!');
const ABCW=['apple','bird','cat','dog','elephant','fish','grapes','house','ice cream','juice','key','lion','moon','nose','octopus','pig','queen','rainbow','sun','tree','umbrella','violin','whale','xylophone','yarn','zebra'];
ABCW.forEach((w,i)=>{ const c=L[i]; add(w, w[0].toUpperCase()+w.slice(1)+'.'); add(`${c.toUpperCase()} is for ${w}`, `[[${IPA[c]},]] is for ${w}!`); });
// added v5
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SEAS=m=>['winter','spring','summer','fall'][Math.floor(((m+1)%12)/3)];
MONTHS.forEach((m,i)=>{ add(m, m+'!'); add(`${m} is in ${SEAS(i)}!`); });
['winter','spring','summer','fall','sunny','cloudy','rainy','stormy','snowy','windy','foggy'].forEach(w=>add(w, w[0].toUpperCase()+w.slice(1)+'!'));
['What comes after','Put the months in order','Which one goes with','What season is','Which one is','Make the','picture','You did the puzzle!','The months of the year!','All twelve months!'].forEach(t=>add(t));
// added v5b
add('I feel','I feel'); ['hungry','angry','scared','silly','sick','excited','calm','loved'].forEach(w=>add(w, w[0].toUpperCase()+w.slice(1)+'.'));
['How do you feel?','Wake up!','Brush teeth!','Bath time!','Night Night!','Great day!','My day!','Tap to add a block!','Great counting!','stickers','Let’s get stickers!','You got a sticker!','Let’s sing the ABCs!','Let’s count!','Now I know my ABCs!','Great singing!'].forEach(t=>add(t));
process.stdout.write(JSON.stringify([...out]));
