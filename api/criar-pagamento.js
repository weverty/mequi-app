export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  const { itens } = req.body;

  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VITE_MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: itens,
        back_urls: {
          // AQUI ESTÁ O SEGREDO: Use o seu link da Vercel
          success: "https://mequi-app.vercel.app/?status=approved",
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