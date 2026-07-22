import React from "react";

// Petites icônes blanches de notification pour la status bar Android (style JB).
const AndroidNotifIcon = ({app}) => {
  const c = "#fff";
  const common = {width:12, height:12, viewBox:"0 0 24 24", fill:"none", style:{flexShrink:0}};
  switch(app) {
    case "messages": case "groupme": case "kik": case "messenger":
    case "snapchat":
      return <svg {...common}><path d="M12 3c3 0 4 2 4 5 0 1 1 1 2 2 0 1-2 1-2 2s2 1 2 3c0 1-3 1-4 2 0 1-1 1-2 1s-2 0-2-1c-1-1-4-1-4-2 0-2 2-2 2-3s-2-1-2-2c1-1 2-1 2-2 0-3 1-5 4-5z" fill={c}/></svg>;
    case "insta":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" stroke={c} strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" stroke={c} strokeWidth="2" fill="none"/><circle cx="17.5" cy="6.5" r="1.3" fill={c}/></svg>;
    case "twitter":
      return <svg {...common}><path d="M22 5.8a8 8 0 01-2.3.6 4 4 0 001.8-2.2 8 8 0 01-2.5 1A4 4 0 0012 8.5c0 .3 0 .6.1.9A11.3 11.3 0 013 5.1a4 4 0 001.2 5.3 4 4 0 01-1.8-.5 4 4 0 003.2 4 4 4 0 01-1.8.1 4 4 0 003.7 2.8A8 8 0 012 18.6 11.3 11.3 0 008.1 20c7 0 11-6 11-11v-.5A8 8 0 0022 5.8z" fill={c}/></svg>;
    case "facebook":
      return <svg {...common}><path d="M13 22v-8h2.7l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.7 1.4-3.7 3.9V11H7.5v3H10v8z" fill={c}/></svg>;
    case "tumblr":
      return <svg {...common}><path d="M14 3v4h4v3h-4v6c0 1 .5 1.5 1.5 1.5H18V21h-3c-2.5 0-4-1.5-4-4v-7H9V7c2 0 3-1.5 3-4z" fill={c}/></svg>;
    case "pinterest":
      return <svg {...common}><circle cx="12" cy="12" r="9" fill={c}/><path d="M11 17l1.2-5.5" stroke="#000" strokeWidth="1.4" strokeLinecap="round"/><circle cx="12.6" cy="10" r="2.4" stroke="#000" strokeWidth="1.4" fill="none"/></svg>;
    case "gmail": case "mail":
      return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="1.5" fill={c}/><path d="M3 6l9 7 9-7" stroke="#000" strokeWidth="1.6" fill="none"/></svg>;
    case "reddit":
      return <svg {...common}><circle cx="12" cy="13.5" r="7" fill={c}/><circle cx="17.5" cy="5.5" r="1.6" fill={c}/><path d="M13 5.5l4 0" stroke={c} strokeWidth="1.4"/><circle cx="9.5" cy="13" r="1.1" fill="#000"/><circle cx="14.5" cy="13" r="1.1" fill="#000"/><path d="M9.5 16c1.6 1 3.4 1 5 0" stroke="#000" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>;
    case "youtube":
      return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="3" fill={c}/><path d="M10 9l5.5 3-5.5 3z" fill="#000"/></svg>;
    case "phone":
      return <svg {...common}><path d="M5 4l4 1 1 4-2 2a12 12 0 005 5l2-2 4 1 1 4c0 1-1 2-2 2A17 17 0 013 6c0-1 1-2 2-2z" fill={c}/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="7" fill={c}/></svg>;
  }
};

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const BatteryIcon = () => (
  <svg width="22" height="11" viewBox="0 0 22 11" fill="white">
    <rect x="0" y="1" width="18" height="9" rx="2" stroke="white" strokeWidth="1" fill="none"/>
    <rect x="18.5" y="3.5" width="2" height="4" rx="1" fill="white"/>
    <rect x="1.5" y="2.5" width="12" height="6" rx="1.5" fill="white"/>
  </svg>
);
// Android Jelly Bean battery — vertical orientation (cap on top), drains from the top.
const BatteryIconVertical = ({level=0.66}) => {
  const innerTop = 3, innerH = 10;
  const fillH = Math.max(1, innerH * level);
  const fillY = innerTop + (innerH - fillH);
  return (
    <svg width="8" height="15" viewBox="0 0 8 15" fill="none" style={{flexShrink:0}}>
      <rect x="2.5" y="0" width="3" height="1.8" rx="0.6" fill="white"/>
      <rect x="0.5" y="1.8" width="7" height="12.7" rx="1.2" stroke="white" strokeWidth="0.8" fill="none"/>
      <rect x="1.5" y={fillY} width="5" height={fillH} rx="0.6" fill="white"/>
    </svg>
  );
};
const SignalIcon = () => (
  <svg width="17" height="12" viewBox="0 0 17 12" fill="white">
    {[0,1,2,3].map(i=><rect key={i} x={i*4} y={12-(i+1)*3} width="3" height={(i+1)*3} rx="0.5" fill={i<3?"white":"rgba(255,255,255,0.35)"}/>)}
  </svg>
);
const WifiIcon = () => (
  <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
    <path d="M7.5 9.5 L7.5 9.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5 7.5 Q7.5 5.5 10 7.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <path d="M2.5 5 Q7.5 1 12.5 5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  </svg>
);

export { AndroidNotifIcon, BatteryIcon, BatteryIconVertical, SignalIcon, WifiIcon };
