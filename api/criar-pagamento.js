// api/criar-pagamento.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  const { itens, taxa } = req.body;

  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VITE_MP_ACCESS_TOKEN}` // Puxa da Vercel
      },
      body: JSON.stringify({
        items: itens.map(i => ({
          title: i.titulo,
          unit_price: i.preco,
          quantity: i.quantidade,
          currency_id: "BRL"
        })),
        back_urls: {
          success: "https://mequi-app.vercel.app/?status=approved", // Troque pelo seu link
          failure: "https://mequi-app.vercel.app/?status=failed",
        },
        auto_return: "approved",
      })
    });

    const data = await response.json();
    return res.status(200).json({ url: data.init_point });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}