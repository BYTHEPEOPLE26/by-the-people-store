import express from 'express';
import Stripe from 'stripe';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const products = [
  {id:'veh-01',type:'Vehicles',name:'Gresley Hellfire PD',price:25,billing:'once',stock:999,images:['GRESLEYHELLFIREPD.webp'],description:'Gresley Hellfire PD vehicle for your By The People RolePlay fleet.'},
  {id:'veh-02',type:'Vehicles',name:'Gresley Hellfire',price:20,billing:'once',stock:999,images:['GRESLEYHELLFIRE.webp'],description:'Gresley Hellfire vehicle for your roleplay fleet.'},
  {id:'veh-03',type:'Vehicles',name:'Schlagen STR',price:20,billing:'once',stock:999,images:['SCHLAGENSTR.webp'],description:'Schlagen STR performance vehicle.'},
  {id:'veh-04',type:'Vehicles',name:'MVolt',price:6,billing:'once',stock:999,images:['MVOLT.webp'],description:'MVolt vehicle package.'},
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

app.use(express.static(path.join(__dirname,'public')));
app.get('/api/products',(_req,res)=>res.json(products));

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
      success_url:`${BASE_URL}/success.html`,
      cancel_url:`${BASE_URL}/#store`,
      metadata:{product_ids:selected.map(p=>p.id).join(','),billing:monthly?'monthly':'once'}
    });
    res.json({url:session.url});
  } catch(error){
    console.error('Stripe checkout error:',error);
    res.status(500).json({error:error?.message || 'Checkout could not be created.'});
  }
});

app.listen(PORT,()=>console.log(`By The People store running on port ${PORT}`));
