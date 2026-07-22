import React, { useState } from "react";

const StarbucksScreen = ({isIos, charKey}) => {
  const [tab, setTab] = useState("card");
  const GRN="#00704A",GOLD="#CBA258",bg=isIos?"#f5f4ef":"#0e1a12",card=isIos?"#fff":"#1a2e1f",sep=isIos?"#e5e5e5":"#1e3326",txt=isIos?"#1a1a1a":"#e8f5e9";
  const name=charKey==="glinda"?"Glinda":charKey==="eoghan"?"Eoghan":charKey==="drew"?"Drew":"Elias";
  const stars=charKey==="glinda"?687:charKey==="eoghan"?118:charKey==="drew"?55:210;
  const bal=charKey==="glinda"?"$14.30":charKey==="eoghan"?"$8.50":charKey==="drew"?"$21.00":"$6.75";
  const GLINDA_SIG = "Grande Caramel Frappuccino, custom";
  const GLINDA_SIG_DETAIL = "soy milk · 4 pumps vanilla · 4 pumps caramel · whipped cream · caramel + chocolate drizzle · caramel crunch topping";
  const recentsByChar = {
    glinda:[
      {item:GLINDA_SIG,detail:GLINDA_SIG_DETAIL,date:"Today · 3:02pm",price:"$6.75",pts:14},
      {item:"Carrot Cake Slice",date:"Today · 3:02pm",price:"$3.25",pts:7},
      {item:GLINDA_SIG,detail:GLINDA_SIG_DETAIL,date:"Today · 8:14am",price:"$6.75",pts:14},
      {item:"Carrot Cake Slice",date:"Today · 8:14am",price:"$3.25",pts:7},
      {item:GLINDA_SIG,detail:GLINDA_SIG_DETAIL,date:"Sep 30 · 5:48pm",price:"$6.75",pts:14},
      {item:"Banana Bread Slice",date:"Sep 30 · 5:48pm",price:"$3.15",pts:7},
      {item:GLINDA_SIG,detail:GLINDA_SIG_DETAIL,date:"Sep 30 · 9:20am",price:"$6.75",pts:14},
      {item:"Carrot Cake Slice",date:"Sep 30 · 9:20am",price:"$3.25",pts:7},
      {item:GLINDA_SIG,detail:GLINDA_SIG_DETAIL,date:"Sep 29 · 2:30pm",price:"$6.75",pts:14},
      {item:"Lemon Loaf",date:"Sep 29 · 2:30pm",price:"$2.95",pts:6},
      {item:GLINDA_SIG,detail:GLINDA_SIG_DETAIL,date:"Sep 29 · 8:05am",price:"$6.75",pts:14},
      {item:"Carrot Cake Slice",date:"Sep 29 · 8:05am",price:"$3.25",pts:7},
    ],
    eoghan:[
      {item:"Grande Americano",date:"Today",price:"$3.25",pts:7},
      {item:"Tall Flat White",date:"Sep 30",price:"$3.75",pts:8},
    ],
    drew:[
      {item:"Grande Pike Place Roast",date:"Today",price:"$2.45",pts:5},
      {item:"Blueberry Muffin",date:"Sep 29",price:"$2.75",pts:6},
    ],
    elias:[
      {item:"Venti Cold Brew",date:"Today",price:"$4.15",pts:9},
      {item:"Iced Black Tea",date:"Sep 28",price:"$3.45",pts:7},
    ],
  };
  const recents = recentsByChar[charKey] || recentsByChar.eoghan;
  const STARBUCKS_AUGUSTA = {name:"Starbucks Augusta Downtown",addr:"284 Water St, Augusta ME",hours:"Mon–Sat 6am–9pm · Sun 7am–8pm"};
  const favoritesByChar = {
    glinda:[
      STARBUCKS_AUGUSTA,
      {name:"Starbucks Michigan Ave",addr:"600 N Michigan Ave, Chicago IL",hours:"Mon–Sun 6am–10pm"},
      {name:"Starbucks Wrigleyville",addr:"3500 N Clark St, Chicago IL",hours:"Mon–Sun 6am–9pm"},
      {name:"Starbucks Market Square",addr:"100 Forbes Ave, Pittsburgh PA",hours:"Mon–Sat 6:30am–8pm · Sun 7am–7pm"},
    ],
  };
  const favorites = favoritesByChar[charKey] || [STARBUCKS_AUGUSTA];
  const TABS=[
    {id:"card",label:"My Card",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2" stroke={a?GRN:"#777"} strokeWidth="1.8"/><path d="M2 10h20" stroke={a?GRN:"#777"} strokeWidth="1.8"/></svg>},
    {id:"store",label:"Store",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l1-5h16l1 5M3 9h18M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9" stroke={a?GRN:"#777"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>},
    {id:"rewards",label:"Rewards",icon:(a)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={a?GOLD:"#777"} strokeWidth="1.8" fill={a?"rgba(203,162,88,0.15)":"none"} strokeLinejoin="round"/></svg>},
  ];
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:bg,minHeight:0}}>
      <div style={{background:GRN,padding:"10px 16px 12px",flexShrink:0}}>
        <div style={{color:"rgba(255,255,255,0.75)",fontSize:10,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Hello,</div>
        <div style={{color:"#fff",fontSize:17,fontWeight:700,marginBottom:8}}>{name}</div>
        {tab==="card"&&<div style={{background:"rgba(0,0,0,0.2)",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{color:"rgba(255,255,255,0.7)",fontSize:10}}>Balance</div><div style={{color:"#fff",fontSize:22,fontWeight:700}}>{bal}</div></div>
          <div style={{textAlign:"right"}}><div style={{color:"rgba(255,255,255,0.7)",fontSize:10}}>Gold Stars</div><div style={{color:GOLD,fontSize:20,fontWeight:700}}>★ {stars}</div></div>
        </div>}
        {tab==="rewards"&&<div style={{textAlign:"center",paddingBottom:4}}>
          <div style={{color:GOLD,fontSize:11,letterSpacing:1}}>GOLD MEMBER</div>
          <div style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:4}}>Next reward at {300-stars%300} stars</div>
          <div style={{height:6,background:"rgba(0,0,0,0.2)",borderRadius:3,marginTop:8,overflow:"hidden"}}><div style={{height:"100%",width:`${(stars%300)/3}%`,background:GOLD,borderRadius:3}}/></div>
        </div>}
      </div>
      <div style={{flex:1,overflowY:"auto",minHeight:0}}>
        {tab==="card"&&recents.map((r,i)=>(
          <div key={i} style={{background:card,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:`1px solid ${sep}`,gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:txt,fontSize:12,fontWeight:500}}>{r.item}</div>
              {r.detail&&<div style={{color:GRN,fontSize:9.5,marginTop:2,lineHeight:1.4,fontStyle:"italic"}}>{r.detail}</div>}
              <div style={{color:"#888",fontSize:10,marginTop:2}}>{r.date} · +{r.pts} ★</div>
            </div>
            <div style={{color:GRN,fontSize:12,fontWeight:600,flexShrink:0}}>{r.price}</div>
          </div>
        ))}
        {tab==="store"&&<div style={{padding:"14px 16px"}}>
          <div style={{color:"#888",fontSize:10,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>My favorite Starbucks</div>
          {favorites.map((s,i)=>(
            <div key={i} style={{background:card,borderRadius:10,padding:"12px 14px",marginBottom:8,border:`1px solid ${sep}`}}>
              <div style={{color:GRN,fontWeight:700,fontSize:14,marginBottom:4}}>{s.name}</div>
              <div style={{color:txt,fontSize:11,lineHeight:1.5,opacity:0.85}}>{s.addr}<br/>{s.hours}</div>
            </div>
          ))}
        </div>}
        {tab==="rewards"&&<div style={{padding:"14px 16px"}}>
          <div style={{color:"#888",fontSize:10,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>My Gold benefits</div>
          {["Free refills on brewed coffee or tea","Unlimited customization","Birthday treat","Gold early access to new menu items"].map((r,i)=>(
            <div key={i} style={{background:card,padding:"11px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:i<3?`1px solid ${sep}`:"none",borderRadius:i===0?"10px 10px 0 0":i===3?"0 0 10px 10px":0,marginBottom:i===3?12:0}}>
              <div style={{color:GOLD,fontSize:16}}>★</div><div style={{color:txt,fontSize:12}}>{r}</div>
            </div>
          ))}

          <div style={{color:"#888",fontSize:10,letterSpacing:1,textTransform:"uppercase",margin:"16px 0 8px"}}>Redeem my stars</div>
          {[
            {cost:25, label:"Extra milk, syrup or shot", icon:"+"},
            {cost:50, label:"Brewed coffee, hot tea or iced coffee", icon:"☕"},
            {cost:150,label:"Customized drink, bakery item or snack", icon:"🥐"},
            {cost:200,label:"Lunch item (sandwich, salad, protein box)", icon:"🥪"},
            {cost:400,label:"Select merchandise item", icon:"🎁"},
          ].map((rw,i)=>{
            const unlocked = stars%300 >= rw.cost;
            return (
              <div key={i} style={{background:card,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10,border:`1px solid ${sep}`,opacity:unlocked?1:0.5}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:unlocked?"rgba(0,112,74,0.12)":"rgba(120,120,120,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{rw.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:txt,fontSize:12,fontWeight:500}}>{rw.label}</div>
                  <div style={{color:unlocked?GOLD:"#888",fontSize:10,marginTop:1}}>{rw.cost} ★ {unlocked?"· Available":""}</div>
                </div>
              </div>
            );
          })}

          <div style={{color:"#888",fontSize:10,letterSpacing:1,textTransform:"uppercase",margin:"16px 0 8px"}}>Star history</div>
          <div style={{background:card,borderRadius:10,padding:"12px 14px",border:`1px solid ${sep}`,fontSize:11,color:txt,lineHeight:1.7,opacity:0.85}}>
            Lifetime stars: <span style={{color:GOLD,fontWeight:700}}>{stars + 1240} ★</span><br/>
            Gold member since: March 2012
          </div>
        </div>}
      </div>
      <div style={{background:isIos?"#f7f7f7":"#111",borderTop:`1px solid ${sep}`,display:"flex",flexShrink:0}}>
        {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",padding:"7px 0",gap:2,cursor:"pointer"}}>{t.icon(tab===t.id)}<span style={{fontSize:9,color:tab===t.id?GRN:"#777",fontWeight:tab===t.id?600:400}}>{t.label}</span></button>))}
      </div>
    </div>
  );
};

export { StarbucksScreen };
