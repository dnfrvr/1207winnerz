import React, { useState } from "react";
import { parseLoreTime } from "../shared/lore-date.js";
import { getCharKey, getSharedAvatars } from "../shared/social-feed.js";
import { LoreDateTimeInput } from "../shared/admin-fields.jsx";

// ── Composant d'affichage des commentaires Instagram (récursif) ──────────────
const IG_CHAR_NAMES = {glinda:"Glinda",eoghan:"Eoghan",drew:"Drew",elias:"Elias"};
// Handles par défaut pour les commentaires quand authorKey est posé — remplacés si le perso a
// un handle perso en base (passé via sharedHandles). Ces valeurs correspondent aux handles
// des 4 persos définis dans les seeds Instagram.
const IG_CHAR_HANDLES = {glinda:"glindarvf",eoghan:"eoghan_masuda",drew:"dreww_orms",elias:"noteliasgreen"};
const IgCommentThread = ({comments, depth=0, sharedAvatars={}, sharedHandles={}}) => {
  if(!comments||comments.length===0) return null;
  return (
    <>
      {comments.map((c,i)=>{
        const isPlayer = !!c.authorKey;
        // Pour un joueur : afficher son @ Instagram (handle) plutôt que son prénom
        const handle = isPlayer ? (sharedHandles[c.authorKey] || IG_CHAR_HANDLES[c.authorKey] || c.authorKey) : null;
        const displayName = isPlayer ? `@${handle}` : c.user;
        const avatarSrc = isPlayer ? (sharedAvatars[c.authorKey] || null) : null;
        return (
        <div key={i}>
          <div style={{display:"flex",alignItems:"flex-start",gap:7,
            padding: depth===0 ? "7px 12px" : "5px 12px 5px "+(12+depth*20)+"px",
            borderBottom:"1px solid #f9f9f9",
            background: depth>0 ? "rgba(0,0,0,0.015)" : "transparent"}}>
            <div style={{width:depth===0?26:20,height:depth===0?26:20,borderRadius:depth===0?5:4,
              background:"#d0d0d0",flexShrink:0,overflow:"hidden",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:depth===0?11:9,fontWeight:700,color:"#fff"}}>
              {avatarSrc?<img src={avatarSrc} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(displayName||"?")[0]?.toUpperCase()}
            </div>
            <div style={{flex:1,fontSize:depth===0?11.5:11,color:"#262626",lineHeight:1.4}}>
              <span style={{fontWeight:700,color:isPlayer?"#3b88c3":"#262626"}}>{displayName} </span>{c.text}
              {c.time&&<div style={{fontSize:9.5,color:"#999",marginTop:1}}>{c.time}</div>}
            </div>
          </div>
          {(c.replies||[]).length>0&&(
            <IgCommentThread comments={c.replies} depth={depth+1} sharedAvatars={sharedAvatars} sharedHandles={sharedHandles}/>
          )}
        </div>
        );
      })}
    </>
  );
};

// ── Composant d'édition des commentaires Instagram (admin, récursif) ──────────
const IgCommentEditor = ({comments, onChange, accentColor="#3d6b8f", depth=0}) => {
  const updComment = (ci, patch) => {
    const cm = [...comments];
    cm[ci] = {...cm[ci], ...patch};
    onChange(cm);
  };
  const addReply = (ci) => {
    const cm = [...comments];
    cm[ci] = {...cm[ci], replies:[...(cm[ci].replies||[]), {user:"",text:"",time:"",replies:[]}]};
    onChange(cm);
  };
  const delComment = (ci) => onChange(comments.filter((_,j)=>j!==ci));
  const updReplies = (ci, replies) => updComment(ci, {replies});

  const indent = depth * 16;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4, marginLeft: indent>0 ? indent : 0}}>
      {depth===0&&(
        <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",letterSpacing:0.4,marginBottom:2}}>
          Commentaires ({comments.length})
        </div>
      )}
      {comments.map((c,ci)=>(
        <div key={ci} style={{
          background: depth===0 ? "rgba(61,107,143,0.04)" : "rgba(0,0,0,0.03)",
          border:"1px solid rgba(0,0,0,0.07)", borderRadius:8,
          padding:"8px 10px", display:"flex", flexDirection:"column", gap:6
        }}>
          {/* Ligne principale */}
          <div style={{display:"flex",gap:4,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <label style={{color:"#9ca3af",fontSize:9,letterSpacing:0.5,fontWeight:600,textTransform:"uppercase"}}>Auteur</label>
              <select value={c.authorKey||"__custom__"} onChange={e=>{
                const v = e.target.value;
                v==="__custom__" ? updComment(ci,{authorKey:null}) : updComment(ci,{authorKey:v, user:""});
              }} className="adm-input" style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a1a2e",padding:"6px 8px",fontSize:11,borderRadius:6,width:100}}>
                <option value="__custom__">Personnalisé</option>
                <option value="glinda">Glinda</option>
                <option value="eoghan">Eoghan</option>
                <option value="drew">Drew</option>
                <option value="elias">Elias</option>
              </select>
            </div>
            {!c.authorKey && (
              <input value={c.user||""} onChange={e=>updComment(ci,{user:e.target.value})}
                placeholder="@pseudo" className="adm-input"
                style={{width:100,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",
                  color:"#1a1a2e",padding:"6px 8px",fontSize:11,borderRadius:6}}/>
            )}
            <input value={c.text||""} onChange={e=>updComment(ci,{text:e.target.value})}
              placeholder="commentaire" className="adm-input"
              style={{flex:1,minWidth:120,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",
                color:"#1a1a2e",padding:"6px 8px",fontSize:11,borderRadius:6}}/>
            <LoreDateTimeInput value={c.time||""} onChange={v=>updComment(ci,{time:v})} width="200px" showLabel={false}/>
            <button onClick={()=>addReply(ci)} title="Ajouter une réponse"
              style={{background:"rgba(61,107,143,0.08)",border:"1px solid rgba(61,107,143,0.25)",
                color:accentColor,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,flexShrink:0}}>
              ↩ Reply
            </button>
            <button onClick={()=>delComment(ci)}
              style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:14,padding:"0 2px",flexShrink:0}}>×</button>
          </div>
          {/* Réponses récursives */}
          {(c.replies||[]).length>0&&(
            <IgCommentEditor
              comments={c.replies||[]}
              onChange={replies=>updReplies(ci,replies)}
              accentColor={accentColor}
              depth={depth+1}
            />
          )}
          {/* Bouton add reply (toujours visible si replies vides, sinon le + est dans IgCommentEditor) */}
          {(c.replies||[]).length===0&&false&&null}
        </div>
      ))}
      <button
        onClick={()=>onChange([...comments,{user:"",text:"",time:"",replies:[]}])}
        style={{background:"rgba(61,107,143,0.06)",border:"1px dashed rgba(61,107,143,0.3)",
          color:accentColor,borderRadius:6,padding:"5px 10px",cursor:"pointer",
          fontSize:11,fontWeight:600,alignSelf:"flex-start",
          marginTop: depth>0?2:0}}>
        {depth===0?"+ Commentaire":"+ Réponse"}
      </button>
    </div>
  );
};

const InstaScreen = ({data, isIos, accent, onBack}) => {
  const [view, setView]         = useState("profile"); // "profile" | "feed" | "post"
  const [activePost, setPost]   = useState(null);
  const [instaTab, setInstaTab] = useState("grid");
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const openPost = (post) => { setPost(post); setActivePhotoIdx(0); setView("post"); };

  const ig        = data.instagram || {};
  const myPosts   = ig.posts    || [];
  const sharedIg  = data.sharedThreads?._sharedInstaPosts || [];
  const handle    = (ig.handle   || data.username || "").toUpperCase();
  const handleLo  = ig.handle   || data.username || "";
  const bio       = ig.bio      || data.bio      || "";
  const followers = ig.followers ?? data.followers ?? 0;
  const following = ig.following ?? data.following ?? 0;
  // Photo de profil spécifique Instagram, sinon avatar global
  const avatar    = ig.avatar   || data.avatar || null;
  const charKey   = getCharKey(data);
  // Nom affiché spécifique Instagram, sinon nom générique
  const name      = ig.displayName || {glinda:"Glinda Ravingfool",eoghan:"Eoghan Masuda",drew:"Drew Bates",elias:"Elias Green"}[charKey] || handleLo;
  const sharedAvatars = getSharedAvatars(data);
  const coTaggedPosts = data._coTaggedInstaPosts || [];
  // Tri : épinglé toujours en premier, puis inversement chronologique pour le reste.
  // gridPosts mélange mes propres posts ET les posts "en commun" où un autre perso m'a tagué
  // (taggedWith === ce perso) — un post en commun apparaît donc sur les deux grilles à la fois.
  const dateKey = (p) => { const t=parseLoreTime(p.date); return t ? t.month*10000+(t.day||0)*100+(t.hour||0) : -1; };
  const gridPosts = [...myPosts.filter(p=>!p.archived), ...coTaggedPosts].sort((a,b)=>{
    if(!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return dateKey(b) - dateKey(a);
  });

  const IG_HDR  = "linear-gradient(180deg,#6497b8,#4a7fa8)";
  const IG_BLUE = "#3b88c3";

  // ── Tab bar bottom fidèle à la capture ──
  const TabBar = ({active}) => {
    const btn = (onClick, icon, key) => (
      <button key={key} onClick={onClick} style={{
        flex:1, height:"100%", border:"none",
        background: active===key ? "rgba(255,255,255,0.13)" : "transparent",
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        borderRight:"1px solid rgba(255,255,255,0.07)",
      }}>{icon}</button>
    );
    const ic = (path, isActive) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{path(isActive)}</svg>;
    return (
      <div style={{background:"#111",borderTop:"1px solid #000",display:"flex",alignItems:"stretch",flexShrink:0,height:49}}>
        {/* Home */}
        {btn(()=>setView("feed"),
          ic(a=><><path d="M3 11L12 3l9 8v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z" fill={a?"#fff":"none"} stroke="#fff" strokeWidth={a?0:"1.8"} strokeLinejoin="round"/><path d="M9 21V13h6v8" stroke={a?"rgba(0,0,0,0.35)":"#fff"} strokeWidth="1.8" strokeLinejoin="round"/></>, active==="feed"),
          "feed")}
        {/* Explore — vraie aiguille de boussole (losange biseauté), plus fidèle que l'étoile crue d'avant */}
        {btn(()=>{},
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9.2" stroke="#fff" strokeWidth="1.7"/>
            <path d="M15.6 8.4l-2.3 5-5 2.3 2.3-5z" fill="#fff"/>
            <path d="M15.6 8.4l-2.3 5-1.1-3.9z" fill="rgba(0,0,0,0.32)"/>
            <circle cx="12" cy="12" r="1.1" fill="#fff"/>
          </svg>,
          "explore")}
        {/* Camera */}
        {btn(()=>{},
          ic(a=><><rect x="2" y="6.5" width="20" height="14.5" rx="2.5" stroke="#fff" strokeWidth="1.8"/><path d="M8.3 6.5l1.3-2.6h4.8l1.3 2.6" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13.7" r="3.6" stroke="#fff" strokeWidth="1.8"/><circle cx="18" cy="9.5" r="0.9" fill="#fff"/></>,false),
          "camera")}
        {/* Heart */}
        {btn(()=>{},
          ic(a=><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>,false),
          "heart")}
        {/* Profile — vraie miniature de la photo de profil, pas une icône générique */}
        {btn(()=>setView("profile"),
          <div style={{width:22,height:22,borderRadius:"50%",overflow:"hidden",border:active==="profile"?"2px solid #fff":"1.5px solid rgba(255,255,255,0.7)",boxSizing:"border-box",background:"#555",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {avatar
              ? <img src={avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="#fff" opacity="0.85"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#fff" opacity="0.85"/></svg>}
          </div>,
          "profile")}
      </div>
    );
  };

  // ── Header ──
  const Header = ({title, left}) => (
    <div style={{background:IG_HDR,borderBottom:"1px solid #3a6a90",height:44,display:"flex",alignItems:"center",padding:"0 8px",flexShrink:0,boxShadow:"0 1px 2px rgba(0,0,0,0.25)"}}>
      <div style={{width:60,display:"flex",alignItems:"center"}}>{left}</div>
      <div style={{flex:1,textAlign:"center",color:"#fff",fontSize:17,fontWeight:700,textShadow:"0 -1px 0 rgba(0,0,0,0.3)",letterSpacing:0.2}}>{title}</div>
      <div style={{width:60,display:"flex",justifyContent:"flex-end",alignItems:"center"}}>
        <button onClick={()=>{}} style={{background:"rgba(0,0,0,0.18)",border:"1px solid rgba(0,0,0,0.28)",borderRadius:5,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#fff" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#fff" strokeWidth="1.8"/></svg>
        </button>
      </div>
    </div>
  );

  const BackArrow = ({onClick}) => (
    <button onClick={onClick} style={{background:"linear-gradient(180deg,#5a8fb8,#3a6f98)",border:"1px solid rgba(0,0,0,0.4)",borderRadius:5,color:"#fff",fontSize:11,fontWeight:"600",cursor:"pointer",padding:"5px 9px",display:"flex",alignItems:"center",textShadow:"0 -1px 0 rgba(0,0,0,0.4)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)"}}>
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6l5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  );

  // ── Vue post individuel ──
  if(view==="post" && activePost) {
    const p = activePost;
    const postAuthor = p.author || charKey;
    const postHandle = p.handle || handleLo;
    const postAvatar = p.avatar || sharedAvatars[postAuthor] || avatar;
    const photos = (p.photos&&p.photos.length) ? p.photos : (p.src?[p.src]:[]);
    const [photoIdx, setPhotoIdx] = [activePhotoIdx, setActivePhotoIdx];
    const curPhoto = photos[Math.min(photoIdx,photos.length-1)] || null;
    const taggedName = p.taggedWith ? ({glinda:"Glinda",eoghan:"Eoghan",drew:"Drew",elias:"Elias"}[p.taggedWith]) : null;
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff"}}>
        <Header title="Photo" left={<BackArrow onClick={()=>setView(p._fromFeed?"feed":"profile")}/>}/>
        <div style={{flex:1,overflowY:"auto"}}>
          {/* Auteur — photo de profil carrée (pas ronde) */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderBottom:"1px solid #f0f0f0"}}>
            <div style={{width:32,height:32,borderRadius:5,overflow:"hidden",background:"#d0d0d0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>
              {postAvatar?<img src={postAvatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(postHandle||"?")[0].toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <span style={{fontSize:13,fontWeight:700,color:"#262626"}}>{postHandle}</span>
              {taggedName && <span style={{fontSize:12,color:"#3b88c3"}}> avec {taggedName}</span>}
              {p.location&&<div style={{fontSize:11,color:"#3b88c3",marginTop:1,display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:10}}>📍</span>{p.location}</div>}
            </div>
            <span style={{color:"#999",fontSize:11}}>{p.date||""}</span>
          </div>
          {/* Photo(s) — carrousel si plusieurs */}
          <div style={{width:"100%",aspectRatio:"1",background:"#efefef",overflow:"hidden",position:"relative"}}>
            {curPhoto?<img src={curPhoto} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,color:"#ccc"}}>📷</div>}
            {photos.length>1 && <>
              {photoIdx>0 && <button onClick={()=>setPhotoIdx(photoIdx-1)} style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.85)",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6l5 5" stroke="#333" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
              {photoIdx<photos.length-1 && <button onClick={()=>setPhotoIdx(photoIdx+1)} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.85)",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="#333" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
              <div style={{position:"absolute",bottom:8,left:0,right:0,display:"flex",justifyContent:"center",gap:5}}>
                {photos.map((_,pi)=>(<span key={pi} style={{width:6,height:6,borderRadius:"50%",background:pi===photoIdx?"#3b88c3":"rgba(255,255,255,0.8)",border:"1px solid rgba(0,0,0,0.15)"}}/>))}
              </div>
            </>}
          </div>
          {/* Actions */}
          <div style={{display:"flex",alignItems:"center",padding:"8px 10px",gap:16,borderBottom:"1px solid #efefef"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#555" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#555" strokeWidth="1.8" strokeLinejoin="round"/></svg>
          </div>
          {(p.likes||0)>0&&<div style={{padding:"6px 12px",fontSize:13,fontWeight:700,color:"#262626",borderBottom:"1px solid #f5f5f5"}}>{p.likes} J'aime</div>}
          {p.caption&&<div style={{padding:"8px 12px",fontSize:13,color:"#262626",lineHeight:1.5,borderBottom:"1px solid #f5f5f5"}}><span style={{fontWeight:700}}>{postHandle} </span>{p.caption}</div>}
          <IgCommentThread comments={p.comments||[]} depth={0} sharedAvatars={sharedAvatars} sharedHandles={data.sharedThreads?._sharedIgHandles||{}}/>
        </div>
        <TabBar active="feed"/>
      </div>
    );
  }

  // ── Vue feed (fil amis) ──
  if(view==="feed") {
    // Fil = posts partagés (vrais persos) + posts décoratifs (comptes fictifs, propres à ce perso,
    // même principe que la Timeline déco Twitter / le Fil Tumblr).
    const decoIg = data.instagramDecorative || [];
    const feedPosts = [...sharedIg, ...decoIg].sort((a,b)=>{
      const pa = parseLoreTime(a.date), pb = parseLoreTime(b.date);
      if(!pa && !pb) return 0; if(!pa) return 1; if(!pb) return -1;
      const va = pa.month*10000+(pa.day||0)*100+(pa.hour||0);
      const vb = pb.month*10000+(pb.day||0)*100+(pb.hour||0);
      return vb - va;
    });
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fafafa"}}>
        <Header title="Instagram" left={null}/>
        <div style={{flex:1,overflowY:"auto"}}>
          {feedPosts.length===0&&(
            <div style={{padding:"40px 24px",textAlign:"center",color:"#999",fontSize:13}}>
              <div style={{fontSize:36,marginBottom:8}}>📷</div>
              Aucun post dans le fil.<br/>Ajoutez des posts partagés dans l'admin Instagram.
            </div>
          )}
          {feedPosts.map((p,i)=>{
            const postHandle = p.handle || p.author || "";
            const postAvatar = p.avatar || sharedAvatars[p.author] || null;
            return (
              <div key={p.id||i} style={{background:"#fff",marginBottom:8,borderTop:i===0?"none":"none"}}>
                {/* Header du post */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderBottom:"1px solid #f0f0f0"}}>
                  <div style={{width:36,height:36,borderRadius:"50%",overflow:"hidden",background:"#d0d0d0",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff"}}>
                    {postAvatar?<img src={postAvatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(postHandle||"?")[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#262626"}}>{postHandle}</div>
                    {p.location&&<div style={{fontSize:11,color:"#3b88c3",marginTop:1,display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:10}}>📍</span>{p.location}</div>}
                  </div>
                  <span style={{color:"#999",fontSize:11}}>{p.date||""}</span>
                </div>
                {/* Photo */}
                <div onClick={()=>openPost({...p,_fromFeed:true})} style={{cursor:"pointer",background:"#efefef",overflow:"hidden",aspectRatio:"1",position:"relative"}}>
                  {(()=>{ const ph=(p.photos&&p.photos.length)?p.photos[0]:p.src;
                    return ph?<img src={ph} style={{width:"100%",display:"block",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,color:"#ccc"}}>📷</div>; })()}
                  {p.photos&&p.photos.length>1 && <div style={{position:"absolute",top:8,right:8,filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.6))"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="14" height="14" rx="2" fill="#fff"/><rect x="7" y="2" width="14" height="14" rx="2" fill="none" stroke="#fff" strokeWidth="1.6"/></svg></div>}
                </div>
                {/* Actions */}
                <div style={{padding:"8px 10px",borderBottom:"1px solid #f5f5f5"}}>
                  <div style={{display:"flex",gap:14,marginBottom:6}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#555" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#555" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                  </div>
                  {(p.likes||0)>0&&<div style={{fontSize:12,fontWeight:700,color:"#262626",marginBottom:3}}>{p.likes} J'aime</div>}
                  {p.caption&&<div style={{fontSize:13,color:"#262626",lineHeight:1.4}}><span style={{fontWeight:700}}>{postHandle} </span>{p.caption}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <TabBar active="feed"/>
      </div>
    );
  }

  // ── Vue profil ──
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff"}}>
      <Header title={handle} left={null}/>
      <div style={{flex:1,overflowY:"auto",background:"#fafafa"}}>
        {/* Bloc profil */}
        <div style={{background:"#fff",borderBottom:"1px solid #dbdbdb"}}>
          <div style={{display:"flex",alignItems:"flex-start",padding:"14px 12px 10px",gap:12}}>
            <div style={{width:70,height:70,borderRadius:4,overflow:"hidden",flexShrink:0,border:"1px solid #d0d0d0",background:"#e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontWeight:700,fontSize:26}}>
              {avatar?<img src={avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(handleLo||"?")[0].toUpperCase()}
            </div>
            <div style={{flex:1,display:"flex",justifyContent:"space-around",paddingTop:4}}>
              {[[gridPosts.length,"photos"],[followers,"followers"],[following,"following"]].map(([n,label])=>(
                <div key={label} style={{textAlign:"center"}}>
                  <div style={{fontSize:17,fontWeight:700,color:"#262626",lineHeight:1.2}}>{n}</div>
                  <div style={{fontSize:11,color:"#555",marginTop:1}}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{margin:"0 12px 10px",border:"1px solid #c8c8c8",borderRadius:4,background:"linear-gradient(180deg,#fafafa,#f0f0f0)",display:"flex",alignItems:"center",padding:"7px 12px",cursor:"default"}}>
            <span style={{flex:1,fontSize:13,fontWeight:600,color:"#262626"}}>Edit Your Profile</span>
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none"><path d="M1 1l7 7-7 7" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        {/* Nom + bio */}
        <div style={{background:"#fff",padding:"10px 12px 12px",borderBottom:"1px solid #dbdbdb"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#262626",marginBottom:3}}>{name}</div>
          {bio&&<div style={{fontSize:13,color:"#262626",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{bio}</div>}
          {ig.link&&<div style={{fontSize:13,color:IG_BLUE,marginTop:2}}>{ig.link}</div>}
        </div>
        {/* Séparateur + onglets */}
        <div style={{background:"#efefef",height:8,borderTop:"1px solid #dbdbdb",borderBottom:"1px solid #dbdbdb"}}/>
        <div style={{background:"#fff",display:"flex",alignItems:"center",borderBottom:"1px solid #dbdbdb"}}>
          <button onClick={()=>setInstaTab("grid")} style={{flex:1,height:42,border:"none",borderBottom:instaTab==="grid"?"2px solid #4a7fa0":"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="9" height="9" rx="1" fill={instaTab==="grid"?"#4a7fa0":"#c0c0c0"}/><rect x="13" y="2" width="9" height="9" rx="1" fill={instaTab==="grid"?"#4a7fa0":"#c0c0c0"}/><rect x="2" y="13" width="9" height="9" rx="1" fill={instaTab==="grid"?"#4a7fa0":"#c0c0c0"}/><rect x="13" y="13" width="9" height="9" rx="1" fill={instaTab==="grid"?"#4a7fa0":"#c0c0c0"}/></svg>
          </button>
          <button onClick={()=>setInstaTab("list")} style={{flex:1,height:42,border:"none",borderLeft:"1px solid #e8e8e8",borderRight:"1px solid #e8e8e8",borderBottom:instaTab==="list"?"2px solid #4a7fa0":"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="4" rx="1" fill={instaTab==="list"?"#4a7fa0":"#c0c0c0"}/><rect x="2" y="10" width="20" height="4" rx="1" fill={instaTab==="list"?"#4a7fa0":"#c0c0c0"}/><rect x="2" y="17" width="20" height="4" rx="1" fill={instaTab==="list"?"#4a7fa0":"#c0c0c0"}/></svg>
          </button>
          <button onClick={()=>setInstaTab("map")} style={{flex:2,height:42,border:"none",borderBottom:instaTab==="map"?"2px solid #4a7fa0":"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill={instaTab==="map"?"#4a7fa0":"#c0c0c0"}/></svg>
            <span style={{fontSize:12,color:instaTab==="map"?"#4a7fa0":"#888",fontWeight:instaTab==="map"?700:400}}>Photo Map</span>
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M1 1l5 5-5 5" stroke={instaTab==="map"?"#4a7fa0":"#bbb"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {/* Contenu grille */}
        {instaTab==="grid"&&(gridPosts.length===0
          ?<div style={{padding:"40px 24px",textAlign:"center",color:"#999",fontSize:13,background:"#fff"}}><div style={{fontSize:36,marginBottom:8}}>📷</div>Aucun post pour l'instant</div>
          :<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,padding:4,background:"#e0e0e0"}}>
            {gridPosts.map((p,i)=>{
              const photos = (p.photos&&p.photos.length) ? p.photos : (p.src?[p.src]:[]);
              return (
              <div key={p.id||i} onClick={()=>openPost({...p,_fromFeed:false})} style={{position:"relative",aspectRatio:"1",overflow:"hidden",cursor:"pointer",background:"#d8d8d8",border:"2px solid #fff",boxSizing:"border-box"}}>
                {photos[0]?<img src={photos[0]} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#bbb"}}>📷</div>}
                {p.pinned && <div style={{position:"absolute",top:4,right:4,filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.6))"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M16 3l5 5-4 4 1 5-5-1-5 5-1-5-5 1 1-5-4-4 5-1 4-5z"/></svg></div>}
                {photos.length>1 && <div style={{position:"absolute",top:4,right:p.pinned?22:4,filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.6))"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="14" height="14" rx="2" fill="#fff"/><rect x="7" y="2" width="14" height="14" rx="2" fill="none" stroke="#fff" strokeWidth="1.6"/></svg></div>}
              </div>
              );
            })}
          </div>
        )}
        {instaTab==="list"&&(gridPosts.length===0
          ?<div style={{padding:"40px 24px",textAlign:"center",color:"#999",fontSize:13,background:"#fff"}}>Aucun post</div>
          :<div>{gridPosts.map((p,i)=>(
              <div key={p.id||i} onClick={()=>openPost({...p,_fromFeed:false})} style={{display:"flex",gap:10,padding:"10px 12px",borderBottom:"1px solid #efefef",cursor:"pointer",background:"#fff",alignItems:"flex-start"}}>
                <div style={{width:60,height:60,borderRadius:3,overflow:"hidden",flexShrink:0,background:"#e8e8e8"}}>{(()=>{ const ph=(p.photos&&p.photos.length)?p.photos[0]:p.src; return ph?<img src={ph} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#bbb"}}>📷</div>; })()}</div>
                <div style={{flex:1,minWidth:0}}>
                  {p.pinned&&<div style={{fontSize:10,color:"#3b88c3",fontWeight:700,marginBottom:2}}>📌 Épinglé</div>}
                  {p.caption&&<div style={{fontSize:13,color:"#262626",lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{p.caption}</div>}
                  <div style={{fontSize:11,color:"#999",marginTop:4,display:"flex",gap:10}}><span>❤ {p.likes||0}</span><span>💬 {(p.comments||[]).length}</span><span style={{marginLeft:"auto"}}>{p.date||""}</span></div>
                </div>
              </div>
            ))}</div>
        )}
        {instaTab==="map"&&<div style={{padding:"40px 24px",textAlign:"center",color:"#999",fontSize:13,background:"#fff"}}><div style={{fontSize:36,marginBottom:8}}>🗺️</div>Aucune photo géolocalisée</div>}
      </div>
      <TabBar active="profile"/>
    </div>
  );
};




export { InstaScreen, IgCommentEditor };
