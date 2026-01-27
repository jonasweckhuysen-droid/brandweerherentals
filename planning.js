(function(){
  // planning.js - simplified wespen planning (compat met permanentie.html)
  // - gebruikt Firebase compat SDK (zoals permanentie.js) om roster te lezen
  // - toont dinsdagen & zaterdagen tussen maart en november, sluit feestdagen uit
  // - toont enkel datums voor de ploeg-week van de ingelogde gebruiker
  // - beschikbaarheid wordt lokaal opgeslagen (localStorage)
  // - eenvoudige generator die leden met de laagste teller voorrang geeft
  // - eenvoudige omruil-workflow in localStorage

  // Firebase base (kan via meta-tag in je HTML worden ingesteld)
  const firebaseBase = (document.querySelector('meta[name="firebase-db"]') && document.querySelector('meta[name="firebase-db"]').content) || "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/";
  try{
    if(window.firebase && firebase && firebase.initializeApp && (!firebase.apps || firebase.apps.length === 0)){
      firebase.initializeApp({ databaseURL: firebaseBase });
    }
  }catch(e){ console.warn('Firebase init error', e); }

  const DB = (window.firebase && firebase && firebase.database) ? firebase.database() : null;

  const TEAM_MAP = { A1:0,A2:1,B1:2,B2:3,C1:4,C2:5 };
  const LS = { AVAIL: 'wespen_avail_v2', SCHED: 'wespen_sched_v2', ROSTER: 'wespen_roster_v2', SWAPS: 'wespen_swaps_v2' };

  function pad(n){ return n<10?('0'+n):(''+n); }
  function keyOf(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function isoWeekNumber(d){ const date=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const dayNum = date.getUTCDay()||7; date.setUTCDate(date.getUTCDate()+4-dayNum); const yearStart=new Date(Date.UTC(date.getUTCFullYear(),0,1)); return Math.ceil((((date-yearStart)/86400000)+1)/7); }

  function easter(year){ const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1; return new Date(year,month-1,day); }
  function holidays(year){ const s=new Set(); [[5,1],[7,21],[8,15],[11,1],[11,11]].forEach(([m,d])=>s.add(year+'-'+m+'-'+d)); const eas=easter(year); const plus=(n)=>{const dd=new Date(eas); dd.setDate(dd.getDate()+n); return dd;}; [1,39,50].forEach(n=>{const dd=plus(n); s.add(dd.getFullYear()+'-'+(dd.getMonth()+1)+'-'+dd.getDate());}); return s; }

  function loadLS(k,def){ try{const v=localStorage.getItem(k); return v?JSON.parse(v):def;}catch(e){return def;} }
  function saveLS(k,v){ localStorage.setItem(k,JSON.stringify(v)); }

  // laad roster uit Firebase indien publiek beschikbaar; anders fallback op opgeslagen roster of sample
  async function loadRoster(){
    const sample=[{username:'jan',displayName:'Jan Peeters',team:'A1',count:0},{username:'els',displayName:'Els De Vries',team:'A1',count:0}];
    const saved = loadLS(LS.ROSTER, null);
    if(saved && Array.isArray(saved) && saved.length) return saved;
    if(DB){
      const paths=['roster','users','members'];
      for(const p of paths){
        try{
          const snap = await DB.ref(p).once('value');
          const val = snap.val();
          if(val){
            const arr = Array.isArray(val)?val:Object.keys(val).map(k=>val[k]);
            const normalized = arr.map(u=>({
              username: u.username || u.uid || (u.email ? u.email.split('@')[0] : ('u'+Math.random().toString(36).slice(2,6))),
              displayName: u.displayName || u.name || u.email || u.username || '',
              team: u.team || u.ploeg || '',
              count: u.count || 0
            }));
            saveLS(LS.ROSTER, normalized);
            return normalized;
          }
        }catch(e){ /* probeer volgend pad */ }
      }
    }
    saveLS(LS.ROSTER, sample);
    return sample;
  }

  function detectUser(roster){
    const metaU = document.querySelector('meta[name="wespen-username"]');
    const metaT = document.querySelector('meta[name="wespen-team"]');
    if(metaU && metaU.content) return { username: metaU.content, team: (metaT?metaT.content:'') };
    return { username: roster[0].username, team: roster[0].team, interactive:true };
  }

  function datesForYear(year){
    const start = new Date(year,2,1), end = new Date(year,10,30), hol = holidays(year), out = [];
    for(let d = new Date(start); d <= end; d.setDate(d.getDate()+1)){
      const day = d.getDay();
      if(day !== 2 && day !== 6) continue; // di of za
      const key = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
      if(hol.has(key)) continue;
      out.push(new Date(d));
    }
    return out;
  }

  function shouldShow(d,team){
    const idx = TEAM_MAP[team];
    if(idx === undefined) return true;
    return (isoWeekNumber(d) % 6) === idx;
  }

  async function boot(){
    const roster = await loadRoster();
    const user = detectUser(roster);
    const datesContainer = document.getElementById('datesContainer');
    const scheduleContainer = document.getElementById('scheduleContainer');
    const swapsContainer = document.getElementById('swapsContainer');

    const cu = document.getElementById('currentUser');
    const ct = document.getElementById('currentTeam');
    if(cu) cu.textContent = roster.find(r=>r.username===user.username)?.displayName || user.username;
    if(ct) ct.textContent = user.team || '–';

    const year = new Date().getFullYear();
    const dates = datesForYear(year);

    // render beschikbaarheids-checkboxen (gebruikers zien alleen hun ploeg-week datums)
    const avail = loadLS(LS.AVAIL, {});
    datesContainer.innerHTML = '';
    dates.forEach(d => {
      if(!shouldShow(d, user.team)) return;
      const key = keyOf(d);
      const div = document.createElement('div'); div.className = 'date-row';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!(avail[key] && avail[key][user.username]);
      cb.addEventListener('change', () => {
        const A = loadLS(LS.AVAIL, {});
        if(!A[key]) A[key] = {};
        if(cb.checked) A[key][user.username] = true; else delete A[key][user.username];
        saveLS(LS.AVAIL, A);
        renderSchedule();
      });
      div.appendChild(cb);
      const label = document.createElement('span'); label.textContent = ' ' + d.toLocaleDateString('nl-BE') + ' ('+['zo','ma','di','wo','do','vr','za'][d.getDay()]+')';
      div.appendChild(label);
      datesContainer.appendChild(div);
    });

    // knoppen
    const genBtn = document.getElementById('generateSchedule'); if(genBtn) genBtn.addEventListener('click', ()=>{ generate(dates, roster); renderSchedule(); });
    const saveBtn = document.getElementById('saveAvail'); if(saveBtn) saveBtn.addEventListener('click', ()=>{ alert('Beschikbaarheid lokaal opgeslagen.'); });

    function renderSchedule(){
      const sched = loadLS(LS.SCHED, {});
      scheduleContainer.innerHTML = '';
      const table = document.createElement('table'); table.className = 'wespen-table';
      table.innerHTML = '<tr><th>Datum</th><th>Dag</th><th>Toegewezen</th><th>Acties</th></tr>';
      dates.forEach(d => {
        if(!shouldShow(d, user.team)) return;
        const key = keyOf(d);
        const tr = document.createElement('tr');
        const tdDate = document.createElement('td'); tdDate.textContent = d.toLocaleDateString('nl-BE');
        const tdDay = document.createElement('td'); tdDay.textContent = ['zo','ma','di','wo','do','vr','za'][d.getDay()];
        const tdAssigned = document.createElement('td'); tdAssigned.textContent = sched[key]?.username || '-';
        const tdAct = document.createElement('td');
        if(sched[key] && sched[key].username === user.username){
          const btn = document.createElement('button'); btn.textContent = 'Omruil';
          btn.addEventListener('click', () => {
            const S = loadLS(LS.SWAPS, []);
            S.push({ id:'s'+Math.random().toString(36).slice(2,7), date:key, from:user.username, reason:'', status:'open', createdAt: new Date().toISOString() });
            saveLS(LS.SWAPS, S);
            renderSwaps();
            alert('Omruil aangemaakt');
          });
          tdAct.appendChild(btn);
        }
        tr.appendChild(tdDate); tr.appendChild(tdDay); tr.appendChild(tdAssigned); tr.appendChild(tdAct);
        table.appendChild(tr);
      });
      scheduleContainer.appendChild(table);
    }

    function renderSwaps(){
      const S = loadLS(LS.SWAPS, []);
      swapsContainer.innerHTML = '';
      if(!S.length){ swapsContainer.textContent = 'Geen omruil-aanvragen.'; return; }
      S.forEach(s => {
        const div = document.createElement('div'); div.className = 'swap-row';
        div.textContent = `${s.from} vraagt omruil voor ${s.date} (${s.status})`;
        swapsContainer.appendChild(div);
      });
    }

    renderSchedule(); renderSwaps();
  }

  // eenvoudige generator
  function generate(dates, roster){
    const avail = loadLS(LS.AVAIL, {});
    const sched = {};
    const counts = {};
    roster.forEach(r => counts[r.username] = r.count || 0);

    dates.forEach(d => {
      const key = keyOf(d);
      const idx = isoWeekNumber(d) % 6;
      const teams = Object.keys(TEAM_MAP).filter(t => TEAM_MAP[t] === idx);
      const candidates = roster.filter(r => teams.includes(r.team));
      if(candidates.length === 0) return;
      const available = candidates.filter(c => avail[key] && avail[key][c.username]);
      const pool = available.length ? available : candidates;
      pool.sort((a,b) => (counts[a.username]||0) - (counts[b.username]||0));
      const chosen = pool[0];
      if(!chosen) return;
      sched[key] = { username: chosen.username, when: new Date().toISOString(), by: 'auto' };
      counts[chosen.username] = (counts[chosen.username]||0) + 1;
    });

    saveLS(LS.SCHED, sched);
    roster.forEach(r => { r.count = counts[r.username] || 0; });
    saveLS(LS.ROSTER, roster);
    alert('Planning gegenereerd (lokaal).');
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
