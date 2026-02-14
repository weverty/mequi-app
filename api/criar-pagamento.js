export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  const { itens } = req.body;

  try {
    // FORMATANDO OS ITENS PARA O PADRÃO EXATO DO MERCADO PAGO
    const itemsSimplificados = itens.map(item => ({
      title: item.nome || item.titulo, // O MP exige 'title'
      unit_price: Number(item.precoFinal || item.preco), // Deve ser número e se chamar 'unit_price'
      quantity: 1,
      currency_id: 'BRL'
    }));

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VITE_MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: itemsSimplificados, // Enviando a lista limpa
        back_urls: {
          success: "https://mequi-app.vercel.app/?status=approved",
          failure: "https://mequi-app.vercel.app/?status=failed",
        },
        auto_return: "approved",
      })
    });

    const data = await response.json();

    // Se a API do MP retornar erro, vamos capturar aqui
    if (data.error || !data.init_point) {
        return res.status(400).json({ error: data.message || "Erro na preferência do MP" });
    }

    return res.status(200).json({ url: data.init_point });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}