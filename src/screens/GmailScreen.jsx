import React, { useState, useContext } from "react";
import { LoreDateCtx, loreRelativeLabel } from "../shared/lore-date.js";

const EMAILS_BY_CHAR = {
  glindatheverygood:[
    {from:"UMA Registrar",     subj:"Calendrier des partiels — Automne 2012", preview:"Les dates des examens de mi-semestre sont publiées sur le portail étudiant.",time:"8:02 AM",unread:true},
    {from:"UMA Registrar",     subj:"Date limite add/drop : 5 octobre",   preview:"Dernier jour pour modifier votre sélection de cours sans pénalité.",time:"9:14 AM",  unread:true},
    {from:"UMA Financial Aid Office",subj:"Demande d'émancipation financière — dossier reçu",preview:"Nous accusons réception de votre demande d'émancipation financière pour l'année 2012-2013. Un conseiller examinera votre situation dans un délai de 10 à 15 jours. Des justificatifs pourront vous être demandés.",time:"Sep 26",unread:true},
    {from:"Chess.com",         subj:"Mise à jour classement : 1812 → 1824",preview:"Félicitations ! Vous venez de franchir la barre des 1800.",time:"Sep 24",unread:false},
    {from:"Tumblr",             subj:"12 personnes ont reblogué votre post", preview:"votre gifset 'architecture brutaliste autumn vibes' devient viral. 12 notes en 3 heures c'est ÉNORME pour vous félicitations.",time:"Sep 24",unread:false},
    {from:"Pinterest",          subj:"Des épingles que vous allez adorer ✨",  preview:"D'après vos tableaux 'dreamhouse' et 'gothic revival inspo' — 47 nouvelles épingles vous attendent cette semaine.",time:"Sep 23",unread:false},
    {from:"Arch Daily Newsletter",subj:"Les 10 plus belles façades néogothiques",preview:"Cette semaine : un tour des campus universitaires néogothiques aux États-Unis. Yale, Duke, et des pépites moins connues.",time:"Sep 22",unread:false},
    {from:"UMA Library",       subj:"Réservation disponible au comptoir",  preview:"Le livre que vous avez demandé est disponible au bureau principal.",time:"Sep 22",unread:false},
  ],
  eoghan_masuda:[
    {from:"UMA Athletics",    subj:"Rappel match : échauffement WR 13h00", preview:"Rappel : échauffement Wide Receivers 13h00, terrain nord. Match vs Vermont Beavers à 15h00. GO MOOSE 🫎",time:"9:45 AM",unread:true},
    {from:"UMA Athletics",    subj:"Horaires salle de sport — octobre",   preview:"Le centre sportif sera ouvert en horaires étendus du 1er au 15 octobre.",time:"8:00 AM",unread:false},
    {from:"Grindr",           subj:"🔥 Vous êtes populaire en ce moment !", preview:"15 hommes ont consulté votre profil aujourd'hui. Passez à Grindr Xtra pour voir qui vous a ajouté aux favoris.",time:"Sep 30",unread:true},
    {from:"SoundCloud",       subj:"Quelqu'un a aimé votre titre Rush",    preview:"Votre titre Rush vient de recevoir un nouveau like. Continuez à créer !",time:"Sep 30",unread:true},
    {from:"The Daily Astorian",subj:"À la une : saison des tempêtes en avance", preview:"Les météorologues prévoient une saison hivernale précoce sur la côte de l'Oregon. Astoria se prépare. Abonné depuis 2011 — merci de votre fidélité.",time:"Sep 28",unread:false},
    {from:"UMA Housing",      subj:"Inspection de chambre — 10 oct.",     preview:"Merci de vous assurer que votre chambre est prête pour l'inspection prévue.",time:"Sep 26",unread:false},
    {from:"Financial Aid UMA",subj:"Bourse 2012-2013 confirmée",          preview:"Votre dossier a été traité. Voir la lettre en pièce jointe.",time:"Sep 20",unread:false},
  ],
  dreww_orms:[
    {from:"UMA Chess Club",   subj:"Tournoi interne — inscriptions ouvertes",preview:"Les inscriptions pour le tournoi interne d'automne sont ouvertes. Première ronde samedi 14h, salle B204.",time:"9:15 AM",unread:true},
    {from:"PubMed Alerts",    subj:"Nouvel article : Locomotion des vers de terre",preview:"Contrôle neural de la locomotion péristaltique chez Lumbricus terrestris — nouvelles données.",time:"10:22 AM",unread:true},
    {from:"UMA Biology Dept", subj:"Rappel : compte-rendu labo semaine 5", preview:"Les comptes-rendus sont à rendre vendredi avant minuit. Aucun retard accepté.",time:"Sep 30",unread:true},
    {from:"iNaturalist",      subj:"Votre observation a été confirmée",    preview:"Des naturalistes experts ont vérifié votre observation de Lumbricus terrestris.",time:"Sep 29",unread:false},
    {from:"Chess.com",        subj:"Résumé hebdomadaire — vos stats",     preview:"Vous avez joué 12 parties cette semaine. Taux de victoire : 75 %. ELO : 1812.",time:"Sep 28",unread:false},
    {from:"Twilight Fan Wiki", subj:"Nouvelle discussion : Équipe Edward vs Jacob",preview:"L'utilisateur twilightforever a répondu à votre commentaire dans le forum.",time:"Sat",  unread:false},
  ],
  noteliasgreen:[
    {from:"Hôpital Régional de Derry",subj:"Mise à jour situation patiente — A. Green", preview:"Situation inchangée. Votre sœur Anna reste stabilisée en service psychiatrique. Visites autorisées lundi-vendredi 9h-17h. Merci de vous présenter à l'accueil.",time:"9:30 AM",unread:true},
    {from:"Parrot Society of America",subj:"Newsletter oct. 2012 — comportement des psittacidés",preview:"Ce mois-ci : la communication vocale chez le gris du Gabon, nouvelles études sur la mémoire des aras, et retour sur le congrès annuel de Portland.",time:"8:15 AM",unread:false},
    {from:"NaNoWriMo",        subj:"Prêt pour novembre ? Inscrivez-vous",  preview:"Le Mois national de l'écriture commence dans 30 jours. Votre profil vous attend.",time:"9:00 AM",unread:true},
    {from:"Reddit",           subj:"[r/conspiracy] Réponse à votre commentaire",preview:"u/TruthSeeker99 a répondu : « Les disparitions de Derry ? Je fais des recherches là-dessus aussi. »",time:"11:58 PM",unread:true},
    {from:"UMA Literature",   subj:"Planning S2 disponible",               preview:"Le planning du semestre de printemps est en ligne sur le portail étudiant.",time:"Mon",  unread:false},
    {from:"AO3",              subj:"Nouveau commentaire sur Five Nights ch.3",preview:"horrorfan2012 a laissé un commentaire : « C'est vraiment terrifiant, mettez à jour vite. »",time:"Sep 29",unread:false},
    {from:"Paranormal Forums",subj:"Votre fil : disparitions de Derry",    preview:"8 nouvelles réponses à votre fil. Quelqu'un prétend avoir des documents.",time:"Sep 27",unread:false},
  ],
};

const MAIL_DRAFTS_BY_CHAR = {
  glindatheverygood:[
    {from:"Glinda R.",subj:"Re: UMA Financial Aid — brouillon",preview:"Bonjour, je vous écris concernant mon dossier d'émancipation financière. Suite à votre email du 26 septembre, je souhaitais vous préciser que...",time:"6 oct, 9:12am",unread:false},
    {from:"Glinda R.",subj:"[Brouillon] Lettre de motivation — Club photo",preview:"Je me permets de vous contacter pour exprimer mon intérêt pour rejoindre le club photo de l'UMA. Passionnée d'architecture...",time:"5 oct, 11:30pm",unread:false},
  ],
  eoghan_masuda:[
    {from:"Eoghan M.",subj:"[Brouillon] Sound file for Ilya",preview:"Hey, j'ai fini le mix de Rush — je voulais t'envoyer la version wav avant de la publier. Dis-moi ce que tu en penses...",time:"6 oct, 2:14am",unread:false},
    {from:"Eoghan M.",subj:"Re: Asra — brouillon",preview:"Asra, je sais pas comment dire ça sans que ça sonne bizarre mais...",time:"4 oct, 11:58pm",unread:false},
  ],
  dreww_orms:[
    {from:"Drew B.",subj:"[Brouillon] Compte-rendu labo semaine 5",preview:"Introduction : L'objectif de cette expérience était d'observer les comportements locomoteurs de Lumbricus terrestris sous différentes conditions de lumière...",time:"6 oct, 8:30am",unread:false},
    {from:"Drew B.",subj:"Re: Tournoi — brouillon",preview:"Bonjour, je confirme ma participation au tournoi interne du samedi. Pour l'ouverture je prévois...",time:"5 oct, 7:00pm",unread:false},
  ],
  noteliasgreen:[
    {from:"Elias G.",subj:"[Brouillon] Lettre hôpital — Anna",preview:"Je souhaitais vous faire part de mes inquiétudes concernant le suivi de ma sœur Anna Green, admise le 4 octobre. Les informations qui m'ont été communiquées...",time:"6 oct, 1:04am",unread:false},
    {from:"Elias G.",subj:"[Brouillon] chapitre 4 Five Nights",preview:"La forêt derrière Derry ne ressemble à aucune autre. Les arbres y poussent trop serrés, trop droits, comme s'ils attendaient quelque chose...",time:"5 oct, 11:00pm",unread:false},
  ],
};
// Boîte "Supprimés" — vide par défaut pour les 4 persos (personne n'a encore rien supprimé dans le
// lore). Cette constante était référencée (admin + GmailScreen) mais n'avait jamais été définie lors
// de l'ajout des onglets Drafts/Deleted — une ReferenceError plantait donc le rendu de l'app Mail
// pour tout le monde, dès l'ouverture, dès que mail_deleted n'avait pas encore de valeur en base.
const MAIL_DELETED_BY_CHAR = {
  glindatheverygood: [],
  eoghan_masuda: [],
  dreww_orms: [],
  noteliasgreen: [],
};

const GmailScreen = ({data, isIos, accent, onBack}) => {
  const loreDateStr = useContext(LoreDateCtx);
  // "inbox" = vue inbox (défaut), null = liste Mailboxes iOS, "drafts"/"deleted" = sous-dossier
  const [mailbox, setMailbox] = useState("inbox");
  const [openMail, setOpenMail] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const charUsername = data.username || "glindatheverygood";
  // Garde défensive : si data.mail_override[charUsername] (ou drafts/deleted) n'est pas un tableau
  // pour une raison ou une autre, .filter/.map plantait plus bas et faisait planter TOUT l'écran
  // Mail (écran noir au clic sur l'app, sur iOS comme Android, car c'est le même composant pour
  // les deux). On retombe sur le tableau par défaut au lieu de laisser planter le rendu.
  const asArr = (v, fallback) => Array.isArray(v) ? v : fallback;
  const inbox   = asArr(data.mail_override?.[charUsername] ?? EMAILS_BY_CHAR[charUsername] ?? EMAILS_BY_CHAR.glindatheverygood, []);
  const drafts  = asArr(data.mail_drafts?.[charUsername]   ?? MAIL_DRAFTS_BY_CHAR[charUsername]  ?? [], []);
  const deleted = asArr(data.mail_deleted?.[charUsername]  ?? MAIL_DELETED_BY_CHAR[charUsername]  ?? [], []);

  const FOLDERS = [
    {key:"inbox",  label:"Inbox",   icon:"inbox",  count:inbox.filter(e=>e.unread).length, list:inbox,   badge:true},
    {key:"drafts", label:"Drafts",  icon:"drafts", count:drafts.length,                    list:drafts,  badge:false},
    {key:"deleted",label:"Deleted", icon:"trash",  count:0,                                list:deleted, badge:false},
  ];

  const FolderIcon = ({type, color="#4a7ab5", size=20}) => {
    if(type==="inbox")  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M2 12l4-8h12l4 8v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/><path d="M2 12h5l2 3h6l2-3h5" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/></svg>;
    if(type==="drafts") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v3" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3v5h5M15.5 18.5l2-2 2 2-2 2-2-2zM17.5 16.5l2-2" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    if(type==="trash")  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke={color} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    return null;
  };

  const IOS_BLUE = "#4a7ab5";
  const GM_AVATAR_COLORS = ["#E53935","#8E24AA","#1E88E5","#00897B","#F4511E","#3949AB","#039BE5","#7CB342","#D81B60","#F6BF26"];
  const gmAvatar = name => GM_AVATAR_COLORS[(name||" ").charCodeAt(0) % GM_AVATAR_COLORS.length];

  const CHAR_DISPLAY_DEFAULTS = {
    glindatheverygood: "Glinda Ravingfool <glindatheverygood@uma.edu>",
    eoghan_masuda:     "Eoghan Masuda <eoghan_masuda@uma.edu>",
    dreww_orms:        "Drew B. <dreww_orms@uma.edu>",
    noteliasgreen:     "Elias Green <noteliasgreen@uma.edu>",
  };
  // Utilise l'adresse mail personnalisée du perso si définie dans l'admin (data.mailEmail)
  const charDisplayEmail = data.mailEmail || CHAR_DISPLAY_DEFAULTS[charUsername] || charUsername;
  const CHAR_DISPLAY = {
    ...CHAR_DISPLAY_DEFAULTS,
    [charUsername]: charDisplayEmail,
  };
  const toAddress   = m => m.to || CHAR_DISPLAY[charUsername] || charUsername;
  const fromAddress = m => m.fromFull || m.from || "";
  const curFolder   = FOLDERS.find(f => f.key === (mailbox || "inbox")) || FOLDERS[0];
  const unreadTotal = inbox.filter(e => e.unread).length;

  // ── Mail ouvert ──
  if(openMail) {
    const m = openMail;
    const senderInitial = (m.from||"?")[0].toUpperCase();
    const senderColor = gmAvatar(m.from);
    const formattedTime = m.time ? loreRelativeLabel(m.time, data.loreDate||"2012-10-06") : "";
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* ── Navbar ── */}
        {isIos ? (
          <div style={{background:"linear-gradient(180deg,#6a8fc0,#3d5f8a)",padding:"6px 10px",display:"flex",alignItems:"center",gap:8,flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.4)"}}>
            <button onClick={()=>setOpenMail(null)} style={{background:"linear-gradient(180deg,#6a8fc0,#3d5f8a)",border:"1px solid rgba(0,0,0,0.45)",borderRadius:6,color:"#fff",fontSize:11,fontWeight:"600",cursor:"pointer",padding:"3px 10px 3px 7px",display:"flex",alignItems:"center",gap:2,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)"}}>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{fontSize:12,marginLeft:2}}>{curFolder.label}</span>
            </button>
            <span style={{flex:1,textAlign:"center",color:"#fff",fontSize:13,fontWeight:600,textShadow:"0 1px 1px rgba(0,0,0,0.4)"}}>Message</span>
            <span style={{width:70}}/>
          </div>
        ) : (
          <div style={{background:"#C62828",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0,boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}>
            <button onClick={()=>setOpenMail(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#fff",padding:0,display:"flex",alignItems:"center"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span style={{flex:1,color:"#fff",fontSize:16,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.subj}</span>
          </div>
        )}
        <div style={{flex:1,overflowY:"auto",background:"#fff"}}>
          {isIos ? (
            <>
              {/* Objet */}
              <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #e8e8e8"}}>
                <div style={{fontSize:17,fontWeight:700,color:"#1a1a1a",lineHeight:1.3,fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>{m.subj||<em style={{color:"#999"}}>Sans objet</em>}</div>
              </div>
              {/* Métadonnées expéditeur */}
              <div style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 16px",borderBottom:"1px solid #e8e8e8",background:"#fafafa"}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:senderColor,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:15,flexShrink:0}}>{senderInitial}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:6}}>
                    <span style={{fontSize:14,fontWeight:600,color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fromAddress(m)}</span>
                    <span style={{fontSize:11,color:"#888",flexShrink:0}}>{formattedTime}</span>
                  </div>
                  <div style={{marginTop:3,fontSize:12,color:"#888",display:"flex",gap:4}}>
                    <span>À</span>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#555"}}>{toAddress(m)}</span>
                  </div>
                </div>
              </div>
              {/* Corps du mail */}
              <div style={{padding:"16px",fontSize:14,color:"#1a1a1a",lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>{m.preview||<span style={{color:"#ccc",fontStyle:"italic"}}>(corps vide)</span>}</div>
            </>
          ) : (
            <>
              <div style={{padding:"16px 16px 0"}}>
                <div style={{fontSize:20,fontWeight:400,color:"#202124",lineHeight:1.3,marginBottom:14}}>{m.subj||<em style={{color:"#999",fontSize:16}}>Sans objet</em>}</div>
              </div>
              {/* Métadonnées Gmail */}
              <div style={{padding:"0 16px 14px",display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:senderColor,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16,flexShrink:0}}>{senderInitial}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"#202124"}}>{fromAddress(m)}</span>
                    <span style={{fontSize:11,color:"#5f6368",flexShrink:0}}>{formattedTime}</span>
                  </div>
                  <div style={{marginTop:3,fontSize:12,color:"#5f6368",display:"flex",gap:4,alignItems:"baseline"}}>
                    <span style={{fontWeight:500}}>À</span>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{toAddress(m)}</span>
                  </div>
                </div>
              </div>
              <div style={{height:1,background:"#e0e0e0",margin:"0 16px 16px"}}/>
              <div style={{padding:"0 16px 32px",fontSize:14,color:"#202124",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{m.preview||<span style={{color:"#ccc",fontStyle:"italic"}}>(corps vide)</span>}</div>
            </>
          )}
        </div>
        {/* ── Actions bottom (iOS) ── */}
        {isIos && (
          <div style={{borderTop:"1px solid #e0dfe0",padding:"6px 16px",display:"flex",justifyContent:"space-around",background:"linear-gradient(180deg,#b0b8c8,#a0a8b8)",flexShrink:0}}>
            {[["↩","Répondre"],["→","Transférer"],["🗑","Supprimer"]].map(([ic,label])=>(
              <button key={label} style={{background:"none",border:"none",color:"#fff",cursor:"default",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:10,padding:"4px 8px",textShadow:"0 -1px 0 rgba(0,0,0,0.4)"}}>
                <span style={{fontSize:18}}>{ic}</span>{label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Liste Mailboxes iOS (mailbox === null) ──
  if(isIos && mailbox === null) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:"linear-gradient(180deg,#6a8fc0,#3d5f8a)",padding:"6px 10px",display:"flex",alignItems:"center",flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.4)"}}>
        <button onClick={()=>onBack?.()} style={{background:`linear-gradient(180deg,#6a8fc0,#3d5f8a)`,border:"1px solid rgba(0,0,0,0.45)",borderRadius:6,color:"#fff",fontSize:11,fontWeight:"600",cursor:"pointer",padding:"3px 10px 3px 7px",display:"flex",alignItems:"center",gap:2,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)"}}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{flex:1,textAlign:"center",color:"#fff",fontSize:14,fontWeight:700,textShadow:"0 1px 1px rgba(0,0,0,0.4)"}}>Mailboxes</span>
        <span style={{width:44}}/>
      </div>
      <div style={{background:"linear-gradient(180deg,#b0b8c8,#a0a8b8)",padding:"5px 8px",flexShrink:0}}>
        <div style={{background:"rgba(255,255,255,0.85)",borderRadius:8,padding:"4px 10px",display:"flex",alignItems:"center",gap:6,border:"1px solid #888",boxShadow:"inset 0 1px 2px rgba(0,0,0,0.1)"}}>
          <svg width="13" height="13" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#888" strokeWidth="1.6"/><path d="M13 13l3 3" stroke="#888" strokeWidth="1.6" strokeLinecap="round"/></svg>
          <span style={{color:"#aaa",fontSize:14}}>Rechercher</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",background:"#c8c8c8"}}>
        <div style={{marginTop:16}}>
          <div style={{padding:"4px 14px",fontSize:11,fontWeight:600,color:"#555",textTransform:"uppercase",letterSpacing:0.5}}>Mailboxes</div>
          <div style={{background:"#fff",borderTop:"1px solid #c8c8c8",borderBottom:"1px solid #c8c8c8"}}>
            {FOLDERS.map((f,i)=>(
              <div key={f.key} onClick={()=>setMailbox(f.key)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderBottom:i<FOLDERS.length-1?"1px solid #c8c8c8":"none",cursor:"pointer",background:"#fff"}}>
                <FolderIcon type={f.icon} color={IOS_BLUE} size={22}/>
                <span style={{flex:1,fontSize:15,color:"#000"}}>{f.label}</span>
                {f.badge&&f.count>0&&<span style={{background:IOS_BLUE,color:"#fff",borderRadius:10,padding:"1px 8px",fontSize:12,fontWeight:700}}>{f.count}</span>}
                <span style={{color:"#c0c0c5",fontSize:16}}>›</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Vue liste d'un dossier (inbox, drafts ou deleted) ──
  const folderList = curFolder.list || [];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {isIos ? (
        <div style={{background:"linear-gradient(180deg,#6a8fc0,#3d5f8a)",padding:"6px 10px",display:"flex",alignItems:"center",flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,0.4)"}}>
          <button onClick={()=>setMailbox(null)} style={{background:`linear-gradient(180deg,#6a8fc0,#3d5f8a)`,border:"1px solid rgba(0,0,0,0.45)",borderRadius:6,color:"#fff",fontSize:11,fontWeight:"600",cursor:"pointer",padding:"3px 10px 3px 7px",display:"flex",alignItems:"center",gap:2,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)"}}>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{fontSize:12,marginLeft:2}}>Mailboxes</span>
          </button>
          <span style={{flex:1,textAlign:"center",color:"#fff",fontSize:14,fontWeight:700,textShadow:"0 1px 1px rgba(0,0,0,0.4)"}}>{curFolder.label}</span>
          <span style={{width:80}}/>
        </div>
      ) : (
        <div style={{background:"#C62828",padding:"10px 14px",display:"flex",alignItems:"center",gap:12,flexShrink:0,boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}>
          <button onClick={()=>setShowMenu(m=>!m)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:"2px 0",display:"flex",flexDirection:"column",gap:4,alignItems:"center",width:20}}>
            <span style={{display:"block",width:18,height:2,background:"#fff",borderRadius:1}}/><span style={{display:"block",width:18,height:2,background:"#fff",borderRadius:1}}/><span style={{display:"block",width:18,height:2,background:"#fff",borderRadius:1}}/>
          </button>
          <span style={{color:"#fff",fontSize:18,fontWeight:500,flex:1}}>Gmail</span>
          {unreadTotal>0&&<span style={{background:"rgba(255,255,255,0.25)",color:"#fff",borderRadius:10,padding:"1px 8px",fontSize:12,fontWeight:700}}>{unreadTotal}</span>}
        </div>
      )}

      {/* Android drawer */}
      {!isIos&&showMenu&&<>
        <div onClick={()=>setShowMenu(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",zIndex:10}}/>
        <div style={{position:"absolute",top:0,left:0,bottom:0,width:"72%",background:"#fff",zIndex:11,boxShadow:"2px 0 8px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
          <div style={{background:"#C62828",padding:"14px 16px",color:"#fff",fontSize:16,fontWeight:500}}>Gmail</div>
          {FOLDERS.map(f=>(
            <div key={f.key} onClick={()=>{setMailbox(f.key);setShowMenu(false);}} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",cursor:"pointer",borderBottom:"1px solid #f5f5f5",background:f.key===mailbox?"rgba(198,40,40,0.06)":"#fff"}}>
              <FolderIcon type={f.icon} color={f.key===mailbox?"#C62828":"#5f6368"} size={20}/>
              <span style={{flex:1,fontSize:14,color:f.key===mailbox?"#C62828":"#212121",fontWeight:f.key===mailbox?600:400}}>{f.label}</span>
              {f.badge&&f.count>0&&<span style={{background:"#C62828",color:"#fff",borderRadius:10,padding:"1px 8px",fontSize:11,fontWeight:700}}>{f.count}</span>}
            </div>
          ))}
        </div>
      </>}

      <div style={{flex:1,overflowY:"auto",background:isIos?"#c8c8c8":"#f1f1f1"}}>
        {folderList.length===0&&<div style={{padding:"40px 24px",textAlign:"center",color:"#888",fontSize:13}}>Aucun message</div>}
        {folderList.map((m,i)=>(
          isIos ? (
            <div key={i} onClick={()=>setOpenMail(m)} style={{background:i%2===0?"#fff":"#f7f7f7",borderBottom:"1px solid #c8c8c8",padding:"8px 10px",display:"flex",gap:8,alignItems:"flex-start",minHeight:64,cursor:"pointer"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:m.unread?"#4a7ab5":"transparent",flexShrink:0,marginTop:5}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:1}}>
                  <span style={{color:"#000",fontSize:13,fontWeight:m.unread?700:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>{m.from}</span>
                  <span style={{color:IOS_BLUE,fontSize:11,flexShrink:0}}>{loreRelativeLabel(m.time,loreDateStr)}</span>
                </div>
                <div style={{color:"#000",fontSize:12,fontWeight:m.unread?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{m.subj}</div>
                <div style={{color:"#888",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.preview}</div>
              </div>
              <span style={{color:"#c0c0c0",fontSize:16,flexShrink:0,marginTop:8}}>›</span>
            </div>
          ) : (
            <div key={i} onClick={()=>setOpenMail(m)} style={{background:m.unread?"#fff":"#fafafa",borderBottom:"1px solid #e5e5e5",padding:"10px 12px",display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:gmAvatar(m.from),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16,flexShrink:0}}>{(m.from||"?")[0]}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}>
                  <span style={{color:m.unread?"#202124":"#5f6368",fontSize:13,fontWeight:m.unread?"700":"400",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>{m.from}</span>
                  <span style={{color:"#5f6368",fontSize:11,flexShrink:0,marginLeft:4}}>{loreRelativeLabel(m.time,loreDateStr)}</span>
                </div>
                <div style={{color:m.unread?"#202124":"#5f6368",fontSize:12,fontWeight:m.unread?"500":"400",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1}}>{m.subj}</div>
                <div style={{color:"#9aa0a6",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.preview}</div>
              </div>
              <span style={{color:"#bdc1c6",fontSize:16,flexShrink:0}}>☆</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export { GmailScreen, EMAILS_BY_CHAR, MAIL_DRAFTS_BY_CHAR, MAIL_DELETED_BY_CHAR };
