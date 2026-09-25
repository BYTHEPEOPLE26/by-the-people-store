import express from 'express';
import Stripe from 'stripe';
import path from 'node:path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const BTP_API_SECRET = process.env.BTP_API_SECRET || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const COOKIE_SECRET = BTP_API_SECRET || crypto.randomBytes(32).toString('hex');

const products = [
  {id:'veh-01',type:'Vehicles',name:'Gresley Hellfire PD',price:25,billing:'once',stock:999,images:['GRESLEYHELLFIREPD.webp'],description:'Gresley Hellfire PD vehicle for your By The People RolePlay fleet.'},
  {id:'veh-02',type:'Vehicles',name:'Gresley Hellfire',price:20,billing:'once',stock:999,images:['GRESLEYHELLFIRE.webp'],description:'Gresley Hellfire vehicle for your roleplay fleet.'},
  {id:'veh-03',type:'Vehicles',name:'Schlagen STR',price:20,billing:'once',stock:999,images:['SCHLAGENSTR.webp'],description:'Schlagen STR performance vehicle.'},
  {id:'veh-04',type:'Vehicles',name:'MVolt',price:0,billing:'once',stock:999,images:['MVOLT.webp'],description:'MVolt vehicle package.'},
  {id:'veh-05',type:'Vehicles',name:'Castigator UM',price:20,billing:'once',stock:999,images:['CASTIGATORUM.webp'],description:'Castigator UM vehicle.'},
  {id:'veh-06',type:'Vehicles',name:'FX3R',price:15,billing:'once',stock:999,images:['FX3R.webp'],description:'FX3R performance vehicle.'},
  {id:'veh-07',type:'Vehicles',name:'H4RXST2',price:15,billing:'once',stock:999,images:['H4RXST2.webp'],description:'H4RXST2 custom vehicle.'},
  {id:'veh-08',type:'Vehicles',name:'RT3000 Varis',price:20,billing:'once',stock:999,images:['RT3000VARIS.webp'],description:'RT3000 Varis custom vehicle.'},
  {id:'veh-09',type:'Vehicles',name:'JDOM9',price:15,billing:'once',stock:999,images:['JDOM9.webp'],description:'JDOM9 custom vehicle.'},
  {id:'veh-10',type:'Vehicles',name:'SPVDJV',price:15,billing:'once',stock:999,images:['SPVDJV.webp'],description:'SPVDJV custom vehicle.'},
  {id:'veh-11',type:'Vehicles',name:'Torero XOC',price:20,billing:'once',stock:999,images:['TOREROXOC.webp'],description:'Torero XOC custom vehicle.'},
  {id:'veh-12',type:'Vehicles',name:'Tempesta ES',price:20,billing:'once',stock:999,images:['tempestaes.webp'],description:'Tempesta ES custom vehicle.'},
  {id:'veh-13',type:'Vehicles',name:'PBGJV',price:15,billing:'once',stock:999,images:['PBGJV.webp'],description:'PBGJV custom vehicle.'},
  {id:'veh-14',type:'Vehicles',name:'Highmare',price:15,billing:'once',stock:999,images:['highmare.webp'],description:'Highmare custom vehicle.'},
  {id:'veh-15',type:'Vehicles',name:'JGAUNT4',price:20,billing:'once',stock:999,images:['JGAUNT4.webp'],description:'JGAUNT4 custom vehicle.'},
  {id:'veh-16',type:'Vehicles',name:'Kriegerty2',price:25,billing:'once',stock:999,images:['KRIEGERTY2.webp'],description:'Kriegerty2 custom vehicle.'},
  {id:'house-01',type:'MLOs',name:'Rockford Villa',price:15,billing:'monthly',stock:1,images:['Rockford villa 0.webp','Rockford villa 1.webp','Rockford villa 2.webp'],description:'Rockford Villa MLO subscription. One property subscription available.'},
  {id:'house-02',type:'MLOs',name:'Vinewood Mansion',price:15,billing:'monthly',stock:1,images:['Vinewood mansion 0.webp','Vinewood mansion 1.webp','Vinewood mansion 2.webp'],description:'Vinewood Mansion MLO subscription. One property subscription available.'},
  {id:'biz-01',type:'Businesses',name:'Redline',price:20,billing:'monthly',stock:1,images:['redline.webp','Redline mechanics .webp'],description:'Redline business subscription with the matching Redline and mechanics images.'},
  {id:'biz-02',type:'Businesses',name:'Up & Atom',price:15,billing:'monthly',stock:1,images:['up and atom.webp','up and atom 1.webp'],description:'Up & Atom business subscription.'},
  {id:'biz-03',type:'Businesses',name:'Burger Shot',price:20,billing:'monthly',stock:1,images:['burger shot.webp','Burger shot .webp'],description:'Burger Shot business subscription.'},
  {id:'biz-04',type:'Businesses',name:'Weed Shop',price:18,billing:'monthly',stock:1,images:['WEED SHOP 1.webp','WEED SHOP 2.webp'],description:'Weed Shop business subscription.'},
  {id:'mlo-01',type:'MLOs',name:'Warehouse',price:12,billing:'monthly',stock:14,images:['Warehouse .webp','Warehouse 0.webp','Warehouse 1.webp','Warehouse 1..webp'],description:'Warehouse MLO subscription. 14 subscriptions currently available.'}
];

let pool;
function db(){
  if(!DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  if(!pool) pool = mysql.createPool(DATABASE_URL + (DATABASE_URL.includes('?') ? '&' : '?') + 'connectionLimit=5');
  return pool;
}
function makePurchaseId(){ return `BTP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }
function money(n){ return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(n)||0); }
function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function hashToken(t){ return crypto.createHash('sha256').update(t).digest('hex'); }
function signAccount(id){ const body=String(id); const sig=crypto.createHmac('sha256',COOKIE_SECRET).update(body).digest('hex'); return `${body}.${sig}`; }
function verifyAccount(value){
  if(!value || !value.includes('.')) return null;
  const [id,sig]=value.split('.');
  if(!/^\d+$/.test(id) || !/^[a-f0-9]{64}$/i.test(sig)) return null;
  const expected=crypto.createHmac('sha256',COOKIE_SECRET).update(id).digest('hex');
  if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return null;
  return Number(id);
}
function apiAuthorized(req){ return !!BTP_API_SECRET && req.headers.authorization === `Bearer ${BTP_API_SECRET}`; }

async function getAccountFromCookie(req){
  const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('btp_account='));
  const value=raw?.slice('btp_account='.length);
  const id=verifyAccount(value);
  if(!id) return null;
  const [rows]=await db().query('SELECT * FROM btp_store_accounts WHERE id=? LIMIT 1',[id]);
  return rows[0] || null;
}

async function sendConfirmationEmail({to,name,purchaseId,products,total,billing}){
  if(!RESEND_API_KEY || !EMAIL_FROM || !to) return;
  const lines=products.map(p=>`<tr><td style="padding:10px 0;border-bottom:1px solid #263246">${escapeHtml(p.name)}</td><td style="padding:10px 0;border-bottom:1px solid #263246;text-align:right">${money(p.price)}${p.billing==='monthly'?'/month':''}</td></tr>`).join('');
  const html=`<!doctype html><html><body style="margin:0;background:#050a12;color:#f7f8fb;font-family:Arial,sans-serif"><div style="max-width:620px;margin:30px auto;background:#0a1321;border:1px solid #263b5c"><div style="padding:26px;background:linear-gradient(90deg,#062a75,#c5162c 50%,#062a75);text-align:center;font-weight:900">★ BY THE PEOPLE ROLEPLAY ★</div><div style="padding:32px"><div style="font-size:12px;letter-spacing:3px;color:#ff2845;font-weight:900">PURCHASE CONFIRMED</div><h1>Thank you for your purchase.</h1><p>Hi ${escapeHtml(name||'there')}, your payment has been successfully completed.</p><div style="margin:25px 0;padding:18px;border:1px solid #ff2845"><div style="font-size:11px">PURCHASE ID</div><div style="font-size:24px;font-weight:900">${purchaseId}</div></div><table style="width:100%;border-collapse:collapse">${lines}<tr><td style="padding:18px 0;font-weight:900">TOTAL</td><td style="padding:18px 0;font-weight:900;text-align:right">${money(total)}${billing==='monthly'?'/month':''}</td></tr></table><p>Payment: Completed</p><p>Your purchase has been linked to your FiveM account and will be delivered automatically when you are online.</p></div></div></body></html>`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:EMAIL_FROM,to:[to],subject:`Purchase confirmed • ${purchaseId}`,html,text:`Purchase confirmed. Purchase ID: ${purchaseId}`})});
  if(!response.ok) console.error('Resend error:',await response.text());
}

app.post('/api/stripe-webhook', express.raw({type:'application/json'}), async (req,res)=>{
  if(!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(500).send('Stripe webhook is not configured.');
  let event; try{event=stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],STRIPE_WEBHOOK_SECRET);}catch(e){return res.status(400).send(`Webhook Error: ${e.message}`);}
  try{
    if(event.type==='checkout.session.completed'){
      const s=event.data.object; const ids=String(s.metadata?.product_ids||'').split(',').filter(Boolean); const selected=ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);
      const purchaseId=s.metadata?.purchase_id||makePurchaseId(); const accountId=Number(s.metadata?.account_id||0)||null; const total=Number(s.amount_total||0)/100; const billing=s.metadata?.billing==='monthly'?'monthly':'once';
      const email=s.customer_details?.email||s.customer_email||''; const name=s.customer_details?.name||'there';
      await db().execute(`INSERT INTO btp_store_purchases (purchase_id,account_id,stripe_session_id,stripe_customer_id,stripe_subscription_id,product_ids,billing,total,payment_status) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE payment_status=VALUES(payment_status),stripe_customer_id=VALUES(stripe_customer_id),stripe_subscription_id=VALUES(stripe_subscription_id),account_id=COALESCE(account_id,VALUES(account_id))`,[purchaseId,accountId,s.id,s.customer||null,s.subscription||null,ids.join(','),billing,total,s.payment_status||'paid']);
      if(accountId){
        for(const p of selected) await db().execute(`INSERT INTO btp_store_entitlements (account_id,purchase_id,product_id,product_type,status,expires_at) VALUES (?,?,?,?,?,?)`,[accountId,purchaseId,p.id,p.type,'active',null]);
      }
      await sendConfirmationEmail({to:email,name,purchaseId,products:selected,total,billing});
      console.log(`Purchase recorded: ${purchaseId} (${s.id})`);
    }
    if(event.type==='customer.subscription.updated' || event.type==='customer.subscription.deleted'){
      const s=event.data.object; const status=event.type==='customer.subscription.deleted'?'cancelled':(s.status||'active'); const expiry=s.current_period_end?new Date(s.current_period_end*1000):null;
      await db().execute(`UPDATE btp_store_purchases SET payment_status=?,updated_at=CURRENT_TIMESTAMP WHERE stripe_subscription_id=?`,[status,s.id]);
      await db().execute(`UPDATE btp_store_entitlements e JOIN btp_store_purchases p ON p.purchase_id=e.purchase_id SET e.status=?,e.expires_at=? WHERE p.stripe_subscription_id=?`,[status,expiry,s.id]);
    }
    return res.json({received:true});
  }catch(e){console.error('Webhook processing error:',e);return res.status(500).json({error:'Webhook processing failed.'});}
});

app.use((req,res,next)=>{
  res.cookie=(name,value,options={})=>{
    const parts=[`${name}=${encodeURIComponent(value)}`];
    if(options.maxAge) parts.push(`Max-Age=${Math.floor(options.maxAge/1000)}`);
    if(options.httpOnly) parts.push('HttpOnly');
    if(options.secure) parts.push('Secure');
    if(options.sameSite) parts.push(`SameSite=${options.sameSite}`);
    res.append('Set-Cookie',parts.join('; '));
  };
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.get('/api/products',(_,res)=>res.json(products));

app.get('/api/account',async(req,res)=>{
  try{
    const account=await getAccountFromCookie(req);
    if(!account) return res.json({linked:false});
    res.json({linked:true,citizenid:account.citizenid});
  }catch(e){console.error('Account lookup error:',e);res.status(500).json({linked:false});}
});

app.post('/api/fivem/link',async(req,res)=>{
  if(!apiAuthorized(req)) return res.status(401).json({error:'Unauthorized'});
  const {citizenid,cfx_id,license_id}=req.body||{};
  if(!citizenid) return res.status(400).json({error:'citizenid required'});
  try{
const token=crypto.randomBytes(32).toString('hex'); const expires=new Date('9999-12-31T23:59:59Z');
    await db().execute('INSERT INTO btp_store_link_tokens (token_hash,fivem_id,license_id,citizenid,expires_at) VALUES (?,?,?,?,?)',[hashToken(token),cfx_id||null,license_id||null,citizenid,expires]);
    res.json({url:`${BASE_URL}/link.html?token=${encodeURIComponent(token)}`});
  }catch(e){console.error('Link creation error:',e);res.status(500).json({error:'Could not create link.'});}
});

app.post('/api/fivem/consume-link',async(req,res)=>{
  const token=String(req.body?.token||'');
  if(!token) return res.status(400).json({error:'Token required'});
  try{
    const [rows]=await db().query('SELECT * FROM btp_store_link_tokens WHERE token_hash=? AND used_at IS NULL LIMIT 1',[hashToken(token)]);
    const row=rows[0];
    if(!row) return res.status(410).json({error:'This link has expired or has already been used.'});
    const [existing]=await db().query('SELECT * FROM btp_store_accounts WHERE citizenid=? OR cfx_id=? OR fivem_id=? LIMIT 1',[row.citizenid,row.fivem_id,row.fivem_id]);
    let account=existing[0];
    if(account){
      await db().execute('UPDATE btp_store_accounts SET citizenid=?,cfx_id=?,fivem_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[row.citizenid,row.fivem_id,row.fivem_id,account.id]);
    }else{
      const [r]=await db().execute('INSERT INTO btp_store_accounts (cfx_id,fivem_id,citizenid) VALUES (?,?,?)',[row.fivem_id,row.fivem_id,row.citizenid]);
      account={id:r.insertId};
    }
    await db().execute('UPDATE btp_store_link_tokens SET used_at=NOW() WHERE id=?',[row.id]);
    res.cookie('btp_account',signAccount(account.id),{httpOnly:true,secure:true,sameSite:'lax',maxAge:31536000000});
    res.json({ok:true});
  }catch(e){console.error('Consume link error:',e);res.status(500).json({error:'Could not link account.'});}
});

app.post('/api/create-checkout-session',async(req,res)=>{
  try{
    if(!stripe) return res.status(500).json({error:'Stripe is not configured.'});
    const account=await getAccountFromCookie(req);
    if(!account) return res.status(401).json({error:'Please link your FiveM account first.'});
    const ids=Array.isArray(req.body?.productIds)?req.body.productIds:[];
    const selected=ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);
    if(!selected.length) return res.status(400).json({error:'No valid products selected.'});
    if(selected.some(p=>p.stock<=0)) return res.status(409).json({error:'One or more selected products are sold out.'});
    const billingTypes=new Set(selected.map(p=>p.billing));
    if(billingTypes.size>1) return res.status(400).json({error:'Please checkout vehicles separately from monthly subscriptions.'});
    const monthly=selected[0].billing==='monthly';
    if(monthly){
      const [rows]=await db().query(`SELECT e.product_id FROM btp_store_entitlements e WHERE e.account_id=? AND e.status='active' AND e.product_id IN (${selected.map(()=>'?').join(',')})`,[account.id,...selected.map(p=>p.id)]);
      if(rows.length) return res.status(409).json({error:'One or more selected subscriptions are already active on this account.'});
    }
    const purchaseId=makePurchaseId();
    const session=await stripe.checkout.sessions.create({
      mode:monthly?'subscription':'payment',
      managed_payments:{enabled:false},
      line_items:selected.map(p=>({price_data:{currency:'gbp',product_data:{name:p.name,description:p.description},unit_amount:Math.round(p.price*100),...(monthly?{recurring:{interval:'month'}}:{})},quantity:1})),
      success_url:`${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${BASE_URL}/#store`,
      metadata:{product_ids:selected.map(p=>p.id).join(','),billing:monthly?'monthly':'once',purchase_id,account_id:String(account.id)}
    });
    res.json({url:session.url});
  }catch(e){console.error('Checkout error:',e);res.status(500).json({error:e?.message||'Checkout failed.'});}
});

app.post('/api/fivem/pending',async(req,res)=>{
  if(!apiAuthorized(req)) return res.status(401).json({error:'Unauthorized'});
  const citizenid=req.body?.citizenid;
  if(!citizenid) return res.status(400).json({error:'citizenid required'});
  try{
    const [rows]=await db().query(`SELECT e.id,e.product_id,purchase.product_ids,e.status FROM btp_store_entitlements e JOIN btp_store_accounts a ON a.id=e.account_id JOIN btp_store_purchases purchase ON purchase.purchase_id=e.purchase_id WHERE a.citizenid=? AND e.status='active'`,[citizenid]);
    const entitlements=rows.map(e=>{const p=products.find(x=>x.id===e.product_id);return {id:e.id,product_id:e.product_id,product_name:p?.name||e.product_id};});
    res.json({entitlements});
  }catch(e){console.error('Pending error:',e);res.status(500).json({error:'Pending lookup failed.'});}
});

app.post('/api/fivem/prepare',async(req,res)=>{
  if(!apiAuthorized(req)) return res.status(401).json({error:'Unauthorized'});
  const {entitlement_id,citizenid}=req.body||{};
  if(!entitlement_id||!citizenid) return res.status(400).json({error:'Missing fields'});
  try{
    const [r]=await db().execute(`UPDATE btp_store_entitlements e JOIN btp_store_accounts a ON a.id=e.account_id SET e.status='processing' WHERE e.id=? AND a.citizenid=? AND e.status='active'`,[entitlement_id,citizenid]);
    if(r.affectedRows!==1) return res.status(409).json({error:'Not available'});
    res.json({status:'processing'});
  }catch(e){console.error(e);res.status(500).json({error:'Prepare failed'});}
});
app.post('/api/fivem/claim',async(req,res)=>{
  if(!apiAuthorized(req)) return res.status(401).json({error:'Unauthorized'});
  const {entitlement_id,vehicle_id,citizenid}=req.body||{};
  try{
    const [r]=await db().execute(`UPDATE btp_store_entitlements e JOIN btp_store_accounts a ON a.id=e.account_id SET e.status='delivered',e.updated_at=CURRENT_TIMESTAMP WHERE e.id=? AND a.citizenid=? AND e.status='processing'`,[entitlement_id,citizenid]);
    if(r.affectedRows!==1)return res.status(409).json({error:'Claim failed'});
    res.json({ok:true});
  }catch(e){console.error(e);res.status(500).json({error:'Claim failed'});}
});
app.post('/api/fivem/release',async(req,res)=>{
  if(!apiAuthorized(req))return res.status(401).json({error:'Unauthorized'});
  const {entitlement_id,citizenid}=req.body||{};
  try{
    await db().execute(`UPDATE btp_store_entitlements e JOIN btp_store_accounts a ON a.id=e.account_id SET e.status='active' WHERE e.id=? AND a.citizenid=? AND e.status='processing'`,[entitlement_id,citizenid]);
    res.json({ok:true});
  }catch(e){res.status(500).json({error:'Release failed'});}
});

app.get('/api/order/:sessionId',async(req,res)=>{
  try{
    if(!stripe)return res.status(500).json({error:'Stripe is not configured.'});
    const s=await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if(!s||s.payment_status!=='paid'&&s.status!=='complete')return res.status(409).json({error:'Payment has not been confirmed.'});
    const ids=String(s.metadata?.product_ids||'').split(',').filter(Boolean);
    res.json({purchaseId:s.metadata?.purchase_id||'BTP-PENDING',products:ids.map(id=>products.find(p=>p.id===id)).filter(Boolean),total:Number(s.amount_total||0)/100,paymentStatus:s.payment_status});
  }catch(e){res.status(404).json({error:'Order could not be found.'});}
});

app.listen(PORT,()=>console.log(`By The People store running on port ${PORT}`));
