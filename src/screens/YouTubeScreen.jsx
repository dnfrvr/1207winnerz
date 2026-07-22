import React, { useState } from "react";

const YOUTUBE_FEEDS_DEFAULT = {
  elias: [
    {id:1,  ch:"ViceNews",       chAvatar:"📰", age:"2d",   views:"1.2M vues",  dur:"18:02", thumb:"#0d1b2a", title:"Missing in Maine: Why Are Children Disappearing from Small Towns?"},
    {id:2,  ch:"Nerdwriter1",    chAvatar:"📚", age:"3d",   views:"341k vues",  dur:"9:14",  thumb:"#1c1c1c", title:"Stephen King's IT: Why Derry Is the Perfect American Horror"},
    {id:3,  ch:"PBS Space Time", chAvatar:"🔬", age:"5d",   views:"2.1M vues",  dur:"22:47", thumb:"#0a0a1a", title:"Can Memory Be Erased? The Science of Selective Amnesia"},
    {id:4,  ch:"BuzzFeedUnsolved",chAvatar:"🕵️",age:"1w", views:"4.8M vues",  dur:"31:22", thumb:"#1a0a0a", title:"The Derry Disappearances: 27 Cases, 27 Years — Unsolved"},
    {id:5,  ch:"SciShow",        chAvatar:"🧠", age:"1w", views:"980k vues",  dur:"11:30", thumb:"#1a1500", title:"Why Do Some People See Things That Aren't There?"},
    {id:6,  ch:"MainePublicTV",  chAvatar:"🌊", age:"4d",   views:"12k vues",   dur:"6:18",  thumb:"#0a1a0a", title:"Kennebec River 2012: Environmental Concerns Grow Among Locals"},
    {id:7,  ch:"CreepyReadings", chAvatar:"👻", age:"6d",   views:"89k vues",   dur:"14:05", thumb:"#1a0000", title:"10 Real Locations from Urban Legends You Can Actually Visit"},
    {id:8,  ch:"IGN",            chAvatar:"🎮", age:"2w", views:"1.7M vues",  dur:"12:34", thumb:"#001a1a", title:"Top 10 Scariest Games of 2012 — You Won't Finish These Alone"},
  ],
  glinda: [
    {id:1,  ch:"VogueTV",        chAvatar:"👗", age:"1d",   views:"2.3M vues",  dur:"8:22",  thumb:"#1a0a1a", title:"Fall 2012 Trends: Everything You Need to Know About This Season"},
    {id:2,  ch:"PointsofLight",  chAvatar:"✨", age:"2d",   views:"456k vues",  dur:"15:44", thumb:"#1a1a0a", title:"The Psychology of Optimism — How to Stay Positive Through Anything"},
    {id:3,  ch:"TaylorSwiftVEVO",chAvatar:"🎤", age:"3d",   views:"18M vues",   dur:"4:01",  thumb:"#0a0a1a", title:"Taylor Swift - We Are Never Ever Getting Back Together (Official)"},
    {id:4,  ch:"DIYCrafters",    chAvatar:"🎨", age:"5d",   views:"223k vues",  dur:"11:30", thumb:"#0a1a0a", title:"DIY Room Décor for Fall — Cozy Aesthetic on a Budget"},
    {id:5,  ch:"MinuteEarth",    chAvatar:"🌍", age:"1w", views:"890k vues",  dur:"5:14",  thumb:"#001a0a", title:"Why Do Monarch Butterflies Always Find Their Way Back?"},
    {id:6,  ch:"TedTalks",       chAvatar:"💬", age:"1w", views:"3.1M vues",  dur:"18:05", thumb:"#0a0a0a", title:"The Art of Being Present: Brené Brown on Vulnerability and Joy"},
    {id:7,  ch:"StyleByGlinda",  chAvatar:"💅", age:"3d",   views:"4.2k vues",  dur:"6:48",  thumb:"#1a0a0a", title:"GRWM: First Day of Fall Semester at UMA — Outfit + Makeup"},
    {id:8,  ch:"KatyPerryVEVO",  chAvatar:"🎵", age:"2w", views:"22M vues",   dur:"3:56",  thumb:"#1a001a", title:"Katy Perry - Roar (Official Music Video)"},
  ],
  eoghan: [
    {id:1,  ch:"NFLFilms",       chAvatar:"🏈", age:"1d",   views:"3.4M vues",  dur:"22:18", thumb:"#0a1a00", title:"The Greatest Fourth Quarter Comebacks in NFL History"},
    {id:2,  ch:"AthleteInsider", chAvatar:"💪", age:"2d",   views:"780k vues",  dur:"14:33", thumb:"#001a00", title:"How to Train Like an NFL Wide Receiver: Speed, Routes, Hands"},
    {id:3,  ch:"ESPN",           chAvatar:"⚡", age:"3d",   views:"1.1M vues",  dur:"7:45",  thumb:"#1a0a00", title:"Top 10 Most Unbelievable Catches of 2012 Season — So Far"},
    {id:4,  ch:"PhilosophyTube", chAvatar:"🎭", age:"5d",   views:"234k vues",  dur:"19:02", thumb:"#0a001a", title:"The Trolley Problem and Real Decisions Under Pressure"},
    {id:5,  ch:"CrashCourse",    chAvatar:"📖", age:"1w", views:"620k vues",  dur:"16:44", thumb:"#001a1a", title:"Symbolism & Ritual in Pre-Modern Societies — What We Don't Understand"},
    {id:6,  ch:"GordonRamsay",   chAvatar:"🍳", age:"4d",   views:"5.6M vues",  dur:"12:20", thumb:"#1a0800", title:"Gordon Ramsay's Perfect Pasta — Step by Step for Beginners"},
    {id:7,  ch:"MooseFootball",  chAvatar:"🫎", age:"2d",   views:"8.2k vues",  dur:"4:15",  thumb:"#001a0a", title:"UMA Moose vs Vermont: Highlights — September 22, 2012"},
    {id:8,  ch:"SciShow",        chAvatar:"🧠", age:"3d",   views:"1.3M vues",  dur:"9:58",  thumb:"#1a1a00", title:"What Does Fear Actually Do to Your Body? The Science Explained"},
  ],
  drew: [
    {id:1,  ch:"TheRootsVEVO",        chAvatar:"🎸", age:"1d",   views:"890k vues",  dur:"5:44",  thumb:"#0a0a1a", title:"The Roots - The Fire ft. John Legend (Official Video)"},
    {id:2,  ch:"KendrickLamarVEVO",   chAvatar:"🎤", age:"1d",   views:"6.2M vues",  dur:"4:21",  thumb:"#0d0d1a", title:"Kendrick Lamar - Swimming Pools (Drank) [Official Video]"},
    {id:3,  ch:"FrankOceanVEVO",      chAvatar:"🎵", age:"2d",   views:"3.8M vues",  dur:"5:02",  thumb:"#001020", title:"Frank Ocean - Thinkin Bout You (Official Video)"},
    {id:4,  ch:"NatureLabsMaine",     chAvatar:"🌲", age:"2d",   views:"18k vues",   dur:"17:30", thumb:"#081808", title:"What Actually Lives in Maine Old Growth Forests — a Field Guide"},
    {id:5,  ch:"DeepDivePodcast",     chAvatar:"🎙️", age:"2d",   views:"45k vues",   dur:"1:02:18",thumb:"#0a1010",title:"Ep. 47 — Le phénomène Derry : folklore ou quelque chose de plus ?"},
    {id:6,  ch:"CrashCourse Biology", chAvatar:"🪱", age:"3d",   views:"1.4M vues",  dur:"11:22", thumb:"#001a08", title:"Oligochaeta: Why Earthworms Are the Most Underrated Organism on Earth"},
    {id:7,  ch:"OffGridLiving",       chAvatar:"🔥", age:"3d",   views:"567k vues",  dur:"23:14", thumb:"#1a0800", title:"72 heures dans les bois avec rien — guide réaliste de survie"},
    {id:8,  ch:"RadioheadOfficial",   chAvatar:"🎧", age:"4d",   views:"2.2M vues",  dur:"4:48",  thumb:"#101010", title:"Radiohead - Pyramid Song (Official Video)"},
    {id:9,  ch:"ViceNews",            chAvatar:"📰", age:"4d",   views:"3.1M vues",  dur:"21:05", thumb:"#0a0a0a", title:"American Towns Are Dying — What's Really Killing Small Communities"},
    {id:10, ch:"iNaturalistChannel",  chAvatar:"🔬", age:"5d",   views:"34k vues",   dur:"8:44",  thumb:"#001208", title:"iNaturalist Tips: How to Identify Invertebrates in the Field"},
    {id:11, ch:"NasaJPL",             chAvatar:"🚀", age:"5d",   views:"4.4M vues",  dur:"9:12",  thumb:"#00000a", title:"What We Actually Know About the Dark Side of the Moon"},
    {id:12, ch:"BraineScienceDaily",  chAvatar:"🧠", age:"6d",   views:"780k vues",  dur:"14:55", thumb:"#0a0010", title:"How Trauma Rewires the Brain — and Whether It Can Be Reversed"},
    {id:13, ch:"GoldieVEVO",          chAvatar:"🎶", age:"6d",   views:"120k vues",  dur:"5:30",  thumb:"#080010", title:"Goldie - Inner City Life (Official Video)"},
    {id:14, ch:"TheNationalVEVO",     chAvatar:"🎸", age:"1w", views:"445k vues",  dur:"4:12",  thumb:"#0a0808", title:"The National - Bloodbuzz Ohio (Official Video)"},
    {id:15, ch:"Maine Public",        chAvatar:"🌊", age:"1w", views:"8.2k vues",  dur:"6:18",  thumb:"#060e06", title:"Kennebec River Levels — Environmental Update Summer 2012"},
  ],
};

const YouTubeScreen = ({isIos, charKey, data, onBack}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const videos = data?.youtubeVideos?.[charKey] || YOUTUBE_FEEDS_DEFAULT[charKey] || YOUTUBE_FEEDS_DEFAULT.elias;

  const VideoRow = ({v}) => (
    <div style={{background:"#fff",marginBottom:0,borderBottom:"1px solid #e8e8e8"}}>
      {/* Upload notice row */}
      <div style={{padding:"8px 10px 5px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontSize:12,fontWeight:700,color:"#212121"}}>{v.ch}</span>
          <span style={{fontSize:12,color:"#212121"}}> uploaded</span>
        </div>
        <span style={{fontSize:11,color:"#999",flexShrink:0}}>{v.age}</span>
      </div>
      {/* Thumbnail */}
      <div style={{position:"relative",width:"100%",paddingBottom:"56.25%",background:v.thumbImg?undefined:v.thumb,overflow:"hidden"}}>
        {v.thumbImg && <img src={v.thumbImg} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:0,height:0,borderTop:"8px solid transparent",borderBottom:"8px solid transparent",borderLeft:"14px solid #fff",marginLeft:3}}/>
          </div>
        </div>
        {/* Duration badge */}
        <div style={{position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,0.75)",borderRadius:2,padding:"1px 5px"}}>
          <span style={{color:"#fff",fontSize:11,fontWeight:600,fontFamily:"Arial,sans-serif"}}>{v.dur}</span>
        </div>
      </div>
      {/* Title + meta */}
      <div style={{padding:"7px 10px 10px"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#212121",lineHeight:1.35,marginBottom:3,
          overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
          {v.title}
        </div>
        <div style={{fontSize:11,color:"#999"}}>
          {v.ch} &nbsp;·&nbsp; {v.views}
        </div>
      </div>
    </div>
  );

  /* ── iOS 6 layout ── */
  if(isIos) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#f2f2f7",overflow:"hidden",
      fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>
      {/* iOS 6 YouTube header — dark, logo centré */}
      <div style={{background:"#212121",height:44,display:"flex",alignItems:"center",
        padding:"0 10px",flexShrink:0,position:"relative",
        boxShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
        {/* Back button */}
        <button onClick={onBack} style={{background:"linear-gradient(180deg,#444,#222)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:6,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",padding:"3px 8px",display:"flex",alignItems:"center",textShadow:"0 -1px 0 rgba(0,0,0,0.5)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.2)",zIndex:1,flexShrink:0}}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Logo */}
        <div style={{position:"absolute",left:0,right:0,display:"flex",alignItems:"center",
          justifyContent:"center",pointerEvents:"none"}}>
          <span style={{color:"#fff",fontWeight:900,fontSize:15,fontFamily:"Arial,sans-serif",letterSpacing:-0.5}}>
            <span style={{background:"#cc0000",color:"#fff",padding:"1px 5px",borderRadius:3,marginRight:3,fontSize:14}}>You</span>
            <span>Tube</span>
          </span>
        </div>
        {/* Search */}
        <div style={{marginLeft:"auto",cursor:"pointer",padding:"4px 2px"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#ccc" strokeWidth="2"/>
            <path d="M20 20l-3.5-3.5" stroke="#ccc" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      {/* Feed */}
      <div style={{flex:1,overflowY:"auto",minHeight:0,background:"#fff"}}>
        {videos.map(v=><VideoRow key={v.id} v={v}/>)}
        <div style={{height:10}}/>
      </div>
    </div>
  );

  /* ── Android layout — YouTube 2012 style ── */
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#1a1a1a",overflow:"hidden",
      fontFamily:"'Roboto','Droid Sans',Arial,sans-serif"}}>

      {/* Header rouge YouTube Android */}
      <div style={{background:"#cc0000",height:48,display:"flex",alignItems:"center",
        padding:"0 4px 0 0",flexShrink:0,boxShadow:"0 2px 4px rgba(0,0,0,0.4)"}}>
        {/* Back */}
        <button onClick={onBack} style={{background:"none",border:"none",color:"rgba(255,255,255,0.87)",cursor:"pointer",padding:"0 8px 0 4px",height:"100%",display:"flex",alignItems:"center"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.87)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
          <div style={{background:"rgba(0,0,0,0.25)",borderRadius:3,padding:"2px 7px",display:"flex",alignItems:"center",gap:4}}>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <rect width="16" height="12" rx="2" fill="white" opacity="0.9"/>
              <path d="M6.5 3.5L11 6L6.5 8.5V3.5Z" fill="#cc0000"/>
            </svg>
            <span style={{color:"#fff",fontWeight:700,fontSize:15,letterSpacing:0.3}}>YouTube</span>
          </div>
        </div>
        {/* Search */}
        <div style={{padding:"0 14px",cursor:"pointer"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.9)" strokeWidth="2"/>
            <path d="M20 20l-3.5-3.5" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Feed */}
      <div style={{flex:1,overflowY:"auto",minHeight:0,background:"#1a1a1a"}}>
        {videos.map((v,vi)=>(
          <div key={v.id} style={{background:"#1a1a1a",borderBottom:"1px solid #252525",marginBottom:0}}>
            {/* Upload row */}
            <div style={{padding:"10px 12px 6px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontSize:12,fontWeight:700,color:"#e8e8e8"}}>{v.ch}</span>
                <span style={{fontSize:12,color:"#aaa"}}> a mis en ligne une vidéo</span>
              </div>
              <span style={{fontSize:10,color:"#666",flexShrink:0}}>{v.age}</span>
            </div>
            {/* Thumbnail */}
            <div style={{position:"relative",width:"100%",paddingBottom:"56.25%",background:v.thumbImg?undefined:v.thumb}}>
              {v.thumbImg && <img src={v.thumbImg} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(0,0,0,0.65)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:0,height:0,
                    borderTop:"9px solid transparent",
                    borderBottom:"9px solid transparent",
                    borderLeft:"16px solid rgba(255,255,255,0.95)",
                    marginLeft:3}}/>
                </div>
              </div>
              <div style={{position:"absolute",bottom:6,right:6,background:"rgba(0,0,0,0.82)",
                borderRadius:2,padding:"2px 5px"}}>
                <span style={{color:"#fff",fontSize:11,fontWeight:600,fontFamily:"Arial,sans-serif"}}>{v.dur}</span>
              </div>
            </div>
            {/* Title + meta */}
            <div style={{padding:"8px 12px 12px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#e8e8e8",lineHeight:1.35,marginBottom:4,
                overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                {v.title}
              </div>
              <div style={{fontSize:11,color:"#777"}}>
                {v.ch} &nbsp;·&nbsp; {v.views}
              </div>
            </div>
          </div>
        ))}
        <div style={{height:16}}/>
      </div>
    </div>
  );
};

export { YouTubeScreen, YOUTUBE_FEEDS_DEFAULT };
