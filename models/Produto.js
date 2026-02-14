import mongoose from 'mongoose';

const ProdutoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    preco: { type: Number, required: true },
    categoria: { type: String, required: true },
    img: String,
    ingredientes: [String],
    permiteAcrescimo: Boolean,
    permitirRemover: Boolean
});

export const Produto = mongoose.model('Produto', ProdutoSchema);