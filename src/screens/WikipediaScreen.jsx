import React from "react";
import { AppSkeleton } from "../shared/ui-kit.jsx";

const WIKI_FEEDS = {
  glinda: [
    ["Économie comportementale","Branche de l'économie étudiant les effets psychologiques et cognitifs sur les décisions économiques.","1 oct 2012"],
    ["Taylor Swift","Auteure-compositrice-interprète américaine née en 1989. Son album Red est sorti le 22 octobre 2012.","1 oct 2012"],
    ["Université du Maine à Augusta","Établissement public d'enseignement supérieur fondé en 1965 à Augusta, Maine.","1 oct 2012"],
  ],
  eoghan: [
    ["Premier League","Première division du championnat de football anglais, fondée en 1992.","1 oct 2012"],
    ["Kendrick Lamar","Rappeur américain originaire de Compton. Good Kid, M.A.A.D City sort le 22 octobre 2012.","28 sep 2012"],
    ["Entraînement fractionné","Méthode alternant des phases d'effort intense et de récupération active.","15 sep 2012"],
  ],
  drew: [
    ["Lombric commun","Ver de terre de la famille des Lumbricidae, jouant un rôle clé dans l'aération des sols.","1 oct 2012"],
    ["Rewilding","Approche de conservation visant à restaurer les écosystèmes naturels.","28 sep 2012"],
    ["Derry (Maine)","Ville fictive du Maine créée par Stephen King, cadre de nombreux romans dont Ça.","30 sep 2012"],
    ["Annélides","Embranchement d'animaux invertébrés au corps segmenté, incluant les vers de terre et les sangsues.","27 sep 2012"],
    ["Forêt ancienne","Écosystème forestier n'ayant subi aucune perturbation humaine majeure depuis plusieurs siècles.","24 sep 2012"],
    ["Échecs","Jeu de société opposant deux joueurs sur un échiquier de 64 cases.","22 sep 2012"],
    ["iNaturalist","Plateforme collaborative de sciences citoyennes pour l'identification d'espèces.","20 sep 2012"],
    ["Décomposition (biologie)","Processus par lequel la matière organique est décomposée en formes plus simples.","18 sep 2012"],
    ["Réseau mycorhizien","Système de connexions souterraines entre les racines des plantes via les champignons.","12 sep 2012"],
  ],
  elias: [
    ["My Chemical Romance","Groupe de rock américain formé à Newark en 1999. Auteurs de The Black Parade (2006).","1 oct 2012"],
    ["Disparitions d'enfants aux États-Unis","Statistiques et procédures liées aux disparitions de mineurs aux États-Unis.","14 juil 2012"],
    ["Catatonie","État neurologique caractérisé par une stupeur et une insensibilité aux stimuli extérieurs.","1 oct 2012"],
    ["Bring Me the Horizon","Groupe de metalcore britannique formé à Sheffield en 2004.","29 sep 2012"],
    ["Amnésie dissociative","Trouble caractérisé par une incapacité à se souvenir d'informations personnelles importantes.","27 sep 2012"],
    ["Derry (Maine)","Ville fictive du Maine créée par Stephen King, cadre de nombreux romans dont Ça.","25 sep 2012"],
    ["Théorie du complot","Tentative d'expliquer un événement par l'action secrète et malveillante d'un groupe.","22 sep 2012"],
    ["Phénomène paranormal","Évènement ou expérience qui semble ne pas pouvoir être expliqué par les lois scientifiques connues.","19 sep 2012"],
    ["Fan fiction","Œuvre de fiction écrite par des fans, réutilisant des personnages ou univers existants.","15 sep 2012"],
    ["État de stress post-traumatique","Trouble psychologique pouvant survenir après l'exposition à un événement traumatique.","10 sep 2012"],
  ],
};


const WikipediaScreen = ({isIos, accent, charKey, data}) => {
  const articles = (data?.wikipedia && data.wikipedia.length > 0)
    ? data.wikipedia.map(a => Array.isArray(a) ? a : [a.title||"",a.desc||"",a.date||""])
    : (WIKI_FEEDS[charKey] || WIKI_FEEDS.elias);
  return (
  <AppSkeleton icon="📖" name="Wikipedia" color="#FFF" isIos={isIos}>
    <div style={{background:isIos?"linear-gradient(180deg,#e8e7e0,#f0efe9)":"#2a2a2a",borderRadius:0,padding:"6px 10px",display:"flex",gap:8,alignItems:"center",borderBottom:`1px solid ${isIos?"#b2b2a8":"#333"}`}}>
      <span style={{color:"#aaa",lineHeight:1}}><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6"/><path d="M13 13l-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></span>
      <span style={{color:"#aaa",fontSize:11,flex:1}}>Search on Wikipédia</span>
    </div>
    {articles.map(([title, desc, date],i)=>(
      <div key={i} style={{background:isIos?"linear-gradient(180deg,#ffffff,#f5f4ef)":"#1e1e1e",padding:"10px 12px",borderBottom:`1px solid ${isIos?"#b2b2a8":"#2a2a2a"}`,display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{width:32,height:32,borderRadius:16,background:isIos?"#e8e7e0":"#333",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📄</div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:isIos?"#3366cc":"#6699ff",marginBottom:2}}>{title}</div>
          <div style={{fontSize:10,color:isIos?"#555":"#aaa",lineHeight:1.4}}>{desc}</div>
          <div style={{fontSize:9,color:"#999",marginTop:3}}>Modifié le {date}</div>
        </div>
      </div>
    ))}
  </AppSkeleton>
  );
}

export { WikipediaScreen, WIKI_FEEDS };
