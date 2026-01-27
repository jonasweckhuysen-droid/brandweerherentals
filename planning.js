/* planning.js
   Client-side wespen planning met Firebase RTDB roster-fetch.
   - Probeer roster te halen uit Firebase RTDB (paden: /roster, /users, /members, /accounts, /people)
   - Fallback naar lokaal opgeslagen roster of voorbeeldroster
   - Beschikbaarheid, auto-planning (na 15 feb of via knop), omruil-workflow
*/

(function(){
  const TEAM_MAP = { "A1":0,"A2":1,"B1":2,"B2":3,"C1":4,"C2":5 };
  const STORAGE_KEYS = {
    AVAIL: "wespen_availabilities_v1",
    SCHEDULE: "wespen_schedule_v1",
    ROSTER: "wespen_roster_v1",
    SWAPS: "wespen_swaps_v1"
  };

  function pad(n){ return n<10?("0"+n):(""+n); }
  function fmtDate(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  function isoWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
  }

  // Easter calculation
  function easterDate(year){
    const a = year % 19;
    const b = Math.floor(year/100);
    const c = year % 100;
    const d = Math.floor(b/4);
    const e = b % 4;
    const f = Math.floor((b+8)/25);
    const g = Math.floor((b-f+1)/3);
    const h = (19*a + b - d - g + 15) % 30;
    const i = Math.floor(c/4);
    const k = c % 4;
    const l = (32 + 2*e + 2*i - h - k) % 7;
    const m = Math.floor((a + 11*h + 22*l)/451);
    const month = Math.floor((h + l - 7*m + 114)/31);
    const day = ((h + l - 7*m + 114) % 31) + 1;
    return new Date(year, month-1, day);
  }

  function holidaysForYear(year){
    const s = new Set();
    const fixed = [
      [5,1],   // Labour Day
      [7,21],  // Belgian National Day
      [8,15],  // Assumption
      [11,1],  // All Saints
      [11,11]  // Armistice
    ];
    fixed.forEach(([m,d]) => s.add(fmtDate(new Date(year, m-1, d))));
    const eas = easterDate(year);
    const plus = (n) => { const d = new Date(eas); d.setDate(d.getDate()+n); return d; };
    [1, 39, 50].forEach(n => s.add(fmtDate(plus(n))));
    return s;
  }

  function betweenDates(start, end){
    const out = [];
    for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) out.push(new Date(d));
    return out;
  }

  /* Storage */
  function load(key, def){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; }catch(e){ return def; }
  }
  function save(key, obj){ localStorage.setItem(key, JSON.stringify(obj)); }

  /* Roster helpers */
  function saveRoster(r){ save(STORAGE_KEYS.ROSTER, r); }
  function loadRosterLocal(){ return load(STORAGE_KEYS.ROSTER, [
    { username:"jan", displayName:"Jan Peeters", team:"A1", count:0 },
    { username:"els", displayName:"Els De Vries", team:"A1", count:0 },
    { username:"peter", displayName:"Peter Jacobs", team:"A2", count:0 },
    { username:"lara", displayName:"Lara Claes", team:"B1", count:0 },
    { username:"tom", displayName:"Tom Willems", team:"B2", count:0 },
    { username:"sara", displayName:"Sara Janssens", team:"C1", count:0 },
    { username:"kurt", displayName:"Kurt Maes", team:"C2", count:0 }
  ]); }

  /* Availability / schedule / swaps */
  function loadAvail(){ return load(STORAGE_KEYS.AVAIL, {}); }
  function saveAvail(o){ save(STORAGE_KEYS.AVAIL, o); }
  function loadSchedule(){ return load(STORAGE_KEYS.SCHEDULE, {}); }
  function saveSchedule(o){ save(STORAGE_KEYS.SCHEDULE, o); }
  function loadSwaps(){ return load(STORAGE_KEYS.SWAPS, []); }
  function saveSwaps(s){ save(STORAGE_KEYS.SWAPS, s); }

  /* Firebase roster fetch */
  const FIREBASE_BASE = (document.querySelector('meta[name="firebase-db"]') && document.querySelector('meta[name="firebase-db"]').content) || "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app/";

  async function tryLoadRosterFromFirebase(){
    const candidates = ['roster.json','users.json','members.json','accounts.json','people.json'];
    for(const p of candidates){
      const url = FIREBASE_BASE.replace(/\/+$/,'') + '/' + p;
      try{
        const resp = await fetch(url, { method: 'GET' });
        if(!resp.ok) continue;
        const data = await resp.json();
        if(!data) continue;
        const arr = [];
        if(Array.isArray(data)){
          data.forEach(u => {
            if(u && (u.username || u.uid || u.email || u.name)){
              arr.push({
                username: u.username || u.uid || (u.email ? u.email.split('@')[0] : ("user"+Math.random().toString(36).slice(2,6))),
                displayName: u.displayName || u.name || u.email || (u.username || ""),
                team: u.team || u.ploeg || u.group || "",
                count: u.count || 0
              });
            }
          });
        } else if(typeof data === 'object'){
          for(const k of Object.keys(data)){
            const u = data[k];
            if(!u) continue;
            arr.push({
              username: u.username || u.uid || k,
              displayName: u.displayName || u.name || u.email || (u.username || k),
              team: u.team || u.ploeg || u.group || "",
              count: u.count || 0
            });
          }
        }
        if(arr.length>0){
          saveRoster(arr);
          console.log("Roster geladen van Firebase:", url);
          return arr;
        }
      }catch(err){
        console.warn("Firebase fetch failed for", p, err);
        continue;
      }
    }
    return null;
  }

  /* Detect current user */
  function detectCurrentUser(){
    const metaUser = document.querySelector('meta[name="wespen-username"]');
    const metaTeam = document.querySelector('meta[name="wespen-team"]');
    if(metaUser && metaUser.content){
      return { username: metaUser.content, team: (metaTeam?metaTeam.content:"") };
    }
    const rosterLocal = loadRosterLocal();
    return { username: rosterLocal[0].username, team: rosterLocal[0].team, interactivePick:true };
  }

  /* Dates generation & display rules */
  function generateDatesForYear(year){
    const start = new Date(year,2,1);
    const end = new Date(year,10,30);
    const hol = holidaysForYear(year);
    return betweenDates(start,end).filter(d => {
      const day = d.getDay();
      if(!(day===2 || day===6)) return false;
      if(hol.has(fmtDate(d))) return false;
      return true;
    });
  }

  function shouldShowDateForTeam(d, team){
    const idx = TEAM_MAP[team];
    if(idx===undefined) return true;
    const wn = isoWeekNumber(d);
    return (wn % 6) === idx;
  }

  function escapeHtmlDisplay(s){ return (s||"").toString().replace(/&/g,'&amp;').replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  /* Render functions */
  function renderDates(dates, currentUser, roster){
    const avail = loadAvail();
    const container = document.getElementById("datesContainer");
    container.innerHTML = "";
    dates.forEach(d => {
      if(!shouldShowDateForTeam(d, currentUser.team)) return;
      const key = fmtDate(d);
      const div = document.createElement("div"); div.className = "date-row";
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.dataset.date = key;
      cb.checked = !!(avail[key] && avail[key][currentUser.username]);
      cb.addEventListener("change", (e) => {
        const a = loadAvail();
        if(!a[key]) a[key] = {};
        if(e.target.checked) a[key][currentUser.username] = true;
        else delete a[key][currentUser.username];
        saveAvail(a);
        renderDates(dates, currentUser, roster);
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + d.toLocaleDateString("nl-BE") + " (" + ["zo","ma","di","wo","do","vr","za"][d.getDay()] + ")"));
      div.appendChild(label);

      const teamMembers = roster.filter(u => u.team === currentUser.team);
      let count = 0;
      if(avail[key]){
        for(const u of teamMembers) if(avail[key][u.username]) count++;
      }
      const span = document.createElement("span"); span.className = "small"; span.style.marginLeft = "1rem";
      span.textContent = `Beschikbaar (ploeg ${currentUser.team}): ${count}/${teamMembers.length}`;
      div.appendChild(span);

      const schedule = loadSchedule();
      if(schedule[key] && schedule[key].username){
        const sspan = document.createElement("div"); sspan.className = "small"; sspan.style.marginTop = ".25rem";
        sspan.innerHTML = `Toegewezen: <strong>${escapeHtmlDisplay(schedule[key].username)}</strong> (${schedule[key].by})`;
        if(schedule[key].username === currentUser.username){
          const btn = document.createElement("button"); btn.textContent = "Omruil aanvragen"; btn.style.marginLeft = "1rem";
          btn.addEventListener("click", () => {
            const reason = prompt("Reden omruil (optioneel):","");
            const swaps = loadSwaps();
            swaps.push({
              id: "swap-"+Math.random().toString(36).slice(2,9),
              date: key,
              fromUsername: currentUser.username,
              reason: reason || "",
              createdAt: new Date().toISOString(),
              status: "open",
              acceptedBy: null
            });
            saveSwaps(swaps);
            renderSwaps(roster);
            alert("Omruil-aanvraag aangemaakt.");
          });
          sspan.appendChild(btn);
        }
        div.appendChild(sspan);
      }

      container.appendChild(div);
    });
    if(container.children.length===0) container.innerHTML = "<p>Geen datums zichtbaar voor jouw ploeg in deze periode.</p>";
  }

  /* Scheduling algorithm */
  function generateScheduleForDates(dates, roster, onlyForDates=null){
    const avail = loadAvail();
    const schedule = loadSchedule();
    const countMap = {};
    roster.forEach(u => countMap[u.username] = u.count || 0);
    for(const k in schedule){
      const entry = schedule[k];
      if(entry && entry.username && countMap[entry.username]!==undefined){
        countMap[entry.username] += 1;
      }
    }
    for(const d of dates){
      const key = fmtDate(d);
      if(onlyForDates && !onlyForDates.includes(key)) continue;
      const idx = isoWeekNumber(d) % 6;
      const teams = Object.keys(TEAM_MAP).filter(t => TEAM_MAP[t]===idx);
      const candidates = roster.filter(u => teams.includes(u.team));
      const availCandidates = candidates.filter(u => avail[key] && avail[key][u.username]);
      let pool = availCandidates.length > 0 ? availCandidates : candidates;
      pool.sort((a,b)=> {
        const ca = (countMap[a.username]||0); const cb = (countMap[b.username]||0);
        if(ca !== cb) return ca - cb;
        return Math.random() - 0.5;
      });
      if(pool.length===0) continue;
      const chosen = pool[0];
      schedule[key] = { username: chosen.username, assignedAt: new Date().toISOString(), by: "auto" };
      countMap[chosen.username] = (countMap[chosen.username]||0) + 1;
    }
    saveSchedule(schedule);
    roster.forEach(u => { u.count = countMap[u.username] || 0; });
    saveRoster(roster);
    return schedule;
  }

  function renderSchedule(dates, roster){
    const schedule = loadSchedule();
    const container = document.getElementById("scheduleContainer");
    container.innerHTML = "";
    const table = document.createElement("table"); table.className = "wespen-table";
    const thead = document.createElement("tr");
    thead.innerHTML = "<th>Datum</th><th>Dag</th><th>Toegewezen</th><th>Acties</th>";
    table.appendChild(thead);
    dates.forEach(d => {
      const key = fmtDate(d);
      const tr = document.createElement("tr");
      const dayName = ["zo","ma","di","wo","do","vr","za"][d.getDay()];
      const tdDate = document.createElement("td"); tdDate.textContent = d.toLocaleDateString("nl-BE");
      const tdDay = document.createElement("td"); tdDay.textContent = dayName;
      const tdAssigned = document.createElement("td"); const tdAct = document.createElement("td");
      if(schedule[key] && schedule[key].username){
        const u = roster.find(xx => xx.username === schedule[key].username);
        tdAssigned.innerHTML = u ? escapeHtmlDisplay(u.displayName + " ("+u.username+")") : escapeHtmlDisplay(schedule[key].username);
        const btnSwap = document.createElement("button"); btnSwap.textContent = "Verzoek omruil (open voor ploeg)";
        btnSwap.addEventListener("click", () => {
          const name = prompt("Je vraagt een omruil voor " + key + ". Geef reden (optioneel):", "");
          const swaps = loadSwaps();
          swaps.push({
            id: "swap-"+Math.random().toString(36).slice(2,9),
            date: key,
            fromUsername: schedule[key].username,
            reason: name||"",
            createdAt: new Date().toISOString(),
            status: "open",
            acceptedBy: null
          });
          saveSwaps(swaps);
          renderSwaps(roster);
          alert("Omruil-aanvraag aangemaakt.");
        });
        tdAct.appendChild(btnSwap);
      } else {
        tdAssigned.textContent = "-";
      }
      tr.appendChild(tdDate); tr.appendChild(tdDay); tr.appendChild(tdAssigned); tr.appendChild(tdAct);
      table.appendChild(tr);
    });
    container.appendChild(table);
  }

  function renderSwaps(roster){
    const swaps = loadSwaps();
    const container = document.getElementById("swapsContainer");
    container.innerHTML = "";
    if(swaps.length===0){ container.innerHTML = "<p>Geen omruil-aanvragen.</p>"; return; }
    swaps.forEach(s => {
      const div = document.createElement("div"); div.className = "swap-row";
      div.innerHTML = `<strong>${s.fromUsername}</strong> vroeg omruil voor <em>${s.date}</em> — reden: ${escapeHtmlDisplay(s.reason)} <small>(${s.status})</small>`;
      if(s.status === "open"){
        const acceptBtn = document.createElement("button"); acceptBtn.textContent = "Accepteer (wissel)";
        acceptBtn.addEventListener("click", () => {
          const schedule = loadSchedule();
          const fromUser = roster.find(u=>u.username===s.fromUsername);
          const candidates = roster.filter(u=> u.team === fromUser.team && u.username !== s.fromUsername);
          const candidateUsernames = candidates.map(c=>c.username).join(", ");
          const sel = prompt("Voer username in van wie de taak overneemt (beschikbare kandidaten: " + candidateUsernames + "):");
          if(!sel) return;
          const target = roster.find(u=>u.username===sel);
          if(!target){ alert("Ongeldige gebruiker."); return; }
          schedule[s.date] = { username: target.username, assignedAt: new Date().toISOString(), by: "swap" };
          saveSchedule(schedule);
          if(fromUser.count && fromUser.count>0) fromUser.count = Math.max(0, fromUser.count - 1);
          target.count = (target.count||0) + 1;
          saveRoster(roster);
          s.status = "accepted"; s.acceptedBy = sel; s.acceptedAt = new Date().toISOString();
          saveSwaps(swaps);
          renderSwaps(roster);
          renderSchedule(generateDatesForYear(new Date().getFullYear()), roster);
          alert("Omruil uitgevoerd.");
        });
        div.appendChild(acceptBtn);
        const cancelBtn = document.createElement("button"); cancelBtn.textContent = "Annuleer"; cancelBtn.style.marginLeft = "0.5rem";
        cancelBtn.addEventListener("click", () => { s.status = "cancelled"; saveSwaps(swaps); renderSwaps(roster); });
        div.appendChild(cancelBtn);
      }
      container.appendChild(div);
    });
  }

  /* Boot */
  async function boot(){
    const current = detectCurrentUser();
    const remoteRoster = await tryLoadRosterFromFirebase();
    if(!remoteRoster){
      console.log("Geen publieke roster gevonden op Firebase, gebruik lokale roster of eerder opgeslagen roster.");
    }
    const roster = loadRosterLocal();
    if(current.interactivePick){
      const selUser = document.createElement("select");
      roster.forEach(u => {
        const o = document.createElement("option"); o.value = u.username; o.textContent = u.displayName + " ("+u.username+") - " + u.team;
        selUser.appendChild(o);
      });
      selUser.addEventListener("change", () => {
        const v = roster.find(r=>r.username===selUser.value);
        current.username = v.username; current.team = v.team;
        document.getElementById("currentUser").textContent = v.displayName + " ("+v.username+")";
        document.getElementById("currentTeam").textContent = v.team;
        refreshAll();
      });
      const el = document.getElementById("currentUser"); el.innerHTML=""; el.appendChild(selUser);
      selUser.value = current.username;
      const first = roster.find(r=>r.username===selUser.value);
      if(first) current.team = first.team;
    } else {
      const u = roster.find(r=>r.username===current.username);
      document.getElementById("currentUser").textContent = u ? (u.displayName + " ("+u.username+")") : current.username;
      document.getElementById("currentTeam").textContent = current.team || "—";
    }

    document.getElementById("rosterFile").addEventListener("change", (ev) => {
      const f = ev.target.files[0];
      if(!f) return;
      const r = new FileReader();
      r.onload = (e) => {
        try{
          const parsed = JSON.parse(e.target.result);
          if(Array.isArray(parsed)){
            saveRoster(parsed);
            alert("Roster opgeslagen.");
            location.reload();
          } else alert("JSON moet een array van gebruikers zijn.");
        }catch(err){ alert("Kon JSON niet parsen: "+err.message); }
      };
      r.readAsText(f);
    });
    document.getElementById("loadSampleRoster").addEventListener("click", () => {
      saveRoster(roster);
      alert("Voorbeeldroster geladen (standaard).");
      location.reload();
    });

    const year = new Date().getFullYear();
    const dates = generateDatesForYear(year);

    function refreshAll(){
      const rosterNow = loadRosterLocal();
      renderDates(dates, current, rosterNow);
      renderSchedule(dates, rosterNow);
      renderSwaps(rosterNow);
    }

    document.getElementById("saveAvail").addEventListener("click", () => {
      alert("Beschikbaarheid is lokaal opgeslagen.");
    });

    document.getElementById("generateSchedule").addEventListener("click", () => {
      const confirmForce = confirm("Plan nu genereren (force). Dit overschrijft bestaande automatische toewijzingen. Doorgaan?");
      if(!confirmForce) return;
      const rosterNow = loadRosterLocal();
      generateScheduleForDates(dates, rosterNow);
      refreshAll();
      alert("Planning gegenereerd.");
    });

    document.getElementById("exportSchedule").addEventListener("click", () => {
      const schedule = loadSchedule();
      let csv = "Datum;Dag;Toegewezen\n";
      dates.forEach(d => {
        const key = fmtDate(d);
        const day = ["zo","ma","di","wo","do","vr","za"][d.getDay()];
        csv += `${d.toLocaleDateString("nl-BE")};${day};${schedule[key] ? schedule[key].username : ""}\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "wespen_schedule.csv"; a.click();
      URL.revokeObjectURL(url);
    });

    // Auto-generate after Feb 15
    const cutoff = new Date(year,1,15);
    const now = new Date();
    if(now > cutoff){
      const existing = loadSchedule();
      if(Object.keys(existing).length === 0){
        generateScheduleForDates(dates, roster);
      }
    }

    refreshAll();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
