import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState(''); 
  const [pedidosCozinha, setPedidosCozinha] = useState([]); 
  const [modoAdmin, setModoAdmin] = useState(false);
  const [abaAdmin, setAbaAdmin] = useState('produtos'); 
  const [senhaGerada, setSenhaGerada] = useState(null);
  const [mostrarMonitorCozinha, setMostrarMonitorCozinha] = useState(true);

  // Estados dos Modais
  const [itemEmPersonalizacao, setItemEmPersonalizacao] = useState(null);
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [modalAdicionaisAberto, setModalAdicionaisAberto] = useState(false);
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false);
  const [modalResumoAberto, setModalResumoAberto] = useState(false);
  const [modalFluxoAberto, setModalFluxoAberto] = useState(false);
  const [produtoSendoEditado, setProdutoSendoEditado] = useState(null);
  
  // Login e Configurações
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [senhaMestra, setSenhaMestra] = useState(() => localStorage.getItem('mequi_senha') || "1234");
  const [showConfigSenha, setShowConfigSenha] = useState(false);

  const [opcaoConsumo, setOpcaoConsumo] = useState(''); 
  const [dadosEntrega, setDadosEntrega] = useState({ nome: '', telefone: '', rua: '', numero: '', referencia: '', mesa: '' });

  // NOVOS ESTADOS PARA O MERCADO PAGO
  const [metodoPagamento, setMetodoPagamento] = useState('local'); // 'local' ou 'online'
  const [processandoMP, setProcessandoMP] = useState(false);
  const [avisoSucesso, setAvisoSucesso] = useState(null);
  const [pedidoParaImprimir, setPedidoParaImprimir] = useState(null);

const [pedidoFinalizado, setPedidoFinalizado] = useState(() => {
  const salvo = localStorage.getItem('mequi_ultimo_pedido');
  return salvo ? JSON.parse(salvo) : null;
});

const [metodoLocalDetallhe, setMetodoLocalDetallhe] = useState(''); // 'troco', 'maquininha' ou 'pix_maquina'
const [valorTroco, setValorTroco] = useState('');

// DADOS E HISTÓRICO - AGORA BUSCANDO DO BANCO
const [dados, setDados] = useState({
  categorias: [],
  produtos: {},
  adicionais: []
});


const [historicoVendas, setHistoricoVendas] = useState(() => {
  const salvo = localStorage.getItem('mequi_historico');
  // Se existir algo salvo, retorna os dados, senão retorna um array vazio
  return salvo ? JSON.parse(salvo) : [];
});

  // 1. Altere a inicialização do carrinho para ler do localStorage
  const [carrinho, setCarrinho] = useState(() => {
    const salvo = localStorage.getItem('mequi_carrinho');
    return salvo ? JSON.parse(salvo) : [];
  });

  // 2. Altere a inicialização do total para calcular baseado no carrinho salvo
  const [total, setTotal] = useState(() => {
    const salvo = localStorage.getItem('mequi_carrinho');
    if (salvo) {
      const itens = JSON.parse(salvo);
      return itens.reduce((acc, item) => acc + item.precoFinal, 0);
    }
    return 0;
  });

const atualizarDadosDoBanco = async () => {
  try {
    const response = await fetch('http://localhost:3001/produtos');
    const produtosDoBanco = await response.json();

    if (produtosDoBanco.length > 0) {
      const categoriasUnicas = [...new Set(produtosDoBanco.map(p => p.categoria))];
      const produtosAgrupados = {};

      categoriasUnicas.forEach(cat => {
        produtosAgrupados[cat] = produtosDoBanco.filter(p => p.categoria === cat);
      });

      setDados(prev => ({
        ...prev,
        categorias: categoriasUnicas,
        produtos: produtosAgrupados
      }));
    }
  } catch (error) {
    console.error("Erro ao atualizar dados:", error);
  }
};

const dispararReimpressao = (venda) => {
  // 1. Cria um iframe invisível para a impressão
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  // 2. Monta o HTML do cupom com estilos forçados para 58mm
  const conteudoCupom = `
    <html>
      <head>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { 
            width: 58mm; margin: 0; padding: 2mm; 
            font-family: 'Courier New', Courier, monospace; 
            color: black; background: white; font-size: 12px;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .border-dashed { border-bottom: 1px dashed black; padding-bottom: 5px; margin-bottom: 5px; }
          .flex { display: flex; justify-content: space-between; }
          .item { margin-bottom: 5px; }
          .total { font-size: 16px; font-weight: bold; margin-top: 10px; border-top: 1px solid black; pt: 5px; }
        </style>
      </head>
      <body>
        <div class="text-center border-dashed">
          <h2 style="margin:0">SISTEMA MEQUI</h2>
          <p style="font-size:9px">${venda.data} - ${venda.hora}</p>
        </div>
        
        <div class="text-center">
          <p class="bold" style="margin:0">${venda.tipo.toUpperCase()}</p>
          <h1 style="font-size:35px; margin:5px 0">#${venda.senha}</h1>
        </div>

        <div class="border-dashed">
          ${venda.itens.map(it => `
            <div class="item">
              <div class="flex">
                <span class="bold">1x ${it.nome}</span>
                <span>R$ ${it.precoFinal.toFixed(2)}</span>
              </div>
              ${it.adicionais.map(adc => `<div style="font-size:10px">+ ${adc}</div>`).join('')}
              ${it.removidos.map(rem => `<div style="font-size:10px">- SEM ${rem.toUpperCase()}</div>`).join('')}
            </div>
          `).join('')}
        </div>

        <div class="total flex">
          <span>TOTAL:</span>
          <span>R$ ${venda.totalFinal.toFixed(2)}</span>
        </div>

        <div class="text-center" style="margin-top:20px; font-size:9px">
          *** REIMPRESSÃO DE LOG ***
        </div>
      </body>
    </html>
  `;

  // 3. Escreve o conteúdo no iframe e manda imprimir
  doc.open();
  doc.write(conteudoCupom);
  doc.close();

  // 4. Aguarda carregar e dispara
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    // 5. Remove o iframe após a janela de impressão fechar
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 500);
};

  // --- EFEITOS ---

  // --- CARREGAMENTO GLOBAL DO SUPABASE ---
  const carregarTudoDoBanco = async () => {
    try {
      const [resProds, resCats, resAdcs] = await Promise.all([
        supabase.from('produtos').select('*'),
        supabase.from('categorias').select('*'),
        supabase.from('adicionais').select('*')
      ]);

      if (resProds.error || resCats.error || resAdcs.error) throw new Error("Erro na conexão");

      const categoriasNomes = resCats.data.map(c => c.nome.toUpperCase());
      const agrupados = {};
      
      categoriasNomes.forEach(cat => {
        agrupados[cat] = resProds.data.filter(p => p.categoria.toUpperCase() === cat);
      });

      setDados({
        categorias: categoriasNomes,
        produtos: agrupados,
        adicionais: resAdcs.data
      });
      
      if (categoriasNomes.length > 0 && !abaAtiva) {
        setAbaAtiva(categoriasNomes[0]);
      }
      setCarregando(false);
    } catch (error) {
      console.error("Falha ao sincronizar:", error);
      setCarregando(false);
    }
  };

  useEffect(() => {
  localStorage.setItem('mequi_historico', JSON.stringify(historicoVendas));
}, [historicoVendas]);

  useEffect(() => {
    if ((!abaAtiva || !dados.categorias.includes(abaAtiva)) && dados.categorias.length > 0) {
      setAbaAtiva(dados.categorias[0]);
    }
  }, [dados.categorias, abaAtiva]);


  useEffect(() => { setTimeout(() => setCarregando(false), 1000); }, []);

  // Salva o carrinho no localStorage toda vez que ele mudar
  useEffect(() => {
    localStorage.setItem('mequi_carrinho', JSON.stringify(carrinho));
  }, [carrinho]);

useEffect(() => {

  // --- EFEITOS DE INICIALIZAÇÃO ---
  useEffect(() => {
    carregarTudoDoBanco();
  }, []);

  useEffect(() => {
    localStorage.setItem('mequi_historico', JSON.stringify(historicoVendas));
  }, [historicoVendas]);

  useEffect(() => {
    localStorage.setItem('mequi_carrinho', JSON.stringify(carrinho));
  }, [carrinho]);

  // --- FUNÇÕES ADMIN (SUPABASE) ---
  const adicionarCategoria = async (nome) => {
    const n = nome.trim().toUpperCase(); 
    if (!n) return;
    try {
      const { error } = await supabase.from('categorias').insert([{ nome: n }]);
      if (error) throw error;
      setAvisoSucesso("Categoria criada!");
      await carregarTudoDoBanco();
      setModalCategoriasAberto(false);
    } catch (error) { alert(error.message); }
  };

  const removerCategoria = async (cat) => {
    if (window.confirm(`Excluir a categoria "${cat}"?`)) {
      try {
        await supabase.from('produtos').delete().eq('categoria', cat);
        const { error } = await supabase.from('categorias').delete().eq('nome', cat);
        if (error) throw error;
        setAvisoSucesso("Categoria removida!");
        await carregarTudoDoBanco();
      } catch (error) { alert(error.message); }
    }
  };

  const salvarProdutoAdmin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const dadosProd = {
      titulo: fd.get('nome'),
      preco: parseFloat(fd.get('preco')),
      categoria: fd.get('categoria'),
      img: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
      ingredientes: fd.get('ingredientes') ? fd.get('ingredientes').split(',').map(i => i.trim()) : [],
      permiteAcrescimo: fd.get('permiteAcrescimo') === 'on', 
      permitirRemover: fd.get('permitirRemover') === 'on',
    };

    try {
      let erro;
      if (produtoSendoEditado) {
        const { error } = await supabase.from('produtos').update(dadosProd).eq('id', produtoSendoEditado.id);
        erro = error;
      } else {
        const { error } = await supabase.from('produtos').insert([dadosProd]);
        erro = error;
      }
      if (erro) throw erro;
      setModalAdminAberto(false);
      setAvisoSucesso("Cardápio Atualizado!");
      await carregarTudoDoBanco();
    } catch (error) { alert(error.message); }
  };

  const deletarProduto = async (id) => {
    if (window.confirm("Excluir este produto?")) {
      try {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) throw error;
        setAvisoSucesso("Removido!");
        await carregarTudoDoBanco();
      } catch (error) { alert(error.message); }
    }
  };

  const salvarAdicionalAdmin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const { error } = await supabase.from('adicionais').insert([{ 
        nome: fd.get('nome'), 
        preco: parseFloat(fd.get('preco')) 
      }]);
      if (error) throw error;
      setModalAdicionaisAberto(false);
      await carregarTudoDoBanco();
    } catch (error) { alert(error.message); }
  };
}, []);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');

  if (status === 'approved') {
    const confirmarPedidoOnline = async () => {
      const senha = Math.floor(Math.random() * 900) + 100;
      
      const resumoPedido = {
        senha: senha.toString(),
        itens: JSON.parse(localStorage.getItem('mequi_carrinho') || '[]'),
        tipo: 'online',
        total: parseFloat(localStorage.getItem('mequi_total_temp') || '0'),
        data: new Date().toLocaleString(),
        pagamento: 'Mercado Pago (Aprovado)'
      };

      // Salva no Supabase
      await supabase.from('pedidos').insert([resumoPedido]);
      
      // Salva localmente para persistência
      localStorage.setItem('mequi_ultimo_pedido', JSON.stringify(resumoPedido));
      setPedidoFinalizado(resumoPedido);
      
      // Limpa carrinho
      setCarrinho([]);
      setTotal(0);
      localStorage.removeItem('mequi_carrinho');
      
      // Limpa a URL
      window.history.replaceState({}, document.title, "/");
    };

    confirmarPedidoOnline();
  }
}, []);

// MUDANÇA NO App.jsx
const gerarPagamentoMercadoPago = async () => {
    setProcessandoMP(true);
    try {
        // Use apenas /api/... sem o http://localhost
        const response = await fetch('/api/criar-pagamento', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itens: carrinho.map(i => ({ 
                    titulo: i.nome, 
                    preco: i.precoFinal, 
                    quantidade: 1 
                }))
            })
        });

        if (!response.ok) throw new Error("Erro na API");

        const resData = await response.json();
        if (resData.url) {
            window.location.href = resData.url; 
        }
    } catch (err) {
        console.error(err);
        alert("Ocorreu um erro ao gerar o pagamento. Verifique se o token está correto.");
    } finally {
        setProcessandoMP(false);
    }
};

  // --- FUNÇÕES ADMIN ---
  const acaoLogoM = () => { if (modoAdmin) setAbaAdmin(abaAdmin === 'produtos' ? 'pdv' : 'produtos'); };

  const tentarLoginAdmin = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('senhaAdmin') === senhaMestra) { 
      setModoAdmin(true); setAbaAdmin('produtos'); setModalLoginAberto(false);
    } else alert("Senha incorreta!");
  };

const adicionarCategoria = async (nome) => {
  const n = nome.trim().toUpperCase(); // Salvar em maiúsculo para combinar com o layout
  if (!n) return;

  try {
    const { error } = await supabase
      .from('categorias')
      .insert([{ nome: n }]);

    if (error) throw error;

    setAvisoSucesso("Categoria adicionada!");
    // Recarrega os dados do banco para atualizar a lista na tela
    await carregarTudoDoBanco(); 
    setModalCategoriasAberto(false);
  } catch (error) {
    alert("Erro ao salvar categoria: " + error.message);
  }
};
  const removerCategoria = (cat) => {
    if (window.confirm(`Deseja remover a categoria "${cat}"?`)) {
      const novasCats = dados.categorias.filter(c => c !== cat);
      const novosProds = { ...dados.produtos };
      delete novosProds[cat];
      setDados({ ...dados, categorias: novasCats, produtos: novosProds });
    }
  };

const salvarProdutoAdmin = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  
  const dadosProd = {
    titulo: fd.get('nome'),
    preco: parseFloat(fd.get('preco')),
    categoria: fd.get('categoria'),
    img: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    ingredientes: fd.get('ingredientes') ? fd.get('ingredientes').split(',').map(i => i.trim()) : [],
    permiteAcrescimo: fd.get('permiteAcrescimo') === 'on', 
    permitirRemover: fd.get('permitirRemover') === 'on',
  };

  try {
    let erro;
    if (produtoSendoEditado) {
      // UPDATE no Supabase
      const { error } = await supabase
        .from('produtos')
        .update(dadosProd)
        .eq('id', produtoSendoEditado.id);
      erro = error;
    } else {
      // INSERT no Supabase
      const { error } = await supabase
        .from('produtos')
        .insert([dadosProd]);
      erro = error;
    }

    if (erro) throw erro;

    setModalAdminAberto(false);
    setProdutoSendoEditado(null);
    setAvisoSucesso("Cardápio Atualizado!");
    
    // Recarrega a página ou chama a função de atualizar
    window.location.reload(); 
  } catch (error) {
    alert("Erro ao salvar no Supabase: " + error.message);
  }
};

const salvarAdicionalAdmin = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const { error } = await supabase.from('adicionais').insert([{ 
    nome: fd.get('nome'), 
    preco: parseFloat(fd.get('preco')) 
  }]);
  if (!error) window.location.reload();
};

  // --- FUNÇÕES CARRINHO ---
const calcularPrecoItemAtual = () => {
  if (!itemEmPersonalizacao) return 0;
  // Soma o preço base + cada adicional da lista de escolhidos
  const valorExtras = (itemEmPersonalizacao.adicionaisEscolhidos || []).reduce((acc, curr) => acc + curr.preco, 0);
  return (itemEmPersonalizacao.preco || 0) + valorExtras;
};

const adicionarAoCarrinho = () => {
  const precoFinal = calcularPrecoItemAtual();
  
  const itemParaCarrinho = { 
    ...itemEmPersonalizacao, 
    precoFinal, 
    instanceId: Math.random() 
  };

  setTotal(prev => prev + precoFinal);
  setCarrinho(prev => [...prev, itemParaCarrinho]);
  setItemEmPersonalizacao(null);
};

const finalizarPedidoTotal = async () => {
  try {
    setProcessandoMP(true);
    const senha = Math.floor(Math.random() * 900) + 100;
    const taxaEntrega = opcaoConsumo === 'entrega' ? 5 : 0;
    const totalComTaxa = total + taxaEntrega;

    // --- LOGICA PARA PAGAMENTO ONLINE (MERCADO PAGO) ---
    if (metodoPagamento === 'online') {
      // 1. Salva tudo no localStorage para recuperar quando o cliente voltar do site do banco
      localStorage.setItem('mequi_total_temp', totalComTaxa.toString());
      localStorage.setItem('mequi_carrinho_temp', JSON.stringify(carrinho));
      localStorage.setItem('mequi_dados_cliente', JSON.stringify({
        ...dadosEntrega,
        opcaoConsumo: opcaoConsumo
      }));

      // 2. Chama a função que faz o redirecionamento
      await gerarPagamentoMercadoPago();
      return; // Interrompe aqui, pois o cliente vai sair da página
    }

    // --- LOGICA PARA PAGAMENTO LOCAL (NA ENTREGA OU NA RETIRADA) ---
    
    // Define a descrição do local que aparecerá no Monitor/Cozinha
    let infoDestino = "";
    if (opcaoConsumo === 'retirar') {
      infoDestino = `📍 RETIRADA NO BALCÃO`;
    } else {
      infoDestino = `🚀 ENTREGA: ${dadosEntrega.rua}, ${dadosEntrega.numero} (${dadosEntrega.referencia})`;
    }

    // Define o detalhe do pagamento para o Log
    const detalhePgto = metodoPagamento === 'retirada_local' 
      ? "PAGAR NA RETIRADA" 
      : (metodoLocalDetallhe === 'troco' ? `DINHEIRO (Troco p/ ${valorTroco})` : `CARTÃO/PIX (Levar Maquininha)`);

    const novoPedido = {
      senha: senha.toString(),
      itens: carrinho,
      tipo: opcaoConsumo,
      info: `${infoDestino} | CLIENTE: ${dadosEntrega.nome} | TEL: ${dadosEntrega.telefone} | PGTO: ${detalhePgto}`,
      totalfinal: totalComTaxa,
      status: 'pendente_local'
    };

    // Salva no Supabase
    const { data, error } = await supabase
      .from('pedidos')
      .insert([novoPedido])
      .select();

    if (error) {
      console.error("Erro Supabase:", error);
      alert("Erro ao salvar no banco: " + error.message);
      return;
    }

    // Sucesso: Gera a senha na tela e limpa tudo
    setSenhaGerada(senha);
    
    // Limpa os estados e o carrinho
    setCarrinho([]);
    setTotal(0);
    localStorage.removeItem('mequi_carrinho');
    setModalFluxoAberto(false);

    // Remove a senha da tela após 5 segundos
    setTimeout(() => setSenhaGerada(null), 5000);

  } catch (err) {
    console.error("Erro crítico:", err);
    alert("Ocorreu um erro interno. Tente novamente.");
  } finally {
    setProcessandoMP(false);
  }
};

const TelaSucesso = () => {
  if (!pedidoFinalizado) return null;

  // 1. Recupera os dados que salvamos no finalizarPedidoTotal
  const dadosSalvos = JSON.parse(localStorage.getItem('mequi_dados_cliente') || '{}');
  
  // 2. Configura o número da sua loja (Substitua pelo seu real)
  const CELULAR_LOJA = "5531972129019"; 

  // 3. Monta a lista de itens com os detalhes de adicionais e removidos
  const itensTexto = pedidoFinalizado.itens.map(it => {
    let linha = `• 1x ${it.nome}`;
    if (it.adicionaisEscolhidos && it.adicionaisEscolhidos.length > 0) {
      const adcs = it.adicionaisEscolhidos.map(a => a.nome).join(', ');
      linha += `%0A   [+] Adicionais: ${adcs}`;
    }
    if (it.removidos && it.removidos.length > 0) {
      linha += `%0A   [-] Sem: ${it.removidos.join(', ')}`;
    }
    return linha;
  }).join('%0A%0A');

  // 4. Monta o corpo da mensagem com todos os detalhes
  const mensagemZap = 
    `*🍔 NOVO PEDIDO - SENHA #${pedidoFinalizado.senha}*%0A` +
    `------------------------------------------%0A` +
    `*👤 CLIENTE:* ${dadosSalvos.nome || 'Não informado'}%0A` +
    `*📞 CONTATO:* ${dadosSalvos.telefone || 'Não informado'}%0A` +
    `*📍 TIPO:* ${pedidoFinalizado.tipo === 'entrega' ? 'DELIVERY' : 'RETIRADA NO BALCÃO'}%0A` +
    
    (pedidoFinalizado.tipo === 'entrega' ? 
    `*🏠 ENDEREÇO:* ${dadosSalvos.rua}, ${dadosSalvos.numero}%0A` +
    `*📌 REF:* ${dadosSalvos.referencia || 'N/A'}%0A` : '') +
    
    `------------------------------------------%0A` +
    `*🛒 ITENS:*%0A${itensTexto}%0A` +
    `------------------------------------------%0A` +
    `*💰 TOTAL DO PEDIDO: R$ ${pedidoFinalizado.total.toFixed(2)}*%0A` +
    `*💳 PAGAMENTO:* ${pedidoFinalizado.pagamento || 'A combinar'}%0A` +
    `------------------------------------------%0A` +
    `_Pedido enviado via Sistema Mequi_`;

  return (
    <div className="fixed inset-0 bg-white z-[5000] flex flex-col items-center p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-8 border-t-[12px] border-green-500 shadow-2xl mt-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 text-green-600 rounded-full p-6 mb-4 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-4xl font-black uppercase italic text-center tracking-tighter text-gray-800">Sucesso!</h2>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Clique abaixo para enviar à loja</p>
        </div>

        <div className="bg-gray-50 rounded-[2.5rem] p-8 shadow-inner border-2 border-dashed border-gray-200 mb-8">
          <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase italic">Sua Senha</p>
            <h1 className="text-7xl font-black italic text-gray-800 tracking-tighter">#{pedidoFinalizado.senha}</h1>
          </div>
        </div>

        <div className="space-y-4">
          <a 
            href={`https://api.whatsapp.com/send?phone=${CELULAR_LOJA}&text=${mensagemZap}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] text-white py-5 rounded-2xl font-black uppercase italic flex justify-center items-center gap-3 shadow-lg active:scale-95 transition-all text-sm"
          >
            <span className="text-2xl">📱</span> Enviar Detalhes para Loja
          </a>
          
          <button 
            onClick={() => {
              localStorage.removeItem('mequi_ultimo_pedido');
              setPedidoFinalizado(null);
              window.location.reload(); 
            }}
            className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl font-black uppercase italic text-xs hover:bg-gray-200"
          >
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    </div>
  );
};

  // --- RENDER MONITOR ---
  const RenderMonitor = () => (
    <aside className="bg-gray-800 rounded-[2.5rem] p-6 shadow-2xl h-[85vh] sticky top-24 overflow-y-auto border-4 border-gray-700 flex flex-col w-full">
      <div className="flex flex-col items-center gap-4 mb-6">
        <h2 className="font-black text-white uppercase italic text-center text-sm tracking-widest">Monitor Preparo</h2>
        <div className="bg-black/40 p-1 rounded-full flex w-full">
          <button onClick={() => setMostrarMonitorCozinha(true)} className={`flex-1 py-2 rounded-full text-[10px] font-black uppercase transition ${mostrarMonitorCozinha ? 'bg-[#ffbc0d] text-black' : 'text-gray-400'}`}>Monitor</button>
          <button onClick={() => setMostrarMonitorCozinha(false)} className={`flex-1 py-2 rounded-full text-[10px] font-black uppercase transition ${!mostrarMonitorCozinha ? 'bg-green-500 text-white' : 'text-gray-400'}`}>Pedidos</button>
        </div>
      </div>
      <div className="space-y-4">
        {pedidosCozinha.map((ped) => (
          mostrarMonitorCozinha ? (
            <div key={ped.id} className="bg-white rounded-2xl shadow-lg border-l-[10px] border-[#ffbc0d] p-3 text-sm italic font-bold">
              <div className="flex justify-between items-center mb-2 font-black italic">
                <span className="text-xl">#{ped.senha}</span>
                <span className="text-[8px] bg-black text-white px-2 py-1 rounded uppercase">{ped.tipo}</span>
              </div>
              {ped.itens.map((it, i) => (
                <div key={i} className="border-b border-dashed mb-1 pb-1">
                  <p className="font-black uppercase text-[11px] italic">● {it.nome}</p>
                </div>
              ))}
              <button onClick={() => setPedidosCozinha(pedidosCozinha.filter(p => p.id !== ped.id))} className="w-full bg-green-600 text-white py-2 rounded-xl font-black text-[10px] mt-2 italic uppercase">Concluir</button>
            </div>
          ) : (
            <div key={ped.id} className="bg-green-500/10 border-2 border-green-500 p-4 rounded-3xl flex justify-between items-center text-white font-black italic">
                <span className="text-4xl">#{ped.senha}</span>
                <span className="text-[10px] uppercase tracking-widest text-green-500">Pronto</span>
            </div>
          )
        ))}
      </div>
    </aside>
  );

  // FUNÇÃO PARA EXCLUIR COM CONFIRMAÇÃO
const deletarProduto = async (id) => {
  if (window.confirm("Tem certeza que deseja excluir este produto do cardápio?")) {
    try {
      const response = await fetch(`http://localhost:3001/produtos/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAvisoSucesso("Produto removido com sucesso!");
        await atualizarDadosDoBanco();
        setTimeout(() => setAvisoSucesso(null), 3000);
      }
    } catch (error) {
      alert("Erro ao excluir produto.");
    }
  }
};

// FUNÇÃO PARA EDITAR (Ajuste na lógica de salvar)
// No seu código, a função salvarProdutoAdmin serve tanto para CRIAR quanto para EDITAR.
// Vamos ajustar para ela entender se existe um "produtoSendoEditado".

  if (carregando) return <div className="h-screen bg-[#db0007] flex items-center justify-center text-[#ffbc0d] text-7xl font-black italic">M</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans select-none">
      <header className="bg-[#db0007] p-4 flex justify-between items-center sticky top-0 z-50 border-b-4 border-[#ffbc0d] shadow-xl">
        <div className="flex items-center gap-6">
          <h1 onClick={acaoLogoM} className={`text-[#ffbc0d] text-5xl font-black italic transition-transform select-none ${modoAdmin ? 'cursor-pointer active:scale-90' : 'cursor-default'}`}>M</h1>
          <nav className="flex bg-black/20 p-1 rounded-full overflow-x-auto max-w-[50vw] scrollbar-hide">
            {(!modoAdmin || abaAdmin === 'pdv') ? (
              dados.categorias.map(cat => (
                <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-6 py-2 rounded-full font-black text-xs uppercase transition whitespace-nowrap ${abaAtiva === cat ? 'bg-[#ffbc0d] text-red-700' : 'text-white'}`}>{cat}</button>
              ))
            ) : (
              <>
                <button onClick={() => setAbaAdmin('produtos')} className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${abaAdmin === 'produtos' ? 'bg-white text-black' : 'text-white'}`}>Edição</button>
                <button onClick={() => setAbaAdmin('relatorios')} className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${abaAdmin === 'relatorios' ? 'bg-white text-black' : 'text-white'}`}>Relatórios</button>
                <button onClick={() => setShowConfigSenha(true)} className="px-4 py-1 rounded-full text-[10px] font-black uppercase text-white hover:bg-white/10 italic">Senha</button>
              </>
            )}
          </nav>
        </div>
        <button onClick={() => setModalResumoAberto(true)} className="bg-[#ffbc0d] px-6 py-2 rounded-full font-black text-gray-900 border-2 border-white shadow-md">
          {`CARRINHO: R$ ${total.toFixed(2)}`}
        </button>
      </header>

<main className={`p-6 grid gap-8 max-w-[1600px] mx-auto flex-grow w-full ${(modoAdmin && abaAdmin !== 'pdv') ? 'grid-cols-1 xl:grid-cols-4' : 'grid-cols-1'}`}>
  <div className={(modoAdmin && abaAdmin !== 'pdv') ? 'xl:col-span-3' : 'w-full'}>
    
    {/* --- ÁREA DE BOTÕES DE ATALHO DO ADMIN --- */}
    {modoAdmin && abaAdmin === 'produtos' && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <button onClick={() => setModalCategoriasAberto(true)} className="bg-purple-600 text-white py-4 rounded-2xl font-black italic shadow-lg uppercase text-xs">📂 Categorias</button>
        <button onClick={() => {setProdutoSendoEditado(null); setModalAdminAberto(true)}} className="bg-blue-600 text-white py-4 rounded-2xl font-black italic shadow-lg uppercase text-xs">＋ Produto</button>
        <button onClick={() => setModalAdicionaisAberto(true)} className="bg-orange-500 text-white py-4 rounded-2xl font-black italic shadow-lg uppercase text-xs">＋ Adicionais</button>
      </div>
    )}

    {/* --- LÓGICA DE EXIBIÇÃO: RELATÓRIO vs CARDÁPIO --- */}
{modoAdmin && abaAdmin === 'relatorios' ? (
  /* --- ABA DE RELATÓRIOS (NOVO NO TOPO) --- */
  <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-t-8 border-green-500 w-full">
    <h2 className="text-4xl font-black uppercase italic mb-8">Log de Vendas</h2>
    <div className="space-y-6">
      {historicoVendas.length > 0 ? (
        /* Removi o reverse() daqui para ler a ordem direta do array */
        historicoVendas.map((v) => (

          <div key={v.id} className="bg-gray-50 rounded-[2rem] p-6 border-2 border-gray-100 relative mb-4">
  
            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
              <div className="flex items-center gap-4">
                <span className="bg-gray-800 text-[#ffbc0d] px-4 py-2 rounded-2xl text-xl font-black italic">#{v.senha}</span>
                <div>
                  <p className="font-black text-gray-800 uppercase italic text-sm">{v.data} - {v.hora}</p>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border-2 border-gray-300">
                    {v.tipo === 'comer' ? '📍 Mesa' : v.tipo === 'entrega' ? '🚀 Entrega' : '🛍️ Balcão'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase">Local</p>
                <p className="font-black italic text-gray-700 text-sm">{v.info}</p>
              </div>
            </div>

{/* Dentro do map do Log de Vendas, na parte dos itens */}
<div className="bg-white rounded-2xl p-4 shadow-inner space-y-2 mb-4">
  {v.itens && v.itens.map((it, idx) => (
    <div key={idx} className="border-b border-gray-50 pb-2 last:border-0">
      <div className="flex justify-between items-start text-xs font-bold">
        <div className="flex-1">
          <span>● {it.nome}</span>
          
          {/* EXIBE ADICIONAIS */}
          {it.adicionais && it.adicionais.length > 0 && (
            <p className="text-[8px] text-orange-500 font-black ml-4 uppercase">
              + ADICIONAL: {it.adicionais.join(', ')}
            </p>
          )}

          {/* EXIBE REMOVIDOS */}
          {it.removidos && it.removidos.length > 0 && (
            <p className="text-[8px] text-red-500 font-black ml-4 uppercase italic">
              <span className="opacity-50 line-through">- REMOVER: {it.removidos.join(', ')}</span>
            </p>
          )}
        </div>

        {/* VALOR E BOTÃO ABAIXO */}
        <div className="flex flex-col items-end gap-2">
          <span>R$ {(it.precoFinal || 0).toFixed(2)}</span>
          
<button 
  onClick={() => dispararReimpressao(v)}
  className="bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg"
>
  <span>🖨️</span>
</button>

        </div>
      </div>
    </div>
  ))}
</div>

            <div className="flex justify-between items-center font-black">
              <div className="text-[10px] text-gray-400 uppercase">Subtotal: R$ {(v.subtotal || 0).toFixed(2)}</div>
              <div className="text-xl text-green-600 italic">Total: R$ {(v.totalFinal || 0).toFixed(2)}</div>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center font-black text-gray-300 py-10 uppercase">Sem vendas registradas</p>
      )}
    </div>
  </div>
) : (
      /* --- ABA DE CARDÁPIO (PRODUTOS) --- */
      <div className={`grid gap-6 ${ (modoAdmin && abaAdmin === 'produtos') ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 opacity-60 grayscale-[0.5]' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
        {(dados.produtos[abaAtiva] || []).map(item => (
          <div key={item._id || item.id} className="bg-white p-6 rounded-[3rem] shadow-xl flex flex-col items-center relative border-b-8 border-[#ffbc0d] hover:scale-105 transition-all">
            <h2 className="font-black text-xl uppercase italic text-gray-800 text-center leading-none mb-4">{item.titulo || item.nome}</h2>
            <img src={item.img} className="h-24 mb-4 object-contain" alt="" />
            <p className="text-[#db0007] font-black text-2xl mb-3 italic tracking-tighter">R$ {item.preco.toFixed(2)}</p>
            
            {item.ingredientes && item.ingredientes.length > 0 && (
              <div className="w-full bg-gray-100 border-2 border-gray-200 rounded-2xl p-3 mb-4 min-h-[60px] flex items-center justify-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase text-center leading-tight">
                  {Array.isArray(item.ingredientes) ? item.ingredientes.join(', ') : item.ingredientes}
                </p>
              </div>
            )}

            <button 
              onClick={() => setItemEmPersonalizacao({...item, nome: item.titulo || item.nome, removidos: [], adicionaisEscolhidos: []})} 
              className="bg-[#db0007] text-white w-full py-4 rounded-2xl font-black text-lg shadow-lg uppercase italic active:scale-95 transition-all"
            >
              Pedir
            </button>

            {modoAdmin && (
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => {setProdutoSendoEditado(item); setModalAdminAberto(true)}} className="bg-blue-500 text-white p-2 rounded-lg text-[8px] font-bold uppercase">Editar</button>
                <button onClick={() => deletarProduto(item._id)} className="bg-red-500 text-white p-2 rounded-lg text-[8px] font-bold uppercase">X</button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
  {/* MONITOR LATERAL (Aparece apenas no modo Admin fora do PDV) */}
  {modoAdmin && abaAdmin !== 'pdv' && <RenderMonitor />}
</main>

      {/* FOOTER */}
      <footer className="bg-[#e60000] p-6 border-t-4 border-[#ffbc0d] shadow-xl w-full">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-[#ffbc0d] text-xl font-black italic uppercase leading-none">SISTEMA MEQUI</h3>
            <p className="text-white text-[10px] font-bold uppercase opacity-90 tracking-widest">Tablet Operacional Ativo</p>
          </div>
          <button onClick={() => modoAdmin ? setModoAdmin(false) : setModalLoginAberto(true)} className="text-white/40 text-[9px] font-black uppercase p-2 hover:text-white transition-colors border border-white/10 rounded-xl">
            {modoAdmin ? "🔒 Sair do Painel" : "🔓 Modo Admin"}
          </button>
        </div>
      </footer>

      {/* --- MODAL EDICAO PRODUTO --- */}
      {modalAdminAberto && (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
          <form onSubmit={salvarProdutoAdmin} className="bg-white w-full max-w-md rounded-[3rem] p-8 border-t-8 border-blue-600 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black uppercase italic mb-6 text-center text-blue-600 tracking-tighter">Configurar Item</h2>
            <div className="space-y-4">
              <input name="nome" defaultValue={produtoSendoEditado?.nome} placeholder="Nome do Produto" required className="w-full p-4 bg-gray-100 rounded-2xl font-bold" />
              <input name="preco" type="number" step="0.01" defaultValue={produtoSendoEditado?.preco} placeholder="Preço (Ex: 29.90)" required className="w-full p-4 bg-gray-100 rounded-2xl font-bold" />
              <input name="ingredientes" defaultValue={produtoSendoEditado?.ingredientes?.join(', ')} placeholder="Ingredientes (separados por vírgula)" className="w-full p-4 bg-gray-100 rounded-2xl font-bold" />
              
              <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="permiteAcrescimo" defaultChecked={produtoSendoEditado?.permiteAcrescimo} className="w-5 h-5" />
                  <span className="font-black uppercase text-[10px]">Permitir Adicionais</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="permitirRemover" defaultChecked={produtoSendoEditado?.permitirRemover} className="w-5 h-5" />
                  <span className="font-black uppercase text-[10px]">Permitir Remover Ingredientes</span>
                </label>
              </div>

              <select name="categoria" defaultValue={produtoSendoEditado?.categoria || abaAtiva} className="w-full p-4 bg-gray-100 rounded-2xl font-bold">
                {dados.categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase italic mt-6 shadow-xl">Salvar Alterações</button>
            <button type="button" onClick={() => setModalAdminAberto(false)} className="w-full text-gray-400 text-xs mt-4 uppercase font-bold text-center underline">Cancelar</button>
          </form>
        </div>
      )}

      {/* --- MODAL PERSONALIZACAO CLIENTE --- */}
      {itemEmPersonalizacao && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto border-t-8 border-[#ffbc0d]">
            <h2 className="text-3xl font-black uppercase italic mb-4 text-center tracking-tighter">{itemEmPersonalizacao.nome}</h2>
            <div className="bg-gray-100 p-4 rounded-2xl mb-6 text-center border-2 border-gray-200 shadow-inner">
              <p className="text-4xl font-black text-gray-900 italic tracking-tighter">R$ {calcularPrecoItemAtual().toFixed(2)}</p>
            </div>

            {itemEmPersonalizacao.permitirRemover && itemEmPersonalizacao.ingredientes?.length > 0 && (
                <div className="mb-8">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-3 italic tracking-widest text-center">Tirar algum item?</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {itemEmPersonalizacao.ingredientes.map(ing => (
                        <button key={ing} onClick={() => {
                            const list = itemEmPersonalizacao.removidos.includes(ing) ? itemEmPersonalizacao.removidos.filter(r => r !== ing) : [...itemEmPersonalizacao.removidos, ing];
                            setItemEmPersonalizacao({...itemEmPersonalizacao, removidos: list});
                        }} className={`px-4 py-3 rounded-xl font-black text-[11px] uppercase border-2 transition-all ${itemEmPersonalizacao.removidos.includes(ing) ? 'border-red-500 text-red-500 line-through bg-red-50' : 'border-gray-100 text-gray-800 bg-white'}`}>
                          {ing}
                        </button>
                    ))}
                  </div>
                </div>
            )}

{itemEmPersonalizacao.permiteAcrescimo && dados.adicionais?.length > 0 && (
  <div className="border-t pt-6 mb-8">
    <p className="text-[10px] font-black text-orange-500 uppercase mb-4 italic tracking-widest text-center">Turbinar seu pedido?</p>
    <div className="space-y-3">
      {dados.adicionais.map(adc => {
        // CORREÇÃO AQUI: Usamos adc._id pois é o padrão que vem do seu banco
        const idAdicional = adc._id || adc.id;
        const estaSelecionado = itemEmPersonalizacao.adicionaisEscolhidos?.some(item => (item._id || item.id) === idAdicional);

        return (
          <button 
            key={idAdicional} 
            type="button" // Garante que não submeta formulários
            onClick={() => {
              const listaAtual = itemEmPersonalizacao.adicionaisEscolhidos || [];
              let novaLista;

              if (estaSelecionado) {
                // Se já estava lá, removemos comparando o _id
                novaLista = listaAtual.filter(item => (item._id || item.id) !== idAdicional);
              } else {
                // Se não estava, adicionamos
                novaLista = [...listaAtual, adc];
              }

              setItemEmPersonalizacao({...itemEmPersonalizacao, adicionaisEscolhidos: novaLista});
            }} 
            className={`w-full flex justify-between items-center p-4 rounded-2xl border-4 font-black italic transition-all ${
              estaSelecionado 
              ? 'border-orange-500 bg-orange-50 scale-[0.98]' 
              : 'border-gray-100 bg-white opacity-60'
            }`}
          >
            <span className="text-xs uppercase">{adc.nome}</span> 
            <span className="text-orange-600 text-sm">+R$ {adc.preco.toFixed(2)}</span>
          </button>
        );
      })}
    </div>
  </div>
)}

            <div className="flex flex-col gap-3">
              <button onClick={adicionarAoCarrinho} className="w-full bg-[#db0007] text-white py-5 rounded-2xl font-black text-xl shadow-lg uppercase italic active:scale-95 transition-all">Adicionar ao Carrinho</button>
              <button onClick={() => setItemEmPersonalizacao(null)} className="w-full text-gray-400 font-bold uppercase text-[10px] text-center hover:underline italic">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAIS DE ADMIN (Categorias e Adicionais) --- */}
      {modalCategoriasAberto && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 border-t-8 border-purple-600">
            <h2 className="text-2xl font-black uppercase italic mb-6 text-center">Categorias</h2>
            <div className="mb-6 flex gap-2">
              <input id="catName" type="text" placeholder="Nova..." className="flex-1 p-3 bg-gray-100 rounded-xl" />
              <button onClick={() => {adicionarCategoria(document.getElementById('catName').value); document.getElementById('catName').value=''}} className="bg-purple-600 text-white px-4 rounded-xl font-black">＋</button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {dados.categorias.map((cat) => (
                <div key={cat} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border-2">
                  <span className="font-black uppercase text-xs italic">{cat}</span>
                  <button onClick={() => removerCategoria(cat)} className="text-red-500 font-black text-[10px]">REMOVER</button>
                </div>
              ))}
            </div>
            <button onClick={() => setModalCategoriasAberto(false)} className="w-full mt-6 py-2 text-gray-400 font-black uppercase italic text-[10px]">Fechar</button>
          </div>
        </div>
      )}

      {modalAdicionaisAberto && (
        <div className="fixed inset-0 bg-black/80 z-[350] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 border-t-8 border-orange-500 shadow-2xl max-h-[90vh] flex flex-col">
              <h2 className="text-2xl font-black uppercase italic text-center mb-6">Lista de Adicionais</h2>
              <form onSubmit={salvarAdicionalAdmin} className="space-y-4 mb-6">
                <input name="nome" placeholder="Ex: Bacon" required className="w-full p-4 bg-gray-100 rounded-2xl font-bold" />
                <input name="preco" type="number" step="0.01" placeholder="Valor" required className="w-full p-4 bg-gray-100 rounded-2xl font-bold" />
                <button type="submit" className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase italic shadow-lg">Adicionar à Lista</button>
              </form>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {dados.adicionais.map(adc => (
                  <div key={adc.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border-2">
                    <span className="font-black italic uppercase text-xs">{adc.nome} - R$ {adc.preco.toFixed(2)}</span>
                    <button onClick={() => setDados({...dados, adicionais: dados.adicionais.filter(it => it.id !== adc.id)})} className="text-red-500 font-black text-[10px]">EXCLUIR</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setModalAdicionaisAberto(false)} className="w-full mt-6 text-gray-400 font-black text-[10px]">Fechar</button>
          </div>
        </div>
      )}

      {/* --- MODAL RESUMO DO CARRINHO --- */}
      {modalResumoAberto && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl max-h-[85vh] flex flex-col border-t-8 border-[#ffbc0d]">
            <h2 className="text-4xl font-black uppercase italic mb-6 text-center tracking-tighter">Seu Pedido</h2>
            {carrinho.length > 0 ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-4">
{/* Procure este trecho dentro do modalResumoAberto */}
{carrinho.map((item) => (
  <div key={item.instanceId} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl border-2">
    <div className="flex items-center gap-4">
      <img src={item.img} className="h-12" alt="" />
      <div>
        <h3 className="font-black uppercase italic text-sm text-gray-800">
          {item.nome}
        </h3>
        <p className="text-[9px] text-gray-400 uppercase font-bold">
          R$ {item.precoFinal.toFixed(2)}
        </p>

        {/* --- EXIBIÇÃO DOS ADICIONAIS ESCOLHIDOS --- */}
        {item.adicionaisEscolhidos && item.adicionaisEscolhidos.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.adicionaisEscolhidos.map((adc, idx) => (
              <span key={idx} className="text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase">
                + {adc.nome}
              </span>
            ))}
          </div>
        )}

        {/* --- EXIBIÇÃO DE ITENS REMOVIDOS (Opcional) --- */}
        {item.removidos && item.removidos.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.removidos.map((rem, idx) => (
              <span key={idx} className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase line-through">
                - {rem}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
    <button 
      onClick={() => {
        setTotal(total - item.precoFinal); 
        setCarrinho(carrinho.filter(i => i.instanceId !== item.instanceId))
      }} 
      className="text-red-500 text-[10px] font-black uppercase italic underline"
    >
      Remover
    </button>
  </div>
))}
                </div>
                <button onClick={() => {setModalResumoAberto(false); setModalFluxoAberto(true)}} className="w-full bg-green-600 text-white py-6 rounded-[2rem] font-black text-2xl mt-8 uppercase italic shadow-xl">Escolher Pagamento</button>
                <button onClick={() => setModalResumoAberto(false)} className="mt-4 text-gray-400 font-bold uppercase text-[10px] text-center italic hover:underline">Continuar Pedindo</button>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-300">
                <p className="font-black uppercase italic text-4xl mb-8">Vazio!</p>
                <button onClick={() => setModalResumoAberto(false)} className="bg-[#db0007] text-white px-10 py-4 rounded-2xl font-black uppercase italic shadow-lg active:scale-95 transition-all">Ver Cardápio</button>
              </div>
            )}
          </div>
        </div>
      )}

{/* --- MODAL FLUXO PAGAMENTO CORRIGIDO --- */}
{modalFluxoAberto && (
  <div className="fixed inset-0 bg-black/80 z-[210] flex items-center justify-center p-4 backdrop-blur-md">
    <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl border-t-[12px] border-[#ffbc0d] max-h-[90vh] overflow-y-auto">
      
      <p className="text-[10px] font-black text-gray-400 uppercase mb-3 italic text-center">Como deseja pagar?</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <button 
          type="button"
          onClick={() => { setMetodoPagamento('local'); setOpcaoConsumo('entrega'); }} 
          className={`p-4 rounded-3xl border-4 font-black text-[10px] uppercase transition-all flex flex-col items-center gap-2 ${metodoPagamento === 'local' && opcaoConsumo === 'entrega' ? 'border-green-600 bg-green-50 text-green-600 scale-105' : 'border-gray-100 text-gray-300'}`}
        >
          <span>🚀</span> Na Entrega
        </button>

        <button 
          type="button"
          onClick={() => { setMetodoPagamento('retirada_local'); setOpcaoConsumo('retirar'); }} 
          className={`p-4 rounded-3xl border-4 font-black text-[10px] uppercase transition-all flex flex-col items-center gap-2 ${metodoPagamento === 'retirada_local' ? 'border-orange-500 bg-orange-50 text-orange-500 scale-105' : 'border-gray-100 text-gray-300'}`}
        >
          <span>🛍️</span> Na Retirada
        </button>

        <button 
          type="button"
          onClick={() => { setMetodoPagamento('online'); setOpcaoConsumo(''); }} // Reset da opção para obrigar a escolha abaixo
          className={`p-4 rounded-3xl border-4 font-black text-[10px] uppercase transition-all flex flex-col items-center gap-2 ${metodoPagamento === 'online' ? 'border-blue-600 bg-blue-50 text-blue-600 scale-105' : 'border-gray-100 text-gray-300'}`}
        >
          <span>💳</span> Cartão/Pix Online
        </button>
      </div>

      {/* SE FOR ONLINE, PRECISAMOS SABER SE É RETIRADA OU DELIVERY ANTES DE PAGAR */}
      {metodoPagamento === 'online' && (
        <div className="animate-fadeIn mb-6">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-3 italic text-center">Onde vai receber seu pedido online?</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setOpcaoConsumo('retirar')} className={`p-4 rounded-2xl border-4 font-black text-xs flex flex-col items-center gap-1 ${opcaoConsumo === 'retirar' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>🛍️ Retirar</button>
            <button onClick={() => setOpcaoConsumo('entrega')} className={`p-4 rounded-2xl border-4 font-black text-xs flex flex-col items-center gap-1 ${opcaoConsumo === 'entrega' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>🚀 Delivery</button>
          </div>
        </div>
      )}

      {/* CAMPOS DE DADOS - SÓ APARECEM SE A OPÇÃO DE CONSUMO FOR SELECIONADA */}
      <div className="space-y-3 mb-6">
        {(opcaoConsumo === 'retirar' || opcaoConsumo === 'entrega') && (
          <div className="space-y-3 animate-fadeIn">
            <p className="text-[10px] font-black text-gray-400 uppercase italic text-center">Seus Dados</p>
            <input placeholder="Seu Nome *" className="w-full p-4 bg-gray-50 rounded-xl font-bold border-2 outline-none focus:border-blue-500" value={dadosEntrega.nome} onChange={(e) => setDadosEntrega({...dadosEntrega, nome: e.target.value})} />
            <input placeholder="Telefone *" className="w-full p-4 bg-gray-50 rounded-xl font-bold border-2 outline-none focus:border-blue-500" value={dadosEntrega.telefone} onChange={(e) => setDadosEntrega({...dadosEntrega, telefone: e.target.value})} />
          </div>
        )}

        {opcaoConsumo === 'entrega' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex gap-2">
              <input placeholder="Rua" className="flex-[3] p-4 bg-gray-50 rounded-xl font-bold border-2" value={dadosEntrega.rua} onChange={(e) => setDadosEntrega({...dadosEntrega, rua: e.target.value})} />
              <input placeholder="Nº" className="flex-1 p-4 bg-gray-50 rounded-xl font-bold border-2 text-center" value={dadosEntrega.numero} onChange={(e) => setDadosEntrega({...dadosEntrega, numero: e.target.value})} />
            </div>
            <input placeholder="Referência (Opcional)" className="w-full p-4 bg-gray-50 rounded-xl font-bold border-2" value={dadosEntrega.referencia} onChange={(e) => setDadosEntrega({...dadosEntrega, referencia: e.target.value})} />
          </div>
        )}
      </div>

      {/* OPÇÕES DE PAGAMENTO PARA ENTREGA LOCAL */}
{metodoPagamento === 'local' && (
  <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 animate-fadeIn">
    <p className="text-[10px] font-black text-gray-400 uppercase italic text-center">Como vai pagar ao entregador?</p>
    
    <div className="grid grid-cols-3 gap-2">
      <button 
        type="button"
        onClick={() => setMetodoLocalDetallhe('troco')} 
        className={`p-3 rounded-2xl border-2 font-black text-[9px] uppercase transition-all ${metodoLocalDetallhe === 'troco' ? 'border-green-600 bg-green-50 text-green-600' : 'border-white bg-white text-gray-400'}`}
      >
        💵 Troco
      </button>
      
      <button 
        type="button"
        onClick={() => setMetodoLocalDetallhe('maquininha')} 
        className={`p-3 rounded-2xl border-2 font-black text-[9px] uppercase transition-all ${metodoLocalDetallhe === 'maquininha' ? 'border-green-600 bg-green-50 text-green-600' : 'border-white bg-white text-gray-400'}`}
      >
        💳 Cartão
      </button>
      
      <button 
        type="button"
        onClick={() => setMetodoLocalDetallhe('pix_maquina')} 
        className={`p-3 rounded-2xl border-2 font-black text-[9px] uppercase transition-all ${metodoLocalDetallhe === 'pix_maquina' ? 'border-green-600 bg-green-50 text-green-600' : 'border-white bg-white text-gray-400'}`}
      >
        📱 Pix Maq.
      </button>
    </div>

    {/* CAMPO DE VALOR DO TROCO */}
{metodoLocalDetallhe === 'troco' && (
  <div className="animate-slideDown space-y-2">
    <input 
      type="number" 
      placeholder="Troco para quanto? (Ex: 50)" 
      className={`w-full p-4 bg-white rounded-xl font-bold border-2 outline-none ${
        valorTroco && Number(valorTroco) < (total + (opcaoConsumo === 'entrega' ? 5 : 0)) 
        ? 'border-red-500 text-red-500' 
        : 'border-green-200 focus:border-green-500'
      }`}
      value={valorTroco} 
      onChange={(e) => setValorTroco(e.target.value)} 
    />
    
    {/* AVISO DE ERRO */}
    {valorTroco && Number(valorTroco) < (total + (opcaoConsumo === 'entrega' ? 5 : 0)) && (
      <p className="text-[10px] text-red-600 font-bold uppercase text-center">
        ❌ O valor para troco deve ser maior que o total!
      </p>
    )}
  </div>
)}
  </div>
)}

      <div className="border-t pt-8 text-center">
        <p className="text-5xl font-black italic mb-8">R$ {(total + (opcaoConsumo === 'entrega' ? 5 : 0)).toFixed(2)}</p>
        <div className="flex gap-4">
          <button onClick={() => setModalFluxoAberto(false)} className="flex-1 font-bold text-gray-400">Voltar</button>
<button 
  disabled={
    !opcaoConsumo || 
    !dadosEntrega.nome || 
    !dadosEntrega.telefone || 
    (opcaoConsumo === 'entrega' && (!dadosEntrega.rua || !dadosEntrega.numero)) ||
    (metodoPagamento === 'local' && !metodoLocalDetallhe) || // Nova validação
    (metodoLocalDetallhe === 'troco' && !valorTroco) ||     // Validação do troco
    processandoMP
  } 
  onClick={finalizarPedidoTotal} 
  className="flex-[2] bg-green-600 text-white py-6 rounded-[2rem] font-black text-2xl uppercase italic active:scale-95 transition-all disabled:opacity-30"
>
  {processandoMP ? '...' : metodoPagamento === 'online' ? 'Ir para Pagamento' : 'Confirmar Pedido'}
</button>
        </div>
      </div>
    </div>
  </div>

  
)}

      {/* ANIMAÇÃO DE SUCESSO */}
      {senhaGerada && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center animate-fadeIn">
          <div className="bg-green-600 text-white p-12 rounded-[4rem] shadow-2xl flex flex-col items-center animate-bounce">
            <h2 className="text-5xl font-black uppercase italic">Pedido Criado!</h2>
            <p className="text-[#ffbc0d] text-2xl font-black italic mt-2">Senha: #{senhaGerada}</p>
          </div>
        </div>
      )}

      {/* MODAL LOGIN ADMIN */}
      {modalLoginAberto && (
        <div className="fixed inset-0 bg-black/90 z-[600] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 border-t-8 border-[#db0007]">
            <h2 className="text-2xl font-black uppercase italic mb-6 text-center">Acesso Admin</h2>
            <form onSubmit={tentarLoginAdmin} className="space-y-4">
              <input name="senhaAdmin" type="password" placeholder="••••" required className="w-full p-4 bg-gray-100 rounded-2xl font-black text-center text-2xl outline-none" />
              <button type="submit" className="w-full bg-[#db0007] text-white py-4 rounded-2xl font-black uppercase italic">Entrar</button>
              <button type="button" onClick={() => setModalLoginAberto(false)} className="w-full text-gray-400 font-bold text-xs uppercase text-center mt-2">Cancelar</button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DE SUCESSO TEMPORÁRIO */}
{avisoSucesso && (
  <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
    <div className="bg-green-600 text-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 animate-bounce">
      <div className="bg-white text-green-600 rounded-full p-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-3xl font-black uppercase italic text-center leading-tight">
        {avisoSucesso}
      </h2>
      <p className="text-xs font-bold uppercase opacity-80 italic tracking-widest">
        Atualizando cardápio em instantes...
      </p>
    </div>
  </div>
)}
      <TelaSucesso />

    </div>
  );
}