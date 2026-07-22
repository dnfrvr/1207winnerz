import React from "react";
import { useClock } from "../shared/phone-chrome.jsx";
import { FF_IOS } from "../shared/constants.js";
import { AppSkeleton, IOS6Toggle } from "../shared/ui-kit.jsx";

const ClockScreen = ({isIos, accent}) => {
  const clock = useClock();
  return (
    <AppSkeleton icon="⏰" name="Clock" color={isIos?"#1C1C1E":"#111"} isIos={isIos}>
      <div style={{background:isIos?"#1C1C1E":"#0a0a0a",borderRadius:0,padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
        <div style={{color:"#fff",fontSize:48,fontWeight:"200",letterSpacing:-2,fontFamily:FF_IOS}}>{clock.full24}</div>
        <div style={{color:"#888",fontSize:12}}>{clock.day}, {clock.month} {clock.dateOrd}</div>
      </div>
      {[{time:"07:30",label:"Class",on:true},{time:"09:00",label:"Biblio",on:false},{time:"23:00",label:"Rappel",on:true}].map((a,i)=>(
        <div key={i} style={{background:isIos?"#fff":"#1e1e1e",borderRadius:0,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${isIos?"#eee":"#2a2a2a"}`}}>
          <div>
            <div style={{color:isIos?"#000":"#fff",fontSize:22,fontWeight:"200"}}>{a.time}</div>
            <div style={{color:"#888",fontSize:11}}>{a.label}</div>
          </div>
          <IOS6Toggle value={a.on} onChange={()=>{}} accent={accent} isIos={isIos}/>
        </div>
      ))}
    </AppSkeleton>
  );
};

// Calculator

// Gmail / Mail

// Facebook — fil d'amis unique et partagé entre les 4 persos (synchronisé via data.sharedThreads._sharedFacebookPosts, comme Twitter).
// Valeurs par défaut tant que rien n'a été modifié depuis l'admin.
const FACEBOOK_PROFILES_DEFAULT = {
  glinda:{name:"Glinda Ravingfool",friends:"342"},
  eoghan:{name:"Eoghan Masuda",    friends:"891"},
  drew:  {name:"Drew Buckley",     friends:"156"},
  elias: {name:"Elias Green",      friends:"89"},
};
const FACEBOOK_FRIENDS_FEED_DEFAULT = [
  {name:"Glinda Ravingfool",time:"2 minutes ago",text:"playlist d'automne en boucle 🍂✨ qui a des recs ?",likes:23,comments:8},
  {name:"Eoghan Masuda",    time:"2 hours ago · 🌍",text:"nouveau son en ligne 🎵 #soundcloud soundcloud.com/eoghan_m",likes:12,comments:3},
  {name:"Drew Buckley",     time:"5 hours ago",text:"Ver de terre de 22 cm découvert ce matin. Record personnel. 🪱",likes:4,comments:7},
  {name:"Cynthia K.",       time:"8 hours ago",text:"Chess club UMA demain 14h salle B204 ! 🏆 cc Glinda, Drew",likes:6,comments:2},
  {name:"Eoghan Masuda",    time:"3 hours ago · 🌍",text:"séance du mat ✅ 6km ce soir ✅ reste à finir Rush 🎸",likes:18,comments:5},
  {name:"Glinda Ravingfool",time:"8 hours ago",text:"JOUR 29 avec mon bff 🎉🎉 tu mérites une médaille de survie @Eoghan",likes:61,comments:14},
  {name:"Ilya Sorokin",     time:"1 day ago",text:"soirée avec eoghan et asra ce soir 👀 incoming chaos",likes:22,comments:4},
  {name:"Drew Buckley",     time:"1 hour ago",text:"Ver de terre de 22 cm découvert ce matin. Record personnel. #Science 🪱",likes:4,comments:7},
  {name:"Cynthia K.",       time:"3 hours ago",text:"@Drew t'as vu le classement des clubs ? L'échecs est PREMIER 🏆🏆",likes:9,comments:3},
  {name:"Elias Green",      time:"5 hours ago",text:"personne ne voit ce que je vois. c'est ok. ça changera.",likes:2,comments:1},
];

// Pages suivies — propres à chaque perso (centres d'intérêt), pas partagées.
// Éditables depuis l'admin via data.facebookPages[charKey].
const FACEBOOK_PAGES_DEFAULT = {
  glinda:[
    {name:"UMA Campus Life",  time:"4 hours ago",text:"🍂 Fall Festival samedi sur le campus ! Musique live, food trucks et surprises.",likes:247,comments:31},
    {name:"Glam & Glow Makeup",time:"6 hours ago",text:"Le smokey eye automnal qui va avec TOUTES vos tenues 🍁💄 tuto en story",likes:1842,comments:96},
    {name:"Sephora",          time:"1 day ago",text:"Notre palette édition automne est en rupture de stock dans 80% des boutiques 😱 nouvelle livraison vendredi",likes:3204,comments:412},
  ],
  eoghan:[
    {name:"UMA Athletics",    time:"5 hours ago",text:"🏃 Bravo à notre équipe de cross-country pour la victoire de dimanche !",likes:54,comments:12},
    {name:"NFL",              time:"7 hours ago",text:"🏈 Week 4 recap: les surprises de la semaine et ce qui nous attend dimanche.",likes:18420,comments:2103},
    {name:"ESPN College Football",time:"1 day ago",text:"Le classement vient de bouger. Qui aurait cru ça en septembre ?",likes:9234,comments:887},
  ],
  drew:[
    {name:"Team Edward Official",time:"2 days ago",text:"BD Twilight vol.3 disponible dès aujourd'hui ! 🌙 #Twilight",likes:2847,comments:341},
    {name:"iNaturalist",      time:"2 days ago",text:"Species of the week: Lumbricus terrestris 🪱 The common earthworm.",likes:431,comments:28},
    {name:"UMA Biology Dept", time:"5 hours ago",text:"📋 Reminder: lab reports due this Friday by midnight. No extensions.",likes:12,comments:2},
  ],
  elias:[
    {name:"Stephen King",     time:"4 hours ago",text:"Derry isn't on most maps. That's never stopped it from being real to the people who grew up there.",likes:18234,comments:1402},
    {name:"My Chemical Romance",time:"1 day ago",text:"Writing. 🖤",likes:48293,comments:5821},
    {name:"Conspiracy Theory Group",time:"2 days ago",text:"THREAD: Les disparitions de Derry, Maine — 1985 à aujourd'hui. 27 ans de silence.",likes:312,comments:89},
    {name:"Bring Me The Horizon",time:"3 days ago",text:"Sempiternal is taking shape. Darker than ever. 🖤",likes:24819,comments:3214},
  ],
};

export { ClockScreen };
