import { useState, useEffect, useRef } from "react";
import logo from "./assets/logoo.png"; // replace this file when your new logo is ready

const ADMIN_PASSWORD = "pawclub2026"; // change this
const DEFAULT_CATEGORIES = ["Food", "Toys", "Beds & Trees", "Litter", "Grooming", "Accessories"];
const BADGES = ["", "Best Seller", "New", "Cat Favorite", "Hot Deal"];
const EMOJIS = ["🐟", "🍗", "🧶", "🐭", "🛏️", "🏠", "🪣", "🧼", "🧴", "🪮", "🎀", "🔔", "🥣", "🧳", "🐾", "🐱", "🦴", "🎣"];
const badgeColors = { "Best Seller": "#1E5B3A", New: "#D99A1E", "Cat Favorite": "#D9677A", "Hot Deal": "#C8642B" };
const catIcons = { Food: "🍗", Toys: "🧶", "Beds & Trees": "🛏️", Litter: "🪣", Grooming: "🪮", Accessories: "🎀" };

const DEFAULT_PRODUCTS = [
  { id: 1, name: "Tuna & Chicken Kibble 2kg", category: "Food", price: 1450, originalPrice: 1800, image: "🍗", rating: 4.8, reviews: 212, badge: "Best Seller", description: "Grain-free dry food for adult cats with real tuna and chicken. Supports a shiny coat and healthy digestion." },
  { id: 2, name: "Wet Food Pouches (12 pack)", category: "Food", price: 980, originalPrice: 1200, image: "🐟", rating: 4.6, reviews: 144, badge: null, description: "Soft, gravy-rich ocean fish pouches. Great as a topper or a full meal." },
  { id: 3, name: "Feather Wand Teaser", category: "Toys", price: 320, originalPrice: 450, image: "🎣", rating: 4.7, reviews: 301, badge: "Cat Favorite", description: "Extendable wand with replaceable feathers and a bell. Perfect for daily play sessions." },
  { id: 4, name: "Crinkle Mouse Set (6 pcs)", category: "Toys", price: 280, originalPrice: 380, image: "🐭", rating: 4.4, reviews: 97, badge: null, description: "Six soft mice with catnip pockets and crinkly tails." },
  { id: 5, name: "Cloud Donut Bed", category: "Beds & Trees", price: 1850, originalPrice: 2300, image: "🛏️", rating: 4.9, reviews: 158, badge: "New", description: "Ultra-soft calming bed with a raised rim. Machine washable." },
  { id: 6, name: "3-Level Cat Tree", category: "Beds & Trees", price: 5400, originalPrice: 6500, image: "🏠", rating: 4.6, reviews: 63, badge: null, description: "Sisal-wrapped scratching posts, two perches and a hideaway cave. 110cm tall." },
  { id: 7, name: "Clumping Litter 10L", category: "Litter", price: 750, originalPrice: 950, image: "🪣", rating: 4.5, reviews: 276, badge: "Hot Deal", description: "Low-dust, fast-clumping bentonite litter with light lavender scent." },
  { id: 8, name: "Deshedding Brush", category: "Grooming", price: 520, originalPrice: 700, image: "🪮", rating: 4.5, reviews: 88, badge: null, description: "Self-cleaning slicker brush that lifts loose fur without pulling." },
  { id: 9, name: "Gentle Cat Shampoo 250ml", category: "Grooming", price: 460, originalPrice: 590, image: "🧴", rating: 4.3, reviews: 52, badge: null, description: "Tear-free oatmeal shampoo for sensitive skin." },
  { id: 10, name: "Breakaway Collar + Bell", category: "Accessories", price: 240, originalPrice: 350, image: "🔔", rating: 4.4, reviews: 120, badge: null, description: "Safety-release collar in soft nylon, adjustable from 20–30cm." },
  { id: 11, name: "Travel Carrier Backpack", category: "Accessories", price: 2600, originalPrice: 3200, image: "🧳", rating: 4.7, reviews: 41, badge: "New", description: "Ventilated bubble-window backpack for vet visits and short trips." },
  { id: 12, name: "Slow Feeder Bowl", category: "Accessories", price: 390, originalPrice: 520, image: "🥣", rating: 4.6, reviews: 77, badge: null, description: "Maze-patterned ceramic bowl that slows down fast eaters." },
];

const PAYMENT_METHODS = [
  { id: "bkash", name: "bKash", color: "#E2136E", icon: "📱", number: "01XXXXXXXXX", needsTx: true },
  { id: "nagad", name: "Nagad", color: "#F6821F", icon: "💳", number: "01XXXXXXXXX", needsTx: true },
  { id: "bank", name: "Bank Transfer", color: "#1A5276", icon: "🏦", number: "Bank name · A/C: XXXX-XXXXXXXX", needsTx: true },
  { id: "cod", name: "Cash on Delivery", color: "#1E5B3A", icon: "💵", number: "Pay when delivered", needsTx: false },
];

const getDelivery = (city) => (!city ? 80 : city.trim().toLowerCase() === "dhaka" ? 80 : 150);
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
const orderId = () => "PC" + Date.now().toString().slice(-8);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Quicksand:wght@500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#4A2E1A;--green:#1E5B3A;--green-l:#2E7D52;--accent:#EDBB4A;--accent-d:#1E5B3A;--lilac:#F6EDD3;--butter:#F7DB7A;--sky:#D3E8D8;--lav:#F3E8C8;--mint:#2E8B57;--bg:#FBF6E9;--border:#4A2E1A;--muted:#7A6650;--faint:#B5A58E;--danger:#C0392B;--pink:#F6C9CF;--cream:#FFFDF5;
--display:'Baloo 2',system-ui,sans-serif;--body:'Quicksand',system-ui,sans-serif;--pop:4px 4px 0 var(--ink)}
body{font-family:var(--body);font-weight:600;background:var(--bg) radial-gradient(#EFE3C0 1.5px,transparent 1.5px) 0 0/26px 26px;color:var(--ink)}
button,input,select,textarea{font-family:inherit;font-weight:600}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--green);outline-offset:2px}
.wrap{min-height:100vh}
.hdr{background:#FBF6E9;position:sticky;top:0;z-index:100;border-bottom:3px solid var(--ink)}
.hdr-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:16px;padding:0 28px;height:76px}
.brand{display:flex;align-items:center;gap:10px;cursor:pointer;color:var(--green);font-family:var(--display);font-size:26px;font-weight:800;line-height:1}
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
.btn.ghost{background:#fff}.btn.ghost:hover{background:var(--lav)}
.btn.green{background:var(--green);color:#FFF6D8}.btn.block{width:100%}

.hero{background:var(--lav) radial-gradient(#FFFDF5 2px,transparent 2px) 0 0/30px 30px;color:var(--ink);padding:64px 28px 84px;border-bottom:3px solid var(--ink);overflow:hidden}
.hero-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.hero h1{font-family:var(--display);font-size:64px;line-height:1;font-weight:800;margin-bottom:18px;color:var(--green)}
.hero p{color:var(--muted);font-size:18px;line-height:1.6;max-width:440px;margin-bottom:28px}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap}
.hero-art{position:relative;height:380px;background:#F2C27A;border:3px solid var(--ink);box-shadow:10px 10px 0 var(--ink);border-radius:48% 52% 45% 55%/55% 45% 55% 45%;display:flex;align-items:center;justify-content:center;font-size:160px}
.hero-art .cat{animation:float 3.5s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-12px) rotate(-3deg)}}
.chip{position:absolute;background:#fff;color:var(--ink);padding:9px 16px;border:3px solid var(--ink);border-radius:999px;font-weight:700;font-size:14px;box-shadow:3px 3px 0 var(--ink)}
.chip.a{top:26px;left:-18px;transform:rotate(-6deg);background:var(--butter)}.chip.b{bottom:70px;right:-14px;transform:rotate(5deg);background:var(--sky)}.chip.c{bottom:-12px;left:44px;transform:rotate(-3deg);background:var(--pink)}
.paw{position:absolute;font-size:30px;opacity:.9}.paw.p1{top:-20px;right:60px;transform:rotate(20deg)}.paw.p2{top:150px;left:-34px;transform:rotate(-25deg)}
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

@media(max-width:900px){
.hero-grid,.dgrid{grid-template-columns:1fr}.hero-art{height:280px;font-size:110px;max-width:340px;margin:10px auto 0}.hero h1{font-size:44px}
.perks-in,.foot-grid,.adm-stats{grid-template-columns:1fr 1fr}.search{display:none}.hdr-in{padding:0 14px}.sec{padding:40px 16px}.mgrid{grid-template-columns:1fr}.mgrid .full{grid-column:span 1}}
@media(max-width:560px){.perks-in,.foot-grid{grid-template-columns:1fr}.nav-btn{padding:6px 8px}.brand small{display:none}}
`;

const Img = ({ p }) => (p.imageData ? <img src={p.imageData} alt={p.name} /> : <span>{p.image}</span>);

function Card({ p, onView, onAdd, wish, toggle }) {
  const off = Math.round((1 - p.price / p.originalPrice) * 100);
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
          <span className="old">৳{p.originalPrice.toLocaleString()}</span>
          <span className="save">−{off}%</span>
        </div>
        <button className="add" onClick={(e) => { e.stopPropagation(); onAdd(); }}>Add to cart</button>
      </div>
    </div>
  );
}

function ProductModal({ product, onSave, onClose, categories }) {
  const [f, setF] = useState(product ? { ...product } : { name: "", category: categories[0], price: "", originalPrice: "", image: "🐾", rating: 4.5, reviews: 0, badge: "", description: "" });
  const [newCat, setNewCat] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const upload = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = (e) => set("imageData", e.target.result);
    r.readAsDataURL(file);
  };
  const save = () => {
    if (!f.name || !f.price || !f.originalPrice || !f.category) return alert("Please fill name, category and both prices.");
    onSave({ ...f, price: +f.price, originalPrice: +f.originalPrice, rating: +f.rating, reviews: +f.reviews, badge: f.badge || null, id: f.id || Date.now() });
  };
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        <h3>{product ? "Edit product" : "Add product"}</h3>
        <div className="mgrid">
          <div className="full"><label className="l">Name *</label><input className="inp" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div>
            <label className="l">Category *</label>
            {newCat ? (
              <input className="inp" autoFocus placeholder="New category name" value={f.category} onChange={(e) => set("category", e.target.value)} />
            ) : (
              <select className="inp" value={f.category} onChange={(e) => e.target.value === "__n" ? (setNewCat(true), set("category", "")) : set("category", e.target.value)}>
                {categories.map((c) => <option key={c}>{c}</option>)}
                <option value="__n">＋ New category…</option>
              </select>
            )}
          </div>
          <div><label className="l">Badge</label><select className="inp" value={f.badge || ""} onChange={(e) => set("badge", e.target.value)}>{BADGES.map((b) => <option key={b} value={b}>{b || "None"}</option>)}</select></div>
          <div><label className="l">Sale price (৳) *</label><input className="inp" type="number" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
          <div><label className="l">Original price (৳) *</label><input className="inp" type="number" value={f.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} /></div>
          <div className="full"><label className="l">Description</label><textarea className="inp" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="full">
            <label className="l">Image</label>
            <div className="emoji">{EMOJIS.map((em) => <span key={em} className={!f.imageData && f.image === em ? "on" : ""} onClick={() => { set("image", em); set("imageData", null); }}>{em}</span>)}</div>
            <div className="row" style={{ marginBottom: 14 }}>
              <button className="sm e" onClick={() => fileRef.current.click()}>📷 Upload photo</button>
              {f.imageData && <><img src={f.imageData} alt="" style={{ height: 44, borderRadius: 8 }} /><button className="sm d" onClick={() => set("imageData", null)}>Remove</button></>}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0])} />
            </div>
          </div>
        </div>
        <div className="row"><button className="btn ghost block" onClick={onClose}>Cancel</button><button className="btn block" onClick={save}>{product ? "Save changes" : "Add product"}</button></div>
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
  const [tab, setTab] = useState("products");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const cats = [...new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)])];
  const fp = products.filter((p) => (p.name + p.category).toLowerCase().includes(q.toLowerCase()));
  const fo = orders.filter((o) => (o.orderId + o.customer.name + o.customer.phone).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.placedAt - a.placedAt);
  const save = (p) => { setProducts((prev) => modal === "add" ? [...prev, p] : prev.map((x) => (x.id === p.id ? p : x))); setModal(null); };
  const status = (id, s) => { setOrders((prev) => prev.map((o) => (o.orderId === id ? { ...o, status: s } : o))); setSel((o) => (o && o.orderId === id ? { ...o, status: s } : o)); };
  const pending = orders.filter((o) => o.status === "Pending").length;
  return (
    <div className="adm">
      {modal && <ProductModal product={modal === "add" ? null : modal} onSave={save} onClose={() => setModal(null)} categories={cats} />}
      {sel && <OrderModal order={sel} onClose={() => setSel(null)} onStatus={status} />}
      <div className="adm-h">
        <div className="row"><b style={{ fontFamily: "var(--display)", fontSize: 18 }}>Paw Club admin</b>
          <button className={`nav-btn ${tab === "products" ? "on" : ""}`} onClick={() => { setTab("products"); setQ(""); }}>Products</button>
          <button className={`nav-btn ${tab === "orders" ? "on" : ""}`} onClick={() => { setTab("orders"); setQ(""); }}>Orders{pending > 0 && ` (${pending})`}</button>
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
                    <td><button className="sm e" onClick={() => setModal(p)}>Edit</button><button className="sm d" onClick={() => window.confirm("Delete this product?") && setProducts((prev) => prev.filter((x) => x.id !== p.id))}>Delete</button></td>
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
                    <td><b>৳{o.total.toLocaleString()}</b></td><td>{o.payment.method}</td>
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

export default function PawClub() {
  const load = (k, d) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch { return d; } };
  const [mode, setMode] = useState("shop");
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [products, setProducts] = useState(() => load("pc_products", DEFAULT_PRODUCTS));
  const [orders, setOrders] = useState(() => load("pc_orders", []));
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [wish, setWish] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(1);
  const [pm, setPm] = useState("");
  const [txId, setTxId] = useState("");
  const [done, setDone] = useState(null);
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "" });
  const [toast, setToast] = useState(null);

  useEffect(() => { try { localStorage.setItem("pc_products", JSON.stringify(products)); } catch {} }, [products]);
  useEffect(() => { try { localStorage.setItem("pc_orders", JSON.stringify(orders)); } catch {} }, [orders]);
  useEffect(() => { const el = document.createElement("style"); el.innerHTML = CSS; document.head.appendChild(el); return () => document.head.removeChild(el); }, []);

  const notify = (msg, color = "#2E8B57") => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };
  const cats = [...new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)])];
  const delivery = getDelivery(form.city);
  const shown = products.filter((p) => (category === "All" || p.category === category) && (p.name + p.category).toLowerCase().includes(search.toLowerCase()));
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = subtotal + delivery;

  const add = (p, n = 1) => { setCart((c) => c.find((i) => i.id === p.id) ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + n } : i)) : [...c, { ...p, qty: n }]); notify(`${p.name} added to cart`); };
  const setQ = (id, q) => setCart((c) => (q < 1 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, qty: q } : i))));
  const toggle = (id) => setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  const view = (p) => { setSelected(p); setQty(1); };
  const home = () => { setPage("home"); setSelected(null); setDone(null); };
  const go = (p) => { setPage(p); setSelected(null); };

  const place = () => {
    const method = PAYMENT_METHODS.find((m) => m.id === pm);
    const o = { orderId: orderId(), items: cart.map(({ id, name, image, price, qty, category }) => ({ id, name, image, price, qty, category })), customer: { ...form }, payment: { method: method.name, txId }, subtotal, delivery, total, status: "Pending", placedAt: Date.now() };
    setOrders((prev) => [...prev, o]); setDone(o); setCart([]); setStep(1); setPm(""); setTxId("");
  };

  if (mode === "login")
    return (
      <div className="login"><div className="login-card">
        <div style={{ fontSize: 40 }}>🐾</div><h2>Admin sign in</h2>
        {pwErr && <p style={{ color: "#C0392B", marginBottom: 10 }}>Wrong password. Try again.</p>}
        <input className="inp" type="password" placeholder="Password" value={pw} autoFocus onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (pw === ADMIN_PASSWORD ? (setMode("admin"), setPw(""), setPwErr(false)) : (setPwErr(true), setPw("")))} />
        <button className="btn block" onClick={() => (pw === ADMIN_PASSWORD ? (setMode("admin"), setPw(""), setPwErr(false)) : (setPwErr(true), setPw("")))}>Sign in</button>
        <button className="nav-btn" style={{ marginTop: 10 }} onClick={() => setMode("shop")}>Back to shop</button>
      </div></div>
    );
  if (mode === "admin") return <Admin products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} onLogout={() => setMode("shop")} />;

  const grid = (list) => <div className="grid">{list.map((p) => <Card key={p.id} p={p} onView={() => view(p)} onAdd={() => add(p)} wish={wish} toggle={toggle} />)}</div>;

  return (
    <div className="wrap">
      {toast && <div className="toast"><i style={{ background: toast.color }} />{toast.msg}</div>}
      <header className="hdr"><div className="hdr-in">
        <div className="brand" onClick={home}><img src={logo} alt="Paw Club logo" /><div>Paw Club<small>Everything for happy cats</small></div></div>
        <input className="search" placeholder="Search food, toys, beds…" value={search} onChange={(e) => { setSearch(e.target.value); if (e.target.value) go("shop"); }} />
        <nav className="nav">
          <button className={`nav-btn ${page === "home" && !selected ? "on" : ""}`} onClick={home}>Home</button>
          <button className={`nav-btn ${page === "shop" && !selected ? "on" : ""}`} onClick={() => go("shop")}>Shop</button>
          <button className={`nav-btn ${page === "wish" ? "on" : ""}`} onClick={() => go("wish")}>Wishlist{wish.length ? ` (${wish.length})` : ""}</button>
          <button className="cart-btn" onClick={() => { setDone(null); go("cart"); }}>🛒 Cart{count ? ` (${count})` : ""}</button>
          <button className="nav-btn" style={{ opacity: 0.35 }} aria-label="Admin" onClick={() => setMode("login")}>🔧</button>
        </nav>
      </div></header>

      {selected && (
        <div className="detail">
          <button className="back" onClick={() => setSelected(null)}>← Back to products</button>
          <div className="dgrid">
            <div className="dimg"><Img p={selected} /></div>
            <div>
              <div className="card-cat">{selected.category}</div>
              <h2 className="dname">{selected.name}</h2>
              <div className="rate">{stars(selected.rating)}<span>{selected.rating} · {selected.reviews} reviews</span></div>
              <p className="ddesc">{selected.description}</p>
              <div className="price-row" style={{ marginBottom: 22 }}>
                <span className="price" style={{ fontSize: 34 }}>৳{selected.price.toLocaleString()}</span>
                <span className="old">৳{selected.originalPrice.toLocaleString()}</span>
                <span className="save">Save {Math.round((1 - selected.price / selected.originalPrice) * 100)}%</span>
              </div>
              <div className="row" style={{ marginBottom: 20 }}><b>Quantity</b><div className="qty"><button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button><span>{qty}</span><button onClick={() => setQty((q) => q + 1)}>+</button></div></div>
              <div className="row"><button className="btn block" onClick={() => add(selected, qty)}>Add to cart</button><button className="btn ghost block" onClick={() => { add(selected, qty); go("cart"); }}>Buy now</button></div>
              <button className="back" style={{ marginTop: 14, marginBottom: 0 }} onClick={() => toggle(selected.id)}>{wish.includes(selected.id) ? "❤️ Saved to wishlist" : "🤍 Add to wishlist"}</button>
            </div>
          </div>
        </div>
      )}

      {!selected && page === "home" && (
        <>
          <section className="hero"><div className="hero-grid">
            <div>
              <h1>Treats, toys and naps your cat will approve of 🐾</h1>
              <p>Food, play, beds and grooming picked by cat people. Delivered across Bangladesh.</p>
              <div className="hero-btns"><button className="btn" onClick={() => go("shop")}>Shop for your cat</button><button className="btn ghost" onClick={() => { setCategory("Toys"); go("shop"); }}>Browse toys</button></div>
            </div>
            <div className="hero-art"><span className="cat">🐱</span><span className="paw p1">🐾</span><span className="paw p2">🐾</span><span className="chip a">🐟 Fishy flavours</span><span className="chip b">🧶 New toys weekly</span><span className="chip c">🛏️ Nap-ready beds</span></div>
          </div></section>
          <div className="strip"><div className="strip-in">{[0,1,2,3].map((k) => <span key={k}>🐾 Purr-fect picks 🐟 Treats 🧶 Toys 🛏️ Naps 💖 Cat approved</span>)}</div></div>
          <div className="perks"><div className="perks-in">
            {[["🚚", "Fast delivery", "Dhaka ৳80 · Outside ৳150"], ["✅", "Vet-approved picks", "Safe for everyday use"], ["💳", "Easy payment", "bKash, Nagad, COD"], ["💬", "Cat-parent support", "We reply within hours"]].map(([i, t, s]) => <div key={t} className="perk"><span>{i}</span><div>{t}<small>{s}</small></div></div>)}
          </div></div>
          <div className="sec">
            <h2>Cat favourites 💖</h2><p className="sub">What other cat parents keep re-ordering</p>
            {grid(products.filter((p) => p.badge).slice(0, 8))}
            <div style={{ textAlign: "center", marginTop: 32 }}><button className="btn" onClick={() => go("shop")}>See all products</button></div>
          </div>
          <div className="band"><div className="sec">
            <h2>Shop by category 🐾</h2><p className="sub">Jump straight to what your cat needs</p>
            <div className="cats">{cats.map((c) => <div key={c} className="cat" onClick={() => { setCategory(c); go("shop"); }}><div>{catIcons[c] || "🐾"}</div><b>{c}</b><small>{products.filter((p) => p.category === c).length} products</small></div>)}</div>
          </div></div>
        </>
      )}

      {!selected && page === "shop" && (
        <div className="sec">
          <h2>All cat supplies</h2><p className="sub">{shown.length} products</p>
          <input className="inp" style={{ maxWidth: 380 }} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="tabs">{["All", ...cats].map((c) => <button key={c} className={`tab ${category === c ? "on" : ""}`} onClick={() => setCategory(c)}>{c}</button>)}</div>
          {grid(shown)}
          {shown.length === 0 && <div className="empty"><div>😿</div><b>No products found</b>Try another search or category.<br /><button className="btn" onClick={() => { setSearch(""); setCategory("All"); }}>Clear filters</button></div>}
        </div>
      )}

      {!selected && page === "wish" && (
        <div className="sec">
          <h2>Wishlist</h2><p className="sub">Saved for later</p>
          {wish.length === 0 ? <div className="empty"><div>🤍</div><b>Nothing saved yet</b>Tap the heart on any product to save it.<br /><button className="btn" onClick={() => go("shop")}>Browse products</button></div> : grid(products.filter((p) => wish.includes(p.id)))}
        </div>
      )}

      {!selected && page === "cart" && (
        <div className="cart">
          {done ? (
            <div className="receipt" style={{ padding: 0 }}>
              <div className="rhead"><div className="ok">✓</div><h2>Order placed</h2><p style={{ color: "#E6EBD9" }}>Thank you for shopping with Paw Club</p></div>
              <div className="rbody">
                <div className="oid">{done.orderId}</div>
                <div className="box"><h4>Delivering to</h4><div style={{ lineHeight: 1.8 }}><b>{done.customer.name}</b> · {done.customer.phone}<br />{done.customer.address}, {done.customer.city}</div></div>
                <div className="box"><h4>Items</h4>
                  {done.items.map((i, k) => <div key={k} className="srow"><span>{i.image} {i.name} × {i.qty}</span><span>৳{(i.price * i.qty).toLocaleString()}</span></div>)}
                  <div className="srow"><span>Delivery</span><span>৳{done.delivery}</span></div>
                  <div className="stot"><span>Total</span><span style={{ color: "var(--green)" }}>৳{done.total.toLocaleString()}</span></div>
                </div>
                <div className="srow"><span>Payment</span><b>{done.payment.method}{done.payment.txId && ` · ${done.payment.txId}`}</b></div>
                <p style={{ marginTop: 14, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>We will call <b>{done.customer.phone}</b> to confirm. Expected delivery: 2–4 business days.</p>
              </div>
              <button className="btn block" onClick={home}>Continue shopping</button>
            </div>
          ) : cart.length === 0 ? (
            <div className="empty"><div>🛒</div><b>Your cart is empty</b>Add something your cat will love.<br /><button className="btn" onClick={() => go("shop")}>Start shopping</button></div>
          ) : (
            <>
              <h2 style={{ fontFamily: "var(--display)", fontSize: 32, color: "var(--green)" }}>Checkout</h2>
              <div className="steps">{["Cart", "Delivery", "Payment", "Confirm"].map((s, i) => <div key={s} className={`step ${step === i + 1 ? "on" : ""} ${step > i + 1 ? "done" : ""}`}>{step > i + 1 ? "✓ " : ""}{s}</div>)}</div>

              {step === 1 && (<>
                {cart.map((i) => (
                  <div key={i.id} className="item">
                    <div className="item-img"><Img p={i} /></div>
                    <div style={{ flex: 1 }}><b>{i.name}</b><div style={{ color: "var(--green)", fontWeight: 700 }}>৳{i.price.toLocaleString()}</div></div>
                    <div className="qty"><button onClick={() => setQ(i.id, i.qty - 1)}>−</button><span>{i.qty}</span><button onClick={() => setQ(i.id, i.qty + 1)}>+</button></div>
                    <b style={{ minWidth: 70, textAlign: "right" }}>৳{(i.price * i.qty).toLocaleString()}</b>
                    <button className="back" style={{ margin: 0 }} aria-label="Remove" onClick={() => setQ(i.id, 0)}>🗑</button>
                  </div>
                ))}
                <div className="box"><div className="srow"><span>Delivery</span><span>Calculated next step</span></div><div className="stot"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
                  <button className="btn block" style={{ marginTop: 16 }} onClick={() => setStep(2)}>Continue to delivery</button></div>
              </>)}

              {step === 2 && (<>
                {[["name", "Full name", ""], ["phone", "Phone number", "01XXXXXXXXX"], ["address", "Full address", "House, road, area"], ["city", "City", "e.g. Dhaka"]].map(([k, l, ph]) => (
                  <div key={k}><label className="l">{l} *</label><input className="inp" placeholder={ph} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} /></div>
                ))}
                {form.city && <div className="note">{delivery === 80 ? "Dhaka delivery: ৳80" : "Outside Dhaka delivery: ৳150"}</div>}
                <div className="box"><div className="srow"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div><div className="srow"><span>Delivery</span><span>{form.city ? `৳${delivery}` : "—"}</span></div><div className="stot"><span>Total</span><span>৳{(form.city ? total : subtotal).toLocaleString()}</span></div></div>
                <div className="row"><button className="btn ghost block" onClick={() => setStep(1)}>Back</button><button className="btn block" onClick={() => (form.name && form.phone && form.address && form.city ? setStep(3) : notify("Please fill in all fields", "#C0392B"))}>Continue to payment</button></div>
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
                {pm && PAYMENT_METHODS.find((m) => m.id === pm).needsTx && (
                  <div className="note">
                    {pm === "bank" ? "Transfer the total to the account above, then enter the reference ID." : <>Open the app and choose <b>Send Money</b> to <b>{PAYMENT_METHODS.find((m) => m.id === pm).number}</b>, then enter the Transaction ID from the SMS.</>}
                    <input className="inp" style={{ marginTop: 10, marginBottom: 0 }} placeholder="Transaction ID" value={txId} onChange={(e) => setTxId(e.target.value.trim())} />
                  </div>
                )}
                {pm === "cod" && <div className="note">Pay <b>৳{total.toLocaleString()}</b> in cash when your order arrives.</div>}
                <div className="row"><button className="btn ghost block" onClick={() => setStep(2)}>Back</button>
                  <button className="btn block" onClick={() => { if (!pm) return notify("Choose a payment method", "#C0392B"); if (PAYMENT_METHODS.find((m) => m.id === pm).needsTx && !txId) return notify("Enter the Transaction ID", "#C0392B"); setStep(4); }}>Review order</button></div>
              </>)}

              {step === 4 && (<>
                <div className="box"><h4>Items</h4>
                  {cart.map((i) => <div key={i.id} className="srow"><span>{i.image} {i.name} × {i.qty}</span><span>৳{(i.price * i.qty).toLocaleString()}</span></div>)}
                  <div className="srow"><span>Delivery to {form.city}</span><span>৳{delivery}</span></div><div className="stot"><span>Total</span><span>৳{total.toLocaleString()}</span></div></div>
                <div className="box"><h4>Delivery</h4><b>{form.name}</b> · {form.phone}<br /><span style={{ color: "var(--muted)" }}>{form.address}, {form.city}</span></div>
                <div className="box"><h4>Payment</h4>{PAYMENT_METHODS.find((m) => m.id === pm)?.name}{txId && ` · ${txId}`}</div>
                <div className="row"><button className="btn ghost block" onClick={() => setStep(3)}>Back</button><button className="btn green block" onClick={place}>Place order</button></div>
              </>)}
            </>
          )}
        </div>
      )}

      {!selected && page !== "cart" && (
        <footer className="foot">
          <div className="foot-grid">
            <div><h5>Paw Club</h5><p>Quality food, toys and comfort for cats and the people who love them.</p></div>
            <div><h5>Contact</h5><p>📞 01XXXXXXXXX</p><p>✉️ hello@pawclub.com.bd</p><p>📍 Your shop address, Dhaka</p></div>
            <div><h5>Categories</h5>{cats.map((c) => <a key={c} onClick={() => { setCategory(c); go("shop"); }}>{c}</a>)}</div>
            <div><h5>Payment</h5>{PAYMENT_METHODS.map((m) => <p key={m.id}>{m.icon} {m.name}</p>)}</div>
          </div>
          <div className="foot-b">Made with ❤️ in Bangladesh</div>
        </footer>
      )}
    </div>
  );
}
