import React from "react";
import { AppSkeleton } from "../shared/ui-kit.jsx";

const ContactsScreen = ({data, isIos, accent}) => {
  const list = (data.contacts && data.contacts.length>0)
    ? data.contacts
    : (data.calls||[]).filter((c,i,a)=>a.findIndex(x=>x.contact===c.contact)===i).map(c=>({id:c.contact, name:c.contact, photo:null, phone:""}));
  return (
    <AppSkeleton icon="👥" name="Contacts" color={isIos?"#4CAF50":"#4a90c0"} isIos={isIos}>
      {list.map((c,i)=>(
        <div key={c.id??i} style={{background:isIos?"linear-gradient(180deg,#ffffff,#f5f4ef)":"#1e1e1e",padding:"10px 12px",borderBottom:isIos?"1px solid #b2b2a8":"1px solid #2a2a2a",display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:15,overflow:"hidden",flexShrink:0}}>
            {c.photo ? <img src={c.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (c.name||"?")[0]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:isIos?"#000":"#fff",fontSize:13}}>{c.name}</div>
            {c.phone && <div style={{color:isIos?"#8e8e93":"#999",fontSize:11,marginTop:1}}>{c.phone}</div>}
          </div>
        </div>
      ))}
    </AppSkeleton>
  );
};

export { ContactsScreen };
