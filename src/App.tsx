import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth, login, logout, handleFirestoreError } from './lib/firebase';
import { SiteConfig, OperationType, School, News, Resource, AdminUser, Cycle } from './types';
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
  Code,
  Grid,
  Sparkles,
  Palette,
  Clock,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Monitor
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
  admins: AdminUser[];
  loading: boolean;
  activeSchoolId: string | null;
  setActiveSchoolId: (id: string | null) => void;
  handleLogin: () => Promise<void>;
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
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
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

    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser));
      setAdmins(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'admins'));

    setLoading(false);
    return () => {
      unsubAuth();
      unsubConfig();
      unsubSchools();
      unsubNews();
      unsubResources();
      unsubAdmins();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    const isCollectionAdmin = admins.some(a => a.email.toLowerCase().trim() === user.email?.toLowerCase().trim());
    const hardcodedAdmins = ['hylomi3ia@gmail.com', 'jtejero5@xtec.cat'];
    setIsAdmin(hardcodedAdmins.includes(user.email?.toLowerCase() || '') || isCollectionAdmin);
  }, [user, admins]);

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
      // Only bootstrap if the schools collection is truly empty and we haven't tried yet this session
      const bootstraped = sessionStorage.getItem('portal_bootstrapped');
      
      if (schools.length === 0 && !bootstraped) {
        const bootstrapData = async () => {
          try {
            sessionStorage.setItem('portal_bootstrapped', 'true');
            await addDoc(collection(db, 'schools'), {
              name: 'ZER Els Ceps',
              slug: 'zer-els-ceps',
              order: 0
            });
          } catch (e) {
            console.error("Error bootstrapping initial data", e);
          }
        };
        bootstrapData();
      }

      // Bootstrap specific resource only if school exists but resource doesn't
      const zerSchool = schools.find(s => s.slug === 'zer-els-ceps');
      if (zerSchool && resources.length === 0 && !bootstraped) {
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
  }, [isAdmin, schools.length, resources.length, loading]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("El navegador ha bloquejat la finestra de login. Si us plau, obre l'aplicació en una pestanya nova o permet els popups.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Aquest domini no està autoritzat a Firebase. Si us plau, afegeix aquest domini a la llista de dominis autoritzats de Firebase (Consola > Authentication > Settings). Domain: " + window.location.hostname);
      } else {
        alert("Error de login: " + error.message);
      }
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-heading font-bold text-primary animate-pulse italic">Iniciant sessió al Portal Docent v2.1...</div>;

  return (
    <AppContext.Provider value={{
      user, isAdmin, config, schools, news, resources, admins, loading, activeSchoolId, setActiveSchoolId, handleLogin
    }}>
      <div className="min-h-screen bg-slate-50 text-slate-900 select-none">
        <Navbar onOpenAdmin={() => setIsAdminPanelOpen(true)} />
        
        <main className="pb-12">
          <AnimatePresence mode="wait">
            {!activeSchoolId ? (
              <Home key="home" />
            ) : (
              <SchoolView key={`school-${activeSchoolId}`} schoolId={activeSchoolId} />
            )}
          </AnimatePresence>
        </main>
        
        <Footer />

        {isAdmin && isAdminPanelOpen && (
          <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />
        )}
      </div>
    </AppContext.Provider>
  );
}

// Navbar Component
function Navbar({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const { user, isAdmin, config, schools, setActiveSchoolId, activeSchoolId, handleLogin } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="relative z-[100] w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => { setActiveSchoolId(null); setIsMenuOpen(false); }}
        >
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-105 overflow-hidden">
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Building2 size={22} />
            )}
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
                onClick={handleLogin}
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
            className="md:hidden absolute top-20 left-0 right-0 bg-white border-bottom border-neutral-200 p-4 flex flex-col gap-2 shadow-xl"
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
              <button onClick={() => { handleLogin(); setIsMenuOpen(false); }} className="text-left py-3 px-4 rounded-lg hover:bg-neutral-50 font-medium text-primary flex items-center gap-2">
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
  const { config, news, schools, resources, setActiveSchoolId } = useApp();

  // Get 6 most recent visible resources that belong to active schools
  const recentResources = [...resources]
    .filter(r => r.isVisible !== false && schools.some(s => s.id === r.schoolId))
    .sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    })
    .slice(0, 6);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto px-4 space-y-12"
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
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 border border-slate-100 shadow-sm">
                      {school.logo ? (
                        <img src={school.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <Building2 size={18} className="text-slate-300" />
                      )}
                    </div>
                    <span className="font-bold">{school.name}</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">
            {schools.length} Escoles Registrades
          </div>
        </div>

        {/* Recent Resources Slider */}
        {recentResources.length > 0 && (
          <div className="md:col-span-12 space-y-6 overflow-hidden">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Clock className="text-primary" size={24} /> Últimes Novetats
              </h2>
              <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
                Llisca <ArrowRight size={14} />
              </div>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x no-scrollbar -mx-4 px-4">
              {recentResources.map((res, idx) => (
                <div key={res.id} className="min-w-[320px] md:min-w-[400px] snap-start">
                  <ResourceCard resource={res} idx={idx} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* News Grid Section */}
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {news.filter(n => n.isVisible !== false && (!n.schoolId || schools.some(s => s.id === n.schoolId))).slice(0, 3).map((item, idx) => (
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
  const [activeCycle, setActiveCycle] = useState<Cycle | 'ALL'>('ALL');
  const school = schools.find(s => s.id === schoolId);
  
  const filteredResources = resources.filter(r => {
    if (r.schoolId !== schoolId) return false;
    // Hide invisible resources for non-admins (or just always hide for the view, 
    // assuming the student view shouldn't see them)
    if (r.isVisible === false) return false;
    if (activeCycle === 'ALL') return true;
    return r.cycle === activeCycle;
  });

  if (!school) return null;

  const cycles: { id: Cycle | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'Tots' },
    { id: 'CI', label: 'CI' },
    { id: 'CM', label: 'CM' },
    { id: 'CS', label: 'CS' },
    { id: 'GENERAL', label: 'General' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      className="max-w-7xl mx-auto px-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* School Header Bento */}
        <div className="md:col-span-12 bento-card p-12 flex flex-col md:flex-row items-center gap-8 min-h-[240px] relative overflow-hidden">
          {school.cover && (
            <>
              <img 
                src={school.cover} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay transition-transform duration-700 hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent md:to-white/20" />
            </>
          )}
          
          <div className="w-32 h-32 bg-white/80 backdrop-blur-xl rounded-3xl flex items-center justify-center p-6 border border-white/50 shadow-xl relative z-10">
            {school.logo ? (
              <img src={school.logo} alt={school.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Building2 size={48} className="text-primary/20" />
            )}
          </div>
          <div className="text-center md:text-left flex-1 relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold font-heading mb-4 leading-none tracking-tighter">{school.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="stat-chip bg-white/50 backdrop-blur-sm">🏫 Educació Primària</span>
              <span className="stat-chip bg-green-50/80 backdrop-blur-sm text-green-700">{filteredResources.length} Recursos Actius</span>
            </div>
          </div>
        </div>

        {/* Cycle Filter */}
        <div className="md:col-span-12 flex justify-center md:justify-start mb-2">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
            {cycles.map(cycle => (
              <button
                key={cycle.id}
                onClick={() => setActiveCycle(cycle.id)}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                  activeCycle === cycle.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {cycle.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Layout */}
        {filteredResources.length > 0 ? (
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            {filteredResources.map((res, idx) => (
              <ResourceCard key={res.id} resource={res} idx={idx} />
            ))}
          </div>
        ) : (
          <div className="md:col-span-12 bento-card py-32 flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <div className="text-5xl">📂</div>
            <p className="text-xl font-bold text-slate-400">No hi ha recursos en aquesta categoria.</p>
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
    html: <Code size={20}/>,
    iframe: <Monitor size={20}/>,
    padlet: <Grid size={20}/>,
    genially: <Sparkles size={20}/>,
    canva: <Palette size={20}/>,
    timeline: <Clock size={20}/>
  };

  const colors = {
    video: 'bg-[#FF0000] text-white shadow-lg shadow-red-500/20',     // YouTube Red
    game: 'bg-[#764ABC] text-white shadow-lg shadow-indigo-500/20',   // Purple
    doc: 'bg-[#2B579A] text-white shadow-lg shadow-blue-500/20',     // Word/Blue
    link: 'bg-[#1e293b] text-white shadow-lg shadow-slate-500/20',   // Slate
    kahoot: 'bg-[#46178F] text-white shadow-lg shadow-purple-900/20',// Kahoot Purple
    html: 'bg-[#059669] text-white shadow-lg shadow-emerald-500/20', // Emerald
    iframe: 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20',  // Blue
    padlet: 'bg-[#FF4D4D] text-white shadow-lg shadow-pink-500/20',  // Padlet Pinkish
    genially: 'bg-[#00ACAC] text-white shadow-lg shadow-cyan-500/20',// Genially Cyan
    canva: 'bg-[#00C4CC] text-white shadow-lg shadow-blue-400/20',   // Canva Teal
    timeline: 'bg-[#D97706] text-white shadow-lg shadow-amber-500/20'// Amber
  };

  const [isOpen, setIsOpen] = useState(false);

  // Types that open in a modal iframe
  const embedTypes = ['html', 'iframe', 'genially', 'canva', 'padlet', 'timeline'];
  const isEmbed = embedTypes.includes(resource.type);

  // Bento logic: make some cards bigger if they have description and it's an even index
  // Special types (html, iframe) are ALWAYS large to give them priority
  const isLarge = (resource.description && idx % 3 === 0) || isEmbed;
  const isExtraLarge = resource.type === 'html' || resource.type === 'iframe' || resource.type === 'genially';

  if (isEmbed) {
    return (
      <>
        <motion.div
           onClick={() => setIsOpen(true)}
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: idx * 0.05 }}
           className={cn(
             "bento-card p-6 md:p-8 flex flex-col group relative overflow-hidden cursor-pointer h-full border-2 border-transparent hover:border-primary/20",
             isExtraLarge ? "md:col-span-2 md:row-span-2" : (isLarge ? "md:col-span-2 md:row-span-1" : "md:col-span-1")
           )}
        >
          {resource.thumbnail && (
            <div className="absolute inset-0 opacity-10 group-hover:opacity-25 transition-opacity">
              <img src={resource.thumbnail} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            </div>
          )}
          
          <div className="flex items-start justify-between mb-6 md:mb-8 relative z-10">
            <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12", colors[resource.type as keyof typeof colors])}>
              {icons[resource.type as keyof typeof icons]}
            </div>
            <div className="p-2 bg-slate-50/50 backdrop-blur rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
              {resource.type === 'html' ? <Code size={16} className="text-slate-400" /> : <Monitor size={16} className="text-slate-400" />}
            </div>
          </div>
          
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">{resource.type === 'html' ? 'Aplicació Codi' : 'Contingut Incrustat'}</span>
              {isExtraLarge && <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">DESTACAT</span>}
            </div>
            <h3 className={cn("font-bold mb-3 leading-tight group-hover:text-primary transition-colors", isExtraLarge ? "text-2xl md:text-3xl" : "text-xl")}>{resource.title}</h3>
            {resource.description && (
              <p className="text-slate-500 text-sm leading-relaxed mb-6 group-hover:text-slate-700 line-clamp-4">{resource.description}</p>
            )}
          </div>

          <div className="mt-4 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <span className={cn("px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider", colors[resource.type as keyof typeof colors])}>{resource.cycle || 'GENERAL'}</span>
            </div>
            <div className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Obrir recurs</div>
          </div>
        </motion.div>

        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[200] bg-slate-900/98 backdrop-blur-md flex flex-col p-1 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-4 text-white px-4 py-2">
                <div className="max-w-[70%]">
                  <h2 className="text-xl md:text-2xl font-bold font-heading line-clamp-1">{resource.title}</h2>
                  {resource.description && <p className="text-slate-400 text-[10px] md:text-xs line-clamp-1">{resource.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {resource.url && (
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold transition-all border border-white/10"
                    >
                      <ExternalLink size={14} /> Pantalla completa
                    </a>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-2 md:p-3 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-xl transition-all border border-red-500/20"><X size={20} /></button>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-lg md:rounded-2xl overflow-hidden shadow-2xl relative w-full h-full">
                <iframe 
                  src={resource.type === 'html' ? undefined : resource.url}
                  srcDoc={resource.type === 'html' ? resource.content : undefined}
                  className="w-full h-full border-none"
                  title={resource.title}
                  sandbox="allow-scripts allow-forms allow-modals allow-same-origin allow-popups"
                  referrerPolicy="no-referrer"
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
        "bento-card p-8 flex flex-col group relative overflow-hidden h-full decoration-none",
        isLarge ? "md:col-span-2 md:row-span-1" : "md:col-span-1"
      )}
    >
      {resource.thumbnail && (
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
          <img src={resource.thumbnail} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
        </div>
      )}

      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12", colors[resource.type])}>
          {icons[resource.type]}
        </div>
        <div className="p-2 bg-slate-50/50 backdrop-blur rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={16} className="text-slate-400" />
        </div>
      </div>
      
      <div className="flex-1 relative z-10">
        <h3 className="text-xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors">{resource.title}</h3>
        {resource.description && (
          <p className="text-slate-500 text-sm leading-relaxed mb-6 group-hover:text-slate-700 line-clamp-3">{resource.description}</p>
        )}
      </div>

      <div className="mt-4 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{resource.type}</span>
          <span className={cn("px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider", colors[resource.type])}>{resource.cycle || 'GENERAL'}</span>
        </div>
        <div className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">OBRIR</div>
      </div>
    </motion.a>
  );
}

// ADMIN PANEL

function AdminPanel({ onClose }: { onClose: () => void }) {
  const { config, schools, news, resources, admins } = useApp();
  const [activeTab, setActiveTab] = useState<'config' | 'schools' | 'news' | 'resources' | 'admins'>('config');

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
            <h1 className="text-2xl font-bold font-heading tracking-tighter mb-1 text-emerald-400">Portal Admin</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identificat: {auth.currentUser?.email?.split('@')[0]}</p>
          </div>

          <nav className="flex-1 flex flex-col gap-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 px-2">Personalització</div>
              <div className="space-y-1">
                <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} label="Configuració" icon={<Settings size={18}/>} />
                <TabButton active={activeTab === 'schools'} onClick={() => setActiveTab('schools')} label="Escoles" icon={<Building2 size={18}/>} />
                <TabButton active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} label="Administradors" icon={<Users size={18}/>} />
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
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
          <div className="mb-12 border-b border-slate-100 pb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-heading font-bold text-slate-900">
                {activeTab === 'config' && 'Configuració del Portal'}
                {activeTab === 'schools' && 'Gestió d\'Escoles'}
                {activeTab === 'news' && 'Notícies Recents'}
                {activeTab === 'resources' && 'Biblioteca de Recursos'}
                {activeTab === 'admins' && 'Administradors del Sistema'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">Crea, edita o elimina elements del sistema.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Sessió Administrador
            </div>
          </div>

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
              {activeTab === 'admins' && <AdminsManager admins={admins} />}
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
          <Input label="URL del Logo (Rodó)" value={formData.logoUrl} onChange={v => setFormData({...formData, logoUrl: v})} />
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
  const [isAdding, setIsAdding] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState<Partial<School>>({ name: '', logo: '', cover: '' });
  
  const handleAdd = async () => {
    if (!formData.name) return;
    try {
      await addDoc(collection(db, 'schools'), {
        ...formData,
        slug: formData.name.toLowerCase().replace(/ /g, '-'),
        order: schools.length
      });
      setFormData({ name: '', logo: '', cover: '' });
      setIsAdding(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'schools');
    }
  };

  const handleUpdate = async () => {
    if (!editingSchool || !formData.name) return;
    try {
      await updateDoc(doc(db, 'schools', editingSchool.id), formData);
      setEditingSchool(null);
      setFormData({ name: '', logo: '', cover: '' });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `schools/${editingSchool.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Segur que vols eliminar aquesta escola?')) return;
    try {
      await deleteDoc(doc(db, 'schools', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `schools/${id}`);
    }
  };

  const moveSchool = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= schools.length) return;

    const currentSchool = schools[index];
    const neighborSchool = schools[newIndex];

    try {
      // Swipe priorities
      await Promise.all([
        updateDoc(doc(db, 'schools', currentSchool.id), { order: newIndex }),
        updateDoc(doc(db, 'schools', neighborSchool.id), { order: index })
      ]);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'schools/reorder');
    }
  };

  const startEdit = (s: School) => {
    setEditingSchool(s);
    setFormData({ name: s.name, logo: s.logo, cover: s.cover });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold">Llistat d'Escoles</h3>
        {!isAdding && !editingSchool && (
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2">
            <Plus size={18}/> Nova Escola
          </button>
        )}
      </div>

      {(isAdding || editingSchool) && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-primary/20 space-y-6 mb-12">
          <h4 className="text-lg font-bold">{editingSchool ? 'Editar Escola' : 'Afegir Nova Escola'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nom de l'Escola" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
            <Input label="URL del Logo (Opcional)" value={formData.logo} onChange={v => setFormData({...formData, logo: v})} />
            <div className="md:col-span-2">
              <Input label="URL de Fons / Cover (Opcional)" value={formData.cover} onChange={v => setFormData({...formData, cover: v})} />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={editingSchool ? handleUpdate : handleAdd} 
              className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold transition-all active:scale-95"
            >
              {editingSchool ? 'Guardar Canvis' : 'Crear Escola'}
            </button>
            <button 
              onClick={() => { setIsAdding(false); setEditingSchool(null); setFormData({ name: '', logo: '', cover: '' }); }} 
              className="px-10 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold transition-all active:scale-95"
            >
              Cancel·lar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {schools.map((s, idx) => (
          <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-neutral-100 flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
             <div className="flex items-center gap-4">
               <div className="flex flex-col items-center gap-1 pr-2">
                 <button 
                   disabled={idx === 0}
                   onClick={() => moveSchool(idx, 'up')}
                   className={`p-1 rounded-md transition-colors ${idx === 0 ? 'text-neutral-100' : 'text-neutral-400 hover:bg-neutral-100 hover:text-primary'}`}
                 >
                   <ArrowUp size={16} />
                 </button>
                 <button 
                   disabled={idx === schools.length - 1}
                   onClick={() => moveSchool(idx, 'down')}
                   className={`p-1 rounded-md transition-colors ${idx === schools.length - 1 ? 'text-neutral-100' : 'text-neutral-400 hover:bg-neutral-100 hover:text-primary'}`}
                 >
                   <ArrowDown size={16} />
                 </button>
               </div>
               <div className="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center border border-neutral-100 overflow-hidden p-2">
                 {s.logo ? (
                   <img src={s.logo} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
                 ) : (
                   <Building2 size={20} className="text-neutral-400" />
                 )}
               </div>
               <span className="text-xl font-bold text-slate-800">{s.name}</span>
             </div>
             <div className="flex items-center gap-2">
               <button 
                 type="button" 
                 onClick={() => startEdit(s)}
                 className="p-4 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
               >
                 <Edit size={20}/>
               </button>
               <button 
                 type="button"
                 onClick={(e) => {
                   e.stopPropagation();
                   handleDelete(s.id);
                 }} 
                 className="p-4 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-2xl transition-all"
                >
                  <Trash2 size={20}/>
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
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [formData, setFormData] = useState<Partial<News>>({ title: '', content: '', isVisible: true });

  const handleAdd = async () => {
    if (!formData.title || !formData.content) return;
    try {
      await addDoc(collection(db, 'news'), {
        ...formData,
        isVisible: formData.isVisible !== false,
        date: new Date()
      });
      resetForm();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'news');
    }
  };

  const handleUpdate = async () => {
    if (!editingNews || !formData.title || !formData.content) return;
    try {
      await updateDoc(doc(db, 'news', editingNews.id), formData);
      resetForm();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `news/${editingNews.id}`);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', isVisible: true });
    setIsAdding(false);
    setEditingNews(null);
  };

  const startEdit = (n: News) => {
    setEditingNews(n);
    setFormData({ ...n });
    setIsAdding(false);
  };

  const toggleVisibility = async (n: News) => {
    try {
      await updateDoc(doc(db, 'news', n.id), {
        isVisible: !n.isVisible
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `news/${n.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Segur que vols eliminar aquesta notícia?')) return;
    try {
      await deleteDoc(doc(db, 'news', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `news/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold">Gestió de Notícies</h3>
        {!isAdding && !editingNews && (
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2">
            <Plus size={18}/> Nova Notícia
          </button>
        )}
      </div>

      {(isAdding || editingNews) && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-primary/20 space-y-6 mb-12">
          <h4 className="text-lg font-bold">{editingNews ? 'Editar Notícia' : 'Afegir Nova Notícia'}</h4>
          <Input label="Títol" value={formData.title} onChange={v => setFormData({...formData, title: v})} />
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Contingut</label>
            <textarea 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})}
              className="w-full p-6 bg-neutral-50 border border-neutral-100 rounded-2xl min-h-[200px] outline-none focus:border-primary transition-all text-slate-700"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Imatge (URL)" value={formData.image || ''} onChange={v => setFormData({...formData, image: v})} />
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
               <span className="text-sm font-bold text-neutral-600 flex-1">Notícia Visible</span>
               <button 
                 type="button"
                 onClick={() => setFormData({...formData, isVisible: !formData.isVisible})}
                 className={cn(
                   "w-12 h-6 rounded-full transition-all relative border border-slate-200",
                   formData.isVisible !== false ? "bg-primary" : "bg-neutral-300"
                 )}
               >
                 <div className={cn("absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm", formData.isVisible !== false ? "right-0.5" : "left-0.5")} />
               </button>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={editingNews ? handleUpdate : handleAdd} 
              className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold transition-all active:scale-95"
            >
              {editingNews ? 'Guardar Canvis' : 'Publicar Notícia'}
            </button>
            <button 
              onClick={resetForm} 
              className="px-10 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold transition-all active:scale-95"
            >
              Cancel·lar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {news.map(n => (
          <div key={n.id} className="bg-white p-6 rounded-[2rem] border border-neutral-100 flex items-center justify-between group transition-all hover:shadow-md">
             <div className="flex items-center gap-4">
               <div className="w-20 h-14 bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100">
                 {n.image ? (
                   <img src={n.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-neutral-200">
                     <Building2 size={24} />
                   </div>
                 )}
               </div>
               <div>
                 <h4 className="font-bold text-lg text-slate-800">{n.title}</h4>
                 <div className="flex items-center gap-3">
                   <p className="text-neutral-400 text-xs line-clamp-1 max-w-[300px]">{n.content}</p>
                   {n.isVisible === false && <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">OCULTA</span>}
                 </div>
               </div>
             </div>
             
             <div className="flex items-center gap-2">
               <button 
                type="button"
                onClick={() => toggleVisibility(n)}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  n.isVisible !== false ? "text-emerald-500 bg-emerald-50" : "text-neutral-300 hover:text-neutral-600"
                )}
                title={n.isVisible !== false ? "Visible" : "Oculta"}
              >
                {n.isVisible !== false ? <Eye size={20}/> : <EyeOff size={20}/>}
              </button>
               <button 
                 type="button" 
                 onClick={() => startEdit(n)}
                 className="p-4 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
               >
                 <Edit size={20}/>
               </button>
               <button 
                 type="button"
                 onClick={() => handleDelete(n.id)} 
                 className="p-4 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
               >
                 <Trash2 size={20} />
               </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Resources Manager
function ResourcesManager({ resources, schools }: { resources: Resource[]; schools: School[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<Partial<Resource>>({ 
    title: '', 
    type: 'link', 
    cycle: 'GENERAL',
    url: '', 
    content: '', 
    isVisible: true,
    thumbnail: '',
    schoolId: schools[0]?.id || '' 
  });

  const handleAdd = async () => {
    if (!formData.title || (!formData.url && formData.type !== 'html') || !formData.schoolId) return;
    try {
      await addDoc(collection(db, 'resources'), {
        ...formData,
        isVisible: formData.isVisible !== false,
        cycle: formData.cycle || 'GENERAL',
        createdAt: new Date()
      });
      resetForm();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'resources');
    }
  };

  const handleUpdate = async () => {
    if (!editingResource || !formData.title || (!formData.url && formData.type !== 'html') || !formData.schoolId) return;
    try {
      await updateDoc(doc(db, 'resources', editingResource.id), formData);
      resetForm();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `resources/${editingResource.id}`);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', type: 'link', cycle: 'GENERAL', url: '', content: '', isVisible: true, thumbnail: '', schoolId: schools[0]?.id || '' });
    setIsAdding(false);
    setEditingResource(null);
  };

  const startEdit = (r: Resource) => {
    setEditingResource(r);
    setFormData({ ...r });
    setIsAdding(false);
  };

  const toggleVisibility = async (resource: Resource) => {
    try {
      await updateDoc(doc(db, 'resources', resource.id), {
        isVisible: !resource.isVisible
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `resources/${resource.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Segur que vols eliminar aquest recurs?')) return;
    try {
      await deleteDoc(doc(db, 'resources', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `resources/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold">Recursos per Escola</h3>
        {!isAdding && !editingResource && (
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2">
            <Plus size={18}/> Nou Recurs
          </button>
        )}
      </div>

      {(isAdding || editingResource) && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-primary/20 space-y-6 mb-12">
          <h4 className="text-lg font-bold">{editingResource ? 'Editar Recurs' : 'Afegir Nou Recurs'}</h4>
          <Input label="Títol del recurs" value={formData.title} onChange={v => setFormData({...formData, title: v})} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cicle</label>
              <select 
                value={formData.cycle} 
                onChange={e => setFormData({...formData, cycle: e.target.value as any})}
                className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none"
              >
                <option value="GENERAL">General</option>
                <option value="CI">CI (Cicle Inicial)</option>
                <option value="CM">CM (Cicle Mitjà)</option>
                <option value="CS">CS (Cicle Superior)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Tipus</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as any})}
                className="w-full p-4 bg-neutral-900 text-white border-2 border-primary/20 rounded-2xl outline-none focus:border-primary transition-all shadow-inner"
              >
                <option value="iframe">🔗 Aplicació Externa (AI Studio, etc.)</option>
                <option value="html">✨ Codi Personalitzat (HTML/JS)</option>
                <option value="video">Vídéo (YouTube)</option>
                <option value="genially">Genially</option>
                <option value="canva">Canva</option>
                <option value="padlet">Padlet</option>
                <option value="timeline">Línia del Temps</option>
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
            <Input label="URL (YouTube, Itch, etc.)" value={formData.url || ''} onChange={v => setFormData({...formData, url: v})} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="URL de la Miniatura (Opcional)" value={formData.thumbnail || ''} onChange={v => setFormData({...formData, thumbnail: v})} />
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
               <span className="text-sm font-bold text-neutral-600 flex-1">Recurs Visible</span>
               <button 
                 type="button"
                 onClick={() => setFormData({...formData, isVisible: !formData.isVisible})}
                 className={cn(
                   "w-12 h-6 rounded-full transition-all relative border border-slate-200",
                   formData.isVisible !== false ? "bg-primary" : "bg-neutral-300"
                 )}
               >
                 <div className={cn("absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm", formData.isVisible !== false ? "right-0.5" : "left-0.5")} />
               </button>
            </div>
          </div>

          <Input label="Descripció (opcional)" value={formData.description || ''} onChange={v => setFormData({...formData, description: v})} />

          <div className="flex gap-4">
            <button 
              onClick={editingResource ? handleUpdate : handleAdd} 
              className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold transition-all active:scale-95"
            >
              {editingResource ? 'Guardar Canvis' : 'Afegir Recurs'}
            </button>
            <button 
              onClick={resetForm} 
              className="px-10 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold transition-all active:scale-95"
            >
              Cancel·lar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-12">
        {schools.map(s => (
          <div key={s.id}>
            <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2 px-2">
              <Building2 size={14}/> {s.name}
            </h4>
            <div className="space-y-3">
              {resources.filter(r => r.schoolId === s.id).map(r => (
                <div key={r.id} className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between group transition-shadow hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden", r.thumbnail ? "p-0" : "bg-neutral-50")}>
                      {r.thumbnail ? (
                        <img src={r.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-neutral-300">
                          {r.type === 'video' && <Youtube size={16}/>}
                          {r.type === 'game' && <Gamepad2 size={16}/>}
                          {r.type === 'kahoot' && <div className="font-bold text-[10px]">K</div>}
                          {r.type === 'doc' && <FileText size={16}/>}
                          {r.type === 'link' && <LinkIcon size={16}/>}
                          {r.type === 'html' && <Code size={16}/>}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-bold block">{r.title}</span>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] text-neutral-400 font-medium uppercase">{r.type}</span>
                         {r.cycle && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">{r.cycle}</span>}
                         {r.isVisible === false && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">OCULT</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => toggleVisibility(r)}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        r.isVisible !== false ? "text-emerald-500 bg-emerald-50" : "text-neutral-300 hover:text-neutral-600"
                      )}
                      title={r.isVisible !== false ? "Visible" : "Ocult"}
                    >
                      {r.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => startEdit(r)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <Edit size={18}/>
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(r.id);
                      }} 
                      className="p-3 text-neutral-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Orphaned resources */}
        {resources.filter(r => !schools.some(s => s.id === r.schoolId)).length > 0 && (
          <div className="pt-8 border-t border-dashed border-neutral-200">
            <h4 className="text-sm font-bold uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2 px-2">
              <X size={14}/> Recursos sense escola (Orfes)
            </h4>
            <div className="space-y-3">
              {resources.filter(r => !schools.some(s => s.id === r.schoolId)).map(r => (
                <div key={r.id} className="bg-red-50/30 p-4 rounded-2xl border border-red-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-200 border border-red-50">
                      <div className="text-red-300">
                        {r.type === 'video' && <Youtube size={16}/>}
                        {r.type === 'game' && <Gamepad2 size={16}/>}
                        {r.type === 'kahoot' && <div className="font-bold text-[10px]">K</div>}
                        {r.type === 'doc' && <FileText size={16}/>}
                        {r.type === 'link' && <LinkIcon size={16}/>}
                        {r.type === 'html' && <Code size={16}/>}
                      </div>
                    </div>
                    <div>
                      <span className="font-bold block text-red-900/60">{r.title}</span>
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-tighter">Aquesta escola ja no existeix</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleDelete(r.id)} 
                    className="p-3 text-red-300 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admins Manager
function AdminsManager({ admins }: { admins: AdminUser[] }) {
  const [email, setEmail] = useState('');

  const handleAdd = async () => {
    if (!email || !email.includes('@')) return;
    const normalizedEmail = email.toLowerCase().trim();
    try {
      await setDoc(doc(db, 'admins', normalizedEmail), {
        email: normalizedEmail,
        addedAt: new Date()
      });
      setEmail('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'admins');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold mb-6">Afegir Administrador</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input label="Correu Electrònic" value={email} onChange={setEmail} />
          </div>
          <div className="pt-2 md:pt-8">
             <button onClick={handleAdd} className="w-full md:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold transition-all hover:shadow-lg active:scale-95">
               Donar Permisos
             </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-4 italic">
          * Els administradors poden gestionar tot el portal: escoles, notícies, recursos i altres administradors.
        </p>
      </div>

      <div className="space-y-4">
        {admins.map(admin => (
          <div key={admin.id} className="bg-white p-6 rounded-2xl border border-neutral-100 flex items-center justify-between group transition-shadow hover:shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                {admin.email[0].toUpperCase()}
              </div>
              <div>
                <span className="font-bold block text-slate-900">{admin.email}</span>
                <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">Administrador Actiu</span>
              </div>
            </div>
            <button 
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await deleteDoc(doc(db, 'admins', admin.id));
                } catch (e) {
                  handleFirestoreError(e, OperationType.DELETE, `admins/${admin.id}`);
                }
              }}
              className="p-3 text-neutral-400 hover:text-red-600 hover:bg-neutral-50 rounded-xl transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {admins.length === 0 && (
          <div className="text-center py-12 text-slate-400 italic">
            No hi ha administradors addicionals configurats.
          </div>
        )}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-slate-200/60 text-center">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center space-y-6">
        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
          Plataforma de Recursos Educatius
        </div>
        
        <div className="h-px w-12 bg-slate-200" />
        
        <div className="space-y-1">
          <p className="text-slate-500 text-sm font-medium">
            © {new Date().getFullYear()} Tots els drets reservats. Projecte creat amb fins educatius.
          </p>
          <div className="flex items-center justify-center gap-2 text-slate-400">
             <span className="text-[10px] font-bold uppercase tracking-widest">Creat per</span>
             <span className="text-slate-900 font-bold px-3 py-1 bg-white border border-slate-100 rounded-full text-xs shadow-sm">Javier Tejero</span>
          </div>
        </div>
      </div>
    </footer>
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
