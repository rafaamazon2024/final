
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LogOut, Search, Grid, Book, PlayCircle, X, 
  ArrowRight, Layers, Star, RotateCcw, Loader2, ExternalLink, 
  Database, AlertCircle, CheckCircle, Sparkles, Info, Plus, Trash2, Edit3, Save, LayoutDashboard, Settings as SettingsIcon, Image as ImageIcon, Upload, Terminal, Copy
} from 'lucide-react';
import { User, Material, AppSettings, CATEGORIES, MaterialType } from './types';
import { supabase } from './supabase';

const VIBRANT_GRADIENTS = [
  'from-indigo-600 via-purple-600 to-pink-500',
  'from-amber-400 via-orange-500 to-red-600',
  'from-cyan-400 via-blue-500 to-indigo-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-fuchsia-500 via-purple-600 to-violet-700',
  'from-blue-600 via-indigo-700 to-purple-800'
];

const getRandomGradient = () => VIBRANT_GRADIENTS[Math.floor(Math.random() * VIBRANT_GRADIENTS.length)];

// ID Estático para as configurações (Deve ser um UUID válido)
const SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

const DEFAULT_SETTINGS: AppSettings = {
  heroTitle: "ACESSO\nVITALÍCIO.",
  heroSubtitle: "Sua biblioteca privada de alta performance, agora 100% online e sob seu comando absoluto.",
  heroImageUrl: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop",
  heroButtonText: "Explorar Conteúdo",
  heroButtonLink: "#vitrine"
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInit, setIsAppInit] = useState(true);
  const [toasts, setToasts] = useState<{id: string, message: string, type?: 'success' | 'error'}[]>([]);

  const [items, setItems] = useState<Material[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'curso' | 'ebook'>('todos');
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'acervo' | 'config'>('acervo');
  const [isEditing, setIsEditing] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState<Partial<Material>>({
    title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: ''
  });
  const [uploading, setUploading] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast("Código copiado!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'material' | 'settings') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("Arquivo muito grande (Máx 5MB).", "error");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        if (uploadError.message.includes('row-level security')) {
          throw new Error("Erro RLS: Execute o SQL na aba de configurações para liberar o upload.");
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      if (target === 'material') {
        setMaterialForm(prev => ({ ...prev, imageUrl: publicUrl }));
      } else {
        setSettings(prev => ({ ...prev, heroImageUrl: publicUrl }));
      }
      addToast("Upload concluído!");
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          id: SETTINGS_ID, 
          hero_title: settings.heroTitle,
          hero_subtitle: settings.heroSubtitle,
          hero_image_url: settings.heroImageUrl,
          hero_button_text: settings.heroButtonText,
          hero_button_link: settings.heroButtonLink,
        });

      if (error) throw error;
      addToast("Identidade visual salva!");
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Buscar Materiais
      const { data: mData, error: mError } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
      if (mError) throw mError;
      
      setItems((mData || []).map(m => ({
        ...m,
        id: m.id,
        title: m.title,
        type: m.type as MaterialType,
        category: m.category,
        description: m.description || '',
        imageUrl: m.image_url || '',
        videoUrl: m.video_url || '',
        views: m.views || 0,
        gradient: m.gradient || getRandomGradient(),
        comments: [],
        isReadBy: []
      })));

      // Buscar Settings
      const { data: sData } = await supabase.from('settings').select('*').eq('id', SETTINGS_ID).maybeSingle();
      if (sData) setSettings({
        heroTitle: sData.hero_title || DEFAULT_SETTINGS.heroTitle,
        heroSubtitle: sData.hero_subtitle || DEFAULT_SETTINGS.heroSubtitle,
        heroImageUrl: sData.hero_image_url || DEFAULT_SETTINGS.heroImageUrl,
        heroButtonText: sData.hero_button_text || DEFAULT_SETTINGS.heroButtonText,
        heroButtonLink: sData.hero_button_link || DEFAULT_SETTINGS.heroButtonLink,
      });

    } catch (e: any) {
      console.warn("Sincronização pendente:", e.message);
      if (e.message.includes('uuid')) {
        addToast("Erro de Banco: O ID usado não é compatível com UUID. Execute o SQL de reparo.", "error");
      }
    }
  };

  useEffect(() => { if (currentUser) fetchData(); }, [currentUser]);

  const saveMaterial = async () => {
    if (!materialForm.title) return addToast("Título é obrigatório", "error");
    setIsLoading(true);
    try {
      const payload = {
        title: materialForm.title,
        type: materialForm.type,
        category: materialForm.category,
        description: materialForm.description,
        image_url: materialForm.imageUrl,
        video_url: materialForm.videoUrl,
        gradient: isEditing?.gradient || getRandomGradient()
      };

      const { error } = isEditing 
        ? await supabase.from('materials').update(payload).eq('id', isEditing.id)
        : await supabase.from('materials').insert([payload]);

      if (error) throw error;
      addToast(isEditing ? "Atualizado!" : "Publicado!");
      setIsEditing(null);
      setMaterialForm({ title: '', type: 'curso', category: CATEGORIES[0], description: '', imageUrl: '', videoUrl: '' });
      fetchData();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fix: Implementation of the deleteMaterial function to resolve the 'Cannot find name' error
  const deleteMaterial = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este conteúdo?")) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
      addToast("Excluído com sucesso!");
      fetchData();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Bypass admin para teste
    if (authEmail === 'admin@academia.com' && authPassword === 'admin123') {
      setCurrentUser({ id: 'admin-root', name: 'Administrador Elite', email: authEmail, isAdmin: true });
      setIsLoading(false);
      return;
    }
    try {
      if (isAuthMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword,
          options: { data: { full_name: authEmail.split('@')[0] } }
        });
        if (error) throw error;
        addToast("Cadastro realizado!", "success");
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isAdmin = session.user.email === 'admin@academia.com';
        setCurrentUser({ id: session.user.id, name: session.user.email?.split('@')[0] || 'Membro', email: session.user.email || '', isAdmin });
      }
      setIsAppInit(false);
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const isAdmin = session.user.email === 'admin@academia.com';
        setCurrentUser({ id: session.user.id, name: session.user.email?.split('@')[0] || 'Membro', email: session.user.email || '', isAdmin });
      } else {
        setCurrentUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
      const matchesTab = activeTab === 'todos' || item.type === activeTab;
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [items, searchTerm, activeCategory, activeTab]);

  const SQL_FIX_SCRIPT = `-- EXECUTE ESTE SCRIPT NO 'SQL EDITOR' DO SUPABASE PARA CORRIGIR AS TABELAS

-- 1. Criar Tabela de Materiais se não existir
CREATE TABLE IF NOT EXISTS materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  description text,
  image_url text,
  video_url text,
  gradient text,
  views bigint DEFAULT 0
);

-- 2. Criar Tabela de Configurações se não existir
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY,
  hero_title text,
  hero_subtitle text,
  hero_image_url text,
  hero_button_text text,
  hero_button_link text
);

-- 3. Inserir Configuração Padrão Inicial
INSERT INTO settings (id, hero_title, hero_subtitle, hero_image_url, hero_button_text, hero_button_link)
VALUES ('00000000-0000-0000-0000-000000000000', 'ACESSO\\nVITALÍCIO.', 'Sua biblioteca privada de alta performance.', 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop', 'Explorar Conteúdo', '#vitrine')
ON CONFLICT (id) DO NOTHING;

-- 4. Criar Política de Storage para Uploads
CREATE POLICY "Permitir Tudo no Bucket Covers" 
ON storage.objects FOR ALL 
TO public 
USING (bucket_id = 'covers') 
WITH CHECK (bucket_id = 'covers');

-- 5. Habilitar RLS em tudo (opcional, mas libera o acesso público se não houver regras restritivas)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Público Leitura Materiais" ON materials FOR SELECT TO public USING (true);
CREATE POLICY "Acesso Público Escrita Materiais" ON materials FOR ALL TO public USING (true);
CREATE POLICY "Acesso Público Leitura Settings" ON settings FOR SELECT TO public USING (true);
CREATE POLICY "Acesso Público Escrita Settings" ON settings FOR ALL TO public USING (true);`;

  if (isAppInit) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <Loader2 className="animate-spin text-purple-600" size={48} />
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6 relative">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] border border-white/10 text-center animate-fade-in">
          <Layers className="mx-auto mb-8 text-purple-500" size={48} />
          <h1 className="text-3xl font-black mb-10 tracking-tighter uppercase text-gradient-primary">Portal Vitalício</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="E-mail" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm" required />
            <input type="password" placeholder="Senha" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm" required />
            <button type="submit" className="w-full py-5 rounded-2xl bg-gradient-primary font-black uppercase text-[11px] tracking-widest shadow-xl">
              {isAuthMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>
          <button onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login')} className="mt-8 text-[10px] font-black uppercase text-gray-500 hover:text-purple-400">
            {isAuthMode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      <div className="fixed top-6 right-6 z-[100] space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`animate-slide-in glass px-6 py-4 rounded-2xl border-l-4 pointer-events-auto flex items-center gap-4 shadow-2xl ${t.type === 'error' ? 'border-red-500' : 'border-purple-500'}`}>
            {t.type === 'error' ? <AlertCircle size={18} className="text-red-500" /> : <CheckCircle size={18} className="text-purple-500" />}
            <span className="text-xs font-black">{t.message}</span>
          </div>
        ))}
      </div>

      <aside className="w-full md:w-80 glass border-r border-white/10 p-10 flex flex-col gap-10 bg-[#050505] z-50">
        <div className="flex items-center gap-4"><Layers className="text-purple-500" size={28} /><h2 className="text-xl font-black tracking-tighter">VITALÍCIO</h2></div>
        
        {currentUser.isAdmin && (
          <button onClick={() => { setIsAdminMode(!isAdminMode); setSelectedItem(null); }} className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-xs font-black transition-all ${isAdminMode ? 'bg-orange-600 text-white' : 'bg-white/5 text-orange-400 border border-orange-500/10'}`}>
            <LayoutDashboard size={18} /> {isAdminMode ? 'Sair do Painel' : 'Painel Admin'}
          </button>
        )}

        <nav className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
          <button onClick={() => { setActiveCategory('Todos'); setIsAdminMode(false); }} className={`w-full text-left px-6 py-5 rounded-2xl text-xs font-black transition-all flex items-center gap-4 ${activeCategory === 'Todos' && !isAdminMode ? 'bg-purple-600' : 'text-gray-500 hover:bg-white/5'}`}><Grid size={16} /> Todos</button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setActiveCategory(cat); setIsAdminMode(false); }} className={`w-full text-left px-6 py-5 rounded-2xl text-xs font-black transition-all flex items-center gap-4 ${activeCategory === cat && !isAdminMode ? 'bg-purple-600' : 'text-gray-500 hover:bg-white/5'}`}><Star size={16} /> {cat}</button>
          ))}
        </nav>
        
        <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-red-500/5 text-red-400 font-black text-xs border border-red-500/10"><LogOut size={18} /> Sair</button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {!isAdminMode ? (
          <>
            <section className="relative min-h-[500px] flex flex-col justify-center p-12 lg:p-24 m-6 rounded-[3rem] overflow-hidden border border-white/5">
              <img src={settings.heroImageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Hero" />
              <div className="absolute inset-0 bg-black/50"></div>
              <div className="relative z-10 max-w-4xl animate-fade-in">
                <h1 className="text-5xl lg:text-8xl font-black mb-8 leading-[0.9] tracking-tighter uppercase whitespace-pre-wrap">{settings.heroTitle}</h1>
                <p className="text-xl text-white/70 font-medium mb-12 italic max-w-xl">{settings.heroSubtitle}</p>
                <a href={settings.heroButtonLink} className="px-12 py-6 rounded-full bg-white text-black font-black uppercase text-xs tracking-widest hover:scale-105 transition-all inline-block">{settings.heroButtonText}</a>
              </div>
            </section>

            <div id="vitrine" className="p-10 lg:p-20 space-y-12">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <h2 className="text-4xl lg:text-6xl font-black tracking-tighter">Acervo <span className="text-purple-500">Exclusivo</span></h2>
                <div className="flex bg-white/5 p-2 rounded-full border border-white/10">
                    {(['todos', 'curso', 'ebook'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-4 rounded-full text-[9px] font-black uppercase tracking-[2px] transition-all ${activeTab === tab ? 'bg-purple-600 shadow-xl' : 'text-gray-500 hover:text-white'}`}>{tab}</button>
                    ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                {filteredItems.map(item => (
                  <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedItem(item)}>
                    <div className="relative glass-card rounded-[2.5rem] border border-white/5 overflow-hidden h-full flex flex-col hover:-translate-y-4 transition-all duration-500 shadow-xl">
                      <div className="h-60 overflow-hidden relative">
                        <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={item.title} />
                        <span className="absolute top-6 left-6 px-4 py-2 glass rounded-xl text-[10px] font-black uppercase">{item.type}</span>
                      </div>
                      <div className="p-10 flex flex-col flex-1">
                        <h3 className="text-2xl font-black mb-4 uppercase line-clamp-2">{item.title}</h3>
                        <p className="text-gray-500 text-sm line-clamp-2 italic flex-1">{item.description}</p>
                        <div className="flex justify-between items-center pt-8 border-t border-white/5 mt-4">
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{item.category}</span>
                          <ArrowRight size={20} className="text-purple-500 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="p-10 lg:p-20 space-y-12 animate-fade-in">
            <div className="flex bg-white/5 p-2 rounded-2xl border border-white/10 w-fit mx-auto mb-10">
              <button onClick={() => setAdminSubTab('acervo')} className={`px-10 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${adminSubTab === 'acervo' ? 'bg-orange-600' : 'text-gray-500 hover:text-white'}`}>Conteúdos</button>
              <button onClick={() => setAdminSubTab('config')} className={`px-10 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${adminSubTab === 'config' ? 'bg-purple-600' : 'text-gray-500 hover:text-white'}`}>Configurações</button>
            </div>

            {adminSubTab === 'acervo' ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <div className="glass p-10 rounded-[2.5rem] border border-orange-500/20 space-y-6">
                  <h3 className="text-xl font-black text-orange-500 flex items-center gap-3"><Plus size={24} /> Criar Novo</h3>
                  <div className="space-y-4">
                    <input type="text" placeholder="Título" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4" />
                    <div className="flex gap-4">
                      <input type="text" placeholder="URL Capa" value={materialForm.imageUrl} onChange={e => setMaterialForm({...materialForm, imageUrl: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4" />
                      <label className="p-4 bg-orange-600 rounded-xl cursor-pointer flex items-center justify-center shrink-0 w-14">
                        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20}/>}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'material')} />
                      </label>
                    </div>
                    <div className="flex gap-4">
                        <select value={materialForm.type} onChange={e => setMaterialForm({...materialForm, type: e.target.value as MaterialType})} className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-4">
                           <option value="curso">Vídeo</option>
                           <option value="ebook">PDF</option>
                        </select>
                        <select value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})} className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-4">
                           {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <textarea placeholder="Descrição" value={materialForm.description} onChange={e => setMaterialForm({...materialForm, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 min-h-[80px]" />
                    <input type="text" placeholder="Link (URL Conteúdo)" value={materialForm.videoUrl} onChange={e => setMaterialForm({...materialForm, videoUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4" />
                    <button onClick={saveMaterial} disabled={isLoading || uploading} className="w-full py-5 rounded-xl bg-green-600 font-black uppercase tracking-widest hover:bg-green-500">
                      {isEditing ? 'Atualizar' : 'Salvar'}
                    </button>
                    {isEditing && <button onClick={() => setIsEditing(null)} className="w-full text-[9px] uppercase font-bold text-gray-500">Cancelar</button>}
                  </div>
                </div>

                <div className="glass p-10 rounded-[2.5rem] border border-white/5 flex flex-col h-[600px]">
                  <h3 className="text-xl font-black mb-6 text-purple-400">Banco de Dados ({items.length})</h3>
                  <div className="space-y-3 overflow-y-auto pr-2 scrollbar-hide">
                    {items.map(item => (
                      <div key={item.id} className="p-4 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5 group">
                        <div className="flex items-center gap-4 truncate">
                           <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
                           <p className="font-bold text-sm truncate uppercase">{item.title}</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => { setIsEditing(item); setMaterialForm(item); }} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Edit3 size={16}/></button>
                           <button onClick={() => deleteMaterial(item.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-10">
                <div className="glass p-10 rounded-[2.5rem] border border-purple-500/20 space-y-6">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Topo do Site</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <textarea value={settings.heroTitle} onChange={e => setSettings({...settings, heroTitle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 font-black" rows={3} placeholder="Título" />
                    <textarea value={settings.heroSubtitle} onChange={e => setSettings({...settings, heroSubtitle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm" rows={3} placeholder="Subtítulo" />
                    <div className="flex gap-4">
                      <input type="text" value={settings.heroImageUrl} onChange={e => setSettings({...settings, heroImageUrl: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4" placeholder="URL Imagem" />
                      <label className="p-4 bg-purple-600 rounded-xl cursor-pointer flex items-center justify-center shrink-0 w-14">
                        {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon size={20}/>}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'settings')} />
                      </label>
                    </div>
                    <input type="text" value={settings.heroButtonText} onChange={e => setSettings({...settings, heroButtonText: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 font-bold" placeholder="Texto do Botão" />
                  </div>
                  <button onClick={saveSettings} disabled={isLoading || uploading} className="w-full py-5 rounded-xl bg-purple-600 font-black uppercase tracking-widest">
                    {isLoading ? <Loader2 className="animate-spin inline" size={16} /> : <Save className="inline" size={16}/>} Salvar Identidade
                  </button>
                </div>

                <div className="glass p-10 rounded-[2.5rem] border border-red-500/20 bg-red-500/5 space-y-6">
                  <div className="flex items-center gap-4 text-red-400">
                     <Terminal size={32} />
                     <div>
                        <h4 className="text-xl font-black uppercase italic">Fix: Erro de Banco (UUID/RLS)</h4>
                        <p className="text-xs font-medium">Use o código abaixo no 'SQL Editor' do Supabase para corrigir o erro 'invalid input syntax for type uuid'.</p>
                     </div>
                  </div>
                  <div className="bg-black/50 rounded-2xl p-6 border border-white/10 relative">
                     <pre className="text-[10px] text-green-400 font-mono overflow-x-auto p-4 max-h-60">
                        {SQL_FIX_SCRIPT}
                     </pre>
                     <button onClick={() => copyToClipboard(SQL_FIX_SCRIPT)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all flex items-center gap-2 text-[10px] font-bold">
                        <Copy size={14}/> COPIAR SQL
                     </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedItem(null)}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] glass border border-white/10 rounded-[3rem] overflow-hidden flex flex-col">
            <div className="p-8 lg:p-12 overflow-y-auto scrollbar-hide flex-1">
               <div className="flex justify-between items-start mb-10">
                  <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter">{selectedItem.title}</h2>
                  <button onClick={() => setSelectedItem(null)} className="p-3 bg-white/5 rounded-full hover:text-red-400"><X size={24} /></button>
               </div>
               <div className="aspect-video w-full rounded-[2rem] bg-gray-950 overflow-hidden mb-10 border border-white/5 flex items-center justify-center relative">
                  <img src={selectedItem.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  <a href={selectedItem.videoUrl} target="_blank" className={`relative z-10 p-12 rounded-full bg-gradient-to-br ${selectedItem.gradient} hover:scale-110 transition-all`}>
                     {selectedItem.type === 'curso' ? <PlayCircle size={48} fill="white"/> : <Book size={48} fill="white" />}
                  </a>
               </div>
               <div className="text-gray-400 text-xl italic font-medium leading-relaxed mb-10">{selectedItem.description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
