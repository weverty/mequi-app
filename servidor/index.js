import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*', // Permite que seu frontend acesse sem restrições
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
// --- CONEXÃO MONGODB ---
const mongoURI = "mongodb+srv://wevertygta2017:29.Weverty@cluster0.pqsuy.mongodb.net/mequi_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Conectado ao MongoDB!"))
    .catch(err => console.error("❌ Erro de conexão:", err));

// --- MODELOS (MOLDE DOS DADOS) ---

// 1. Produtos (Atualizado com as travas de personalização)
const ProdutoSchema = new mongoose.Schema({
    titulo: String,
    preco: Number,
    categoria: String,
    img: String,
    ingredientes: [String],
    permiteAcrescimo: { type: Boolean, default: false }, // Se aceita bacon, queijo extra, etc.
    permitirRemover: { type: Boolean, default: false }   // Se permite tirar alface, cebola, etc.
});
const Produto = mongoose.model('Produto', ProdutoSchema);

// 2. Adicionais (Bacon, Queijo, etc.)
const AdicionalSchema = new mongoose.Schema({
    nome: String,
    preco: Number
});
const Adicional = mongoose.model('Adicional', AdicionalSchema);

// 3. Categorias (Lanches, Bebidas, etc.)
const CategoriaSchema = new mongoose.Schema({
    nome: { type: String, unique: true }
});
const Categoria = mongoose.model('Categoria', CategoriaSchema);

// --- ROTAS DO BANCO DE DATOS ---

// PRODUTOS
app.get('/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find();
        res.json(produtos);
    } catch (e) { res.status(500).send(e); }
});

app.post('/produtos', async (req, res) => {
    try {
        const novo = new Produto(req.body);
        await novo.save();
        res.json(novo);
    } catch (e) { res.status(500).send(e); }
});

app.delete('/produtos/:id', async (req, res) => {
    await Produto.findByIdAndDelete(req.params.id);
    res.json({ mensagem: "Removido!" });
});

// Rota para EDITAR um produto existente
app.put('/produtos/:id', async (req, res) => {
    try {
        const produtoAtualizado = await Produto.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true } // Retorna o produto já com as mudanças
        );
        res.json(produtoAtualizado);
    } catch (error) {
        res.status(500).json({ error: "Erro ao editar produto" });
    }
});

// ADICIONAIS
app.get('/adicionais', async (req, res) => {
    const adcs = await Adicional.find();
    res.json(adcs);
});

app.post('/adicionais', async (req, res) => {
    const novo = new Adicional(req.body);
    await novo.save();
    res.json(novo);
});

app.delete('/adicionais/:id', async (req, res) => {
    await Adicional.findByIdAndDelete(req.params.id);
    res.json({ mensagem: "Adicional removido!" });
});

// CATEGORIAS
app.get('/categorias', async (req, res) => {
    const cats = await Categoria.find();
    res.json(cats.map(c => c.nome)); // Retorna apenas os nomes em uma lista
});

app.post('/categorias', async (req, res) => {
    try {
        const nova = new Categoria({ nome: req.body.nome.toLowerCase() });
        await nova.save();
        res.json(nova);
    } catch (e) { res.status(400).json({ error: "Categoria já existe ou erro no nome" }); }
});

app.delete('/categorias/:nome', async (req, res) => {
    await Categoria.findOneAndDelete({ nome: req.params.nome });
    res.json({ mensagem: "Categoria removida!" });
});

// --- MERCADO PAGO ---
const client = new MercadoPagoConfig({ 
    accessToken: 'APP_USR-3117101718336968-012116-254410de47b5c77aeca50f1d6aedc6dd-1779479870' 
});

app.post('/criar-pagamento', async (req, res) => {
    try {
        const { itens, taxa } = req.body;

        const itemsMercadoPago = itens.map(i => ({
            title: String(i.titulo),
            unit_price: Number(parseFloat(i.preco).toFixed(2)),
            quantity: Number(i.quantidade),
            currency_id: 'BRL'
        }));

        if (taxa > 0) {
            itemsMercadoPago.push({
                title: 'Taxa de Entrega',
                unit_price: Number(parseFloat(taxa).toFixed(2)),
                quantity: 1,
                currency_id: 'BRL'
            });
        }

        const preference = new Preference(client);

        const response = await preference.create({
            body: {
                items: itemsMercadoPago,
                back_urls: {
                    success: "http://localhost:5173",
                    failure: "http://localhost:5173",
                    pending: "http://localhost:5173"
                },
                // DESATIVADO PARA EVITAR ERRO COM LOCALHOST
                // auto_return: "approved", 
                statement_descriptor: "MEQUI",
            }
        });

        // Retorna a URL de checkout
        res.json({ url: response.init_point });

    } catch (error) {
        console.error("ERRO CRÍTICO MP:", error);
        res.status(400).json({ 
            error: "Erro na API do Mercado Pago", 
            message: error.message 
        });
    }
});

const PORTA = 3001;
app.listen(PORTA, () => {
    console.log(`✅ Servidor e Banco de Dados ON em: http://localhost:${PORTA}`);
});