import express from 'express';
import Stripe from 'stripe';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const products = [
  {id:'veh-01',type:'Vehicles',name:'Gresley Hellfire PD',price:25,billing:'once',stock:999,images:['GRESLEYHELLFIREPD.webp'],description:'Gresley Hellfire PD vehicle for your By The People RolePlay fleet.'},
  {id:'veh-02',type:'Vehicles',name:'Gresley Hellfire',price:20,billing:'once',stock:999,images:['GRESLEYHELLFIRE.webp'],description:'Gresley Hellfire vehicle for your roleplay fleet.'},
  {id:'veh-03',type:'Vehicles',name:'Schlagen STR',price:20,billing:'once',stock:999,images:['SCHLAGENSTR.webp'],description:'Schlagen STR performance vehicle.'},
  {id:'veh-04',type:'Vehicles',name:'MVolt',price:15,billing:'once',stock:999,images:['MVOLT.webp'],description:'MVolt vehicle package.'},
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


function makePurchaseId() {
  const stamp = new Date().getFullYear();
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BTP-${stamp}-${code}`;
}

async function sendConfirmationEmail({to, name, purchaseId, products, total, billing}) {
  if (!RESEND_API_KEY || !EMAIL_FROM || !to) {
    console.log('Confirmation email not sent: RESEND_API_KEY, EMAIL_FROM or customer email is missing.');
    return;
  }

  const productLines = products.map(p =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #263246;color:#f4f7fb">${escapeHtml(p.name)}</td><td style="padding:10px 0;border-bottom:1px solid #263246;color:#f4f7fb;text-align:right">${money(p.price)}${p.billing === 'monthly' ? '/month' : ''}</td></tr>`
  ).join('');

  const html = `<!doctype html><html><body style="margin:0;background:#050a12;color:#f7f8fb;font-family:Arial,sans-serif">
  <div style="max-width:620px;margin:30px auto;background:#0a1321;border:1px solid #263b5c">
    <div style="padding:26px;background:linear-gradient(90deg,#062a75,#c5162c 50%,#062a75);text-align:center">
      <div style="font-size:22px;font-weight:900;letter-spacing:2px">★ BY THE PEOPLE ROLEPLAY ★</div>
      <div style="font-size:11px;letter-spacing:4px;margin-top:8px">OFFICIAL STORE</div>
    </div>
    <div style="padding:32px">
      <div style="font-size:12px;letter-spacing:3px;color:#ff2845;font-weight:900">PURCHASE CONFIRMED</div>
      <h1 style="font-size:32px;margin:10px 0 12px">Thank you for your purchase.</h1>
      <p style="color:#cbd5e1;line-height:1.6">Hi ${escapeHtml(name || 'there')}, your payment has been successfully completed.</p>
      <div style="margin:25px 0;padding:18px;border:1px solid #ff2845;background:#07101d">
        <div style="font-size:11px;color:#aeb8c8;letter-spacing:2px">PURCHASE ID</div>
        <div style="font-size:24px;font-weight:900;margin-top:7px">${purchaseId}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">${productLines}
      <tr><td style="padding:18px 0 4px;font-weight:900">TOTAL</td><td style="padding:18px 0 4px;font-weight:900;text-align:right">${money(total)}${billing === 'monthly' ? '/month' : ''}</td></tr></table>
      <p style="color:#cbd5e1;line-height:1.6;margin-top:25px"><strong>Payment:</strong> Completed</p>
      <p style="color:#cbd5e1;line-height:1.6">Your purchase is recorded for By The People RolePlay. In-game delivery will be handled once your FiveM account is linked and the delivery system is connected.</p>
      <p style="color:#9aa8bc;font-size:13px;line-height:1.6">Please keep your Purchase ID for support enquiries.</p>
    </div>
    <div style="padding:20px;text-align:center;border-top:1px solid #263246;color:#8492a6;font-size:12px">BY THE PEOPLE ROLEPLAY • OFFICIAL STORE • © 2026</div>
  </div></body></html>`;

  const text = `BY THE PEOPLE ROLEPLAY
OFFICIAL STORE

Purchase confirmed

Hi ${name || 'there'},

Thank you for your purchase.

Purchase ID:
${purchaseId}

Products:
${products.map(p => `- ${p.name}: ${money(p.price)}${p.billing === 'monthly' ? '/month' : ''}`).join('\n')}

Total:
${money(total)}${billing === 'monthly' ? '/month' : ''}

Payment:
Completed

Your purchase is recorded for By The People RolePlay.
Please keep your Purchase ID for support enquiries.`;

  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{'Authorization':`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({from:EMAIL_FROM,to:[to],subject:`Purchase confirmed • ${purchaseId}`,html,text})
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }
}

function money(n) {
  return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(n)||0);
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

app.post('/api/stripe-webhook', express.raw({type:'application/json'}), async (req,res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(500).send('Stripe webhook is not configured.');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Stripe webhook signature error:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const ids = String(session.metadata?.product_ids || '').split(',').filter(Boolean);
      const selected = ids.map(id => products.find(p => p.id === id)).filter(Boolean);
      const purchaseId = session.metadata?.purchase_id || makePurchaseId();
      const total = Number(session.amount_total || 0) / 100;
      const email = session.customer_details?.email || session.customer_email || '';
      const name = session.customer_details?.name || 'there';
      await sendConfirmationEmail({
        to:email,name,purchaseId,products:selected,total,
        billing:session.metadata?.billing === 'monthly' ? 'monthly' : 'once'
      });
      console.log(`Purchase confirmed: ${purchaseId} (${session.id})`);
    }
    return res.json({received:true});
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    return res.status(500).json({error:'Webhook processing failed.'});
  }
});

app.use(express.static(path.join(__dirname,'public')));
app.get('/api/products',(_req,res)=>res.json(products));

app.get('/api/order/:sessionId', async (req,res) => {
  try {
    if (!stripe) return res.status(500).json({error:'Stripe is not configured on the server.'});
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (!session || session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(409).json({error:'Payment has not been confirmed.'});
    }
    const ids = String(session.metadata?.product_ids || '').split(',').filter(Boolean);
    const selected = ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);
    const total = Number(session.amount_total || 0) / 100;
    res.json({
      purchaseId: session.metadata?.purchase_id || 'BTP-PENDING',
      name: session.customer_details?.name || 'there',
      email: session.customer_details?.email || session.customer_email || '',
      products: selected.map(p=>({name:p.name,price:p.price,billing:p.billing,type:p.type})),
      total,
      billing: session.metadata?.billing === 'monthly' ? 'monthly' : 'once',
      paymentStatus: session.payment_status,
      sessionId: session.id
    });
  } catch(error) {
    console.error('Order lookup error:', error);
    res.status(404).json({error:'Order could not be found.'});
  }
});

app.post('/api/create-checkout-session', express.json(), async (req,res)=>{
  try {
    if(!stripe) return res.status(500).json({error:'Stripe is not configured on the server.'});
    const ids = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
    const selected = ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);
    if(!selected.length) return res.status(400).json({error:'No valid products selected.'});
    if(selected.some(p=>p.stock<=0)) return res.status(409).json({error:'One or more selected products are sold out.'});
    const billingTypes = new Set(selected.map(p=>p.billing));
    if(billingTypes.size > 1) return res.status(400).json({error:'Please checkout vehicles separately from monthly subscriptions.'});
    const monthly = selected[0].billing === 'monthly';
    const session = await stripe.checkout.sessions.create({
      mode: monthly ? 'subscription' : 'payment',
      managed_payments: {enabled:false},
      line_items: selected.map(p=>({
        price_data:{
          currency:'gbp',
          product_data:{name:p.name,description:p.description},
          unit_amount:Math.round(p.price*100),
          ...(monthly ? {recurring:{interval:'month'}} : {})
        },
        quantity:1
      })),
      success_url:`${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${BASE_URL}/#store`,
      metadata:{product_ids:selected.map(p=>p.id).join(','),billing:monthly?'monthly':'once',purchase_id:makePurchaseId()}
    });
    res.json({url:session.url});
  } catch(error){
    console.error('Stripe checkout error:',error);
    res.status(500).json({error:error?.message || 'Checkout could not be created.'});
  }
});

app.listen(PORT,()=>console.log(`By The People store running on port ${PORT}`));
