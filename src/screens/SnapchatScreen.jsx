import React, { useContext } from "react";
import { LoreDateCtx, loreRelativeLabel } from "../shared/lore-date.js";
import { getCharKey } from "../shared/social-feed.js";

const SNAPCHAT_DEFAULTS = {
  glinda:[
    {id:12, contact:"Niall 🍀",     opened:false, sent:false, time:"Oct 1 at 12:14PM"},
    {id:1,  contact:"Eoghan ☆",    opened:false, sent:false, time:"Oct 1 at 11:32AM"},
    {id:2,  contact:"Cynthia",      opened:false, sent:false, time:"Oct 1 at 11:08AM"},
    {id:3,  contact:"Drew",         opened:true,  sent:false, time:"Oct 1 at 10:15AM"},
    {id:4,  contact:"Taylor S. 🌟",opened:false, sent:false, time:"Oct 1 at 9:51AM"},
    {id:5,  contact:"Jeongguk",     opened:false, sent:false, time:"Oct 1 at 9:44AM"},
    {id:6,  contact:"Elphie 🌿",   opened:false, sent:true,  time:"Oct 1 at 8:30AM"},
    {id:7,  contact:"Vicky",        opened:true,  sent:false, time:"Sep 30 at 11:20PM"},
    {id:8,  contact:"Nayati",       opened:false, sent:false, time:"Sep 30 at 9:15PM"},
    {id:9,  contact:"Abby",         opened:true,  sent:true,  time:"Sep 30 at 8:17PM"},
    {id:10, contact:"Drew",         opened:true,  sent:true,  time:"Sep 30 at 3:21PM"},
    {id:11, contact:"Boq 🌹",       opened:false, sent:false, time:"Oct 1 at 11:59AM"},
  ],
  eoghan:[
    {id:9,  contact:"Niall 🍀",     opened:false, sent:false, time:"Oct 1 at 12:09PM"},
    {id:1,  contact:"Glinglin 🌸", opened:false, sent:false, time:"Oct 1 at 11:44AM"},
    {id:2,  contact:"Ilya 🔥",     opened:false, sent:false, time:"Oct 1 at 9:30AM"},
    {id:3,  contact:"Jungkook",    opened:false, sent:false, time:"Oct 1 at 2:17AM"},
    {id:4,  contact:"Theo",        opened:true,  sent:false, time:"Sep 30 at 11:48PM"},
    {id:5,  contact:"Ryo",         opened:false, sent:true,  time:"Sep 30 at 10:33PM"},
    {id:6,  contact:"Namjoon",     opened:false, sent:true,  time:"Sep 30 at 9:12PM"},
    {id:7,  contact:"Santi",       opened:true,  sent:false, time:"Sep 30 at 8:55PM"},
    {id:8,  contact:"Felix",       opened:false, sent:false, time:"Sep 29 at 11:20PM"},
    {id:9,  contact:"Asra",        opened:true,  sent:true,  time:"Oct 1 at 8:55AM"},
    {id:10, contact:"Vicky",       opened:true,  sent:false, time:"Sep 30 at 11:15PM"},
  ],
  drew:[
    {id:1, contact:"Glinda",       opened:true,  sent:false, time:"Oct 1 at 10:22AM"},
    {id:2, contact:"Abby",         opened:false, sent:false, time:"Oct 1 at 9:11AM"},
    {id:3, contact:"Elias",        opened:false, sent:false, time:"Sep 30 at 11:58PM"},
    {id:4, contact:"Cynthia",      opened:true,  sent:true,  time:"Sep 30 at 4:15PM"},
  ],
  elias:[
    {id:1, contact:"Drew",         opened:false, sent:false, time:"Sep 30 at 11:58PM"},
    {id:2, contact:"Eoghan",       opened:false, sent:false, time:"Sep 30 at 8:22PM"},
    {id:3, contact:"Matthew",      opened:true,  sent:true,  time:"Sep 29 at 3:10PM"},
  ],
};

const SnapchatScreen = ({data,admin,update}) => {
  const charKey = getCharKey(data);
  const loreDateStr = useContext(LoreDateCtx);
  
  const snaps = (data.snaps && data.snaps.length > 0) ? data.snaps : (SNAPCHAT_DEFAULTS[charKey] || []);
  const SC_GREEN  = "#8ad232";
  const SC_PINK   = "#e8365d";
  const SC_PURPLE = "#9b59b6";

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#fff",overflow:"hidden"}}>

      
      <div style={{flex:1,overflowY:"auto"}}>
        {snaps.map((s,i)=>{
          const isSentOpened   = s.sent && s.opened;
          const isSentNew      = s.sent && !s.opened;
          const isRecvNew      = !s.sent && !s.opened;
          const isRecvOpened   = !s.sent && s.opened;

          return (
            <div key={s.id} style={{
              padding:"10px 14px",
              borderBottom:"1px solid #f0f0f0",
              display:"flex",alignItems:"center",gap:12,
              background:"#fff",
            }}>
          
              <div style={{width:34,height:34,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {s.sent ? (
                  s.opened
                    ? <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                        <path d="M10 5 C10 5 85 42 85 50 C85 58 10 95 10 95 C10 95 30 72 30 50 C30 28 10 5 10 5Z" stroke={s.video?SC_PURPLE:SC_PINK} strokeWidth="5" fill="none" strokeLinejoin="round"/>
                      </svg>
                    : <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                        <path d="M10 5 C10 5 85 42 85 50 C85 58 10 95 10 95 C10 95 30 72 30 50 C30 28 10 5 10 5Z" fill={s.video?SC_PURPLE:SC_PINK}/>
                      </svg>
                ) : (
                  // Received: filled square (not opened) or outline square (opened)
                  s.opened
                    ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <rect x="1" y="1" width="20" height="20" rx="2" stroke={SC_PINK} strokeWidth="2.5" fill="none"/>
                      </svg>
                    : <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <rect x="0" y="0" width="22" height="22" rx="2" fill={s.video?SC_PURPLE:SC_PINK}/>
                      </svg>
                )}
              </div>
              
              <div style={{flex:1,minWidth:0}}>
                <div style={{
                  fontSize:14,
                  fontWeight:isRecvNew?700:400,
                  color:isRecvNew?"#000":"#666",
                  marginBottom:2,
                }}>
                  {isRecvNew && <span style={{color:s.video?SC_PURPLE:SC_PINK}}>Snap! </span>}
                  {isRecvNew ? `from ${s.contact}` : s.contact}
                </div>
                <div style={{fontSize:11,color:"#999"}}>
                  {loreRelativeLabel(s.time,loreDateStr)}
                  {isRecvNew     && " · Press and hold to view"}
                  {isSentNew     && " · Delivered"}
                  {isRecvOpened  && " · Opened"}
                </div>
              </div>
              
              {isRecvNew && <span style={{color:"#c8c7cc",lineHeight:1}}><svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>}
              {isSentNew && <span style={{color:SC_GREEN,fontSize:16}}>→</span>}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export { SnapchatScreen, SNAPCHAT_DEFAULTS };
