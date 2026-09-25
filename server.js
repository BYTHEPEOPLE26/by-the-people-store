import express from "express";
import Stripe from "stripe";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const products = [
  {id:"biz-01", type:"Businesses", name:"Premium Auto Dealership", price:149.99, image:"https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=1200&q=80", description:"A complete business package for your FiveM server.", tags:["Business","RP Ready"]},
  {id:"biz-02", type:"Businesses", name:"Downtown Restaurant", price:99.99, image:"https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80", description:"A premium restaurant business setup.", tags:["Business","MLO"]},
  {id:"veh-01", type:"Vehicles", name:"Liberty GT", price:34.99, image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80", description:"Premium performance vehicle for your roleplay fleet.", tags:["Vehicle","Custom"]},
  {id:"veh-02", type:"Vehicles", name:"Patriot SUV", price:29.99, image:"https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80", description:"A rugged SUV built for American-style RP.", tags:["Vehicle","SUV"]},
  {id:"mlo-01", type:"MLOs", name:"Federal Office Interior", price:79.99, image:"https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80", description:"A detailed professional interior for your server.", tags:["MLO","Interior"]},
  {id:"mlo-02", type:"MLOs", name:"Modern Beach House", price:69.99, image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80", description:"A premium residential MLO with a modern layout.", tags:["MLO","Housing"]}
];

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/products", (_req,res) => res.json(products));

app.post("/api/create-checkout-session", express.json(), async (req,res) => {
  if (!stripe) return res.status(500).json({error:"Stripe is not configured. Add STRIPE_SECRET_KEY to .env."});
  const ids = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
  const selected = ids.map(id => products.find(p => p.id === id)).filter(Boolean);
  if (!selected.length) return res.status(400).json({error:"No valid products selected."});

  const session = await stripe.checkout.sessions.create({
  mode: "payment",
  managed_payments: {
    enabled: false
  },
    line_items: selected.map(p => ({
      price_data: {
        currency: "gbp",
        product_data: {name:p.name, description:p.description, images:[p.image]},
        unit_amount: Math.round(p.price * 100)
      },
      quantity: 1
    })),
    success_url: `${process.env.BASE_URL || "http://localhost:"+PORT}/success.html`,
    cancel_url: `${process.env.BASE_URL || "http://localhost:"+PORT}/#store`,
    metadata: {product_ids: selected.map(p=>p.id).join(",")}
  });
  res.json({url:session.url});
});

app.listen(PORT, () => console.log(`By The People store running on http://localhost:${PORT}`));
