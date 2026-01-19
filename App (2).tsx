
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LogOut, Search, PlayCircle, X, Send, 
  ArrowRight, Layers, RotateCcw, Loader2, ExternalLink, 
  CheckCircle, AlertCircle, Home, Bookmark, BookOpen
} from 'lucide-react';
import { User, Material, AppSettings, CATEGORIES } from './types';
import { supabase } from './supabase';

const getRandomGradient = () => {
  const gradients = [
    'from-indigo-600 via-purple-600 to-pink-600',
    'from-amber-500 via-orange-600 to-red-600',
    'from-cyan-500 via-blue-600 to-indigo-700',
    'from-emerald-500 via-teal-600 to-cyan-700'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};

const DEFAULT_SETTINGS: AppSettings = {
  heroTitle: "Domine\nO Próximo Nível.",
  heroSubtitle: "Sua biblioteca privada de alta performance, agora 100% online.",
  heroImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop",
  heroButtonText: "Começar Agora",
  heroButtonLink: "#vitrine"
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInit, setIsAppInit] = useState(true);
  
  const [items, setItems] = useState<Material[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'curso' | 'ebook'>('todos');
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  const [toasts, setToasts] = useState<{id: string, message: string, type?: 'success' | 'error'}[]>([]);
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) handleSetUser(session.user);
      setIsAppInit(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) handleSetUser(session.user);
      else setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSetUser = (supabaseUser: any) => {
    const isAdmin = supabaseUser.email === 'admin@academia.com';
    setCurrentUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata.full_name || supabaseUser.email?.split('@')[0] || 'Membro Elite',
      email: supabaseUser.email || '',
      isAdmin: isAdmin
    });
  };

  const fetchData = async () => {
    try {
      const { data: mData } = await supabase.from('materials').select(`*, comments (*)`).order('created_at', { ascending: false });
      const { data: sData } = await supabase.from('settings').select('*').maybeSingle();
      if (sData) setSettings({ ...DEFAULT_SETTINGS, ...sData });
      if (mData) {
        setItems(mData.map((m: any) => ({
          ...m,
          id: m.id.toString(),
          gradient: m.gradient || getRandomGradient(),
          comments: (m.comments || [])
        })));
      }
    } catch (e) { addToast("Erro ao carregar dados", "error"); }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isAuthMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: authName } } });
        if (error) throw error;
        addToast("Cadastro realizado com sucesso!");
      }
    } catch (e: any) { addToast(e.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedItem(null);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
      const matchesTab = activeTab === 'todos' || item.type === activeTab;
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [items, searchTerm, activeCategory, activeTab]);

  if (isAppInit) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black tracking-[8px] uppercase text-purple-500 animate-pulse">Iniciando</p>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020202] p-6 relative">
        <div className="glass max-w-md w-full p-8 md:p-16 rounded-[2.5rem] shadow-2xl border border-white/10 text-center animate-fade-in z-10">
          <div className="w-16 h-16 mx-auto mb-8 p-4 rounded-2xl bg-gradient-primary shadow-xl"><Layers size={32} /></div>
          <h1 className="text-3xl font-black text-gradient-primary mb-10 tracking-tighter">VITALÍCIO</h1>
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            {isAuthMode === 'register' && (
              <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-purple-500/50 transition-all" placeholder="Seu nome" required />
            )}
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-purple-500/50 transition-all" placeholder="E-mail" required />
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-purple-500/50 transition-all" placeholder="Chave de Acesso" required />
            <button type="submit" disabled={isLoading} className="w-full py-5 rounded-2xl bg-gradient-primary font-black uppercase text-[10px] tracking-[4px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Entrar na Plataforma'}
            </button>
          </form>
          <button onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login')} className="mt-8 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
            {isAuthMode === 'login' ? 'Não tem acesso? Solicitar' : 'Já sou membro VIP'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col md:flex-row relative">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-72 border-r border-white/5 p-8 flex-col gap-10 bg-black/60 backdrop-blur-3xl sticky top-0 h-screen">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-primary shadow-lg"><Layers size={20} /></div>
          <h2 className="text-lg font-black tracking-tighter uppercase">Vitalício</h2>
        </div>
        <nav className="space-y-1 overflow-y-auto scrollbar-hide flex-1">
          {['Todos', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`w-full text-left px-5 py-3.5 rounded-xl text-[11px] font-black transition-all uppercase tracking-wider ${activeCategory === cat ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              {cat}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-red-500/5 text-red-500/70 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
          <LogOut size={16} /> Sair
        </button>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden sticky top-0 z-[60] px-6 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary"><Layers size={18} /></div>
            <h2 className="text-xs font-black tracking-tighter uppercase">Vitalício</h2>
         </div>
         <button onClick={() => setShowSearchMobile(!showSearchMobile)} className="p-2 text-gray-400 hover:text-white transition-colors"><Search size={20} /></button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto scrollbar-hide flex flex-col pb-24 md:pb-0">
        {/* DESKTOP SEARCH */}
        <header className="hidden md:flex sticky top-0 z-40 px-12 py-6 border-b border-white/5 items-center justify-between bg-black/80 backdrop-blur-3xl">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
            <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-full pl-12 pr-6 py-3.5 text-xs outline-none focus:ring-1 focus:ring-purple-500/50" />
          </div>
          <button onClick={fetchData} className="ml-6 p-3.5 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><RotateCcw size={18}/></button>
        </header>

        {/* MOBILE CATEGORIES */}
        <div className="md:hidden overflow-x-auto scrollbar-hide border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-[57px] z-50">
           <div className="flex gap-2 px-6 py-3.5 min-w-max">
              {['Todos', ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${activeCategory === cat ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-500 border-white/5'}`}>
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* SEARCH OVERLAY (Mobile) */}
        {showSearchMobile && (
          <div className="md:hidden fixed inset-x-0 top-[57px] z-[70] p-4 bg-black border-b border-white/10 animate-fade-in shadow-2xl">
             <div className="relative">
               <input autoFocus type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3.5 text-xs outline-none" />
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
               <button onClick={() => setShowSearchMobile(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"><X size={16}/></button>
             </div>
          </div>
        )}

        <div className="p-6 md:p-12 lg:p-20 space-y-12 md:space-y-24">
          {/* HERO */}
          <section className="relative p-8 md:p-20 rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-2xl min-h-[40vh] md:min-h-[60vh] flex flex-col justify-center">
            <img src={settings.heroImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Hero" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent"></div>
            <div className="relative z-10 max-w-3xl">
              <h1 className="text-4xl md:text-7xl lg:text-9xl font-black mb-6 leading-[0.9] tracking-tighter text-white whitespace-pre-wrap">
                {settings.heroTitle}
              </h1>
              <p className="text-xs md:text-lg text-white/60 font-medium mb-10 max-w-xl border-l-2 border-purple-600 pl-5 italic leading-relaxed">
                {settings.heroSubtitle}
              </p>
              <a href={settings.heroButtonLink} className="inline-flex items-center gap-3 px-8 md:px-12 py-4 md:py-6 rounded-full bg-white text-black font-black uppercase text-[10px] tracking-[4px] hover:scale-105 active:scale-95 transition-all shadow-xl">
                {settings.heroButtonText} <ArrowRight size={16}/>
              </a>
            </div>
          </section>

          {/* VITRINE */}
          <div id="vitrine" className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
              <h2 className="text-3xl md:text-6xl font-black tracking-tighter">Acervo <span className="text-white/20">Digital</span></h2>
              <div className="flex bg-white/5 p-1 rounded-full border border-white/10 w-fit">
                {(['todos', 'curso', 'ebook'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 md:px-8 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
                    {tab === 'todos' ? 'Tudo' : tab === 'curso' ? 'Cursos' : 'PDFs'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10">
              {filteredItems.map((item, index) => (
                <div key={item.id} className="group relative animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="relative bg-[#080808] rounded-[2rem] border border-white/5 overflow-hidden h-full flex flex-col hover:-translate-y-2 transition-all duration-500 shadow-xl">
                    <div className="h-52 md:h-64 overflow-hidden relative">
                      <img src={item.imageUrl} className="w-full h-full object-cover opacity-70 group-hover:scale-110 transition-all duration-700" alt={item.title} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] to-transparent"></div>
                      <div className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                        {item.type === 'curso' ? <PlayCircle size={16} className="text-purple-400" /> : <BookOpen size={16} className="text-orange-400" />}
                      </div>
                    </div>
                    <div className="p-8 flex flex-col flex-1">
                      <h3 className="text-lg md:text-xl font-black mb-3 tracking-tighter leading-tight group-hover:text-purple-400 transition-colors">{item.title}</h3>
                      <p className="text-gray-600 text-[11px] md:text-xs line-clamp-2 mb-8 italic font-medium leading-relaxed">{item.description}</p>
                      <div className="mt-auto flex justify-between items-center pt-6 border-t border-white/5">
                        <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">{item.category}</span>
                        <button onClick={() => setSelectedItem(item)} className={`p-3.5 bg-gradient-to-br ${item.gradient} text-white rounded-xl hover:scale-110 transition-all shadow-lg active:scale-90`}>
                          <ArrowRight size={18}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-black/90 backdrop-blur-2xl border-t border-white/5 px-8 py-3.5 flex justify-between items-center pb-8">
         <button onClick={() => { setActiveCategory('Todos'); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`flex flex-col items-center gap-1 ${activeCategory === 'Todos' ? 'text-purple-500' : 'text-gray-600'}`}>
            <Home size={20} /> <span className="text-[8px] font-black uppercase tracking-tighter">Início</span>
         </button>
         <button onClick={() => setShowSearchMobile(true)} className="flex flex-col items-center gap-1 text-gray-600">
            <Search size={20} /> <span className="text-[8px] font-black uppercase tracking-tighter">Busca</span>
         </button>
         <button className="flex flex-col items-center gap-1 text-gray-600">
            <Bookmark size={20} /> <span className="text-[8px] font-black uppercase tracking-tighter">Salvos</span>
         </button>
         <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500/50">
            <LogOut size={20} /> <span className="text-[8px] font-black uppercase tracking-tighter">Sair</span>
         </button>
      </nav>

      {/* MODAL DETALHES */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setSelectedItem(null)}></div>
          <div className="relative w-full h-full md:h-auto md:max-w-5xl md:max-h-[85vh] bg-[#050505] md:rounded-[3rem] border border-white/10 flex flex-col overflow-y-auto scrollbar-hide">
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-white/5 bg-black/60 backdrop-blur-xl flex justify-between items-center">
               <span className="text-[9px] font-black tracking-[4px] uppercase text-gray-500">{selectedItem.type} Premium</span>
               <button onClick={() => setSelectedItem(null)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 md:p-14 space-y-12">
              <div className="aspect-video w-full rounded-2xl md:rounded-[2.5rem] bg-black overflow-hidden relative shadow-2xl">
                <img src={selectedItem.imageUrl} className="w-full h-full object-cover opacity-40" alt="" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                  <a href={selectedItem.videoUrl || '#'} target="_blank" className="p-8 md:p-12 rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-all shadow-2xl">
                    <PlayCircle size={40} />
                  </a>
                  <p className="text-[8px] font-black uppercase tracking-[6px] text-white/30">Clique para Iniciar</p>
                </div>
              </div>
              <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">{selectedItem.title}</h2>
                <p className="text-gray-400 text-sm md:text-xl leading-relaxed italic border-l-2 border-purple-600 pl-6 py-2">
                   {selectedItem.description}
                </p>
              </div>
              <div className="pt-10 border-t border-white/5">
                <form className="relative" onSubmit={(e) => { e.preventDefault(); addToast("Feedback enviado!"); }}>
                  <input placeholder="Adicione seu insight..." className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-xs outline-none focus:border-purple-500/30" />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-purple-600 rounded-lg text-white hover:bg-purple-500 transition-all"><Send size={16} /></button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed top-20 right-4 md:top-auto md:bottom-8 md:right-8 z-[110] space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="glass px-5 py-4 rounded-xl border-l-4 border-purple-500 shadow-2xl flex items-center gap-3 animate-slide-in pointer-events-auto">
            {t.type === 'error' ? <AlertCircle size={16} className="text-red-400" /> : <CheckCircle size={16} className="text-purple-400" />}
            <span className="text-[11px] font-black uppercase tracking-wider">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
