import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth, login, logout, handleFirestoreError } from './lib/firebase';
import { SiteConfig, OperationType, School, News, Resource } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Menu, 
  X, 
  Settings, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit,
  ExternalLink,
  Youtube,
  Gamepad2,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  Code
} from 'lucide-react';
import { cn } from './lib/utils';

// Context for App State
interface AppContextType {
  user: User | null;
  isAdmin: boolean;
  config: SiteConfig | null;
  schools: School[];
  news: News[];
  resources: Resource[];
  loading: boolean;
  activeSchoolId: string | null;
  setActiveSchoolId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Hardcoded admin check from instruction Email
      setIsAdmin(u?.email === 'hylomi3ia@gmail.com');
    });

    // Subscriptions
    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig({ id: snapshot.id, ...snapshot.data() } as SiteConfig);
      } else {
        // Initial setup
        setConfig({
          id: 'main',
          siteName: 'Portal Docent',
          heroTitle: 'Benvinguts al Portal de Gestió Escolar',
          heroSubtitle: 'Recursos, notícies i gestió per a les nostres escoles.',
          primaryColor: '#2563eb',
          accentColor: '#f59e0b',
          fontSans: 'Inter',
          fontHeading: 'Outfit',
          baseFontSize: '16px'
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'config/main'));

    const unsubSchools = onSnapshot(collection(db, 'schools'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as School))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setSchools(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'schools'));

    const unsubNews = onSnapshot(collection(db, 'news'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as News))
        .sort((a, b) => b.date?.toMillis?.() - a.date?.toMillis?.());
      setNews(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'news'));

    const unsubResources = onSnapshot(collection(db, 'resources'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
      setResources(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'resources'));

    setLoading(false);
    return () => {
      unsubAuth();
      unsubConfig();
      unsubSchools();
      unsubNews();
      unsubResources();
    };
  }, []);

  // Inject dynamic styles
  useEffect(() => {
    if (config) {
      document.documentElement.style.setProperty('--primary', config.primaryColor || '#2563eb');
      document.documentElement.style.setProperty('--accent', config.accentColor || '#f59e0b');
      document.documentElement.style.fontSize = config.baseFontSize || '16px';
      
      // Font injection
      const headingFont = config.fontHeading || 'Outfit';
      const sansFont = config.fontSans || 'Inter';
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${headingFont.replace(/ /g, '+')}:wght@400;600;700&family=${sansFont.replace(/ /g, '+')}:wght@400;500;600&display=swap`;
      document.head.appendChild(link);
      
      document.body.style.fontFamily = `"${sansFont}", sans-serif`;
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((h: any) => {
        h.style.fontFamily = `"${headingFont}", sans-serif`;
      });
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [config]);

  useEffect(() => {
    if (isAdmin && !loading) {
      // 1. Bootstrap School
      if (schools.length === 0) {
        const bootstrapSchool = async () => {
          try {
            await addDoc(collection(db, 'schools'), {
              name: 'ZER Els Ceps',
              slug: 'zer-els-ceps',
              order: 0
            });
          } catch (e) {
            console.error("Error bootstrapping school", e);
          }
        };
        bootstrapSchool();
      }

      // 2. Bootstrap specific resource
      const zerSchool = schools.find(s => s.slug === 'zer-els-ceps');
      if (zerSchool) {
        const hasConsell = resources.some(r => r.schoolId === zerSchool.id && r.title === 'Consell Escolar');
        if (!hasConsell) {
          const bootstrapResource = async () => {
            try {
              await addDoc(collection(db, 'resources'), {
                schoolId: zerSchool.id,
                title: 'Consell Escolar',
                description: 'Aplicació per a la gestió del Consell Escolar',
                type: 'link',
                url: 'https://ai.studio/apps/59657500-89ec-4663-b194-09199e8d17a4',
                createdAt: new Date()
              });
            } catch (e) {
              console.error("Error bootstrapping resource", e);
            }
          };
          bootstrapResource();
        }
      }
    }
  }, [isAdmin, schools, resources, loading]);

  if (loading) return <div className="flex h-screen items-center justify-center font-heading font-bold text-primary animate-pulse">Carregant Portal Docent...</div>;

  return (
    <AppContext.Provider value={{
      user, isAdmin, config, schools, news, resources, loading, activeSchoolId, setActiveSchoolId
    }}>
      <div className="min-h-screen bg-slate-50 text-slate-900 select-none">
        <Navbar onOpenAdmin={() => setIsAdminPanelOpen(true)} />
        
        <main className="pt-24 pb-12">
          <AnimatePresence mode="wait">
            {!activeSchoolId ? (
              <Home key="home" />
            ) : (
              <SchoolView key={`school-${activeSchoolId}`} schoolId={activeSchoolId} />
            )}
          </AnimatePresence>
        </main>

        {isAdmin && isAdminPanelOpen && (
          <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />
        )}
      </div>
    </AppContext.Provider>
  );
}

// Navbar Component
function Navbar({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const { user, isAdmin, config, schools, setActiveSchoolId, activeSchoolId } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl px-6 h-16 flex items-center justify-between shadow-lg shadow-slate-100/50">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => { setActiveSchoolId(null); setIsMenuOpen(false); }}
        >
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <Building2 size={22} />
          </div>
          <span className="text-xl font-bold font-heading tracking-tighter">
            {config?.siteName || 'Portal Docent'}
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex bg-slate-100/50 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveSchoolId(null)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                !activeSchoolId ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Inici
            </button>
            {schools.map(school => (
              <button 
                key={school.id}
                onClick={() => setActiveSchoolId(school.id)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                  activeSchoolId === school.id ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {school.name}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          {isAdmin && (
            <button 
              onClick={onOpenAdmin}
              className="p-2 hover:bg-neutral-100 rounded-full text-neutral-600 transition-colors"
              title="Administració"
            >
              <Settings size={20} />
            </button>
          )}

          {user ? (
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-100 rounded-lg text-sm font-medium text-neutral-600"
            >
              <LogOut size={18} />
              <span className="hidden lg:inline">Sortir</span>
            </button>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-all active:scale-95"
            >
              <LogIn size={18} />
              Entrar
            </button>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-16 left-0 right-0 bg-white border-bottom border-neutral-200 p-4 flex flex-col gap-2"
          >
            <button 
              onClick={() => { setActiveSchoolId(null); setIsMenuOpen(false); }}
              className="text-left py-3 px-4 rounded-lg hover:bg-neutral-50 font-medium"
            >
              Inici
            </button>
            {schools.map(school => (
              <button 
                key={school.id}
                onClick={() => { setActiveSchoolId(school.id); setIsMenuOpen(false); }}
                className="text-left py-3 px-4 rounded-lg hover:bg-neutral-50 font-medium"
              >
                {school.name}
              </button>
            ))}
            <div className="h-px bg-neutral-100 my-2" />
            {isAdmin && (
              <button 
                onClick={() => { onOpenAdmin(); setIsMenuOpen(false); }}
                className="text-left py-3 px-4 rounded-lg hover:bg-neutral-50 font-medium text-primary flex items-center gap-2"
              >
                <Settings size={18} /> Administració
              </button>
            )}
            {user ? (
              <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-left py-3 px-4 rounded-lg hover:bg-neutral-50 font-medium text-red-600 flex items-center gap-2">
                <LogOut size={18} /> Sortir
              </button>
            ) : (
              <button onClick={() => { login(); setIsMenuOpen(false); }} className="text-left py-3 px-4 rounded-lg hover:bg-neutral-50 font-medium text-primary flex items-center gap-2">
                <LogIn size={18} /> Entrar
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// Home Component
function Home() {
  const { config, news, schools, setActiveSchoolId } = useApp();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto px-4 space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Hero Card */}
        <div className="md:col-span-8 bento-card relative overflow-hidden flex flex-col justify-end p-12 min-h-[400px]">
          {config?.heroImage && (
            <img 
              src={config.heroImage} 
              alt="Hero" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply transition-transform duration-700 hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
          <div className="relative z-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="stat-chip mb-4 bg-white/20 text-white backdrop-blur-md">Escritori Virtual</motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold font-heading text-white mb-4 leading-none"
            >
              {config?.heroTitle}
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-200 max-w-lg"
            >
              {config?.heroSubtitle}
            </motion.p>
          </div>
        </div>

        {/* Quick Access Schools */}
        <div className="md:col-span-4 bento-card p-8 flex flex-col justify-between overflow-hidden">
          <div>
            <h3 className="text-xl font-bold font-heading mb-2 flex items-center gap-2">
              <Building2 className="text-primary" size={20}/>
              Escoles
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Selecciona l'escola per veure recursos</p>
            <div className="space-y-3">
              {schools.map(school => (
                <button 
                  key={school.id}
                  onClick={() => setActiveSchoolId(school.id)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/30 hover:bg-white hover:shadow-lg transition-all group"
                >
                  <span className="font-bold">{school.name}</span>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">
            {schools.length} Escoles Registrades
          </div>
        </div>

        {/* News Grid Section */}
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {news.slice(0, 3).map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (idx * 0.1) }}
              className={cn(
                "bento-card p-8 flex flex-col group",
                idx === 0 ? "md:col-span-2 md:flex-row gap-8" : "md:col-span-1"
              )}
            >
              {item.image && (
                <div className={cn("overflow-hidden rounded-2xl flex-shrink-0", idx === 0 ? "w-full md:w-1/2 h-full min-h-[200px]" : "w-full h-44 mb-6")}>
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                </div>
              )}
              <div className="flex flex-col justify-center flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {new Date(item.date?.toMillis?.() || Date.now()).toLocaleDateString('ca-ES')}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3 leading-tight">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6">{item.content}</p>
                <button className="self-start text-xs font-bold text-primary flex items-center gap-1 group/btn transition-all">
                  Veure més <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// School View Component
function SchoolView({ schoolId }: { schoolId: string }) {
  const { schools, resources } = useApp();
  const school = schools.find(s => s.id === schoolId);
  const schoolResources = resources.filter(r => r.schoolId === schoolId);

  if (!school) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      className="max-w-7xl mx-auto px-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* School Header Bento */}
        <div className="md:col-span-12 bento-card p-12 flex flex-col md:flex-row items-center gap-8 min-h-[240px]">
          <div className="w-32 h-32 bg-slate-50 rounded-3xl flex items-center justify-center p-6 border border-slate-100 shadow-inner">
            {school.logo ? (
              <img src={school.logo} alt={school.name} className="w-full h-full object-contain" />
            ) : (
              <Building2 size={48} className="text-primary/20" />
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-5xl md:text-7xl font-bold font-heading mb-4 leading-none tracking-tighter">{school.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="stat-chip">🏫 Educació Primària</span>
              <span className="stat-chip bg-green-50 text-green-700">{schoolResources.length} Recursos Actius</span>
            </div>
          </div>
        </div>

        {/* Resources Layout */}
        {schoolResources.length > 0 ? (
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            {schoolResources.map((res, idx) => (
              <ResourceCard key={res.id} resource={res} idx={idx} />
            ))}
          </div>
        ) : (
          <div className="md:col-span-12 bento-card py-32 flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <div className="text-5xl">📂</div>
            <p className="text-xl font-bold text-slate-400">Encara no s'han pujat recursos per a aquesta escola.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ResourceCard({ resource, idx }: { resource: Resource; idx: number }) {
  const icons = {
    video: <Youtube size={20}/>,
    game: <Gamepad2 size={20}/>,
    doc: <FileText size={20}/>,
    link: <LinkIcon size={20}/>,
    kahoot: <div className="font-bold text-xs uppercase tracking-tighter">K</div>,
    html: <Code size={20}/>
  };

  const colors = {
    video: 'bg-red-50 text-red-600',
    game: 'bg-indigo-50 text-indigo-600',
    doc: 'bg-blue-50 text-blue-600',
    link: 'bg-slate-50 text-slate-600',
    kahoot: 'bg-purple-600 text-white',
    html: 'bg-emerald-50 text-emerald-600'
  };

  const [isOpen, setIsOpen] = useState(false);

  // Bento logic: make some cards bigger if they have description and it's an even index
  const isLarge = (resource.description && idx % 3 === 0) || resource.type === 'html';

  if (resource.type === 'html') {
    return (
      <>
        <motion.div
           onClick={() => setIsOpen(true)}
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: idx * 0.05 }}
           className={cn(
             "bento-card p-8 flex flex-col group relative overflow-hidden cursor-pointer",
             isLarge ? "md:col-span-2 md:row-span-1" : "md:col-span-1"
           )}
        >
          <div className="flex items-start justify-between mb-8">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12", colors[resource.type])}>
              {icons[resource.type]}
            </div>
            <div className="p-2 bg-slate-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink size={16} className="text-slate-400" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors">{resource.title}</h3>
            {resource.description && (
              <p className="text-slate-500 text-sm leading-relaxed mb-6 group-hover:text-slate-700 line-clamp-3">{resource.description}</p>
            )}
          </div>

          <div className="mt-4 pt-6 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">APP PERSONALITZADA</span>
            <div className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">OBRIR APP</div>
          </div>
        </motion.div>

        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex flex-col p-4 md:p-12">
              <div className="flex items-center justify-between mb-8 text-white">
                <div>
                  <h2 className="text-3xl font-bold font-heading">{resource.title}</h2>
                  <p className="text-slate-400 text-sm">{resource.description}</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><X /></button>
              </div>
              <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-2xl relative">
                <iframe 
                  srcDoc={resource.content}
                  className="w-full h-full border-none"
                  title={resource.title}
                  sandbox="allow-scripts allow-forms allow-modals"
                />
              </div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
      className={cn(
        "bento-card p-8 flex flex-col group relative overflow-hidden",
        isLarge ? "md:col-span-2 md:row-span-1" : "md:col-span-1"
      )}
    >
      <div className="flex items-start justify-between mb-8">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12", colors[resource.type])}>
          {icons[resource.type]}
        </div>
        <div className="p-2 bg-slate-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={16} className="text-slate-400" />
        </div>
      </div>
      
      <div className="flex-1">
        <h3 className="text-xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors">{resource.title}</h3>
        {resource.description && (
          <p className="text-slate-500 text-sm leading-relaxed mb-6 group-hover:text-slate-700 line-clamp-3">{resource.description}</p>
        )}
      </div>

      <div className="mt-4 pt-6 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{resource.type}</span>
        <div className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">OBRIR</div>
      </div>
    </motion.a>
  );
}

// ADMIN PANEL

function AdminPanel({ onClose }: { onClose: () => void }) {
  const { config, schools, news, resources } = useApp();
  const [activeTab, setActiveTab] = useState<'config' | 'schools' | 'news' | 'resources'>('config');

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-end p-4 md:p-6">
      <motion.div 
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        className="w-full max-w-5xl h-full bg-slate-50 shadow-[0_0_80px_rgba(0,0,0,0.2)] rounded-[2.5rem] flex flex-col md:flex-row overflow-hidden"
      >
        {/* Sidebar Admin */}
        <aside className="w-full md:w-64 bg-[#1e293b] text-white p-8 flex flex-col border-r border-slate-700">
          <div className="mb-12">
            <h1 className="text-2xl font-bold font-heading tracking-tighter mb-1">Portal Docent</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Panell d'Administrador</p>
          </div>

          <nav className="flex-1 flex flex-col gap-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 px-2">Personalització</div>
              <div className="space-y-1">
                <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} label="Configuració" icon={<Settings size={18}/>} />
                <TabButton active={activeTab === 'schools'} onClick={() => setActiveTab('schools')} label="Escoles" icon={<Building2 size={18}/>} />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 px-2">Continguts</div>
              <div className="space-y-1">
                <TabButton active={activeTab === 'news'} onClick={() => setActiveTab('news')} label="Notícies" icon={<MessageSquare size={18}/>} />
                <TabButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} label="Recursos" icon={<LinkIcon size={18}/>} />
              </div>
            </div>
          </nav>

          <div className="mt-auto">
            <button 
              onClick={onClose}
              className="w-full py-4 mt-8 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-colors border border-slate-700"
            >
              <X size={18} /> Tancar Panell
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'config' && <ConfigManager config={config} />}
              {activeTab === 'schools' && <SchoolsManager schools={schools} />}
              {activeTab === 'news' && <NewsManager news={news} schools={schools} />}
              {activeTab === 'resources' && <ResourcesManager resources={resources} schools={schools} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: any }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
        active ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// Config Manager
function ConfigManager({ config }: { config: SiteConfig | null }) {
  const [formData, setFormData] = useState<Partial<SiteConfig>>(config || {});

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'config', 'main'), formData, { merge: true });
      alert('Configuració guardada!');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'config/main');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
        <h3 className="text-xl font-bold mb-4">Aparença i Textos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Nom de la web" value={formData.siteName} onChange={v => setFormData({...formData, siteName: v})} />
          <Input label="Mida font base" value={formData.baseFontSize} onChange={v => setFormData({...formData, baseFontSize: v})} />
          <Input label="Color Primari (Hex)" value={formData.primaryColor} onChange={v => setFormData({...formData, primaryColor: v})} />
          <Input label="Color Accent (Hex)" value={formData.accentColor} onChange={v => setFormData({...formData, accentColor: v})} />
          <Input label="Font Títols (Google Font)" value={formData.fontHeading} onChange={v => setFormData({...formData, fontHeading: v})} />
          <Input label="Font Cos (Google Font)" value={formData.fontSans} onChange={v => setFormData({...formData, fontSans: v})} />
        </div>
        
        <div className="h-px bg-neutral-100 my-4" />

        <Input label="Títol Hero" value={formData.heroTitle} onChange={v => setFormData({...formData, heroTitle: v})} />
        <Input label="Subtítol Hero" value={formData.heroSubtitle} onChange={v => setFormData({...formData, heroSubtitle: v})} />
        <Input label="Imatge Hero (URL)" value={formData.heroImage} onChange={v => setFormData({...formData, heroImage: v})} />

        <button 
          onClick={handleSave}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Guardar Canvis
        </button>
      </div>
    </div>
  );
}

// Schools Manager
function SchoolsManager({ schools }: { schools: School[] }) {
  const [newSchoolName, setNewSchoolName] = useState('');
  
  const handleAdd = async () => {
    if (!newSchoolName) return;
    try {
      await addDoc(collection(db, 'schools'), {
        name: newSchoolName,
        slug: newSchoolName.toLowerCase().replace(/ /g, '-'),
        order: schools.length
      });
      setNewSchoolName('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'schools');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'schools', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `schools/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-8">
        <input 
          type="text" 
          value={newSchoolName}
          onChange={e => setNewSchoolName(e.target.value)}
          placeholder="Nom de la nova escola..."
          className="flex-1 px-6 py-4 bg-white border border-neutral-200 rounded-2xl text-lg outline-none focus:border-primary transition-colors"
        />
        <button onClick={handleAdd} className="px-8 py-4 bg-neutral-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-neutral-800">
          <Plus size={20} /> Afegir Escola
        </button>
      </div>

      <div className="space-y-4">
        {schools.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-neutral-100 flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center border border-neutral-100">
                 <Building2 size={20} className="text-neutral-400" />
               </div>
               <span className="text-xl font-bold">{s.name}</span>
             </div>
             <div className="flex items-center gap-2">
               <button type="button" className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors"><Edit size={18}/></button>
               <button 
                 type="button"
                 onClick={(e) => {
                   e.stopPropagation();
                   handleDelete(s.id);
                 }} 
                 className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                >
                  <Trash2 size={18}/>
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// News Manager
function NewsManager({ news, schools }: { news: News[]; schools: School[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<News>>({ title: '', content: '' });

  const handleAdd = async () => {
    if (!formData.title || !formData.content) return;
    try {
      await addDoc(collection(db, 'news'), {
        ...formData,
        date: new Date() // Simplified for now
      });
      setFormData({ title: '', content: '' });
      setIsAdding(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'news');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold">Gestió de Notícies</h3>
        {!isAdding && <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm">Nova Notícia</button>}
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-primary/20 space-y-4 mb-8">
          <Input label="Títol" value={formData.title} onChange={v => setFormData({...formData, title: v})} />
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Contingut</label>
            <textarea 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})}
              className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl min-h-[150px] outline-none focus:border-primary transition-all"
            />
          </div>
          <Input label="Imatge (URL)" value={formData.image} onChange={v => setFormData({...formData, image: v})} />
          <div className="flex gap-4">
            <button onClick={handleAdd} className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold">Publicar</button>
            <button onClick={() => setIsAdding(false)} className="px-8 py-4 bg-neutral-100 rounded-2xl font-bold">Cancel·lar</button>
          </div>
        </div>
      )}

      {news.map(n => (
        <div key={n.id} className="bg-white p-6 rounded-2xl border border-neutral-100 flex items-center justify-between group">
           <div className="flex-1">
             <h4 className="font-bold text-lg">{n.title}</h4>
             <p className="text-neutral-500 text-sm line-clamp-1">{n.content}</p>
           </div>
           <button 
             type="button"
             onClick={async (e) => {
               e.stopPropagation();
               try {
                 await deleteDoc(doc(db, 'news', n.id));
               } catch (e) {
                 handleFirestoreError(e, OperationType.DELETE, `news/${n.id}`);
               }
             }} 
             className="p-3 text-red-600 hover:bg-neutral-50 rounded-xl transition-all"
           >
             <Trash2 size={18} />
           </button>
        </div>
      ))}
    </div>
  );
}

// Resources Manager
function ResourcesManager({ resources, schools }: { resources: Resource[]; schools: School[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Resource>>({ title: '', type: 'link', url: '', content: '', schoolId: schools[0]?.id || '' });

  const handleAdd = async () => {
    if (!formData.title || (!formData.url && formData.type !== 'html') || !formData.schoolId) return;
    try {
      await addDoc(collection(db, 'resources'), {
        ...formData,
        createdAt: new Date()
      });
      setFormData({ title: '', type: 'link', url: '', content: '', schoolId: schools[0]?.id || '' });
      setIsAdding(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'resources');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold">Recursos per Escola</h3>
        {!isAdding && <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm">Nou Recurs</button>}
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-primary/20 space-y-6 mb-8">
          <Input label="Títol del recurs" value={formData.title} onChange={v => setFormData({...formData, title: v})} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Escola</label>
              <select 
                value={formData.schoolId} 
                onChange={e => setFormData({...formData, schoolId: e.target.value})}
                className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none"
              >
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Tipus</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as any})}
                className="w-full p-4 bg-neutral-900 text-white border-2 border-primary/20 rounded-2xl outline-none focus:border-primary transition-all shadow-inner"
              >
                <option value="html">✨ Codi Personalitzat (HTML/JS)</option>
                <option value="video">Vídéo (YouTube)</option>
                <option value="game">Joc / Itch.io</option>
                <option value="kahoot">Kahoot</option>
                <option value="doc">Document / PDF</option>
                <option value="link">Enllaç extern</option>
              </select>
            </div>
          </div>
          
          {formData.type === 'html' ? (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Codi HTML/JS (App Personalitzada)</label>
              <textarea 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})}
                className="w-full p-6 bg-neutral-900 text-emerald-400 font-mono text-sm rounded-2xl min-h-[300px] outline-none border-2 border-slate-800 focus:border-primary transition-all"
                placeholder="<html>... Codí aquí ...</html>"
              />
              <p className="text-[10px] text-slate-400 mt-2 italic">* Pots enganxar el codi sencer d'una aplicació interactiva.</p>
            </div>
          ) : (
            <Input label="URL (YouTube, Itch, etc.)" value={formData.url} onChange={v => setFormData({...formData, url: v})} />
          )}

          <Input label="Descripció (opcional)" value={formData.description} onChange={v => setFormData({...formData, description: v})} />

          <div className="flex gap-4">
            <button onClick={handleAdd} className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold">Afegir Recurs</button>
            <button onClick={() => setIsAdding(false)} className="px-8 py-4 bg-neutral-100 rounded-2xl font-bold">Cancel·lar</button>
          </div>
        </div>
      )}

      {schools.map(s => (
        <div key={s.id} className="mb-10">
          <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
            <Building2 size={14}/> {s.name}
          </h4>
          <div className="space-y-3">
            {resources.filter(r => r.schoolId === s.id).map(r => (
              <div key={r.id} className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between group transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-300">
                    {r.type === 'video' && <Youtube size={16}/>}
                    {r.type === 'game' && <Gamepad2 size={16}/>}
                    {r.type === 'kahoot' && <div className="font-bold text-[10px]">K</div>}
                    {r.type === 'doc' && <FileText size={16}/>}
                    {r.type === 'link' && <LinkIcon size={16}/>}
                    {r.type === 'html' && <Code size={16}/>}
                  </div>
                  <div>
                    <span className="font-bold block">{r.title}</span>
                    <span className="text-[10px] text-neutral-400 font-medium uppercase">{r.type}</span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await deleteDoc(doc(db, 'resources', r.id));
                    } catch (e) {
                      handleFirestoreError(e, OperationType.DELETE, `resources/${r.id}`);
                    }
                  }} 
                  className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// UI Components
function Input({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1 flex-1">
      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 ml-2">{label}</label>
      <input 
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-neutral-700 font-medium"
        placeholder={`Introdueix ${label.toLowerCase()}...`}
      />
    </div>
  );
}
