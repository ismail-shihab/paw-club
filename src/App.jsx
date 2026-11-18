import { useState, useEffect, useRef } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import { supabase } from "./supabase";
import logo from "./assets/logoo.png"; // replace this file when your new logo is ready
import introVideo from "./assets/intro_video.mp4"; // hero intro video

// Admin needs password + authenticator code. If you cannot get 2FA working yet, set this to false
// temporarily (and relax is_admin() in SQL, see the notes), then set it back to true.
const REQUIRE_MFA = true;
const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY;

const DEFAULT_CATEGORIES = ["Food", "Toys", "Beds & Trees", "Litter", "Grooming", "Accessories"];
const CITIES = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh", "Gazipur", "Narayanganj", "Other"];
const PHONE_RE = /^01[3-9]\d{8}$/;
const BADGES = ["", "Best Seller", "New", "Cat Favorite", "Hot Deal"];
const EMOJIS = ["🐟", "🍗", "🧶", "🐭", "🛏️", "🏠", "🪣", "🧼", "🧴", "🪮", "🎀", "🔔", "🥣", "🧳", "🐾", "🐱", "🦴", "🎣"];
const badgeColors = { "Best Seller": "#1E5B3A", New: "#D99A1E", "Cat Favorite": "#D9677A", "Hot Deal": "#C8642B" };
const catIcons = { Food: "🍗", Toys: "🧶", "Beds & Trees": "🛏️", Litter: "🪣", Grooming: "🪮", Accessories: "🎀" };

const PAYMENT_METHODS = [
  { id: "bkash", name: "bKash", color: "#E2136E", icon: "📱", number: "01XXXXXXXXX", needsTx: true },
  { id: "nagad", name: "Nagad", color: "#F6821F", icon: "💳", number: "01XXXXXXXXX", needsTx: true },
  { id: "bank", name: "Bank Transfer", color: "#1A5276", icon: "🏦", number: "Bank name · A/C: XXXX-XXXXXXXX", needsTx: true },
  { id: "cod", name: "Cash on Delivery", color: "#1E5B3A", icon: "💵", number: "Pay when delivered", needsTx: false },
];

const getDelivery = (city) => (!city ? 80 : city.trim().toLowerCase() === "dhaka" ? 80 : 150);
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
const pct = (p) => (p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0);
const load = (k, d) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch { return d; } };

// ---------- database <-> app shape ----------
const fromDb = (r) => ({ ...r, originalPrice: r.original_price, imageData: r.image_url });
const toDb = (p) => ({
  name: p.name, category: p.category, price: p.price, original_price: p.originalPrice,
  image: p.image, image_url: p.imageData || null, rating: p.rating, reviews: p.reviews,
  badge: p.badge || null, description: p.description,
});
const fromOrder = (o) => ({
  ...o,
  orderId: o.code,
  payment: { method: o.payment_method, txId: o.tx_id || "" },
  placedAt: new Date(o.created_at).getTime(),
});

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Quicksand:wght@500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#4A2E1A;--green:#1E5B3A;--green-l:#2E7D52;--accent:#EDBB4A;--accent-d:#1E5B3A;--lilac:#F6EDD3;--butter:#F7DB7A;--sky:#D3E8D8;--lav:#F3E8C8;--mint:#2E8B57;--bg:#FBF6E9;--border:#4A2E1A;--muted:#7A6650;--faint:#B5A58E;--danger:#C0392B;--pink:#F6C9CF;--cream:#FFFDF5;
--display:'Baloo 2',system-ui,sans-serif;--body:'Quicksand',system-ui,sans-serif;--pop:4px 4px 0 var(--ink)}
body{font-family:var(--body);font-weight:600;background:var(--bg) radial-gradient(#EFE3C0 1.5px,transparent 1.5px) 0 0/26px 26px;color:var(--ink)}
button,input,select,textarea{font-family:inherit;font-weight:600}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--green);outline-offset:2px}
.wrap{min-height:100vh;overflow-x:clip}
.hdr{background:#FBF6E9;position:sticky;top:0;z-index:100;border-bottom:3px solid var(--ink)}
.hdr-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:16px;padding:0 28px;height:76px}
.brand{display:flex;align-items:center;min-width:0;gap:10px;cursor:pointer;color:var(--green);font-family:var(--display);font-size:26px;font-weight:800;line-height:1}
.brand img{width:54px;height:54px;object-fit:contain;border-radius:16px;border:3px solid var(--ink);background:#fff}
.brand small{display:block;font-family:var(--body);font-size:12px;font-weight:700;color:var(--muted);margin-top:3px}
.search{flex:1;max-width:360px;margin:0 auto;background:#fff;border:3px solid var(--ink);border-radius:999px;padding:9px 18px;color:var(--ink);font-size:14px}
.search::placeholder{color:var(--faint)}
.nav{display:flex;gap:6px;align-items:center;margin-left:auto}
.nav-btn{background:none;border:3px solid transparent;color:var(--ink);padding:6px 14px;border-radius:999px;cursor:pointer;font-weight:700;font-size:14px}
.nav-btn:hover{background:var(--lilac)}.nav-btn.on{background:var(--butter);border-color:var(--ink)}
.cart-btn{background:var(--green);color:#FFF6D8;border:3px solid var(--ink);box-shadow:3px 3px 0 var(--ink);padding:7px 18px;border-radius:999px;font-weight:700;cursor:pointer;font-size:14px}
.cart-btn:hover{background:var(--green-l)}
.btn{background:var(--accent);color:var(--ink);border:3px solid var(--ink);box-shadow:var(--pop);padding:11px 26px;border-radius:999px;font-weight:700;font-size:15px;cursor:pointer;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink)}
.btn:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--ink)}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:var(--pop)}
.btn.ghost{background:#fff}.btn.ghost:hover{background:var(--lav)}
.btn.green{background:var(--green);color:#FFF6D8}.btn.block{width:100%}

.hero{position:relative;min-height:560px;display:flex;align-items:center;padding:64px 28px;border-bottom:3px solid var(--ink);overflow:hidden;background:#F6EBD3;color:var(--ink)}
.hero-video{position:absolute;top:0;right:0;width:70%;height:100%;object-fit:cover;pointer-events:none;-webkit-mask-image:linear-gradient(to right,transparent,#000 22%);mask-image:linear-gradient(to right,transparent,#000 22%)}
.hero-grid{position:relative;z-index:1;max-width:1200px;width:100%;margin:0 auto}
.hero-text{max-width:500px}
.hero h1{font-family:var(--display);font-size:56px;line-height:1.05;font-weight:800;margin-bottom:18px;color:var(--green)}
.hero p{color:var(--muted);font-size:18px;line-height:1.6;max-width:440px;margin-bottom:28px}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap}
.strip{background:var(--green);color:var(--butter);overflow:hidden;white-space:nowrap;border-bottom:3px solid var(--ink)}
.strip-in{display:inline-block;padding:10px 0;font-family:var(--display);font-size:17px;animation:slide 28s linear infinite}
.strip-in span{margin:0 22px}
@keyframes slide{to{transform:translateX(-50%)}}
.perks{background:#FFF0B8;border-bottom:3px solid var(--ink)}
.perks-in{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px 28px}
.perk{display:flex;gap:12px;align-items:center;padding:8px 10px;font-weight:700;font-size:15px}
.perk span{font-size:28px}.perk small{display:block;font-weight:600;color:var(--muted);font-size:12px}

.sec{max-width:1200px;margin:0 auto;padding:56px 28px}
.sec h2{font-family:var(--display);font-size:38px;font-weight:800;margin-bottom:4px;color:var(--green)}
.sec .sub{color:var(--muted);margin-bottom:28px}
.tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}
.tab{background:#fff;border:3px solid var(--ink);color:var(--ink);padding:6px 18px;border-radius:999px;cursor:pointer;font-weight:700;font-size:14px;box-shadow:2px 2px 0 var(--ink)}
.tab:hover{background:var(--lilac)}.tab.on{background:var(--green);color:#FFF6D8;transform:translate(2px,2px);box-shadow:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:26px}
.card{background:#fff;border:3px solid var(--ink);border-radius:28px;overflow:hidden;cursor:pointer;box-shadow:var(--pop);transition:transform .18s,box-shadow .18s}
.card:hover{transform:translate(-3px,-5px) rotate(-.6deg);box-shadow:8px 9px 0 var(--ink)}
.card-img{height:180px;display:flex;align-items:center;justify-content:center;font-size:72px;position:relative;overflow:hidden;border-bottom:3px solid var(--ink)}
.grid .card:nth-child(4n+1) .card-img{background:#F6DDB0}.grid .card:nth-child(4n+2) .card-img{background:var(--sky)}
.grid .card:nth-child(4n+3) .card-img{background:#FFF0B8}.grid .card:nth-child(4n+4) .card-img{background:var(--pink)}
.card-img img{width:100%;height:100%;object-fit:cover}
.badge{position:absolute;top:12px;left:12px;color:#fff;font-size:11px;font-weight:700;padding:4px 11px;border-radius:999px;border:2px solid var(--ink)}
.heart{position:absolute;top:10px;right:10px;background:#fff;border:2px solid var(--ink);border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:15px}
.heart:hover{transform:scale(1.15)}
.card-body{padding:16px 18px 18px}
.card-cat{font-size:12px;color:var(--green-l);font-weight:700;margin-bottom:4px}
.card-name{font-family:var(--display);font-weight:700;font-size:19px;line-height:1.2;margin-bottom:6px}
.rate{color:#E0A100;font-size:13px}.rate span{color:var(--muted);margin-left:6px}
.price-row{display:flex;align-items:baseline;gap:8px;margin:10px 0 12px}
.price{font-family:var(--display);font-size:24px;font-weight:800;color:var(--green)}
.old{color:var(--faint);text-decoration:line-through;font-size:13px}
.save{background:#DDEFE2;color:#17603C;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;border:2px solid #17603C}
.add{width:100%;background:#fff;color:var(--ink);border:3px solid var(--ink);padding:9px;border-radius:999px;font-weight:700;cursor:pointer}
.add:hover{background:var(--accent)}
.cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:20px}
.cat{background:#fff;border:3px solid var(--ink);border-radius:28px;padding:24px 14px;text-align:center;cursor:pointer;box-shadow:var(--pop);transition:transform .18s}
.cat:hover{transform:translateY(-6px) rotate(-2deg)}
.cats .cat:nth-child(5n+1){background:#F6DDB0}.cats .cat:nth-child(5n+2){background:var(--sky)}.cats .cat:nth-child(5n+3){background:#FFF0B8}.cats .cat:nth-child(5n+4){background:var(--pink)}.cats .cat:nth-child(5n+5){background:var(--lav)}
.cat div:first-child{font-size:44px;margin-bottom:6px}
.cat b{display:block;font-family:var(--display);font-size:18px}.cat small{color:var(--muted)}
.band{background:#fff;border-block:3px solid var(--ink)}

.detail{max-width:960px;margin:0 auto;padding:36px 28px}
.back{background:none;border:none;color:var(--muted);cursor:pointer;font-weight:700;margin-bottom:24px;font-size:14px}
.back:hover{color:var(--green)}
.dgrid{display:grid;grid-template-columns:1fr 1fr;gap:44px}
.dimg{background:#F6DDB0;border:3px solid var(--ink);box-shadow:8px 8px 0 var(--ink);border-radius:36px;height:340px;display:flex;align-items:center;justify-content:center;font-size:120px;overflow:hidden}
.dimg img{width:100%;height:100%;object-fit:cover}
.dname{font-family:var(--display);font-size:36px;font-weight:800;margin:6px 0 10px;line-height:1.1;color:var(--green)}
.ddesc{color:var(--muted);line-height:1.7;margin:14px 0 20px}
.qty{display:flex;align-items:center;border:3px solid var(--ink);border-radius:999px;overflow:hidden;background:#fff}
.qty button{background:var(--butter);border:none;width:36px;height:36px;cursor:pointer;font-size:18px;font-weight:700;color:var(--ink)}
.qty span{width:38px;text-align:center;font-weight:700}
.row{display:flex;gap:12px;align-items:center}

.cart{max-width:800px;margin:0 auto;padding:40px 28px}
.steps{display:flex;border:3px solid var(--ink);border-radius:999px;overflow:hidden;margin:20px 0 28px;background:#fff}
.step{flex:1;text-align:center;padding:10px 6px;font-size:13px;font-weight:700;color:var(--muted)}
.step.on{background:var(--butter);color:var(--ink)}.step.done{background:var(--green);color:var(--butter)}
.item{display:flex;align-items:center;gap:14px;background:#fff;border:3px solid var(--ink);border-radius:22px;padding:14px;margin-bottom:14px;box-shadow:3px 3px 0 var(--ink)}
.item-img{width:62px;height:62px;border-radius:16px;background:#F6DDB0;border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;font-size:32px;overflow:hidden;flex-shrink:0}
.item-img img{width:100%;height:100%;object-fit:cover}
.box{background:#fff;border:3px solid var(--ink);border-radius:26px;padding:22px;margin-bottom:18px;box-shadow:var(--pop)}
.box h4{font-family:var(--display);font-size:19px;margin-bottom:10px;color:var(--green)}
.srow{display:flex;justify-content:space-between;margin-bottom:9px;font-size:14px;color:var(--muted)}
.stot{display:flex;justify-content:space-between;font-weight:700;font-size:19px;border-top:3px dashed var(--ink);padding-top:12px;margin-top:6px;color:var(--ink)}
label.l{display:block;font-size:13px;font-weight:700;margin-bottom:6px}
.inp{width:100%;border:3px solid var(--ink);border-radius:16px;padding:10px 14px;font-size:15px;background:#fff;color:var(--ink);margin-bottom:14px;display:block}
.inp:focus{background:#FFFBE8}
.pay{display:flex;align-items:center;gap:14px;border:3px solid var(--ink);border-radius:20px;padding:12px 18px;margin-bottom:12px;cursor:pointer;background:#fff}
.pay:hover{background:var(--lilac)}.pay.on{background:var(--butter);box-shadow:3px 3px 0 var(--ink)}
.note{border:3px dashed var(--ink);border-radius:20px;padding:14px 18px;margin-bottom:14px;font-size:14px;line-height:1.7;background:var(--lav)}
.empty{text-align:center;padding:70px 0;color:var(--muted)}
.empty div:first-child{font-size:60px;margin-bottom:12px}
.empty b{display:block;color:var(--ink);font-family:var(--display);font-size:22px;margin-bottom:6px}
.empty .btn{margin-top:18px}
.rhead{background:var(--green);color:#FFF6D8;text-align:center;padding:30px;border:3px solid var(--ink);border-radius:30px 30px 0 0}
.rhead .ok{width:62px;height:62px;border-radius:50%;background:var(--butter);color:var(--ink);border:3px solid var(--ink);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:28px}
.rhead h2{font-family:var(--display);font-size:32px}
.rbody{background:#fff;border:3px solid var(--ink);border-top:none;border-radius:0 0 30px 30px;padding:26px 30px;margin-bottom:24px;box-shadow:var(--pop)}
.oid{background:var(--butter);border:3px dashed var(--ink);border-radius:18px;text-align:center;padding:10px;margin-bottom:20px;font-family:var(--display);font-size:26px;font-weight:800}
.toast{position:fixed;bottom:26px;right:26px;background:var(--ink);color:#fff;padding:12px 22px;border-radius:999px;font-weight:700;z-index:9999;display:flex;gap:10px;align-items:center;animation:up .25s ease;border:3px solid #fff;box-shadow:var(--pop)}
.toast i{width:9px;height:9px;border-radius:50%;display:block}
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

.foot{background:var(--green);color:#E6EBD9;padding:52px 28px 24px;margin-top:70px;border-top:3px solid var(--ink)}
.foot-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2fr 1.5fr 1fr 1fr;gap:36px;padding-bottom:32px;border-bottom:2px dashed rgba(255,255,255,.25)}
.foot h5{color:var(--butter);font-family:var(--display);font-size:19px;margin-bottom:12px}
.foot a,.foot p{display:block;font-size:14px;line-height:1.9;cursor:pointer}
.foot a:hover{color:var(--butter)}
.foot-b{max-width:1200px;margin:20px auto 0;font-size:13px}

.login{min-height:100vh;background:var(--lav);display:flex;align-items:center;justify-content:center;padding:24px}
.login-card{background:#fff;border:3px solid var(--ink);box-shadow:8px 8px 0 var(--ink);border-radius:32px;padding:40px;width:100%;max-width:380px}
.login-card h2{font-family:var(--display);margin:8px 0 20px;color:var(--green)}
.adm{min-height:100vh;background:var(--bg)}
.adm-h{background:var(--butter);border-bottom:3px solid var(--ink);height:68px;padding:0 28px;display:flex;align-items:center;justify-content:space-between}
.adm-c{max-width:1100px;margin:0 auto;padding:36px 28px}
.adm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.stat{background:#fff;border:3px solid var(--ink);border-radius:22px;padding:16px 20px;box-shadow:3px 3px 0 var(--ink)}
.stat small{color:var(--muted);font-weight:700}.stat div{font-family:var(--display);font-size:30px;font-weight:800;color:var(--green)}
.tbl{background:#fff;border:3px solid var(--ink);border-radius:22px;overflow:auto;box-shadow:var(--pop)}
table{width:100%;border-collapse:collapse;min-width:640px}
th{background:var(--lilac);font-size:12px;text-align:left;padding:12px 16px;color:var(--ink)}
td{padding:12px 16px;border-top:2px solid var(--lilac);font-size:14px}
.sm{border:2px solid var(--ink);padding:5px 12px;border-radius:999px;font-weight:700;font-size:12px;cursor:pointer;margin-right:6px;color:var(--ink)}
.sm.e{background:var(--lav)}.sm.d{background:#F7D4C8}.sm.v{background:#DDEFE2}
.modal{position:fixed;inset:0;background:rgba(74,46,26,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
.mbox{background:#fff;border:3px solid var(--ink);box-shadow:8px 8px 0 var(--ink);border-radius:30px;padding:30px;width:100%;max-width:540px;max-height:90vh;overflow:auto}
.mbox h3{font-family:var(--display);font-size:26px;margin-bottom:18px;color:var(--green)}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}.mgrid .full{grid-column:span 2}
.emoji{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;background:var(--lilac);padding:8px;border-radius:16px;margin-bottom:14px}
.emoji span{font-size:22px;text-align:center;padding:5px;border-radius:10px;cursor:pointer;border:2px solid transparent}
.emoji span.on{background:#fff;border-color:var(--ink)}

.burger{display:none;position:relative;z-index:300;background:#fff;border:3px solid var(--ink);box-shadow:2px 2px 0 var(--ink);width:44px;height:44px;border-radius:14px;font-size:20px;cursor:pointer;line-height:1;flex-shrink:0}
.dsearch,.only-m,.scrim{display:none}
.admin-btn{opacity:.35}
.item-info{flex:1;min-width:0}

@media(max-width:900px){
.dgrid{grid-template-columns:1fr}.hero h1{font-size:40px}
.hero{min-height:0;align-items:flex-start;padding:36px 16px calc(56.25vw + 20px)}
.hero-video{top:auto;bottom:0;left:0;right:auto;width:100%;height:auto;aspect-ratio:16/9;-webkit-mask-image:linear-gradient(to bottom,transparent,#000 18%);mask-image:linear-gradient(to bottom,transparent,#000 18%)}
.hero-text{max-width:100%}
.perks-in,.foot-grid,.adm-stats{grid-template-columns:1fr 1fr}.mgrid{grid-template-columns:1fr}.mgrid .full{grid-column:span 1}
.search{display:none}
.hdr-in{height:68px;gap:10px;padding:0 14px}
.brand{flex:1;font-size:22px}.brand img{width:44px;height:44px;border-radius:12px}
.cart-btn{padding:8px 14px}
.burger{display:block}
.nav{position:fixed;top:0;right:0;bottom:0;width:min(82%,320px);margin:0;background:var(--bg);border-left:3px solid var(--ink);box-shadow:-6px 0 0 var(--ink);flex-direction:column;align-items:stretch;gap:8px;padding:84px 18px 24px;overflow-y:auto;transform:translateX(110%);visibility:hidden;transition:transform .25s ease,visibility .25s;z-index:200}
.nav.open{transform:none;visibility:visible}
.nav-btn{text-align:left;font-size:16px;padding:12px 16px;border-color:var(--ink);background:#fff}
.nav-btn.on{background:var(--butter)}
.dsearch{display:block;margin:0 0 6px}
.only-m{display:inline}
.admin-btn{opacity:1;margin-top:auto}
.scrim.show{display:block;position:fixed;inset:0;background:rgba(74,46,26,.5);z-index:150}
.sec{padding:40px 16px}}
@media(max-width:560px){
.perks-in,.foot-grid{grid-template-columns:1fr}.brand small{display:none}
.brand{font-size:20px}.cart-btn{font-size:13px;padding:8px 12px}
.hero h1{font-size:34px}.hero p{font-size:16px;margin-bottom:20px}
.hero-btns .btn{flex:1;padding:11px 12px;font-size:14px;white-space:nowrap}
.perk{padding:4px 6px}
.sec{padding:32px 14px}.sec h2{font-size:28px}
.tabs{flex-wrap:nowrap;overflow-x:auto;margin-inline:-14px;padding:2px 14px 8px}.tab{white-space:nowrap;flex-shrink:0}
.grid{grid-template-columns:1fr 1fr;gap:12px}
.card{border-radius:20px;box-shadow:3px 3px 0 var(--ink)}
.card-img{height:128px;font-size:52px}
.badge{font-size:10px;padding:3px 8px;top:8px;left:8px}.heart{width:30px;height:30px;font-size:13px;top:8px;right:8px}
.card-body{padding:10px 12px 12px}.card-cat{font-size:11px}.card-name{font-size:15px}.rate{font-size:11px}
.price-row{flex-wrap:wrap;gap:2px 6px;margin:6px 0 10px}.price{font-size:18px}.old{font-size:11px}.save{font-size:10px;padding:1px 6px}
.add{font-size:13px;padding:7px}
.cats{grid-template-columns:1fr 1fr;gap:12px}.cat{padding:16px 8px;border-radius:20px}.cat div:first-child{font-size:36px}.cat b{font-size:16px}
.detail{padding:20px 16px}.dgrid{gap:22px}.dimg{height:250px;font-size:90px;box-shadow:5px 5px 0 var(--ink);border-radius:26px}.dname{font-size:28px}
.cart{padding:24px 14px}.step{font-size:11px;padding:8px 2px}
.item{flex-wrap:wrap;gap:10px;padding:12px}.item-info{flex:1 1 calc(100% - 80px)}.item .qty{margin-right:auto}
.box{padding:16px}.rhead{padding:22px 14px}.rhead h2{font-size:26px}.rbody{padding:18px 14px}.oid{font-size:20px}
.foot{padding:36px 16px 20px}
.toast{left:14px;right:14px;bottom:14px;justify-content:center}
.mbox{padding:20px}.emoji{grid-template-columns:repeat(6,1fr)}.login-card{padding:28px}
.adm-h{height:auto;padding:10px 14px;flex-wrap:wrap;gap:8px}.adm-c{padding:20px 14px}.adm-c .row{flex-wrap:wrap}}
`;

const Img = ({ p }) => (p.imageData ? <img src={p.imageData} alt={p.name} /> : <span>{p.image}</span>);

function Card({ p, onView, onAdd, wish, toggle }) {
  const off = pct(p);
  return (
    <div className="card" onClick={onView}>
      <div className="card-img">
        <Img p={p} />
        {p.badge && <span className="badge" style={{ background: badgeColors[p.badge] || "#C8642B" }}>{p.badge}</span>}
        <button className="heart" aria-label="Wishlist" onClick={(e) => { e.stopPropagation(); toggle(p.id); }}>{wish.includes(p.id) ? "❤️" : "🤍"}</button>
      </div>
      <div className="card-body">
        <div className="card-cat">{p.category}</div>
        <div className="card-name">{p.name}</div>
        <div className="rate">{stars(p.rating)}<span>({p.reviews})</span></div>
        <div className="price-row">
          <span className="price">৳{p.price.toLocaleString()}</span>
          {off > 0 && <span className="old">৳{p.originalPrice.toLocaleString()}</span>}
          {off > 0 && <span className="save">−{off}%</span>}
        </div>
        <button className="add" onClick={(e) => { e.stopPropagation(); onAdd(); }}>Add to cart</button>
      </div>
    </div>
  );
}

// Shrinks a photo in the browser before upload (max 800px, WebP) so it stays well under the 1 MB limit.
const compress = async (file, max = 800) => {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/webp", 0.8));
};

function ProductModal({ product, onSave, onClose, categories }) {
  const [f, setF] = useState(product ? { ...product } : { name: "", category: categories[0], price: "", originalPrice: "", image: "🐾", rating: 4.5, reviews: 0, badge: "", description: "" });
  const [newCat, setNewCat] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const upload = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const blob = await compress(file);
      const path = `${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/webp" });
      if (error) { alert("Upload failed: " + error.message); return; }
      set("imageData", supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      alert("Could not process that image.");
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    const price = Math.round(+f.price), originalPrice = Math.round(+f.originalPrice);
    if (!f.name || !f.category || !(price > 0) || !(originalPrice > 0)) return alert("Please fill name, category and both prices.");
    if (originalPrice < price) return alert("Original price must be the same as or higher than the sale price.");
    onSave({ ...f, price, originalPrice, rating: +f.rating, reviews: Math.round(+f.reviews) || 0, badge: f.badge || null });
  };
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        <h3>{product ? "Edit product" : "Add product"}</h3>
        <div className="mgrid">
          <div className="full"><label className="l">Name *</label><input className="inp" maxLength={120} value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div>
            <label className="l">Category *</label>
            {newCat ? (
              <input className="inp" autoFocus maxLength={40} placeholder="New category name" value={f.category} onChange={(e) => set("category", e.target.value)} />
            ) : (
              <select className="inp" value={f.category} onChange={(e) => e.target.value === "__n" ? (setNewCat(true), set("category", "")) : set("category", e.target.value)}>
                {categories.map((c) => <option key={c}>{c}</option>)}
                <option value="__n">＋ New category…</option>
              </select>
            )}
          </div>
          <div><label className="l">Badge</label><select className="inp" value={f.badge || ""} onChange={(e) => set("badge", e.target.value)}>{BADGES.map((b) => <option key={b} value={b}>{b || "None"}</option>)}</select></div>
          <div><label className="l">Sale price (৳) *</label><input className="inp" type="number" min="1" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
          <div><label className="l">Original price (৳) *</label><input className="inp" type="number" min="1" value={f.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} /></div>
          <div className="full"><label className="l">Description</label><textarea className="inp" rows={3} maxLength={1000} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="full">
            <label className="l">Image</label>
            <div className="emoji">{EMOJIS.map((em) => <span key={em} className={!f.imageData && f.image === em ? "on" : ""} onClick={() => { set("image", em); set("imageData", null); }}>{em}</span>)}</div>
            <div className="row" style={{ marginBottom: 14 }}>
              <button className="sm e" disabled={busy} onClick={() => fileRef.current.click()}>{busy ? "Uploading…" : "📷 Upload photo"}</button>
              {f.imageData && <><img src={f.imageData} alt="" style={{ height: 44, borderRadius: 8 }} /><button className="sm d" onClick={() => set("imageData", null)}>Remove</button></>}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { upload(e.target.files[0]); e.target.value = ""; }} />
            </div>
          </div>
        </div>
        <div className="row"><button className="btn ghost block" onClick={onClose}>Cancel</button><button className="btn block" disabled={busy} onClick={save}>{product ? "Save changes" : "Add product"}</button></div>
      </div>
    </div>
  );
}

const STATUS = { Pending: "#D99A1E", Processing: "#7A4FE0", Delivered: "#1E5B3A", Cancelled: "#C0392B" };

function OrderModal({ order, onClose, onStatus }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        <h3>Order {order.orderId}</h3>
        <div className="row" style={{ flexWrap: "wrap", marginBottom: 18 }}>
          {Object.keys(STATUS).map((s) => (
            <button key={s} className="sm" onClick={() => onStatus(order.orderId, s)} style={{ border: `2px solid ${STATUS[s]}`, background: order.status === s ? STATUS[s] : "transparent", color: order.status === s ? "#fff" : STATUS[s] }}>{s}</button>
          ))}
        </div>
        <div className="note"><b>{order.customer.name}</b><br />📞 {order.customer.phone}<br />{order.customer.address}, {order.customer.city}</div>
        <div className="note">Payment: <b>{order.payment.method}</b>{order.payment.txId && <> · Trx: <b style={{ color: "var(--mint)" }}>{order.payment.txId}</b></>}</div>
        {order.items.map((i, k) => <div key={k} className="srow"><span>{i.image} {i.name} × {i.qty}</span><span>৳{(i.price * i.qty).toLocaleString()}</span></div>)}
        <div className="srow"><span>Delivery ({order.customer.city})</span><span>৳{order.delivery}</span></div>
        <div className="stot"><span>Total</span><span>৳{order.total.toLocaleString()}</span></div>
        <button className="btn block" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function Admin({ products, setProducts, orders, setOrders, onLogout }) {
  const nav = useNavigate();
  const tab = useLocation().pathname.startsWith("/admin/orders") ? "orders" : "products";
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const cats = [...new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)])];
  const fp = products.filter((p) => (p.name + p.category).toLowerCase().includes(q.toLowerCase()));
  const fo = orders.filter((o) => (o.orderId + o.customer.name + o.customer.phone).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.placedAt - a.placedAt);

  const save = async (p) => {
    const isNew = modal === "add";
    const { data, error } = isNew
      ? await supabase.from("products").insert(toDb(p)).select().single()
      : await supabase.from("products").update(toDb(p)).eq("id", p.id).select().single();
    if (error) return alert("Could not save: " + error.message);
    const saved = fromDb(data);
    setProducts((prev) => (isNew ? [...prev, saved] : prev.map((x) => (x.id === saved.id ? saved : x))));
    setModal(null);
  };
  const removeProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return alert("Could not delete: " + error.message);
    setProducts((prev) => prev.filter((x) => x.id !== id));
  };
  const status = async (code, s) => {
    const { error } = await supabase.from("orders").update({ status: s }).eq("code", code);
    if (error) return alert("Could not update status: " + error.message);
    setOrders((prev) => prev.map((o) => (o.orderId === code ? { ...o, status: s } : o)));
    setSel((o) => (o && o.orderId === code ? { ...o, status: s } : o));
  };

  const pending = orders.filter((o) => o.status === "Pending").length;
  return (
    <div className="adm">
      {modal && <ProductModal product={modal === "add" ? null : modal} onSave={save} onClose={() => setModal(null)} categories={cats} />}
      {sel && <OrderModal order={sel} onClose={() => setSel(null)} onStatus={status} />}
      <div className="adm-h">
        <div className="row"><b style={{ fontFamily: "var(--display)", fontSize: 18 }}>Paw Club admin</b>
          <button className={`nav-btn ${tab === "products" ? "on" : ""}`} onClick={() => { nav("/admin/products"); setQ(""); }}>Products</button>
          <button className={`nav-btn ${tab === "orders" ? "on" : ""}`} onClick={() => { nav("/admin/orders"); setQ(""); }}>Orders{pending > 0 && ` (${pending})`}</button>
        </div>
        <button className="nav-btn" onClick={onLogout}>Sign out</button>
      </div>
      <div className="adm-c">
        <div className="adm-stats">
          {(tab === "products"
            ? [["Products", products.length], ["Categories", cats.length], ["On sale badges", products.filter((p) => p.badge).length], ["Avg. rating", (products.reduce((s, p) => s + p.rating, 0) / (products.length || 1)).toFixed(1)]]
            : [["Orders", orders.length], ["Pending", pending], ["Processing", orders.filter((o) => o.status === "Processing").length], ["Delivered", orders.filter((o) => o.status === "Delivered").length]]
          ).map(([l, v]) => <div key={l} className="stat"><small>{l}</small><div>{v}</div></div>)}
        </div>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
          <input className="inp" style={{ maxWidth: 300, margin: 0 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          {tab === "products" && <button className="btn" onClick={() => setModal("add")}>＋ Add product</button>}
        </div>
        <div className="tbl">
          {tab === "products" ? (
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Badge</th><th>Actions</th></tr></thead>
              <tbody>
                {fp.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.image} {p.name}</b></td><td>{p.category}</td>
                    <td>৳{p.price.toLocaleString()} <s style={{ color: "var(--faint)" }}>৳{p.originalPrice.toLocaleString()}</s></td>
                    <td>{p.badge || "—"}</td>
                    <td><button className="sm e" onClick={() => setModal(p)}>Edit</button><button className="sm d" onClick={() => removeProduct(p.id)}>Delete</button></td>
                  </tr>
                ))}
                {fp.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--faint)" }}>No products match your search.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {fo.map((o) => (
                  <tr key={o.orderId}>
                    <td><b style={{ color: "var(--green)" }}>{o.orderId}</b><br /><small>{new Date(o.placedAt).toLocaleDateString()}</small></td>
                    <td>{o.customer.name}<br /><small>📞 {o.customer.phone} · {o.customer.city}</small></td>
                    <td><b>৳{o.total.toLocaleString()}</b></td><td>{o.payment.method}{o.payment.txId && <><br /><small>{o.payment.txId}</small></>}</td>
                    <td><span style={{ color: STATUS[o.status], fontWeight: 700 }}>{o.status}</span></td>
                    <td><button className="sm v" onClick={() => setSel(o)}>View</button></td>
                  </tr>
                ))}
                {fo.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--faint)" }}>No orders yet. New orders will show up here.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Admin sign in: email + password, then a 6-digit code from your authenticator app.
// The first time, it shows a QR code so you can link your authenticator app.
function AdminGate({ onDone, onBack }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("login"); // login | enroll | verify
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [fid, setFid] = useState("");
  const [busy, setBusy] = useState(false);

  const startMfa = async () => {
    const { data: f, error } = await supabase.auth.mfa.listFactors();
    if (error) return setMsg(error.message);
    const verified = f?.totp?.[0];
    if (verified) { setFid(verified.id); setStage("verify"); return; }
    // remove half-finished enrollments from earlier attempts
    for (const x of f?.all ?? []) {
      if (x.factor_type === "totp" && x.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: x.id });
    }
    const { data, error: e2 } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "admin-" + Date.now() });
    if (e2) return setMsg("Could not start 2FA setup: " + e2.message);
    setFid(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStage("enroll");
  };

  // If you are already signed in with a password but have not entered the code yet, continue from there.
  useEffect(() => {
    if (!REQUIRE_MFA) return;
    supabase.auth.getSession().then(({ data }) => { if (data.session) startMfa(); });
  }, []);

  const login = async () => {
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false); setPw("");
    if (error) return setMsg("Wrong email or password.");
    if (!REQUIRE_MFA) return onDone();
    await startMfa();
  };
  const verify = async () => {
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fid, code: code.trim() });
    setBusy(false);
    if (error) { setCode(""); return setMsg("Wrong or expired code. Try again."); }
    onDone();
  };
  const switchAccount = async () => { await supabase.auth.signOut(); setStage("login"); setMsg(""); setCode(""); };

  return (
    <div className="login"><div className="login-card">
      <div style={{ fontSize: 40 }}>🐾</div><h2>Admin sign in</h2>
      {msg && <p style={{ color: "#C0392B", marginBottom: 10 }}>{msg}</p>}
      {stage === "login" && <>
        <input className="inp" type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="inp" type="password" placeholder="Password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
        <button className="btn block" disabled={busy} onClick={login}>{busy ? "Signing in…" : "Continue"}</button>
      </>}
      {stage === "enroll" && <>
        <p style={{ marginBottom: 10, lineHeight: 1.6 }}>One-time setup: scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
        <img src={qr} alt="Authenticator QR code" style={{ width: "100%", marginBottom: 8 }} />
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, wordBreak: "break-all" }}>Can't scan? Enter this key manually: <b>{secret}</b></p>
      </>}
      {stage === "verify" && <p style={{ marginBottom: 10 }}>Enter the 6-digit code from your authenticator app.</p>}
      {(stage === "enroll" || stage === "verify") && <>
        <input className="inp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && verify()} />
        <button className="btn block" disabled={busy || code.length !== 6} onClick={verify}>{busy ? "Checking…" : "Verify"}</button>
        <button className="nav-btn" style={{ marginTop: 10 }} onClick={switchAccount}>Use a different account</button>
      </>}
      <button className="nav-btn" style={{ marginTop: 10 }} onClick={onBack}>Back to shop</button>
    </div></div>
  );
}

const shopLink = (c) => (c && c !== "All" ? `/shop?category=${encodeURIComponent(c)}` : "/shop");

function ProductPage({ products, loaded, wish, toggle, add }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  useEffect(() => setQty(1), [id]);
  const selected = products.find((p) => String(p.id) === id);
  if (!loaded) return <div className="sec"><div className="empty"><div>🐾</div><b>Loading…</b></div></div>;
  if (!selected)
    return <div className="sec"><div className="empty"><div>😿</div><b>Product not found</b>It may have been removed.<br /><button className="btn" onClick={() => nav("/shop")}>Browse products</button></div></div>;
  const off = pct(selected);
  return (
    <div className="detail">
      <button className="back" onClick={() => nav("/shop")}>← Back to products</button>
      <div className="dgrid">
        <div className="dimg"><Img p={selected} /></div>
        <div>
          <div className="card-cat">{selected.category}</div>
          <h2 className="dname">{selected.name}</h2>
          <div className="rate">{stars(selected.rating)}<span>{selected.rating} · {selected.reviews} reviews</span></div>
          <p className="ddesc">{selected.description}</p>
          <div className="price-row" style={{ marginBottom: 22 }}>
            <span className="price" style={{ fontSize: 34 }}>৳{selected.price.toLocaleString()}</span>
            {off > 0 && <span className="old">৳{selected.originalPrice.toLocaleString()}</span>}
            {off > 0 && <span className="save">Save {off}%</span>}
          </div>
          <div className="row" style={{ marginBottom: 20 }}><b>Quantity</b><div className="qty"><button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button><span>{qty}</span><button onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button></div></div>
          <div className="row"><button className="btn block" onClick={() => add(selected, qty)}>Add to cart</button><button className="btn ghost block" onClick={() => { add(selected, qty); nav("/cart"); }}>Buy now</button></div>
          <button className="back" style={{ marginTop: 14, marginBottom: 0 }} onClick={() => toggle(selected.id)}>{wish.includes(selected.id) ? "❤️ Saved to wishlist" : "🤍 Add to wishlist"}</button>
        </div>
      </div>
    </div>
  );
}

// Confirmation page: reads the order through the safe get_order() database function.
// It only returns the name and city, never the full phone number or street address.
function OrderPage() {
  const { orderId } = useParams();
  const nav = useNavigate();
  const [done, setDone] = useState(undefined); // undefined = loading, null = not found
  useEffect(() => {
    supabase.rpc("get_order", { oid: orderId }).then(({ data, error }) => setDone(error ? null : data?.[0] ?? null));
  }, [orderId]);
  if (done === undefined)
    return <div className="cart"><div className="empty"><div>🧾</div><b>Loading your order…</b></div></div>;
  if (!done)
    return <div className="cart"><div className="empty"><div>🧾</div><b>Order not found</b>We couldn't find that order.<br /><button className="btn" onClick={() => nav("/")}>Go home</button></div></div>;
  return (
    <div className="cart">
      <div className="receipt" style={{ padding: 0 }}>
        <div className="rhead"><div className="ok">✓</div><h2>Order placed</h2><p style={{ color: "#E6EBD9" }}>Thank you for shopping with Paw Club</p></div>
        <div className="rbody">
          <div className="oid">{done.code}</div>
          <div className="box"><h4>Delivering to</h4><div style={{ lineHeight: 1.8 }}><b>{done.name}</b> · {done.city}</div></div>
          <div className="box"><h4>Items</h4>
            {done.items.map((i, k) => <div key={k} className="srow"><span>{i.image} {i.name} × {i.qty}</span><span>৳{(i.price * i.qty).toLocaleString()}</span></div>)}
            <div className="srow"><span>Delivery</span><span>৳{done.delivery}</span></div>
            <div className="stot"><span>Total</span><span style={{ color: "var(--green)" }}>৳{done.total.toLocaleString()}</span></div>
          </div>
          <div className="srow"><span>Payment</span><b>{done.payment_method}</b></div>
          <p style={{ marginTop: 14, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>We will call the phone number you gave us to confirm. Expected delivery: 2–4 business days. Keep your order code <b>{done.code}</b> handy.</p>
        </div>
        <button className="btn block" onClick={() => nav("/")}>Continue shopping</button>
      </div>
    </div>
  );
}

function PawClubApp() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [sp] = useSearchParams();
  const category = sp.get("category") || "All";

  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [orders, setOrders] = useState([]);
  const [session, setSession] = useState(null);
  const [aal, setAal] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState(() => load("pc_cart", []));
  const [wish, setWish] = useState(() => load("pc_wish", []));
  const [search, setSearch] = useState("");
  const [pm, setPm] = useState("");
  const [txId, setTxId] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "" });
  const [toast, setToast] = useState(null);
  const [menu, setMenu] = useState(false); // mobile side menu
  const [token, setToken] = useState(""); // Turnstile bot-check token
  const [tsKey, setTsKey] = useState(0);
  const [placing, setPlacing] = useState(false);

  // load products for everyone
  useEffect(() => {
    supabase.from("products").select("*").order("id").then(({ data, error }) => {
      if (error) setLoadErr(true); else setProducts(data.map(fromDb));
      setLoaded(true);
    });
  }, []);

  // keep cart prices in sync with the database (and drop products that no longer exist)
  useEffect(() => {
    if (!loaded) return;
    setCart((c) => c.flatMap((i) => { const p = products.find((x) => x.id === i.id); return p ? [{ ...p, qty: i.qty }] : []; }));
  }, [loaded]);

  // admin session tracking
  const refreshAuth = async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    setSession(s);
    if (!s) setAal(null);
    else {
      const { data: a } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setAal(a?.currentLevel ?? null);
    }
    setAuthReady(true);
  };
  useEffect(() => {
    refreshAuth();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { setTimeout(refreshAuth, 0); });
    return () => sub.subscription.unsubscribe();
  }, []);
  const authed = !!session && (!REQUIRE_MFA || aal === "aal2");

  // orders are only fetched once the admin is fully signed in (the database enforces this too)
  useEffect(() => {
    if (!authed) { setOrders([]); return; }
    supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setOrders(data.map(fromOrder)));
  }, [authed]);

  useEffect(() => { try { localStorage.setItem("pc_cart", JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { try { localStorage.setItem("pc_wish", JSON.stringify(wish)); } catch {} }, [wish]);
  useEffect(() => { window.scrollTo(0, 0); setMenu(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = menu ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [menu]);
  useEffect(() => { const el = document.createElement("style"); el.innerHTML = CSS; document.head.appendChild(el); return () => document.head.removeChild(el); }, []);

  const notify = (msg, color = "#2E8B57") => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };
  const cats = [...new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)])];
  const delivery = getDelivery(form.city);
  const shown = products.filter((p) => (category === "All" || p.category === category) && (p.name + p.category).toLowerCase().includes(search.toLowerCase()));
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = subtotal + delivery;

  const add = (p, n = 1) => { setCart((c) => c.find((i) => i.id === p.id) ? c.map((i) => (i.id === p.id ? { ...i, qty: Math.min(20, i.qty + n) } : i)) : [...c, { ...p, qty: n }]); notify(`${p.name} added to cart`); };
  const setQ = (id, q) => setCart((c) => (q < 1 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, qty: Math.min(20, q) } : i))));
  const toggle = (id) => setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  const go = (path) => { nav(path); setMenu(false); };
  const view = (p) => nav(`/product/${p.id}`);

  // The server recalculates every price. We only send product ids and quantities.
  const place = async () => {
    if (placing) return;
    setPlacing(true);
    const { data, error } = await supabase.functions.invoke("hyper-worker", {
      body: {
        items: cart.map(({ id, qty }) => ({ id, qty })),
        customer: { name: form.name, phone: form.phone, address: form.address, city: form.city },
        payment: { method: pm, txId },
        turnstileToken: token,
      },
    });
    setPlacing(false);
    setToken(""); setTsKey((k) => k + 1); // bot-check tokens work only once
    if (error || !data?.id) {
      let msg = "Could not place the order. Please try again.";
      try { const j = await error?.context?.json?.(); if (j?.error) msg = j.error; } catch {}
      return notify(msg, "#C0392B");
    }
    setCart([]); setPm(""); setTxId("");
    nav(`/order/${data.id}`, { replace: true });
  };

  // ---------- Admin pages: /admin, /admin/products, /admin/orders ----------
  if (pathname.startsWith("/admin")) {
    if (!authReady) return <div className="login"><div className="login-card"><h2>Loading…</h2></div></div>;
    if (!authed) return <AdminGate onDone={refreshAuth} onBack={() => nav("/")} />;
    if (pathname.replace(/\/+$/, "") === "/admin") return <Navigate to="/admin/products" replace />;
    return <Admin products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} onLogout={async () => { await supabase.auth.signOut(); nav("/"); }} />;
  }

  const grid = (list) => <div className="grid">{list.map((p) => <Card key={p.id} p={p} onView={() => view(p)} onAdd={() => add(p)} wish={wish} toggle={toggle} />)}</div>;
  const loadingBox = <div className="empty"><div>🐾</div><b>Loading products…</b></div>;
  const errorBox = <div className="empty"><div>😿</div><b>Couldn't load products</b>Please check your connection and refresh the page.</div>;

  // ---------- Home: / ----------
  const homeEl = (
    <>
      <section className="hero">
        <video className="hero-video" src={introVideo} autoPlay loop muted playsInline preload="auto" aria-hidden="true" tabIndex={-1} disablePictureInPicture />
        <div className="hero-grid"><div className="hero-text">
          <h1>Treats, toys and naps your cat will approve of 🐾</h1>
          <p>Food, play, beds and grooming picked by cat people. Delivered across Bangladesh.</p>
          <div className="hero-btns"><button className="btn" onClick={() => go("/shop")}>Shop for your cat</button><button className="btn ghost" onClick={() => go(shopLink("Toys"))}>Browse toys</button></div>
        </div></div>
      </section>
      <div className="strip"><div className="strip-in">{[0, 1, 2, 3].map((k) => <span key={k}>🐾 Purr-fect picks 🐟 Treats 🧶 Toys 🛏️ Naps 💖 Cat approved</span>)}</div></div>
      <div className="perks"><div className="perks-in">
        {[["🚚", "Fast delivery", "Dhaka ৳80 · Outside ৳150"], ["✅", "Vet-approved picks", "Safe for everyday use"], ["💳", "Easy payment", "bKash, Nagad, COD"], ["💬", "Cat-parent support", "We reply within hours"]].map(([i, t, s]) => <div key={t} className="perk"><span>{i}</span><div>{t}<small>{s}</small></div></div>)}
      </div></div>
      <div className="sec">
        <h2>Cat favourites 💖</h2><p className="sub">What other cat parents keep re-ordering</p>
        {loadErr ? errorBox : !loaded ? loadingBox : grid(products.filter((p) => p.badge).slice(0, 8))}
        <div style={{ textAlign: "center", marginTop: 32 }}><button className="btn" onClick={() => go("/shop")}>See all products</button></div>
      </div>
      <div className="band"><div className="sec">
        <h2>Shop by category 🐾</h2><p className="sub">Jump straight to what your cat needs</p>
        <div className="cats">{cats.map((c) => <div key={c} className="cat" onClick={() => go(shopLink(c))}><div>{catIcons[c] || "🐾"}</div><b>{c}</b><small>{products.filter((p) => p.category === c).length} products</small></div>)}</div>
      </div></div>
    </>
  );

  // ---------- Shop: /shop and /shop?category=Toys ----------
  const shopEl = (
    <div className="sec">
      <h2>All cat supplies</h2><p className="sub">{loaded ? `${shown.length} products` : "Loading…"}</p>
      <input className="inp" style={{ maxWidth: 380 }} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="tabs">{["All", ...cats].map((c) => <button key={c} className={`tab ${category === c ? "on" : ""}`} onClick={() => nav(shopLink(c))}>{c}</button>)}</div>
      {loadErr ? errorBox : !loaded ? loadingBox : grid(shown)}
      {loaded && !loadErr && shown.length === 0 && <div className="empty"><div>😿</div><b>No products found</b>Try another search or category.<br /><button className="btn" onClick={() => { setSearch(""); nav("/shop"); }}>Clear filters</button></div>}
    </div>
  );

  // ---------- Wishlist: /wishlist ----------
  const wishEl = (
    <div className="sec">
      <h2>Wishlist</h2><p className="sub">Saved for later</p>
      {wish.length === 0 ? <div className="empty"><div>🤍</div><b>Nothing saved yet</b>Tap the heart on any product to save it.<br /><button className="btn" onClick={() => go("/shop")}>Browse products</button></div> : grid(products.filter((p) => wish.includes(p.id)))}
    </div>
  );

  // ---------- Checkout: /cart, /checkout/delivery, /checkout/payment, /checkout/review ----------
  const step = { "/cart": 1, "/checkout/delivery": 2, "/checkout/payment": 3, "/checkout/review": 4 }[pathname.replace(/\/+$/, "")] || 1;
  const phoneOk = PHONE_RE.test(form.phone);
  const formOk = form.name.trim().length >= 2 && phoneOk && form.address.trim().length >= 5 && CITIES.includes(form.city);
  const pmObj = PAYMENT_METHODS.find((m) => m.id === pm);
  const txOk = !pmObj?.needsTx || /^[A-Za-z0-9]{6,30}$/.test(txId);
  const payOk = !!pmObj && txOk;
  const checkoutEl =
    cart.length === 0 ? (
      <div className="cart"><div className="empty"><div>🛒</div><b>Your cart is empty</b>Add something your cat will love.<br /><button className="btn" onClick={() => go("/shop")}>Start shopping</button></div></div>
    ) : step >= 3 && !formOk ? (
      <Navigate to="/checkout/delivery" replace />
    ) : step === 4 && !payOk ? (
      <Navigate to="/checkout/payment" replace />
    ) : (
      <div className="cart">
        <h2 style={{ fontFamily: "var(--display)", fontSize: 32, color: "var(--green)" }}>Checkout</h2>
        <div className="steps">{["Cart", "Delivery", "Payment", "Confirm"].map((s, i) => <div key={s} className={`step ${step === i + 1 ? "on" : ""} ${step > i + 1 ? "done" : ""}`}>{step > i + 1 ? "✓ " : ""}{s}</div>)}</div>

        {step === 1 && (<>
          {cart.map((i) => (
            <div key={i.id} className="item">
              <div className="item-img"><Img p={i} /></div>
              <div className="item-info"><b>{i.name}</b><div style={{ color: "var(--green)", fontWeight: 700 }}>৳{i.price.toLocaleString()}</div></div>
              <div className="qty"><button onClick={() => setQ(i.id, i.qty - 1)}>−</button><span>{i.qty}</span><button onClick={() => setQ(i.id, i.qty + 1)}>+</button></div>
              <b style={{ minWidth: 70, textAlign: "right" }}>৳{(i.price * i.qty).toLocaleString()}</b>
              <button className="back" style={{ margin: 0 }} aria-label="Remove" onClick={() => setQ(i.id, 0)}>🗑</button>
            </div>
          ))}
          <div className="box"><div className="srow"><span>Delivery</span><span>Calculated next step</span></div><div className="stot"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
            <button className="btn block" style={{ marginTop: 16 }} onClick={() => nav("/checkout/delivery")}>Continue to delivery</button></div>
        </>)}

        {step === 2 && (<>
          <div><label className="l">Full name *</label><input className="inp" maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="l">Phone number *</label><input className="inp" inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))} />
            {form.phone.length >= 11 && !phoneOk && <p style={{ color: "#C0392B", fontSize: 13, marginTop: -8, marginBottom: 12 }}>Enter a valid 11-digit mobile number starting with 01.</p>}</div>
          <div><label className="l">Full address *</label><input className="inp" maxLength={200} placeholder="House, road, area" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
          <div><label className="l">City *</label>
            <select className="inp" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
              <option value="">Select city</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></div>
          {form.city && <div className="note">{delivery === 80 ? "Dhaka delivery: ৳80" : "Outside Dhaka delivery: ৳150"}</div>}
          <div className="box"><div className="srow"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div><div className="srow"><span>Delivery</span><span>{form.city ? `৳${delivery}` : "—"}</span></div><div className="stot"><span>Total</span><span>৳{(form.city ? total : subtotal).toLocaleString()}</span></div></div>
          <div className="row"><button className="btn ghost block" onClick={() => nav("/cart")}>Back</button><button className="btn block" onClick={() => (formOk ? nav("/checkout/payment") : notify("Please fill in all fields correctly", "#C0392B"))}>Continue to payment</button></div>
        </>)}

        {step === 3 && (<>
          <p style={{ marginBottom: 16, color: "var(--muted)" }}>Total to pay: <b style={{ color: "var(--ink)" }}>৳{total.toLocaleString()}</b> (includes ৳{delivery} delivery)</p>
          {PAYMENT_METHODS.map((m) => (
            <div key={m.id} className={`pay ${pm === m.id ? "on" : ""}`} onClick={() => { setPm(m.id); setTxId(""); }}>
              <span style={{ fontSize: 26 }}>{m.icon}</span>
              <div><b style={{ color: m.color }}>{m.name}</b><div style={{ fontSize: 13, color: "var(--muted)" }}>{m.number}</div></div>
              {pm === m.id && <b style={{ marginLeft: "auto", color: "var(--mint)" }}>✓</b>}
            </div>
          ))}
          {pmObj && pmObj.needsTx && (
            <div className="note">
              {pm === "bank" ? "Transfer the total to the account above, then enter the reference ID." : <>Open the app and choose <b>Send Money</b> to <b>{pmObj.number}</b>, then enter the Transaction ID from the SMS.</>}
              <input className="inp" style={{ marginTop: 10, marginBottom: 0 }} maxLength={30} placeholder="Transaction ID (letters and numbers)" value={txId} onChange={(e) => setTxId(e.target.value.trim())} />
            </div>
          )}
          {pm === "cod" && <div className="note">Pay <b>৳{total.toLocaleString()}</b> in cash when your order arrives.</div>}
          <div className="row"><button className="btn ghost block" onClick={() => nav("/checkout/delivery")}>Back</button>
            <button className="btn block" onClick={() => { if (!pm) return notify("Choose a payment method", "#C0392B"); if (!txOk) return notify("Enter a valid Transaction ID (6–30 letters or numbers)", "#C0392B"); nav("/checkout/review"); }}>Review order</button></div>
        </>)}

        {step === 4 && (<>
          <div className="box"><h4>Items</h4>
            {cart.map((i) => <div key={i.id} className="srow"><span>{i.image} {i.name} × {i.qty}</span><span>৳{(i.price * i.qty).toLocaleString()}</span></div>)}
            <div className="srow"><span>Delivery to {form.city}</span><span>৳{delivery}</span></div><div className="stot"><span>Total</span><span>৳{total.toLocaleString()}</span></div></div>
          <div className="box"><h4>Delivery</h4><b>{form.name}</b> · {form.phone}<br /><span style={{ color: "var(--muted)" }}>{form.address}, {form.city}</span></div>
          <div className="box"><h4>Payment</h4>{pmObj?.name}{txId && ` · ${txId}`}</div>
          <div style={{ marginBottom: 16 }}>
            <Turnstile key={tsKey} siteKey={TURNSTILE_SITEKEY} onSuccess={setToken} onExpire={() => setToken("")} onError={() => setToken("")} />
          </div>
          <div className="row"><button className="btn ghost block" onClick={() => nav("/checkout/payment")}>Back</button><button className="btn green block" disabled={!token || placing} onClick={place}>{placing ? "Placing order…" : "Place order"}</button></div>
        </>)}
      </div>
    );

  const notFound = <div className="sec"><div className="empty"><div>😿</div><b>Page not found</b>This page doesn't exist.<br /><button className="btn" onClick={() => go("/")}>Go home</button></div></div>;
  const showFooter = !/^\/(cart|checkout|order)/.test(pathname);
  const on = (test) => (test ? "on" : "");

  return (
    <div className="wrap">
      {toast && <div className="toast"><i style={{ background: toast.color }} />{toast.msg}</div>}
      <header className="hdr">
        {menu && <div className="scrim show" onClick={() => setMenu(false)} />}
        <div className="hdr-in">
          <div className="brand" onClick={() => go("/")}><img src={logo} alt="Paw Club logo" /><div>Paw Club<small>Everything for happy cats</small></div></div>
          <input className="search" placeholder="Search food, toys, beds…" value={search} onChange={(e) => { setSearch(e.target.value); if (e.target.value && !pathname.startsWith("/shop")) nav("/shop"); }} />
          <nav className={`nav ${menu ? "open" : ""}`}>
            <input className="inp dsearch" placeholder="Search food, toys, beds…" value={search} onChange={(e) => { setSearch(e.target.value); if (e.target.value && !pathname.startsWith("/shop")) nav("/shop"); }} />
            <button className={`nav-btn ${on(pathname === "/")}`} onClick={() => go("/")}>Home</button>
            <button className={`nav-btn ${on(pathname.startsWith("/shop") || pathname.startsWith("/product"))}`} onClick={() => go("/shop")}>Shop</button>
            <button className={`nav-btn ${on(pathname === "/wishlist")}`} onClick={() => go("/wishlist")}>Wishlist{wish.length ? ` (${wish.length})` : ""}</button>
            <button className="nav-btn admin-btn" aria-label="Admin" onClick={() => go("/admin")}>🔧<span className="only-m"> Admin</span></button>
          </nav>
          <button className="cart-btn" onClick={() => go("/cart")}>🛒 Cart{count ? ` (${count})` : ""}</button>
          <button className="burger" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>{menu ? "✕" : "☰"}</button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={homeEl} />
        <Route path="/shop" element={shopEl} />
        <Route path="/product/:id" element={<ProductPage products={products} loaded={loaded} wish={wish} toggle={toggle} add={add} />} />
        <Route path="/wishlist" element={wishEl} />
        <Route path="/cart" element={checkoutEl} />
        <Route path="/checkout/delivery" element={checkoutEl} />
        <Route path="/checkout/payment" element={checkoutEl} />
        <Route path="/checkout/review" element={checkoutEl} />
        <Route path="/order/:orderId" element={<OrderPage />} />
        <Route path="*" element={notFound} />
      </Routes>

      {showFooter && (
        <footer className="foot">
          <div className="foot-grid">
            <div><h5>Paw Club</h5><p>Quality food, toys and comfort for cats and the people who love them.</p></div>
            <div><h5>Contact</h5><p>📞 01XXXXXXXXX</p><p>✉️ hello@pawclub.com.bd</p><p>📍 Your shop address, Dhaka</p></div>
            <div><h5>Categories</h5>{cats.map((c) => <a key={c} onClick={() => go(shopLink(c))}>{c}</a>)}</div>
            <div><h5>Payment</h5>{PAYMENT_METHODS.map((m) => <p key={m.id}>{m.icon} {m.name}</p>)}</div>
          </div>
          <div className="foot-b">Made with ❤️ in Bangladesh</div>
        </footer>
      )}
    </div>
  );
}

// HashRouter works on any static host with no extra setup (Cloudflare Pages, GitHub Pages, Netlify).
export default function PawClub() {
  return <HashRouter><PawClubApp /></HashRouter>;
}