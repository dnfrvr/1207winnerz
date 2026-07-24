// ─── APP MESSAGES (iOS + Android) ────────────────────────────────────────────
// Dernier écran d'app sorti du monolithe. Était embarqué (et en partie dupliqué) dans les 2
// shells. La vue est en LECTURE SEULE (l'édition se fait dans l'admin) : le champ de saisie et
// le bouton d'envoi sont purement décoratifs.
//
// Le « chrome » du téléphone (Shell/AppShell, NavBar/ActionBar, barre de statut) est défini DANS
// chaque shell (fermetures sur devOv/appNavColors/app/notifApps…) : on le reçoit donc en props
// (`Shell`, `NavBar`, `statusBar`) plutôt que de le réimporter, ce qui préserve ces fermetures.
// Idem pour `getThread`/`fmtTime`, déjà calculés côté shell.
import React from "react";
import { FF_IOS } from "../shared/constants.js";
import { loreSortKey, loreDayKey, loreDateLabel, loreClock } from "../shared/lore-date.js";
import { isMainPairThread } from "../shared/messages.js";

const AND_CONTACTS = ['drew','elias','gwen','nils','abby','hector','matthew','louis','vicky','james','harry','asra','nayati','sophie'];

export const MessagesScreen = ({
  isIos, data, accent,
  thread, setThread, msgView, setMsgView, goHome,
  getThread, fmtTime,
  Shell, NavBar, statusBar,
}) => {
  // Filet anti-doublon (non destructif). La synchro Firebase des tableaux `messages` se fait par
  // index ; à plusieurs appareils/onglets, la fusion peut laisser plusieurs entrées pour une même
  // conversation partagée (même sharedThreadId), parfois avec une perspective incohérente (on voit
  // alors le point de vue de l'autre perso). On n'affiche qu'UNE ligne par sharedThreadId — la
  // première dans l'ordre d'origine (typiquement l'entrée du seed, la bonne). Les données Firebase
  // ne sont PAS modifiées ; seul l'affichage est nettoyé. Les convs locales (sans sharedThreadId)
  // ont un id unique et ne sont jamais fusionnées → gardées telles quelles.
  // `pairs` = tableau de [msg, indexOriginal] (l'index sert à setThread → ouvrir la bonne conv).
  const dedupeConvs = (pairs) => {
    const seen = new Set();
    return pairs.filter(([m]) => {
      if (!m.sharedThreadId) return true;
      if (seen.has(m.sharedThreadId)) return false;
      seen.add(m.sharedThreadId);
      return true;
    });
  };

  // ── iOS ────────────────────────────────────────────────────────────────────
  if (isIos) {
    if (thread === null) {
      // key={i} (index d'origine, unique) et NON msg.id : le seed contient des conversations qui
      // partagent le même id (ex: deux convs id:9). Des clés React dupliquées font que React
      // « duplique et/ou omet » des éléments — une conv peut alors s'afficher sous l'identité d'une
      // autre (ex: Nils qui devient Matthew). L'index de la conv dans data.messages est unique.
      const renderConvRow = (msg, i, dim=false) => (
        <div key={i} onClick={()=>setThread(i)} style={{background:"#fff",borderBottom:"0.5px solid #c8c7cc",display:"flex",cursor:"pointer",alignItems:"stretch",opacity:dim?0.55:1}}>

            <div style={{width:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",paddingLeft:6}}>
              {msg.unread&&<div style={{width:10,height:10,borderRadius:"50%",background:"#007aff"}}/>}
            </div>
            <div style={{width:52,display:"flex",alignItems:"center",justifyContent:"center",padding:"10px 0 10px 4px",flexShrink:0}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${accent}88,${accent}44)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:15,border:`1.5px solid ${accent}66`}}>{msg.contact[0]}</div>
            </div>
            <div style={{flex:1,padding:"10px 0 10px 10px",minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}>
                <div style={{fontWeight:msg.unread?700:600,fontSize:14,color:"#000"}}>{msg.contact}</div>
                {(()=>{const _t=getThread(msg);const _l=_t[_t.length-1];return <span style={{fontSize:12,color:msg.unread?"#007aff":"#8e8e93",fontWeight:msg.unread?600:400,flexShrink:0,marginRight:12}}>{fmtTime(_l?.time)}</span>;})()}
              </div>
              <div style={{fontSize:13,color:msg.unread?"#000":"#8e8e93",fontWeight:msg.unread?500:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:12}}>{(()=>{const _t=getThread(msg);return _t[_t.length-1]?.text;})()}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",paddingRight:8,gap:6}}>
              <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </div>
        </div>
      );
      const deletedConvs = dedupeConvs(data.messages.map((m,i)=>[m,i]).filter(([m])=>m.deleted));
      if(msgView==="deleted") return (
      <Shell>{statusBar}<NavBar title="Deleted Conversations" back={()=>setMsgView("inbox")}/>
        <div style={{flex:1,background:"#f2f2f7",overflowY:"auto",minHeight:0}}>
          <div style={{padding:"10px 14px",fontSize:11,color:"#8e8e93",background:"#e9e9ee",borderBottom:"0.5px solid #c8c7cc"}}>These conversations have been removed from your inbox.</div>
          {deletedConvs.length===0
            ? <div style={{padding:24,textAlign:"center",color:"#8e8e93",fontSize:13}}>No deleted conversations.</div>
            : deletedConvs.map(([m,i])=>renderConvRow(m,i,true))}
        </div>
      </Shell>
      );
      return (
      <Shell>{statusBar}<NavBar title="Messages" back={goHome}/>
        <div style={{flex:1,background:"#f2f2f7",overflowY:"auto",minHeight:0}}>
          {deletedConvs.length>0 && (
            <div onClick={()=>setMsgView("deleted")} style={{background:"#e9e9ee",borderBottom:"0.5px solid #c8c7cc",padding:"11px 14px",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <span style={{fontSize:15}}>🗑️</span>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:"#8e8e93"}}>Deleted Conversations</span>
              <span style={{fontSize:12,color:"#8e8e93"}}>{deletedConvs.length}</span>
              <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </div>
          )}
          {(()=>{const sp=dedupeConvs(data.messages.map((m,i)=>[m,i]).filter(([m])=>!m.deleted)).sort(([a],[b])=>{const ta=getThread(a),tb=getThread(b);return loreSortKey(tb[tb.length-1]?.time)-loreSortKey(ta[ta.length-1]?.time);});return sp.map(([msg,i])=>renderConvRow(msg,i,false));})()}
        </div>
      </Shell>
      );
    }

    const conv=data.messages[thread]; if(!conv) return null;
    const resolvedThread=getThread(conv);
    // isGroup effectif : une conv 1-à-1 entre persos principaux n'est JAMAIS un groupe, même si un
    // flag isGroup parasite traîne (cf. isMainPairThread). Évite l'affichage group-style + « them ».
    const isGroupConv = conv.isGroup && !isMainPairThread(conv.sharedThreadId);
    const contactLower = (conv.contact||'').toLowerCase();
    const isAndroidContact = AND_CONTACTS.some(n=>contactLower.includes(n));
    const meBg    = isAndroidContact ? "linear-gradient(180deg,#5AD265,#3DBF56)" : "linear-gradient(180deg,#1D85FB,#0A6EE8)";
    const sendBtnBg = isAndroidContact ? "#4CD964" : "#147EFB";
    return (
      <Shell>
        {statusBar}
        <NavBar title={conv.contact} back={()=>setThread(null)}/>
        <div ref={el=>{if(el)setTimeout(()=>{el.scrollTop=el.scrollHeight;},0)}}
          style={{flex:1,background:"#b2bbc6",overflowY:"auto",padding:"8px 0",display:"flex",flexDirection:"column",minHeight:0,WebkitOverflowScrolling:"touch"}}>
          {resolvedThread.map((msg,mi)=>{
            const isMe=msg.from==="me";
            const nextMsg = resolvedThread[mi+1];
            // Afficher l'heure seulement sous le DERNIER message d'une série consécutive du même
            // expéditeur — comme iMessage. Avant, nextMsg.time!==msg.time déclenchait l'affichage
            // dès que deux messages reçus avaient des heures différentes, donc chaque message "them"
            // avait sa propre heure même au milieu d'une série. Maintenant uniquement au changement
            // d'expéditeur ou en fin de fil.
            // Heure affichée sous CHAQUE message (discrète mais visible). loreClock donne l'heure
            // horloge du message ("2:22pm"), indépendante de la date lore courante.
            const clock = loreClock(msg.time);
            const dayChanged = loreDayKey(msg.time)!==null && (mi===0 || loreDayKey(resolvedThread[mi-1]?.time)!==loreDayKey(msg.time));
            const dateLabel = loreDateLabel(msg.time);
            return (
              <React.Fragment key={mi}>
              {dayChanged && dateLabel &&
                <div style={{textAlign:"center",fontSize:10.5,color:"#8e8e93",fontWeight:400,padding:"12px 0 6px",letterSpacing:0.2}}>{dateLabel}</div>}
              <div style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",padding:"1px 10px",gap:0}}>
                {isGroupConv && !isMe && (mi===0 || resolvedThread[mi-1]?.senderKey!==msg.senderKey) &&
                  <span style={{fontSize:10,color:"#5b6b7a",fontWeight:600,padding:"3px 6px 1px"}}>{msg.senderName}</span>}
                <div style={{
                  maxWidth:"75%",
                  background:msg.img?"transparent":(isMe ? meBg : "linear-gradient(180deg,#f2f2f2,#e0e0e0)"),
                  color:isMe?"#fff":"#000",
                  borderRadius:isMe?"18px 18px 3px 18px":"18px 18px 18px 3px",
                  padding:msg.img?0:"7px 12px",
                  fontSize:14,
                  lineHeight:1.35,
                  fontFamily:FF_IOS,
                  boxShadow:msg.img?"none":(isMe
                    ?"0 1px 2px rgba(0,0,80,0.3),inset 0 1px 0 rgba(255,255,255,0.2)"
                    :"0 1px 2px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.85)"),
                  border:msg.img?"none":(isMe?"none":"1px solid rgba(0,0,0,0.1)"),
                  wordBreak:"break-word",
                  overflow:msg.img?"hidden":"visible",
                }}>
                  {msg.img && <img src={msg.img} style={{maxWidth:"100%",display:"block",borderRadius:msg.text?"18px 18px 0 0":(isMe?"18px 18px 3px 18px":"18px 18px 18px 3px")}}/>}
                  {msg.text && <div style={{padding:msg.img?"6px 12px":0}}>{msg.text}</div>}
                </div>
                {clock&&<span style={{fontSize:9,color:"#5f6b78",opacity:0.75,padding:"1px 5px 2px",fontFamily:FF_IOS}}>{clock}</span>}
              </div>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{background:"linear-gradient(180deg,#c6ccd4,#b8bec6)",borderTop:"1px solid #8a9099",padding:"5px 8px",display:"flex",alignItems:"center",gap:6,flexShrink:0,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.35)"}}>
          <div style={{flex:1,background:"linear-gradient(180deg,#fff,#f4f4f4)",border:"1px solid #9a9a9a",borderRadius:14,padding:"5px 12px",fontSize:13,color:"#aaa",fontFamily:FF_IOS,boxShadow:"inset 0 1px 3px rgba(0,0,0,0.12)"}}>iMessage</div>
          <div style={{width:30,height:30,borderRadius:"50%",background:sendBtnBg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:700,boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>↑</div>
        </div>
      </Shell>
    );
  }

  // ── Android ──────────────────────────────────────────────────────────────────
  if (thread === null) {
    // Ligne de conversation (réutilisée pour l'inbox ET la vue « supprimés »). `dim` grise
    // les convs supprimées. key={i} = index d'origine (unique) → setThread(i) ouvre la bonne conv.
    const renderAndroidRow = (msg, i, dim=false) => {
      const lastMsg=(()=>{const _t=getThread(msg);return _t[_t.length-1];})();
      const lastTime=fmtTime(lastMsg?.time);
      const initials=(msg.contact||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
      const avatarColor=["#e53935","#1e88e5","#43a047","#fb8c00","#8e24aa","#00897b"][msg.contact.charCodeAt(0)%6];
      return (
        <div key={i} onClick={()=>setThread(i)} style={{
          padding:"12px 16px",borderBottom:"1px solid #e0e0e0",
          display:"flex",gap:14,cursor:"pointer",alignItems:"center",
          background:msg.unread?"#fff":"#fafafa",opacity:dim?0.6:1,
        }}>
          <div style={{width:38,height:38,background:avatarColor,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0,fontFamily:FF_IOS}}>{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
              <div style={{color:msg.unread?"#212121":"#424242",fontWeight:msg.unread?700:400,fontSize:14,fontFamily:FF_IOS}}>{msg.contact}</div>
              <span style={{color:msg.unread?accent:"#bdbdbd",fontSize:11,fontFamily:FF_IOS,flexShrink:0}}>{lastTime}</span>
            </div>
            <div style={{color:msg.unread?"#616161":"#9e9e9e",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FF_IOS,fontWeight:msg.unread?500:400}}>{lastMsg?.text}</div>
          </div>
          {msg.unread&&<div style={{width:9,height:9,borderRadius:"50%",background:accent,flexShrink:0}}/>}
        </div>
      );
    };
    const sortPairs = (pairs) => pairs.sort(([a],[b])=>{const ta=getThread(a),tb=getThread(b);return loreSortKey(tb[tb.length-1]?.time)-loreSortKey(ta[ta.length-1]?.time);});
    // Une conv supprimée (`deleted`) ne doit JAMAIS apparaître dans l'inbox — parité avec iOS.
    const deletedConvs = dedupeConvs(data.messages.map((m,i)=>[m,i]).filter(([m])=>m.deleted));
    if(msgView==="deleted") return (
      <Shell>
        {statusBar}<NavBar title="Messages supprimés" back={()=>setMsgView("inbox")} overflow/>
        <div style={{flex:1,background:"#f5f5f5",overflowY:"auto"}}>
          <div style={{padding:"10px 16px",fontSize:11,color:"#9e9e9e",background:"#eee",borderBottom:"1px solid #e0e0e0",fontFamily:FF_IOS}}>Ces conversations ont été retirées de la boîte de réception.</div>
          {deletedConvs.length===0
            ? <div style={{padding:24,textAlign:"center",color:"#9e9e9e",fontSize:13,fontFamily:FF_IOS}}>Aucune conversation supprimée.</div>
            : sortPairs(deletedConvs).map(([m,i])=>renderAndroidRow(m,i,true))}
        </div>
      </Shell>
    );
    return (
      <Shell>
        {statusBar}<NavBar title="Messages" back={goHome} overflow/>
        <div style={{flex:1,background:"#f5f5f5",overflowY:"auto"}}>
          {deletedConvs.length>0 && (
            <div onClick={()=>setMsgView("deleted")} style={{background:"#eee",borderBottom:"1px solid #e0e0e0",padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <span style={{fontSize:15}}>🗑️</span>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:"#616161",fontFamily:FF_IOS}}>Messages supprimés</span>
              <span style={{fontSize:12,color:"#9e9e9e",fontFamily:FF_IOS}}>{deletedConvs.length}</span>
            </div>
          )}
          {sortPairs(dedupeConvs(data.messages.map((m,i)=>[m,i]).filter(([m])=>!m.deleted))).map(([msg,i])=>renderAndroidRow(msg,i,false))}
        </div>
      </Shell>
    );
  }

  const conv=data.messages[thread]; if(!conv) return null;
  const resolvedThread=getThread(conv);
  const isGroupConv = conv.isGroup && !isMainPairThread(conv.sharedThreadId); // cf. iOS : invariant persos principaux
  const avatarColor=["#e53935","#1e88e5","#43a047","#fb8c00","#8e24aa","#00897b"][conv.contact.charCodeAt(0)%6];
  return (
    <Shell onBack={()=>setThread(null)}>
      {statusBar}<NavBar title={conv.contact} back={()=>setThread(null)}/>
      <div ref={el=>{if(el)setTimeout(()=>{el.scrollTop=el.scrollHeight;},0)}} style={{flex:1,background:"#ece5dd",overflowY:"auto",padding:"8px 10px",display:"flex",flexDirection:"column",gap:3,minHeight:0,WebkitOverflowScrolling:"touch"}}>
        {resolvedThread.map((msg,mi)=>{
          const isMe=msg.from==="me";
          const clock = loreClock(msg.time); // heure horloge, sous chaque message
          const dayChanged = loreDayKey(msg.time)!==null && (mi===0 || loreDayKey(resolvedThread[mi-1]?.time)!==loreDayKey(msg.time));
          const dateLabel = loreDateLabel(msg.time);
          return <React.Fragment key={mi}>
            {dayChanged && dateLabel &&
              <div style={{textAlign:"center",fontSize:10,color:"#888",fontWeight:500,padding:"10px 0 6px",fontFamily:FF_IOS}}>
                <span style={{background:"#d1c7bd",color:"#777",padding:"3px 10px",borderRadius:10,fontSize:10}}>{dateLabel}</span>
              </div>}
            <div style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",alignItems:"flex-end",gap:6}}>
            {/* Avatar reçu : UNIQUEMENT en groupe (pour distinguer les expéditeurs). En 1-à-1, pas d'avatar. */}
            {!isMe && isGroupConv && <div style={{width:28,height:28,background:avatarColor,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0,alignSelf:"flex-end",fontFamily:FF_IOS}}>{msg.senderName?.[0]||"?"}</div>}
            <div style={{maxWidth:"72%"}}>
              {isGroupConv && !isMe && (mi===0 || resolvedThread[mi-1]?.senderKey!==msg.senderKey) &&
                <div style={{fontSize:10,color:avatarColor,fontWeight:600,padding:"0 10px 2px",fontFamily:FF_IOS}}>{msg.senderName}</div>}
              <div style={{
                background:msg.img?"transparent":(isMe?accent:"#fff"),
                color:isMe?"#fff":"#212121",
                borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                padding:msg.img?0:"8px 12px",fontSize:13,lineHeight:1.45,
                boxShadow:msg.img?"none":"0 1px 1px rgba(0,0,0,0.13)",
                fontFamily:FF_IOS,
                overflow:msg.img?"hidden":"visible",
              }}>
                {msg.img && <img src={msg.img} style={{maxWidth:"100%",display:"block",borderRadius:msg.text?"18px 18px 0 0":(isMe?"18px 18px 4px 18px":"18px 18px 18px 4px")}}/>}
                {msg.text && <div style={{padding:msg.img?"6px 12px":0}}>{msg.text}</div>}
              </div>
              <div style={{fontSize:9,color:"#999",opacity:0.85,marginTop:1,textAlign:isMe?"right":"left",padding:"0 5px",fontFamily:FF_IOS}}>{clock}</div>
            </div>
          </div>
          </React.Fragment>;
        })}
      </div>

      <div style={{background:"#f0f0f0",borderTop:"1px solid #ddd",padding:"6px 10px",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
        <div style={{flex:1,background:"#fff",borderRadius:24,padding:"8px 16px",fontSize:13,color:"#bdbdbd",lineHeight:1,border:"1px solid #e0e0e0",fontFamily:FF_IOS}}>Text message</div>
        <div style={{width:38,height:38,background:accent,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    </Shell>
  );
};
