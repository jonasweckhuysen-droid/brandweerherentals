(function () {

const NAME_KEY = "userName";

const TEAM_CYCLE = [
  "A1",
  "B1",
  "C1",
  "A2",
  "B2",
  "C2"
];

const REFERENCE_DATE = new Date("2026-01-23T12:00:00");


const DATABASE =
"https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app";


window.addEventListener(
"DOMContentLoaded",
initHeader
);



function initHeader(){

  restoreUser();

  updateDateTime();

  updatePloegVanWeek();

  injectMetaTags();


  setInterval(
    updateDateTime,
    1000
  );

}




// ================= GEBRUIKER =================

async function restoreUser(){

const userId =
localStorage.getItem(NAME_KEY);


const greet =
document.getElementById("greeting");


if(!userId){

window.displayName="";

return;

}


window.currentUser=userId;



try{


const response =
await fetch(
`${DATABASE}/users/${encodeURIComponent(userId)}.json`
);


const user =
await response.json();



const name =
user?.displayName || userId;



window.displayName=name;



if(greet){

greet.textContent =
`Welkom, ${name}!`;

}



}
catch(e){


window.displayName=userId;


if(greet){

greet.textContent =
`Welkom, ${userId}`;

}


}


}




// ================= DATUM =================


function updateDateTime(){


const dt =
document.getElementById("datetime");


if(!dt) return;


const now =
new Date();



dt.textContent =
now.toLocaleDateString(
"nl-BE",
{
weekday:"long",
day:"numeric",
month:"long",
year:"numeric"
}
)
+
" "
+
now.toLocaleTimeString(
"nl-BE",
{
hour:"2-digit",
minute:"2-digit"
}
);


}




// ================= PLOEG =================


function getPloegVanWeek(
date=new Date()
){


const diffWeeks =
Math.floor(
(date-REFERENCE_DATE)
/
(7*24*60*60*1000)
);



const start =
TEAM_CYCLE.indexOf("B1");



return TEAM_CYCLE[
(
start +
diffWeeks
)
%
TEAM_CYCLE.length
];


}




function updatePloegVanWeek(){


const ploeg =
getPloegVanWeek();



const el =
document.getElementById(
"ploegOfWeek"
);



if(el){

el.textContent =
"Ploeg van week: "
+
ploeg;

}



window.ploegVanWeek=ploeg;


}



// ================= META =================


function injectMetaTags(){


setMeta(
"wespen-team",
getPloegVanWeek()
);


const user =
localStorage.getItem(NAME_KEY);



if(user){

setMeta(
"wespen-username",
user
);

}



}



function setMeta(
name,
content
){


let meta =
document.querySelector(
`meta[name="${name}"]`
);



if(!meta){

meta =
document.createElement("meta");

meta.name=name;

document.head.appendChild(meta);

}



meta.content=content;


}



})();
