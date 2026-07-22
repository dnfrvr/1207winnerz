import React, { useState } from "react";
import { FF_IOS } from "../shared/constants.js";
import { loreSortKey } from "../shared/lore-date.js";
import { getCharKey, getSharedAvatars, makeSharedFollows } from "../shared/social-feed.js";

const TumblrScreen = ({data,admin,update,onUpdateShared=()=>{},accent,onBack=null}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [viewProfile, setViewProfile] = React.useState(null); // charKey d'un autre perso, ou null
  const posts = data.tumblr?.posts||[];
  const charKey = getCharKey(data);
  // Posts "réels" partagés entre persos (comme les tweets) : postés par un perso, visibles par tous,
  // et seul l'auteur peut les modifier/supprimer — contrairement aux anciens posts/feedPosts qui ne
  // vivaient que dans la copie locale de chaque perso.
  const sharedTumblrPosts = data.sharedThreads?._sharedTumblrPosts || [];
  const myShared = sharedTumblrPosts.filter(p=>p.author===charKey);
  const othersShared = sharedTumblrPosts.filter(p=>p.author!==charKey);
  const updateSharedPosts = (newList) => onUpdateShared("_sharedTumblrPosts", newList);
  const CHAR_NAMES_TB = {glinda:"Glinda R.",eoghan:"Eoghan M.",drew:"Drew B.",elias:"Elias G."};
  const sharedAvatarsTb = getSharedAvatars(data);

  // Relations "follow" réelles entre les 4 persos, partagées comme pour Twitter.
  const {follows: tumblrFollows, iFollow: iFollowTb, followsMe: followsMeTb, toggleFollow: toggleFollowTb} = makeSharedFollows(data, onUpdateShared, "_tumblrFollows");
  const TB    = "#35465c";
  const GRAY  = "#9b9b9b";
  const SEP   = "#e0deda";

  const ReblogIcon = ({color=GRAY,size=19}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 4h8a3 3 0 013 3v5" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 15l4 4 4-4" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 20H9a3 3 0 01-3-3v-5" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 9l-4-4-4 4" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const HeartIcon = ({color=GRAY,size=19}) => (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <path d="M11 19S3.5 13 3.5 7.5A4 4 0 0111 4.8 4 4 0 0118.5 7.5C18.5 13 11 19 11 19z" stroke={color} strokeWidth="1.7" fill="none"/>
    </svg>
  );

  const PostCard = ({post, isFeed=false}) => {
    const isQuote = post.quote || post.type==="quote";
    const charKeyOfUsername = {glindatheverygood:"glinda",eoghan_masuda:"eoghan",dreww_orms:"drew","dreww-orms":"drew",noteliasgreen:"elias"}[post.username];
    const otherKey = post.author || charKeyOfUsername;
    const clickable = otherKey && otherKey!==charKey;
    const goToProfile = clickable ? ()=>setViewProfile(otherKey) : undefined;
    return (
      <div style={{
        background:"#fff", marginBottom:8, borderRadius:2,
        boxShadow:"0 1px 3px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.06)",
        overflow:"hidden",
      }}>
        
        <div style={{display:"flex",alignItems:"center",padding:"9px 10px 8px",gap:8,borderBottom:`1px solid ${SEP}`}}>
          <div onClick={goToProfile} style={{width:36,height:36,borderRadius:5,flexShrink:0,overflow:"hidden",background:post.avatarBg||TB,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:15,cursor:clickable?"pointer":"default"}}>
            {(()=>{
              // Résout l'avatar : on priorise post.author (clé directe du perso, toujours posée par
              // SharedPostsEditor) sur charKeyOfUsername (déduit du handle, absent des posts admin).
              // Avant ce fix, !charKeyOfUsername → isCurrentChar=true → data.avatar (proprio du
              // téléphone) s'affichait sur TOUS les posts sans username reconnu.
              const sharedAvatars = getSharedAvatars(data);
              const authorKey = post.author || charKeyOfUsername;
              const isCurrentChar = authorKey === charKey;
              const resolvedAvatar = post.avatar
                || (isCurrentChar ? data.avatar : null)
                || (authorKey ? sharedAvatars[authorKey] : null);
              return resolvedAvatar
                ? <img src={resolvedAvatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                : (post.username||data.username||"?")[0].toUpperCase();
            })()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div onClick={goToProfile} style={{fontWeight:700,fontSize:(post.username||data.username||"").length>16?11:13,color:"#222",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:clickable?"pointer":"default"}}>{post.username||data.tumblr?.handle||data.username}</div>
            {post.reblogFrom&&(
              <div style={{display:"flex",alignItems:"center",gap:3,marginTop:2}}>
                <ReblogIcon size={10} color={GRAY}/>
                <span style={{fontSize:11,color:GRAY}}>{post.reblogFrom}</span>
              </div>
            )}
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="#c8c7c2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>

        
        {post.img && <div style={{borderTop:`1px solid ${SEP}`}}><img src={post.img} style={{width:"100%",display:"block",maxHeight:340,objectFit:"cover"}}/></div>}
        <div style={{padding:"10px 10px 8px"}}>
          {isQuote
            ?<div>
              <div style={{fontSize:14,color:"#222",lineHeight:1.6,fontWeight:400}}>
                {"\u201c"}{post.body}{"\u201d"}
              </div>
              {post.source&&<div style={{fontSize:12,color:"#666",marginTop:5}}>{"\u2014"} {post.source}</div>}
            </div>
            :<div style={{fontSize:13,color:"#333",lineHeight:1.55,whiteSpace:"pre-wrap"}}>{post.body}</div>
          }
        </div>

        
        <div style={{display:"flex",alignItems:"center",borderTop:`1px solid ${SEP}`,padding:"5px 10px",background:"#f9f8f6"}}>
          <span style={{flex:1,fontSize:12,color:GRAY}}>{(post.notes||0).toLocaleString()} notes</span>
          <div style={{padding:"3px 14px 3px 6px"}}><ReblogIcon/></div>
          <div style={{padding:"3px 4px"}}><HeartIcon/></div>
        </div>
      </div>
    );
  };

  // Posts décoratifs du fil — propres à ce perso, éditables depuis l'admin. Plus de valeurs par défaut hardcodées.
  const feedPosts = data.tumblr?.feedPosts || [];

  /* ── Tabs ── */
  const Dashboard = () => (
    <div style={{flex:1,overflowY:"auto",minHeight:0,WebkitOverflowScrolling:"touch",background:"#ebe9e4"}}>
      <div style={{padding:"8px 8px 0"}}>
        {sharedTumblrPosts.length === 0 && feedPosts.length === 0
          ? <div style={{padding:"32px 16px",textAlign:"center",color:GRAY,fontSize:13}}>
              Aucun post pour l'instant.<br/>
              <span style={{fontSize:11,marginTop:6,display:"block"}}>Les posts des personnages apparaîtront ici une fois créés depuis l'admin.</span>
            </div>
          : [...sharedTumblrPosts, ...feedPosts]
              .sort((a,b)=>loreSortKey(b.date)-loreSortKey(a.date))
              .map((post,i)=>(
                <PostCard key={post.id??i} post={post} isFeed={!post.author}/>
              ))
        }
      </div>
      <div style={{height:8}}/>
    </div>
  );

  const Explore = () => (
    <div style={{flex:1,background:"#ebe9e4",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"8px 10px",background:"#fff",borderBottom:`1px solid ${SEP}`}}>
        <div style={{background:"#eeedea",border:"1px solid #d5d4d0",borderRadius:10,padding:"5px 12px",display:"flex",alignItems:"center",gap:6}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={GRAY} strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke={GRAY} strokeWidth="2" strokeLinecap="round"/></svg>
          <span style={{fontSize:13,color:GRAY}}>Search Tumblr</span>
        </div>
      </div>
      <div style={{overflowY:"auto",flex:1,padding:"10px 8px"}}>
        <div style={{fontSize:10,color:GRAY,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Trending</div>
        {["architecture","minimalism","photography","aesthetic","vintage","film","art","interiors"].map((tag,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:2,boxShadow:"0 1px 2px rgba(0,0,0,0.1)",padding:"9px 10px",marginBottom:6,display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:30,height:30,borderRadius:3,background:`hsl(${i*44},38%,58%)`,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:"#222"}}>#{tag}</div>
              <div style={{fontSize:11,color:GRAY}}>{(Math.floor(Math.random()*900+100)).toLocaleString()}K posts</div>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="#c8c7c2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        ))}
      </div>
    </div>
  );

  const Profile = () => {
    const myPosts = [...myShared].sort((a,b)=>loreSortKey(b.date)-loreSortKey(a.date));
    const coverColor = data.tumblr?.coverColor || "#2c3e50";
    return (
      <div style={{flex:1,background:"#ebe9e4",overflowY:"auto",minHeight:0}}>
        
        <div style={{position:"relative",height:100,background:coverColor,flexShrink:0,overflow:"visible"}}>
          {data.tumblr?.cover
            ?<img src={data.tumblr.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            :<div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${coverColor},#1a252f)`}}/>}
          
          <div style={{position:"absolute",bottom:-28,left:12,width:56,height:56,borderRadius:8,border:"3px solid #fff",overflow:"hidden",background:data.tumblr?.avatarBg||"#8e7cc3",boxShadow:"0 2px 6px rgba(0,0,0,0.25)",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:22}}>
            {data.avatar
              ?<img src={data.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :(data.username||"?")[0].toUpperCase()}
          </div>
        </div>
        
        <div style={{padding:"36px 12px 10px",background:"#fff",borderBottom:`1px solid ${SEP}`}}>
          <div style={{fontWeight:700,fontSize:(data.tumblr?.handle||data.username||"").length>18?12:16,color:"#222",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{data.tumblr?.handle || data.username}</div>
          <div style={{display:"flex",gap:18,marginTop:6}}>
            {[["Posts",myPosts.length],[" Followers",data.tumblr?.followers||0],["Following",data.tumblr?.following||0]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontWeight:700,fontSize:14,color:"#222"}}>{v}</div>
                <div style={{fontSize:10,color:GRAY}}>{l}</div>
              </div>
            ))}
          </div>
          {data.tumblr?.bio&&<div style={{fontSize:12,color:"#555",marginTop:8,lineHeight:1.5}}>{data.tumblr.bio}</div>}
        </div>
        
        <div style={{padding:"8px 8px 0"}}>
          {myPosts.length === 0
            ? <div style={{padding:"24px 16px",textAlign:"center",color:GRAY,fontSize:12}}>Aucun post pour l'instant.</div>
            : myPosts.map((post,i)=><PostCard key={post.id??i} post={post}/>)}
        </div>
        <div style={{height:8}}/>
      </div>
    );
  };

  const ViewedProfile = () => {
    const pKey = viewProfile;
    const pName = CHAR_NAMES_TB[pKey];
    const pAvatar = sharedAvatarsTb[pKey];
    const pPosts = othersShared.filter(p=>p.author===pKey).sort((a,b)=>loreSortKey(b.date)-loreSortKey(a.date));
    const following = iFollowTb(pKey);
    return (
      <div style={{flex:1,background:"#ebe9e4",overflowY:"auto",minHeight:0}}>
        <div style={{position:"relative",height:100,background:"#2c3e50",flexShrink:0,overflow:"visible"}}>
          <div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#2c3e50,#1a252f)"}}/>
          <div style={{position:"absolute",bottom:-28,left:12,width:56,height:56,borderRadius:8,border:"3px solid #fff",overflow:"hidden",background:"#8e7cc3",boxShadow:"0 2px 6px rgba(0,0,0,0.25)",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:22}}>
            {pAvatar ? <img src={pAvatar} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (pName||"?")[0].toUpperCase()}
          </div>
          <button onClick={()=>toggleFollowTb(pKey)} style={{position:"absolute",bottom:-22,right:12,background:following?"#fff":TB,color:following?TB:"#fff",border:`1.5px solid ${TB}`,borderRadius:16,padding:"5px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {following?"Following":"Follow"}
          </button>
        </div>
        <div style={{padding:"36px 12px 10px",background:"#fff",borderBottom:`1px solid ${SEP}`}}>
          <div style={{fontWeight:700,fontSize:16,color:"#222"}}>{pName}</div>
          {followsMeTb(pKey) && <span style={{display:"inline-block",marginTop:4,fontSize:10,color:GRAY,fontWeight:600,background:"#f0eee9",borderRadius:3,padding:"2px 6px"}}>Follows you</span>}
          <div style={{display:"flex",gap:18,marginTop:6}}>
            <div><div style={{fontWeight:700,fontSize:14,color:"#222"}}>{pPosts.length}</div><div style={{fontSize:10,color:GRAY}}>Posts</div></div>
          </div>
        </div>
        <div style={{padding:"8px 8px 0"}}>
          {pPosts.length===0
            ? <div style={{padding:24,textAlign:"center",color:GRAY,fontSize:12}}>No posts yet.</div>
            : pPosts.map((post,i)=><PostCard key={post.id} post={{...post,username:pName}}/>)}
        </div>
        <div style={{height:8}}/>
      </div>
    );
  };

  const TABS = [Dashboard, Explore, Profile];

  /* ── Tab bar: 3 regular + 1 blue compose button ── */
  /* Screenshot: home | tag | person | [blue compose] */
  const tabDefs = [
    /* Home */
    (active) => <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path d="M3 11L12 3l9 8" stroke={active?TB:GRAY} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 9.5V19a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" stroke={active?TB:GRAY} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
    /* Radar/tag — price-tag shape */
    (active) => <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path d="M21 13.41l-7.17 7.17a2 2 0 01-2.83 0L3 12.59V4h8.59L21 13.41z" stroke={active?TB:GRAY} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7.5" cy="7.5" r="1.5" fill={active?TB:GRAY}/>
    </svg>,
    /* Person/profile */
    (active) => <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke={active?TB:GRAY} strokeWidth="1.7"/>
      <path d="M5 20c0-3.86 3.13-7 7-7s7 3.14 7 7" stroke={active?TB:GRAY} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>,
  ];

  const ActiveTab = TABS[activeTab]||Dashboard;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:FF_IOS}}>
      {/* Header iOS style — la flèche revient à la TL si un profil est ouvert, sinon quitte l'app */}
      {onBack && (
        <div style={{background:`linear-gradient(180deg,#4a6a8a,${TB})`,padding:"0 8px",display:"flex",alignItems:"center",height:44,flexShrink:0,borderBottom:"1px solid #1e3347",boxShadow:"0 1px 3px rgba(0,0,0,0.35)",position:"relative"}}>
          <button onClick={viewProfile ? ()=>setViewProfile(null) : onBack}
            style={{background:`linear-gradient(180deg,${TB},#1e3347)`,border:"1px solid rgba(0,0,0,0.45)",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 10px 3px 7px",display:"flex",alignItems:"center",gap:2,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)",zIndex:1,flexShrink:0,fontFamily:FF_IOS}}>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{position:"absolute",left:0,right:0,textAlign:"center",color:"#fff",fontWeight:700,fontSize:17,textShadow:"0 1px 2px rgba(0,0,0,0.5)",letterSpacing:-0.3,fontFamily:FF_IOS,pointerEvents:"none"}}>
            {viewProfile ? (CHAR_NAMES_TB[viewProfile]||viewProfile) : "Tumblr"}
          </span>
        </div>
      )}
      {viewProfile ? <ViewedProfile key={viewProfile}/> : <ActiveTab/>}

      
      <div style={{
        background:"linear-gradient(180deg,#f5f4ef 0%,#e6e4de 100%)",
        borderTop:"1px solid #b8b6b0",
        display:"flex",flexShrink:0,height:50,
        boxShadow:"inset 0 1px 0 rgba(255,255,255,0.7)",
      }}>
        {tabDefs.map((icon,i)=>(
          <div key={i} onClick={()=>{setViewProfile(null);setActiveTab(i);}}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:3}}>
            {icon(activeTab===i&&!viewProfile)}
            {activeTab===i&&!viewProfile&&<div style={{width:4,height:4,borderRadius:"50%",background:TB,marginTop:-1}}/>}
          </div>
        ))}
        
        <div style={{
          flex:1,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
        }}>
          <div style={{
            width:36,height:36,borderRadius:7,
            background:`linear-gradient(180deg,#4a6a8a 0%,${TB} 100%)`,
            border:"1px solid #253548",
            boxShadow:"0 1px 3px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.15)",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#fff" strokeWidth="1.8"/>
              <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};


export { TumblrScreen };
