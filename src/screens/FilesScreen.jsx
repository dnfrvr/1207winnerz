import React, { useState } from "react";

const FILE_TYPE_META = {
  pdf:  {icon:"📄", color:"#e74c3c", label:"PDF"},
  mp3:  {icon:"🎵", color:"#9b59b6", label:"MP3"},
  mp4:  {icon:"🎬", color:"#2980b9", label:"MP4"},
  mov:  {icon:"🎬", color:"#2980b9", label:"MOV"},
  jpg:  {icon:"🖼️", color:"#27ae60", label:"JPG"},
  png:  {icon:"🖼️", color:"#27ae60", label:"PNG"},
  doc:  {icon:"📝", color:"#2c5fbe", label:"DOC"},
  docx: {icon:"📝", color:"#2c5fbe", label:"DOCX"},
  xls:  {icon:"📊", color:"#1a7c3e", label:"XLS"},
  xlsx: {icon:"📊", color:"#1a7c3e", label:"XLSX"},
  ppt:  {icon:"📋", color:"#d35400", label:"PPT"},
  zip:  {icon:"🗜️", color:"#7f8c8d", label:"ZIP"},
  txt:  {icon:"📃", color:"#95a5a6", label:"TXT"},
  other:{icon:"📎", color:"#7f8c8d", label:"FILE"},
};

const fileTypeMeta = (ext) => FILE_TYPE_META[(ext||"other").toLowerCase()] || FILE_TYPE_META.other;
const fileExt = (name) => (name||"").split(".").pop().toLowerCase();

const FilesScreen = ({data, isIos, accent, onBack}) => {
  const [folder, setFolder] = useState(null); // null = racine, string = id du dossier ouvert
  const items = data.files || {folders:[], rootFiles:[]};
  const folders = items.folders || [];
  const rootFiles = items.rootFiles || [];

  // iOS 6 style
  const IOS6_BG    = "#c8c8cc";
  const IOS6_CELL  = "#ffffff";
  const IOS6_SEP   = "#c8c8cd";
  const IOS6_BLUE  = "#007aff";
  const IOS6_GRAY  = "#6d6d72";
  const IOS6_HDR   = "linear-gradient(180deg,#f5f5f5 0%,#e0e0e0 100%)";

  // Android style
  const AND_BG     = "#fafafa";
  const AND_CELL   = "#ffffff";
  const AND_SEP    = "#e0e0e0";
  const AND_BLUE   = "#1565C0";
  const AND_GRAY   = "#757575";
  const AND_HDR    = "#1976D2";

  const currentFolder = folder ? folders.find(f=>f.id===folder) : null;
  const displayFiles  = folder ? (currentFolder?.files||[]) : rootFiles;
  const displayFolders= folder ? [] : folders;

  if(isIos) {
    // ── iOS 6 Files — header style Photos NavBar ────────────────────────────
    const titleText = folder ? (currentFolder?.name||"Dossier") : "Fichiers";
    const tSize = titleText.length > 16 ? 13 : titleText.length > 12 ? 15 : 18;
    return (
      <div style={{flex:1,background:IOS6_BG,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header style PhotosNavBar */}
        <div style={{background:"linear-gradient(180deg,#b8b8b8 0%,#909090 45%,#7c7c7c 100%)",borderBottom:"1px solid #555",height:44,display:"flex",alignItems:"center",padding:"0 8px",flexShrink:0,fontFamily:"Helvetica,'Helvetica Neue',Arial,sans-serif"}}>
          <button onClick={()=>folder ? setFolder(null) : onBack?.()} style={{background:"linear-gradient(180deg,#444,#222)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:5,padding:"4px 8px",color:"#fff",fontSize:12,fontWeight:"600",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:3,flexShrink:0,width:70,boxSizing:"border-box",textShadow:"0 -1px 0 rgba(0,0,0,0.5)"}}>
            <svg width="6" height="10" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6L6 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{fontSize:11}}>{folder?"Fichiers":""}</span>
          </button>
          <div style={{flex:1,textAlign:"center",color:"#fff",fontWeight:"700",fontSize:tSize,textShadow:"0 -1px 0 rgba(0,0,0,0.5)",pointerEvents:"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{titleText}</div>
          <div style={{width:70}}/>
        </div>

        {/* Barre de recherche iOS 6 — collée au header, pas de gap */}
        {!folder && (
          <div style={{background:"linear-gradient(180deg,#d0d0d4,#c0c0c4)",padding:"5px 10px",flexShrink:0}}>
            <div style={{background:"rgba(255,255,255,0.85)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",gap:6,border:"1px solid #aaa",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.12)"}}>
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke={IOS6_GRAY} strokeWidth="1.6"/><path d="M13 13l3 3" stroke={IOS6_GRAY} strokeWidth="1.6" strokeLinecap="round"/></svg>
              <span style={{color:"#aaa",fontSize:14}}>Rechercher</span>
            </div>
          </div>
        )}

        <div style={{flex:1,overflowY:"auto"}}>
          {/* Dossiers — pas de marginTop, collé à la search bar */}
          {displayFolders.length > 0 && (
            <div>
              <div style={{background:IOS6_CELL,borderTop:`1px solid ${IOS6_SEP}`,borderBottom:`1px solid ${IOS6_SEP}`}}>
                {displayFolders.map((f,i)=>(
                  <div key={f.id||i} onClick={()=>setFolder(f.id)}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderBottom:i<displayFolders.length-1?`1px solid ${IOS6_SEP}`:"none",cursor:"pointer",background:IOS6_CELL}}>
                    {/* Icône dossier iOS 6 */}
                    <div style={{width:36,height:30,position:"relative",flexShrink:0}}>
                      <svg viewBox="0 0 36 30" style={{width:"100%",height:"100%"}}>
                        <defs>
                          <linearGradient id={`fg${f.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c8972a"/>
                            <stop offset="100%" stopColor="#a07018"/>
                          </linearGradient>
                        </defs>
                        <rect x="0" y="5" width="36" height="25" rx="3" fill={`url(#fg${f.id})`}/>
                        <rect x="0" y="5" width="36" height="25" rx="3" fill="rgba(255,255,255,0.08)"/>
                        <path d="M0 8 Q2 5 5 5 L12 5 Q14 5 15 7 L36 7 L36 8 Z" fill="#d4a030"/>
                        <rect x="1" y="5" width="34" height="1" fill="rgba(255,255,255,0.25)"/>
                      </svg>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,color:"#000",fontWeight:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name||"Dossier"}</div>
                      {f.files?.length>0 && <div style={{fontSize:12,color:IOS6_GRAY}}>{f.files.length} élément{f.files.length>1?"s":""}</div>}
                    </div>
                    <span style={{color:"#c0c0c5",fontSize:16}}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fichiers */}
          {displayFiles.length > 0 && (
            <div>
              <div style={{background:IOS6_CELL,borderTop:`1px solid ${IOS6_SEP}`,borderBottom:`1px solid ${IOS6_SEP}`}}>
                {displayFiles.map((file,i)=>{
                  const ext = fileExt(file.name);
                  const meta = fileTypeMeta(ext);
                  return (
                    <div key={file.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderBottom:i<displayFiles.length-1?`1px solid ${IOS6_SEP}`:"none",background:IOS6_CELL}}>
                      {/* Icône fichier iOS 6 */}
                      <div style={{width:32,height:38,position:"relative",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <svg viewBox="0 0 32 38" style={{width:"100%",height:"100%",position:"absolute",top:0,left:0}}>
                          <defs>
                            <linearGradient id={`ff${file.id||i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f8f8f8"/>
                              <stop offset="100%" stopColor="#e8e8e8"/>
                            </linearGradient>
                          </defs>
                          <path d="M0 2 Q0 0 2 0 L22 0 L32 10 L32 36 Q32 38 30 38 L2 38 Q0 38 0 36 Z" fill={`url(#ff${file.id||i})`} stroke="#ccc" strokeWidth="0.5"/>
                          <path d="M22 0 L22 10 L32 10 Z" fill="#ddd"/>
                        </svg>
                        <span style={{position:"relative",fontSize:13,zIndex:1,marginTop:6}}>{meta.icon}</span>
                        <div style={{position:"absolute",bottom:4,left:0,right:0,textAlign:"center",fontSize:7,fontWeight:700,color:"#fff",background:meta.color,borderRadius:2,margin:"0 3px",padding:"1px 0",letterSpacing:0.3}}>{ext.toUpperCase().slice(0,4)}</div>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,color:"#000",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name||"Fichier"}</div>
                        <div style={{fontSize:12,color:IOS6_GRAY}}>{file.date||""}{file.size?` · ${file.size}`:""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {displayFolders.length===0 && displayFiles.length===0 && (
            <div style={{padding:"60px 24px",textAlign:"center",color:IOS6_GRAY,fontSize:14}}>
              <div style={{fontSize:40,marginBottom:12}}>📁</div>
              Aucun fichier
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Android Files ─────────────────────────────────────────────────────────
  return (
    <div style={{flex:1,background:AND_BG,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header Android permanent */}
      <div style={{background:AND_HDR,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0,boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}>
        <button onClick={()=>folder ? setFolder(null) : onBack?.()} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:0,fontSize:20,display:"flex",alignItems:"center"}}>←</button>
        <span style={{color:"#fff",fontSize:16,fontWeight:500}}>{folder ? (currentFolder?.name||"Dossier") : "Fichiers"}</span>
      </div>

      <div style={{flex:1,overflowY:"auto"}}>
        {/* Dossiers Android */}
        {displayFolders.length > 0 && (
          <div>
            <div style={{padding:"12px 16px 4px",fontSize:12,fontWeight:500,color:AND_GRAY,textTransform:"uppercase",letterSpacing:0.8}}>Dossiers</div>
            {displayFolders.map((f,i)=>(
              <div key={f.id||i} onClick={()=>setFolder(f.id)}
                style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderBottom:`1px solid ${AND_SEP}`,cursor:"pointer",background:AND_CELL}}>
                <span style={{fontSize:28,flexShrink:0}}>📁</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,color:"#212121",fontWeight:400}}>{f.name||"Dossier"}</div>
                  {f.files?.length>0 && <div style={{fontSize:12,color:AND_GRAY}}>{f.files.length} élément{f.files.length>1?"s":""}</div>}
                </div>
                <span style={{color:AND_GRAY,fontSize:18}}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* Fichiers Android */}
        {displayFiles.length > 0 && (
          <div>
            <div style={{padding:"12px 16px 4px",fontSize:12,fontWeight:500,color:AND_GRAY,textTransform:"uppercase",letterSpacing:0.8}}>Fichiers</div>
            {displayFiles.map((file,i)=>{
              const ext = fileExt(file.name);
              const meta = fileTypeMeta(ext);
              return (
                <div key={file.id||i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderBottom:`1px solid ${AND_SEP}`,background:AND_CELL}}>
                  <div style={{width:40,height:40,borderRadius:4,background:meta.color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:20}}>{meta.icon}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,color:"#212121",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name||"Fichier"}</div>
                    <div style={{fontSize:12,color:AND_GRAY}}>{file.date||""}{file.size?` · ${file.size}`:""}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:meta.color,background:meta.color+"18",borderRadius:4,padding:"2px 6px",flexShrink:0}}>{ext.toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        )}

        {displayFolders.length===0 && displayFiles.length===0 && (
          <div style={{padding:"60px 24px",textAlign:"center",color:AND_GRAY,fontSize:14}}>
            <div style={{fontSize:40,marginBottom:12}}>📂</div>
            Aucun fichier
          </div>
        )}
      </div>
    </div>
  );
};

export { FilesScreen, fileTypeMeta };
