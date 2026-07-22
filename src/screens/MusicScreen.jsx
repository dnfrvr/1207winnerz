import React, { useState } from "react";
import { FF_IOS } from "../shared/constants.js";

const MusicScreen = ({data,admin,update,accent,isIos=false,goHome=()=>{}}) => {
  const [playing,  setPlaying]  = useState(null);
  const [dragIdx,  setDragIdx]  = useState(null);
  const [overIdx,  setOverIdx]  = useState(null);
  const [musicTab, setMusicTab] = useState("songs");
  const [openArtist, setOpenArtist] = useState(null);
  const [openAlbum, setOpenAlbum] = useState(null);
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const len = data.music.length;

  const music = data.music || [];
  const playlists = data.playlists || [];
  // AVANT : deux champs distincts cohabitaient sans qu'aucun des deux ne fonctionne vraiment.
  // - data.musicCover : lu ici pour le fallback "rien en cours de lecture", mais AUCUNE UI admin
  //   n'écrivait jamais dedans (toujours null) → fallback mort.
  // - data.playlistCover : la seule à avoir un upload fonctionnel dans l'admin (onglet Musique,
  //   "Cover de la playlist"), mais jamais lue nulle part dans le rendu → upload qui "marche"
  //   (l'image est bien sauvegardée) mais reste invisible partout, exactement le symptôme remonté.
  // APRÈS : un seul champ réellement branché bout en bout — playlistCover sert de pochette de
  // secours quand rien ne joue, c'est la seule pochette "globale" qui ait jamais été éditable.
  const coverImg = data.playlistCover || null;

  // ── Drag to reorder ───────────────────────────────────────────────────────
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver  = (e,i) => { e.preventDefault(); setOverIdx(i); };
  const onDrop      = (i) => {
    if(dragIdx===null||dragIdx===i) return;
    const m = [...music];
    const [moved] = m.splice(dragIdx,1);
    m.splice(i,0,moved);
    update("music",m);
    setDragIdx(null); setOverIdx(null);
    if(playing===dragIdx) setPlaying(i);
  };

  const current = playing!==null ? music[playing] : null;
  // Pochette affichée : celle du morceau en cours en priorité, sinon la pochette de playlist.
  const coverSrc = current?.cover || coverImg;

  // ── iOS 6 Music library UI ─────────────────────────────────────────────
  if(isIos) {
    const sorted = [...music].sort((a,b)=>a.title.localeCompare(b.title,'fr',{sensitivity:'base'}));
    const sections = {};
    sorted.forEach(t=>{
      const k=/^[a-zA-ZÀ-ÿ]/.test(t.title)?t.title[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""):'#';
      if(!sections[k])sections[k]=[];
      sections[k].push(t);
    });
    const sKeys=Object.keys(sections).sort((a,b)=>a==='#'?1:b==='#'?-1:a<b?-1:1);
    // Artists groupés par lettre initiale, même logique que les Songs
    const artistNames = [...new Set(music.map(t=>t.artist))].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
    const artistSections = {};
    artistNames.forEach(a=>{
      const k=/^[a-zA-ZÀ-ÿ]/.test(a)?a[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""):'#';
      if(!artistSections[k])artistSections[k]=[];
      artistSections[k].push(a);
    });
    const artistKeys=Object.keys(artistSections).sort((a,b)=>a==='#'?1:b==='#'?-1:a<b?-1:1);
    // Albums groupés par lettre initiale, même logique
    const albumNames = [...new Set(music.map(t=>t.album).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
    const albumSections = {};
    albumNames.forEach(al=>{
      const k=/^[a-zA-ZÀ-ÿ]/.test(al)?al[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""):'#';
      if(!albumSections[k])albumSections[k]=[];
      albumSections[k].push(al);
    });
    const albumKeys=Object.keys(albumSections).sort((a,b)=>a==='#'?1:b==='#'?-1:a<b?-1:1);
    const ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
    const TABS=[
      {id:'playlists',icon:'<svg width="22" height="20" viewBox="0 0 24 22" fill="none"><path d="M3 5h18M3 11h18M3 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>', label:'Playlists'},
      {id:'artists',  icon:'<svg width="22" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>',   label:'Artists'},
      {id:'songs',    icon:'<svg width="22" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18V6l12-2v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>',     label:'Songs'},
      {id:'albums',   icon:'<svg width="22" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',    label:'Albums'},
      {id:'more',   icon:'<svg width="22" height="20" viewBox="0 0 24 8" fill="currentColor"><circle cx="4" cy="4" r="2.5"/><circle cx="12" cy="4" r="2.5"/><circle cx="20" cy="4" r="2.5"/></svg>',     label:'More'},
    ];
    const titleMap={playlists:'Playlists',artists:'Artists',songs:'Songs',albums:'Albums',more:'More'};

    // ── Page dédiée "détail de playlist" ──────────────────────────────────
    // Remplace l'ancien accordéon inline : cliquer une playlist ouvre maintenant un vrai écran
    // séparé (cover en grand, titre, liste des morceaux dessous), avec un bouton retour vers la
    // liste des playlists — plus proche du comportement Musique iOS natif.
    if(musicTab==='playlists' && openPlaylist) {
      const pl = playlists.find(p=>p.id===openPlaylist);
      const plTracks = pl ? (pl.trackIds||[]).map(id=>music.find(t=>t.id===id)).filter(Boolean) : [];
      return (
        <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,fontFamily:FF_IOS}}>
          <div style={{background:'linear-gradient(180deg,#b8b8b8,#909090 45%,#7c7c7c)',borderBottom:'1px solid #555',height:44,display:'flex',alignItems:'center',padding:'0 8px',flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}>
            <button onClick={()=>setOpenPlaylist(null)} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.4)',borderRadius:6,padding:'4px 10px 4px 7px',color:'rgba(255,255,255,0.95)',fontSize:12,fontWeight:'600',cursor:'pointer',textShadow:'0 -1px 0 rgba(0,0,0,0.4)',flexShrink:0,display:'flex',alignItems:'center',gap:3}}>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6l5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Playlists
            </button>
            <span style={{flex:1,textAlign:'center',color:'#fff',fontWeight:'700',fontSize:15,textShadow:'0 -1px 0 rgba(0,0,0,0.5)',pointerEvents:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',padding:'0 6px'}}>{pl?.name||'Playlist'}</span>
            <div style={{width:74}}/>
          </div>

          <div style={{flex:1,overflowY:'auto',background:'#fff'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 20px 18px',background:'linear-gradient(180deg,#f2f2f2,#fff)'}}>
              <div style={{width:150,height:150,borderRadius:6,background:'#ddd',overflow:'hidden',boxShadow:'0 4px 14px rgba(0,0,0,0.25)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,flexShrink:0}}>
                {pl?.cover?<img src={pl.cover} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#bbb',fontSize:48}}>♫</span>}
              </div>
              <div style={{fontWeight:'700',fontSize:19,color:'#1a1a1a',textAlign:'center'}}>{pl?.name||'Playlist'}</div>
              <div style={{fontSize:12,color:'#8e8e93',marginTop:4}}>{plTracks.length} song{plTracks.length!==1?'s':''}</div>
            </div>
            {plTracks.length===0
              ? <div style={{padding:32,textAlign:'center',color:'#8e8e93',fontSize:13}}>Aucun morceau dans cette playlist.</div>
              : plTracks.map(track=>(
                <div key={track.id} onClick={()=>setPlaying(music.indexOf(track))} style={{padding:'10px 14px',borderBottom:'0.5px solid #e5e5ea',cursor:'pointer',background:current===track?'#ddeeff':'#fff',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:34,height:34,borderRadius:3,flexShrink:0,overflow:'hidden',background:'#e2e2e7',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {track.cover?<img src={track.cover} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#bbb',fontSize:14}}>♫</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:'700',fontSize:15,color:current===track?'#007aff':'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
                    <div style={{fontSize:12,color:'#8e8e93',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.artist}</div>
                  </div>
                </div>
              ))
            }
          </div>

          <div style={{background:'linear-gradient(180deg,#e8e8ea,#cfcfd2)',borderTop:'1px solid #aaa',borderBottom:'1px solid #aaa',height:46,display:'flex',alignItems:'center',gap:10,padding:'0 10px',flexShrink:0}}>
            <div style={{width:32,height:32,background:'#ddd',borderRadius:2,border:'1px solid rgba(0,0,0,0.25)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 1px 2px rgba(0,0,0,0.15)'}}>
              {coverSrc?<img src={coverSrc} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#999',fontSize:14}}>♫</span>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:'#1a1a1a',fontSize:13,fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current?current.title:(data.playlistName||"No track selected")}</div>
              <div style={{color:'#6b6b6e',fontSize:11,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current?current.artist:"—"}</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
              <button onClick={()=>{if(!len)return;setPlaying(p=>((p??1)-1+len)%len);}} style={{background:'none',border:'none',color:'#007aff',cursor:'pointer',padding:'2px 4px',lineHeight:1,display:'flex'}}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11M14 3L5.5 8 14 13z"/></svg>
              </button>
              <button onClick={()=>{if(!len)return;setPlaying(p=>p===null?0:null);}} style={{background:'none',border:'none',color:'#007aff',cursor:'pointer',padding:'2px 4px',lineHeight:1,display:'flex'}}>
                {current
                  ? <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14" rx="1"/><rect x="12" y="3" width="4" height="14" rx="1"/></svg>
                  : <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor"><path d="M4 2.5v15l13-7.5z"/></svg>}
              </button>
              <button onClick={()=>{if(!len)return;setPlaying(p=>((p??-1)+1)%len);}} style={{background:'none',border:'none',color:'#007aff',cursor:'pointer',padding:'2px 4px',lineHeight:1,display:'flex'}}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M12 2.5v11M2 3l8.5 5L2 13z"/></svg>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,fontFamily:FF_IOS}}>
        
        <div style={{background:'linear-gradient(180deg,#b8b8b8,#909090 45%,#7c7c7c)',borderBottom:'1px solid #555',height:44,display:'flex',alignItems:'center',padding:'0 8px',flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}>
          <button onClick={goHome} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.4)',borderRadius:6,padding:'4px 12px',color:'rgba(255,255,255,0.95)',fontSize:12,fontWeight:'600',cursor:'pointer',textShadow:'0 -1px 0 rgba(0,0,0,0.4)',flexShrink:0}}>Store</button>
          <span style={{flex:1,textAlign:'center',color:'#fff',fontWeight:'700',fontSize:18,textShadow:'0 -1px 0 rgba(0,0,0,0.5)',pointerEvents:'none'}}>{titleMap[musicTab]||'Songs'}</span>
          <div style={{width:60}}/>
        </div>
        
        <div style={{flex:1,display:'flex',flexDirection:'row',overflow:'hidden',background:'#fff'}}>
          <div id="music-scroll" style={{flex:1,overflowY:'auto'}}>
            {musicTab==='songs'&&<>
              {sKeys.map(key=>(
                <React.Fragment key={key}>
                  <div id={`ms-${key}`} style={{background:'#e2e2e7',padding:'3px 14px',fontSize:13,fontWeight:'700',color:'#333',borderTop:'0.5px solid #c8c7cc',borderBottom:'0.5px solid #c8c7cc'}}>{key}</div>
                  {sections[key].map(track=>(
                    <div key={track.id} onClick={()=>setPlaying(music.indexOf(track))} style={{padding:'10px 14px',borderBottom:'0.5px solid #e5e5ea',cursor:'pointer',background:current===track?'#ddeeff':'#fff',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,borderRadius:3,flexShrink:0,overflow:'hidden',background:'#e2e2e7',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {track.cover?<img src={track.cover} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#bbb',fontSize:14}}>♫</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                      {admin
                        ?<div style={{display:'flex',gap:6,flexDirection:'column'}}>
                          <input value={track.title} onClick={e=>e.stopPropagation()} onChange={e=>{const m=[...music];const idx=m.indexOf(track);m[idx]={...m[idx],title:e.target.value};update('music',m);}} style={{background:'rgba(255,200,0,0.1)',border:'1px dashed #ffc107',color:'#1a1a1a',fontSize:13,width:'100%'}}/>
                          <input value={track.artist} onClick={e=>e.stopPropagation()} onChange={e=>{const m=[...music];const idx=m.indexOf(track);m[idx]={...m[idx],artist:e.target.value};update('music',m);}} style={{background:'rgba(255,200,0,0.1)',border:'1px dashed #ffc107',color:'#8e8e93',fontSize:11,width:'100%'}}/>
                        </div>
                        :<>
                          <div style={{fontWeight:'700',fontSize:15,color:current===track?'#007aff':'#1a1a1a'}}>{track.title}</div>
                          <div style={{fontSize:12,color:'#8e8e93',marginTop:1}}>{track.artist}</div>
                        </>}
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </>}
            {musicTab==='playlists'&&<>
              {playlists.length===0
                ? <div style={{padding:32,textAlign:'center',color:'#8e8e93',fontSize:13}}>No Playlists</div>
                : playlists.map(pl=>{
                  const tracks = (pl.trackIds||[]).map(id=>music.find(t=>t.id===id)).filter(Boolean);
                  return (
                    <div key={pl.id} onClick={()=>setOpenPlaylist(pl.id)} style={{padding:'10px 14px',borderBottom:'0.5px solid #e5e5ea',cursor:'pointer',background:'#fff',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:36,height:36,borderRadius:2,background:'#ddd',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {pl.cover?<img src={pl.cover} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#aaa',fontSize:14}}>♫</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:'700',fontSize:15,color:'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pl.name||'Playlist'}</div>
                        <div style={{fontSize:12,color:'#8e8e93',marginTop:1}}>{tracks.length} song{tracks.length!==1?'s':''}</div>
                      </div>
                      <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{flexShrink:0}}><path d="M1 1l6 6-6 6" stroke="#c8c7cc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  );
                })}
            </>}
            {musicTab==='artists'&&<>
              {artistKeys.map(key=>(
                <React.Fragment key={key}>
                  <div id={`ma-${key}`} style={{background:'#e2e2e7',padding:'3px 14px',fontSize:13,fontWeight:'700',color:'#333',borderTop:'0.5px solid #c8c7cc',borderBottom:'0.5px solid #c8c7cc'}}>{key}</div>
                  {artistSections[key].map(artist=>{
                    const tracks = music.filter(t=>t.artist===artist);
                    const isOpen = openArtist===artist;
                    return (
                      <React.Fragment key={artist}>
                        <div onClick={()=>setOpenArtist(isOpen?null:artist)} style={{padding:'10px 14px',borderBottom:'0.5px solid #e5e5ea',cursor:'pointer',background:isOpen?'#f0f0f3':'#fff',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div>
                            <div style={{fontWeight:'700',fontSize:15,color:'#1a1a1a'}}>{artist}</div>
                            <div style={{fontSize:12,color:'#8e8e93',marginTop:1}}>{tracks.length} song{tracks.length!==1?'s':''}</div>
                          </div>
                          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{transform:isOpen?'rotate(90deg)':'none',flexShrink:0}}><path d="M1 1l6 6-6 6" stroke="#c8c7cc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        {isOpen && tracks.map(track=>(
                          <div key={track.id} onClick={()=>setPlaying(music.indexOf(track))} style={{padding:'9px 14px 9px 26px',borderBottom:'0.5px solid #e5e5ea',cursor:'pointer',background:current===track?'#ddeeff':'#fafafa'}}>
                            <div style={{fontWeight:'600',fontSize:13,color:current===track?'#007aff':'#1a1a1a'}}>{track.title}</div>
                            <div style={{fontSize:11,color:'#8e8e93',marginTop:1}}>{track.album||'Unknown Album'}</div>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </>}
            {musicTab==='albums'&&<>
              {albumKeys.length===0
                ? <div style={{padding:32,textAlign:'center',color:'#8e8e93',fontSize:13}}>No Albums</div>
                : albumKeys.map(key=>(
                <React.Fragment key={key}>
                  <div id={`mb-${key}`} style={{background:'#e2e2e7',padding:'3px 14px',fontSize:13,fontWeight:'700',color:'#333',borderTop:'0.5px solid #c8c7cc',borderBottom:'0.5px solid #c8c7cc'}}>{key}</div>
                  {albumSections[key].map(album=>{
                    const tracks = music.filter(t=>t.album===album);
                    const isOpen = openAlbum===album;
                    const albumArtist = tracks[0]?.artist || '';
                    return (
                      <React.Fragment key={album}>
                        <div onClick={()=>setOpenAlbum(isOpen?null:album)} style={{padding:'10px 14px',borderBottom:'0.5px solid #e5e5ea',cursor:'pointer',background:isOpen?'#f0f0f3':'#fff',display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:36,height:36,borderRadius:2,background:'#ddd',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {tracks[0]?.cover?<img src={tracks[0].cover} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#aaa',fontSize:14}}>♫</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:'700',fontSize:15,color:'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{album}</div>
                            <div style={{fontSize:12,color:'#8e8e93',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{albumArtist} · {tracks.length} song{tracks.length!==1?'s':''}</div>
                          </div>
                          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{transform:isOpen?'rotate(90deg)':'none',flexShrink:0}}><path d="M1 1l6 6-6 6" stroke="#c8c7cc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        {isOpen && tracks.map(track=>(
                          <div key={track.id} onClick={()=>setPlaying(music.indexOf(track))} style={{padding:'9px 14px 9px 26px',borderBottom:'0.5px solid #e5e5ea',cursor:'pointer',background:current===track?'#ddeeff':'#fafafa',display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:28,height:28,borderRadius:2,background:'#ddd',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                              {track.cover?<img src={track.cover} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#aaa',fontSize:11}}>♫</span>}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:'600',fontSize:13,color:current===track?'#007aff':'#1a1a1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
                              <div style={{fontSize:11,color:'#8e8e93',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.artist}</div>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </>}
            {musicTab==='more'&&<div style={{padding:32,textAlign:'center',color:'#8e8e93',fontSize:13}}>More</div>}
          </div>
          
          {(musicTab==='songs'||musicTab==='artists'||musicTab==='albums')&&(
            <div style={{width:14,display:'flex',flexDirection:'column',justifyContent:'space-evenly',alignItems:'center',padding:'4px 0',flexShrink:0,background:'transparent'}}>
              {ALPHA.map(l=>(
                <div key={l} onClick={()=>{const prefix=musicTab==='songs'?'ms':musicTab==='artists'?'ma':'mb';const el=document.getElementById(`${prefix}-${l}`);if(el){el.scrollIntoView({block:'start'});}}} style={{fontSize:8,color:'#007aff',lineHeight:1.2,cursor:'pointer',fontWeight:'600',width:12,textAlign:'center'}}>{l}</div>
              ))}
            </div>
          )}
        </div>

        <div style={{background:'linear-gradient(180deg,#e8e8ea,#cfcfd2)',borderTop:'1px solid #aaa',borderBottom:'1px solid #aaa',height:46,display:'flex',alignItems:'center',gap:10,padding:'0 10px',flexShrink:0}}>
          <div
            style={{width:32,height:32,background:'#ddd',borderRadius:2,border:'1px solid rgba(0,0,0,0.25)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 1px 2px rgba(0,0,0,0.15)'}}
          >
            {coverSrc?<img src={coverSrc} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#999',fontSize:14}}>♫</span>}
          </div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{color:'#1a1a1a',fontSize:13,fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current?current.title:(data.playlistName||"No track selected")}</div>
            <div style={{color:'#6b6b6e',fontSize:11,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current?current.artist:"—"}</div>
          </div>

          <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
            <button onClick={()=>{if(!len)return;setPlaying(p=>((p??1)-1+len)%len);}} style={{background:'none',border:'none',color:'#007aff',cursor:'pointer',padding:'2px 4px',lineHeight:1,display:'flex'}}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11M14 3L5.5 8 14 13z"/></svg>
            </button>
            <button onClick={()=>{if(!len)return;setPlaying(p=>p===null?0:null);}} style={{background:'none',border:'none',color:'#007aff',cursor:'pointer',padding:'2px 4px',lineHeight:1,display:'flex'}}>
              {current
                ? <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14" rx="1"/><rect x="12" y="3" width="4" height="14" rx="1"/></svg>
                : <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor"><path d="M4 2.5v15l13-7.5z"/></svg>}
            </button>
            <button onClick={()=>{if(!len)return;setPlaying(p=>((p??-1)+1)%len);}} style={{background:'none',border:'none',color:'#007aff',cursor:'pointer',padding:'2px 4px',lineHeight:1,display:'flex'}}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M12 2.5v11M2 3l8.5 5L2 13z"/></svg>
            </button>
          </div>
        </div>

        <div style={{background:'linear-gradient(180deg,#d5d5d5,#ababab)',borderTop:'1px solid #808080',height:50,display:'flex',alignItems:'stretch',flexShrink:0}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setMusicTab(t.id)} style={{flex:1,border:'none',background:musicTab===t.id?'rgba(0,0,0,0.18)':'transparent',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,cursor:'pointer',borderTop:musicTab===t.id?'1.5px solid rgba(255,255,255,0.5)':'1.5px solid transparent'}}>
              <span style={{color:musicTab===t.id?'#fff':'rgba(0,0,0,0.4)',lineHeight:1,display:"flex"}} dangerouslySetInnerHTML={{__html:t.icon}}/>
              <span style={{fontSize:9,fontWeight:'600',color:musicTab===t.id?'#fff':'rgba(0,0,0,0.45)',fontFamily:FF_IOS}}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Page dédiée "détail de playlist" (Android) ──────────────────────────
  if(musicTab==='playlists' && openPlaylist) {
    const pl = playlists.find(p=>p.id===openPlaylist);
    const plTracks = pl ? (pl.trackIds||[]).map(id=>music.find(t=>t.id===id)).filter(Boolean) : [];
    return (
      <div style={{flex:1,background:"#1a1a1a",display:"flex",flexDirection:"column",minHeight:0,fontFamily:FF_IOS}}>
        <div style={{display:"flex",alignItems:"center",gap:8,background:"#111",borderBottom:"1px solid #0a0a0a",padding:"8px 10px",flexShrink:0}}>
          <button onClick={()=>setOpenPlaylist(null)} style={{background:"none",border:"none",color:accent,cursor:"pointer",padding:"4px 6px",display:"flex",alignItems:"center"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{color:"#fff",fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{pl?.name||"Playlist"}</span>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"22px 16px 16px"}}>
            <div style={{width:140,height:140,borderRadius:6,background:"#272727",overflow:"hidden",boxShadow:"0 4px 14px rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,flexShrink:0}}>
              {pl?.cover?<img src={pl.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#444",fontSize:44}}>♫</span>}
            </div>
            <div style={{color:"#fff",fontWeight:700,fontSize:17,textAlign:"center"}}>{pl?.name||"Playlist"}</div>
            <div style={{color:"#666",fontSize:11,marginTop:4}}>{plTracks.length} track{plTracks.length!==1?"s":""}</div>
          </div>
          {plTracks.length===0
            ? <div style={{padding:32,textAlign:"center",color:"#444",fontSize:13}}>Aucun morceau dans cette playlist.</div>
            : plTracks.map(track=>(
              <div key={track.id} onClick={()=>setPlaying(music.indexOf(track))} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderBottom:"1px solid #111",background:playing===music.indexOf(track)?`${accent}18`:"#1a1a1a",cursor:"pointer"}}>
                {track.cover
                  ?<img src={track.cover} style={{width:36,height:36,objectFit:"cover",flexShrink:0,borderRadius:2}}/>
                  :<div style={{width:36,height:36,borderRadius:2,background:"#272727",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:"#444",fontSize:14}}>♫</span></div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:"rgba(255,255,255,0.9)",fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.title}</div>
                  <div style={{color:"#777",fontSize:11,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.artist}</div>
                </div>
              </div>
            ))
          }
        </div>
        <div style={{background:"#111",borderTop:`2px solid ${accent}44`,padding:"10px 14px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{width:38,height:38,background:"#222",borderRadius:2,border:`1px solid ${accent}33`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
            {coverSrc?<img src={coverSrc} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:accent,opacity:0.6}}>♫</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{current?current.title:(data.playlistName||"No track selected")}</div>
            <div style={{color:accent,fontSize:11,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{current?current.artist:"—"}</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
            <button onClick={()=>{if(!len)return;setPlaying(p=>((p??1)-1+len)%len);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",padding:"2px 4px",lineHeight:1,display:"flex"}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11M14 3L5.5 8 14 13z"/></svg>
            </button>
            <button onClick={()=>{if(!len)return;setPlaying(p=>p===null?0:null);}} style={{background:"none",border:"none",color:accent,cursor:"pointer",padding:"2px 4px",lineHeight:1,display:"flex"}}>
              {current
                ? <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14" rx="1"/><rect x="12" y="3" width="4" height="14" rx="1"/></svg>
                : <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4 2.5v15l13-7.5z"/></svg>}
            </button>
            <button onClick={()=>{if(!len)return;setPlaying(p=>((p??-1)+1)%len);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",padding:"2px 4px",lineHeight:1,display:"flex"}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12 2.5v11M2 3l8.5 5L2 13z"/></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{flex:1,background:"#1a1a1a",display:"flex",flexDirection:"column",minHeight:0,fontFamily:FF_IOS}}>

      <div style={{display:"flex",background:"#111",borderBottom:"1px solid #0a0a0a",flexShrink:0}}>
        {[["playlists","Playlists"],["songs","Songs"],["artists","Artists"],["albums","Albums"]].map(([t,l])=>(
          <button key={t} onClick={()=>setMusicTab(t)} style={{
            flex:1, padding:"10px 0", border:"none", cursor:"pointer", fontSize:11, fontWeight:700,
            letterSpacing:0.5, fontFamily:FF_IOS, background:"transparent",
            color:musicTab===t?accent:"#555",
            borderBottom:musicTab===t?`2px solid ${accent}`:"2px solid transparent",
          }}>{l.toUpperCase()}</button>
        ))}
      </div>

      
      <div style={{flex:1,overflowY:"auto",minHeight:0}}>

        
        {musicTab==="playlists"&&(()=>{
          if(playlists.length===0) return <div style={{padding:32,textAlign:"center",color:"#444",fontSize:13}}>No playlists.</div>;
          return playlists.map(pl=>{
            const tracks = (pl.trackIds||[]).map(id=>music.find(t=>t.id===id)).filter(Boolean);
            return (
              <div key={pl.id} onClick={()=>setOpenPlaylist(pl.id)} style={{display:"flex",alignItems:"center",gap:10,background:"#111",padding:"8px 14px",borderBottom:"1px solid #0a0a0a",cursor:"pointer"}}>
                <div style={{width:30,height:30,borderRadius:2,background:"#272727",flexShrink:0,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {pl.cover?<img src={pl.cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#444",fontSize:12}}>♫</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:accent,fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pl.name||"Playlist"}</div>
                  <div style={{color:"#555",fontSize:10,marginTop:1}}>{tracks.length} track{tracks.length!==1?"s":""}</div>
                </div>
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{flexShrink:0}}><path d="M1 1l6 6-6 6" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            );
          });
        })()}

        {musicTab==="songs"&&<>
          {[...music].sort((a,b)=>a.title.localeCompare(b.title,'fr',{sensitivity:'base'})).map((track,si)=>{
            const i=music.indexOf(track);
            return (
              <div key={track.id}
                onClick={()=>setPlaying(i)}
                style={{
                  display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
                  borderBottom:"1px solid #111",
                  background:playing===i?`${accent}18`:"#1a1a1a",
                  borderLeft:playing===i?`3px solid ${accent}`:"3px solid transparent",
                  cursor:"pointer",
                }}>
                {track.cover
                  ?<img src={track.cover} style={{width:36,height:36,objectFit:"cover",flexShrink:0,borderRadius:2}}/>
                  :<div style={{width:36,height:36,borderRadius:2,background:"#272727",border:`1px solid ${accent}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:playing===i?accent:"#444",fontSize:14}}>{playing===i?"♪":"♫"}</span>
                  </div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:playing===i?"#fff":"rgba(255,255,255,0.85)",fontSize:13,fontWeight:playing===i?500:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.title}</div>
                  <div style={{color:playing===i?accent:"#666",fontSize:11,marginTop:1}}>{track.artist}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <span style={{color:"#555",fontSize:10}}>{track.duration}</span>
                </div>
              </div>
            );
          })}
        </>}

        
        {musicTab==="artists"&&(()=>{
          const byArtist={};
          music.forEach(t=>{if(!byArtist[t.artist])byArtist[t.artist]=[];byArtist[t.artist].push(t);});
          return Object.keys(byArtist).sort().map(artist=>(
            <div key={artist}>
              <div style={{background:"#111",padding:"6px 14px",borderBottom:"1px solid #0a0a0a"}}>
                <span style={{color:accent,fontSize:12,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase"}}>{artist}</span>
                <span style={{color:"#555",fontSize:10,marginLeft:8}}>{byArtist[artist].length} track{byArtist[artist].length!==1?"s":""}</span>
              </div>
              {byArtist[artist].map(track=>(
                <div key={track.id} onClick={()=>setPlaying(music.indexOf(track))} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px 9px 24px",borderBottom:"1px solid #111",background:playing===music.indexOf(track)?`${accent}14`:"#1a1a1a",cursor:"pointer"}}>
                  <span style={{color:playing===music.indexOf(track)?accent:"#444",fontSize:12,width:16,textAlign:"center",flexShrink:0}}>♫</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:"rgba(255,255,255,0.85)",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.title}</div>
                    <div style={{color:"#555",fontSize:10,marginTop:1}}>{track.duration}</div>
                  </div>
                </div>
              ))}
            </div>
          ));
        })()}

        
        {musicTab==="albums"&&(()=>{
          const byAlbum={};
          music.forEach(t=>{if(!t.album)return;if(!byAlbum[t.album])byAlbum[t.album]=[];byAlbum[t.album].push(t);});
          const albumNames=Object.keys(byAlbum).sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
          if(albumNames.length===0) return <div style={{padding:32,textAlign:"center",color:"#444",fontSize:13}}>No albums.</div>;
          return albumNames.map(album=>{
            const tracks=byAlbum[album];
            const albumArtist=tracks[0]?.artist||"";
            const isOpen=openAlbum===album;
            return (
            <div key={album}>
              <div onClick={()=>setOpenAlbum(isOpen?null:album)} style={{display:"flex",alignItems:"center",gap:10,background:isOpen?"#1a1a1a":"#111",padding:"8px 14px",borderBottom:"1px solid #0a0a0a",cursor:"pointer"}}>
                <div style={{width:30,height:30,borderRadius:2,background:"#272727",flexShrink:0,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {tracks[0]?.cover?<img src={tracks[0].cover} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:"#444",fontSize:12}}>♫</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:accent,fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{album}</div>
                  <div style={{color:"#555",fontSize:10,marginTop:1}}>{albumArtist} · {tracks.length} track{tracks.length!==1?"s":""}</div>
                </div>
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{transform:isOpen?'rotate(90deg)':'none',flexShrink:0}}><path d="M1 1l6 6-6 6" stroke="#555" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              {isOpen&&tracks.map(track=>(
                <div key={track.id} onClick={()=>setPlaying(music.indexOf(track))} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px 9px 24px",borderBottom:"1px solid #111",background:playing===music.indexOf(track)?`${accent}14`:"#1a1a1a",cursor:"pointer"}}>
                  <span style={{color:playing===music.indexOf(track)?accent:"#444",fontSize:12,width:16,textAlign:"center",flexShrink:0}}>♫</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:"rgba(255,255,255,0.85)",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.title}</div>
                    <div style={{color:"#555",fontSize:10,marginTop:1}}>{track.duration}</div>
                  </div>
                </div>
              ))}
            </div>
            );
          });
        })()}

      </div>

      <div style={{background:"#111",borderTop:`2px solid ${accent}44`,padding:"10px 14px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>

        <div
          style={{width:38,height:38,background:"#222",borderRadius:2,border:`1px solid ${accent}33`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}
        >
          {coverSrc?<img src={coverSrc} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{color:accent,opacity:0.6}}>♫</span>}
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"#fff",fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{current?current.title:(data.playlistName||"No track selected")}</div>
          <div style={{color:accent,fontSize:11,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{current?current.artist:"—"}</div>
        </div>

        <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
          <button onClick={()=>{if(!len)return;setPlaying(p=>((p??1)-1+len)%len);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",padding:"2px 4px",lineHeight:1,display:"flex"}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11M14 3L5.5 8 14 13z"/></svg>
          </button>
          <button onClick={()=>{if(!len)return;setPlaying(p=>p===null?0:null);}} style={{background:"none",border:"none",color:accent,cursor:"pointer",padding:"2px 4px",lineHeight:1,display:"flex"}}>
            {current
              ? <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14" rx="1"/><rect x="12" y="3" width="4" height="14" rx="1"/></svg>
              : <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4 2.5v15l13-7.5z"/></svg>}
          </button>
          <button onClick={()=>{if(!len)return;setPlaying(p=>((p??-1)+1)%len);}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",padding:"2px 4px",lineHeight:1,display:"flex"}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12 2.5v11M2 3l8.5 5L2 13z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export { MusicScreen };
