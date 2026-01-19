
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LogOut, Search, Grid, List, Book, PlayCircle, Plus, Trash2, Edit3, 
  LayoutDashboard, MessageSquare, Eye, CheckCircle, X, Send, 
  ArrowRight, Users, Layers, Star, RotateCcw, Loader2, ExternalLink, 
  Database, AlertCircle, Image as ImageIcon, Info, FileText, UploadCloud,
  Settings as SettingsIcon, Monitor, Sparkles, Link as LinkIcon,
  ChevronRight, Bookmark, Home, User as UserIcon
} from 'lucide-react';
import { User, Material, AppSettings, CATEGORIES, CATEGORY_ICONS, MaterialType } from './types';
import { supabase } from './supabase';

const getRandomGradient = () => {
  const gradients = [
    'from-indigo-600 via-purple-600 to-pink-600',
    'from-amber-500 via-orange-600 to-red-600',
    'from-cyan-500 via-blue-600 to-indigo-700',
    'from-emerald-500 via-teal-600 to-cyan-700',
    'from-fuchsia-600 via-purple-700 to-violet-800',
    'from-rose-500 via-pink-600 to-purple-700'
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
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  const [items, setItems] = useState<Material[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'todos' | 'curso' | 'ebook'>('todos');
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  const [toasts, setToasts] = useState<{id: string, message: string, type?: 'success' | 'error'}[]>([]);
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const renderDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-purple-400 font-bold underline hover:text-purple-300" onClick={(e) => e.stopPropagation()}>
            Link <ExternalLink size={12} className="inline ml-1"/>
          </a>
        );
      }
      return part;
    });
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
      const { data: mData, error: mError } = await supabase.from('materials').select(`*, comments (*)`).order('created_at', { ascending: false });
      if (mError) throw mError;
      const { data: sData } = await supabase.from('settings').select('*').maybeSingle();
      if (sData) {
        setSettings({
          heroTitle: sData.hero_title || DEFAULT_SETTINGS.heroTitle,
          heroSubtitle: sData.hero_subtitle || DEFAULT_SETTINGS.heroSubtitle,
          heroImageUrl: sData.hero_image_url || DEFAULT_SETTINGS.heroImageUrl,
          heroButtonText: sData.hero_button_text || DEFAULT_SETTINGS.heroButtonText,
          heroButtonLink: sData.hero_button_link || DEFAULT_SETTINGS.heroButtonLink,
        });
      }
      setItems((mData || []).map((m: any) => ({
        ...m,
        id: m.id.toString(),
        gradient: m.gradient || getRandomGradient(),
        comments: (m.comments || []).map((c: any) => ({
          id: c.id.toString(),
          userName: c.user_name,
          text: c.text,
          timestamp: c.timestamp
        }))
      })));
      setDbStatus('connected');
    } catch (e) { setDbStatus('error'); }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (authEmail === 'admin@academia.com' && authPassword === 'admin123') {
      setCurrentUser({ id: 'admin-root', name: 'Diretoria Vitalício', email: authEmail, isAdmin: true });
      setIsLoading(false);
      return;
    }
    try {
      if (isAuthMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: authName } } });
        if (error) throw error;
        addToast("Cadastro realizado!");
      }
    } catch (e: any) { addToast(e.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedItem(null);
  };

  const incrementViews = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      await supabase.from('materials').update({ views: (item.views || 0) + 1 }).eq('id', id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, views: (i.views || 0) + 1 } : i));
    } catch (e) {}
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
      const matchesTab = activeTab === 'todos' || item.type === activeTab;
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [items, searchTerm, activeCategory, activeTab]);

  const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col md:flex-row relative">
      {/* SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex w-64 lg:w-80 border-r border-white/5 p-8 flex-col gap-10 bg-black/60 backdrop-blur-3xl sticky top-0 h-screen">
        <div className="flex items-center gap-4 px-2">
          <div className="p-3 rounded-2xl bg-gradient-primary shadow-lg"><Layers size={24} /></div>
          <h2 className="text-xl font-black text-gradient-primary tracking-tighter">VITALÍCIO</h2>
        </div>
        <nav className="space-y-1 overflow-y-auto scrollbar-hide flex-1">
          {['Todos', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`w-full text-left px-6 py-4 rounded-2xl text-xs font-black transition-all flex items-center gap-4 ${activeCategory === cat ? 'bg-purple-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-500/10 text-red-400 font-black text-xs hover:bg-red-500 hover:text-white transition-all">
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden sticky top-0 z-[60] px-6 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary"><Layers size={18} /></div>
            <h2 className="text-sm font-black tracking-tighter">VITALÍCIO</h2>
         </div>
         <div className="flex items-center gap-3">
            <button onClick={() => setShowSearchMobile(!showSearchMobile)} className="p-2 text-gray-400"><Search size={20} /></button>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-black">{currentUser?.name?.[0]}</div>
         </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide flex flex-col pb-24 md:pb-0">
        {/* DESKTOP SEARCH BAR */}
        <header className="hidden md:flex sticky top-0 z-40 px-10 py-8 border-b border-white/5 items-center justify-between bg-black/80 backdrop-blur-3xl">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
            <input type="text" placeholder="Pesquisar módulo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-full pl-14 pr-6 py-4 text-sm outline-none focus:ring-1 focus:ring-purple-500/50" />
          </div>
          <div className="flex items-center gap-4 ml-8">
            <button onClick={fetchData} className="p-4 bg-white/5 rounded-xl text-gray-500 hover:text-white"><RotateCcw size={18}/></button>
          </div>
        </header>

        {/* MOBILE CATEGORY SCROLL */}
        <div className="md:hidden overflow-x-auto scrollbar-hide border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-[65px] z-50">
           <div className="flex gap-2 px-6 py-4 min-w-max">
              {['Todos', ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${activeCategory === cat ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-500 border-white/5'}`}>
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* MOBILE SEARCH OVERLAY */}
        {showSearchMobile && (
          <div className="md:hidden fixed inset-x-0 top-[65px] z-[70] p-6 bg-black border-b border-white/10 animate-fade-in">
             <input autoFocus type="text" placeholder="Buscar agora..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none" />
          </div>
        )}

        <div className="p-6 md:p-16 flex-1">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-black/90 backdrop-blur-2xl border-t border-white/5 px-8 py-4 flex justify-between items-center pb-8">
         <button onClick={() => setActiveCategory('Todos')} className={`flex flex-col items-center gap-1 ${activeCategory === 'Todos' ? 'text-purple-500' : 'text-gray-500'}`}>
            <Home size={22} /> <span className="text-[9px] font-black uppercase">Home</span>
         </button>
         <button onClick={() => setShowSearchMobile(true)} className="flex flex-col items-center gap-1 text-gray-500">
            <Search size={22} /> <span className="text-[9px] font-black uppercase">Busca</span>
         </button>
         <button className="flex flex-col items-center gap-1 text-gray-500">
            <Bookmark size={22} /> <span className="text-[9px] font-black uppercase">Salvos</span>
         </button>
         <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500/70">
            <LogOut size={22} /> <span className="text-[9px] font-black uppercase">Sair</span>
         </button>
      </nav>

      {/* TOASTS (TOP no mobile) */}
      <div className="fixed top-6 right-6 md:top-auto md:bottom-24 lg:bottom-6 z-[100] space-y-3 pointer-events-none w-[calc(100%-48px)] md:w-auto">
        {toasts.map(t => (
          <div key={t.id} className={`animate-slide-in glass px-6 py-4 rounded-2xl border-l-4 pointer-events-auto flex items-center gap-3 shadow-2xl ${t.type === 'error' ? 'border-red-500 bg-red-500/10' : 'border-purple-500 bg-purple-500/10'}`}>
            {t.type === 'error' ? <AlertCircle size={18} className="text-red-400" /> : <CheckCircle size={18} className="text-purple-400" />}
            <span className="text-[12px] font-bold">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (isAppInit) return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div><p className="text-[10px] font-black tracking-[5px] uppercase text-purple-500">Carregando</p></div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020202] p-6 relative">
        <div className="glass max-w-md w-full p-10 md:p-16 rounded-[3rem] shadow-2xl border border-white/10 text-center animate-fade-in z-10">
          <div className="w-20 h-20 mx-auto mb-10 p-5 rounded-[2rem] bg-gradient-primary shadow-xl"><Layers size={40} /></div>
          <h1 className="text-4xl font-black text-gradient-primary mb-12 tracking-tighter">VITALÍCIO</h1>
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            {isAuthMode === 'register' && (
              <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none" placeholder="Nome" required />
            )}
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none" placeholder="E-mail" required />
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none" placeholder="Chave de Acesso" required />
            <button type="submit" disabled={isLoading} className="w-full py-5 rounded-[2rem] bg-gradient-primary font-black uppercase text-[10px] tracking-[4px] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Acessar'}
            </button>
          </form>
          <button onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login')} className="mt-8 text-[9px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors">
            {isAuthMode === 'login' ? 'Novo por aqui?' : 'Já sou membro'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-16 md:space-y-32 animate-fade-in">
        {/* HERO SECTION RESPONSIVA */}
        <section className="relative p-8 md:p-24 rounded-[3rem] md:rounded-[5rem] overflow-hidden shadow-2xl min-h-[50vh] md:min-h-[80vh] flex flex-col justify-center">
          <img src={settings.heroImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
          <div className="relative z-10 max-w-4xl">
            <h1 className="text-4xl md:text-8xl lg:text-[10rem] font-black mb-6 leading-[0.9] tracking-tighter text-white whitespace-pre-wrap">
              {settings.heroTitle}
            </h1>
            <p className="text-sm md:text-2xl text-white/70 font-medium mb-10 max-w-2xl italic leading-relaxed border-l-2 md:border-l-4 border-purple-600 pl-4 md:pl-8">
              {settings.heroSubtitle}
            </p>
            <a href={settings.heroButtonLink} className="inline-flex items-center gap-3 px-8 md:px-14 py-4 md:py-7 rounded-full bg-white text-black font-black uppercase text-[10px] md:text-xs tracking-[4px] hover:scale-105 transition-all shadow-xl">
              {settings.heroButtonText} <ArrowRight size={18}/>
            </a>
          </div>
        </section>

        {/* VITRINE OTIMIZADA */}
        <div id="vitrine" className="space-y-10 md:space-y-20">
          <div className="flex flex-col gap-6 border-b border-white/5 pb-10">
            <h2 className="text-3xl md:text-7xl font-black tracking-tighter">Biblioteca <span className="text-white/20">Elite</span></h2>
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10 w-fit">
              {(['todos', 'curso', 'ebook'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 md:px-10 py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-gray-500'}`}>
                  {tab === 'todos' ? 'Tudo' : tab === 'curso' ? 'Cursos' : 'PDFs'}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-12`}>
            {filteredItems.map((item, index) => (
              <div key={item.id} className="relative group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className={`absolute -inset-2 bg-gradient-to-br ${item.gradient} rounded-[3rem] opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500`}></div>
                <div className="relative bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 overflow-hidden h-full flex flex-col hover:-translate-y-2 transition-all duration-500">
                  <div className="h-56 md:h-72 overflow-hidden relative">
                    <img src={item.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-all duration-1000" alt={item.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
                  </div>
                  <div className="p-8 flex flex-col flex-1">
                    <h3 className="text-xl md:text-2xl font-black mb-4 tracking-tighter leading-tight">{item.title}</h3>
                    <p className="text-gray-500 text-xs md:text-sm line-clamp-2 mb-8 italic">{item.description}</p>
                    <div className="mt-auto flex justify-between items-center pt-6 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">{item.category}</span>
                        <span className="text-[9px] font-black text-purple-500 flex items-center gap-1 mt-1"><Eye size={10}/> {item.views}</span>
                      </div>
                      <button onClick={() => { setSelectedItem(item); incrementViews(item.id); }} className={`p-4 bg-gradient-to-br ${item.gradient} text-white rounded-2xl hover:scale-110 transition-all shadow-lg`}>
                        <ArrowRight size={20}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DETALHES (Mobile Otimizado) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => setSelectedItem(null)}></div>
          <div className="relative w-full h-full md:h-auto md:max-w-6xl md:max-h-[90vh] bg-[#050505] md:rounded-[4rem] border border-white/10 flex flex-col overflow-y-auto scrollbar-hide">
            
            <div className="sticky top-0 z-10 px-6 py-6 border-b border-white/5 bg-black/60 backdrop-blur-xl flex justify-between items-center">
               <h2 className="text-sm font-black tracking-widest uppercase">{selectedItem.title}</h2>
               <button onClick={() => setSelectedItem(null)} className="p-3 bg-white/5 rounded-full"><X size={20} /></button>
            </div>

            <div className="p-6 md:p-16 space-y-10">
              <div className="aspect-video w-full rounded-[2rem] md:rounded-[3rem] bg-black overflow-hidden relative group shadow-2xl">
                <img src={selectedItem.imageUrl} className="w-full h-full object-cover opacity-30" alt="" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <a href={selectedItem.videoUrl} target="_blank" className="p-10 md:p-16 rounded-full bg-white text-black hover:scale-110 transition-all shadow-2xl">
                    {selectedItem.type === 'curso' ? <PlayCircle size={40} /> : <Book size={40} />}
                  </a>
                  <p className="text-[9px] font-black uppercase tracking-[5px] opacity-40">Acessar Conteúdo</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex gap-3">
                  <span className="px-4 py-2 bg-purple-600/10 text-purple-400 rounded-full text-[10px] font-black uppercase border border-purple-500/20">{selectedItem.category}</span>
                  <span className="px-4 py-2 bg-white/5 text-gray-500 rounded-full text-[10px] font-black uppercase border border-white/10">{selectedItem.views} Acessos</span>
                </div>
                <div className="text-gray-400 text-lg md:text-2xl leading-relaxed italic border-l-2 border-purple-600 pl-6">
                  {renderDescription(selectedItem.description)}
                </div>
              </div>

              {/* COMENTÁRIOS NO MODAL */}
              <div className="pt-10 border-t border-white/5 space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[4px] text-gray-600">Feedback dos Membros</h3>
                 <div className="space-y-4">
                    {selectedItem.comments.map(c => (
                      <div key={c.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="flex justify-between mb-2 text-[10px] font-black"><span className="text-purple-400">{c.userName}</span><span className="text-gray-800">{c.timestamp}</span></div>
                        <p className="text-sm text-gray-500 leading-relaxed italic">"{c.text}"</p>
                      </div>
                    ))}
                 </div>
                 <form className="relative" onSubmit={async (e) => {
                    e.preventDefault();
                    const input = (e.target as any).comment;
                    if(!input.value.trim()) return;
                    try {
                      await supabase.from('comments').insert([{ material_id: selectedItem.id, user_name: currentUser?.name || 'Membro', text: input.value, timestamp: new Date().toLocaleDateString('pt-BR') }]);
                      input.value = '';
                      fetchData();
                    } catch (err) { addToast("Erro ao comentar", "error"); }
                  }}>
                    <input name="comment" type="text" placeholder="Adicionar insight..." className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm outline-none" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 rounded-lg"><Send size={18} /></button>
                 </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default App;
