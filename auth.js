import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function initAuth(app, db, onReady){

  const auth = getAuth(app);

  onAuthStateChanged(auth, (user)=>{

    if(!user){
      window.location.href = "login.html";
      return;
    }

    // laad user profiel uit database
    onValue(ref(db,"users"), snap=>{

      const users = snap.val() || {};

      const profile = Object.values(users)
        .find(u => u.email === user.email);

      if(!profile){
        document.body.innerHTML = "Geen toegang";
        return;
      }

      onReady(profile);
    });

  });
}
