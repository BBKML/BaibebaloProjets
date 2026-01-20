import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const KnowledgeBaseArticle = () => {
  const { articleId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');

  const [article] = useState({
    id: articleId || 'notifications-payment',
    title: 'Comment configurer les notifications de paiement',
    lastUpdated: '12 Octobre 2023',
    readingTime: '5 min',
    category: 'Paiements',
    content: `
      La configuration des notifications de paiement est cruciale pour maintenir vos utilisateurs informés en temps réel de l'état de leurs transactions. BAIBEBALO permet une personnalisation poussée par canal (Email, SMS, Push).

      ## 1. Accéder aux paramètres

      Rendez-vous dans la section **Paramètres > Système > Notifications** de votre tableau de bord administrateur. Vous y trouverez trois onglets distincts pour chaque type de notification.

      ## 2. Configuration du flux de travail

      Le diagramme ci-dessous illustre le parcours d'un signal de notification depuis la passerelle de paiement jusqu'à l'utilisateur final.

      ## 3. Définir les déclencheurs (Triggers)

      Vous pouvez choisir parmi une liste de 12 événements prédéfinis. Les plus courants sont :

      - **SUCCESS :** Transaction validée.
      - **FAILED :** Échec du paiement (solde insuffisant, etc).
      - **REFUNDED :** Remboursement effectué.
      - **PENDING :** Paiement en attente de vérification manuelle.
    `,
  });

  const sidebarItems = [
    {
      category: 'Documentation',
      items: [
        { id: 'intro', label: 'Introduction', icon: 'house' },
        { id: 'config', label: 'Configuration', icon: 'settings' },
        { id: 'users', label: 'Gestion Utilisateurs', icon: 'group' },
      ],
    },
    {
      category: 'Paiements',
      items: [
        { id: 'notifications', label: 'Notifications', icon: 'notifications_active', active: true },
        { id: 'payment-flow', label: 'Flux de Paiement', icon: 'credit_card' },
        { id: 'api', label: 'API & Intégrations', icon: 'terminal' },
      ],
    },
  ];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-80 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Rechercher... (Cmd+K)"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {sidebarItems.map((section) => (
              <div key={section.category}>
                <h3 className="px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {section.category}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.id}
                      to={`/support/knowledge-base/${item.id}`}
                      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        item.active
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <button className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-lg">contact_support</span>
              Contact Support
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          <div className="max-w-[840px] mx-auto px-8 py-10">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 mb-8">
              <Link to="/support/knowledge-base" className="hover:text-primary">
                Accueil
              </Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <Link to="/support/knowledge-base" className="hover:text-primary">
                Guide Utilisateur
              </Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-slate-900 dark:text-white">{article.category}</span>
            </nav>

            {/* Article Header */}
            <header className="mb-10">
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">calendar_today</span>
                  Dernière mise à jour : {article.lastUpdated}
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-500" />
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  Temps de lecture : {article.readingTime}
                </div>
              </div>
            </header>

            {/* Article Body */}
            <article className="article-content border-b border-slate-200 dark:border-slate-800 pb-12 mb-12">
              <p className="text-lg leading-relaxed text-gray-700 dark:text-slate-300 mb-6">
                La configuration des notifications de paiement est cruciale pour maintenir vos utilisateurs informés
                en temps réel de l'état de leurs transactions. BAIBEBALO permet une personnalisation poussée par canal
                (Email, SMS, Push).
              </p>
              
              <div className="my-8 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 custom-shadow bg-slate-50 dark:bg-slate-900 p-6">
                <div className="flex items-center gap-2 text-primary font-bold mb-4">
                  <span className="material-symbols-outlined">info</span>
                  Note importante
                </div>
                <p className="text-sm m-0 text-slate-700 dark:text-slate-300">
                  Avant de configurer les webhooks, assurez-vous que votre serveur est capable de répondre avec un
                  statut HTTP 200 en moins de 2 secondes.
                </p>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Accéder aux paramètres</h2>
              <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                Rendez-vous dans la section <strong>Paramètres &gt; Système &gt; Notifications</strong> de votre tableau
                de bord administrateur. Vous y trouverez trois onglets distincts pour chaque type de notification.
              </p>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
                2. Configuration du flux de travail
              </h2>
              <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                Le diagramme ci-dessous illustre le parcours d'un signal de notification depuis la passerelle de
                paiement jusqu'à l'utilisateur final.
              </p>
              
              <div className="my-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col items-center">
                <div className="w-full aspect-video bg-gradient-to-br from-primary/5 to-primary/20 flex items-center justify-center p-8">
                  <div className="grid grid-cols-3 gap-8 w-full">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-primary/20 flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary mb-2">payments</span>
                      <span className="text-xs font-bold uppercase">Paiement Reçu</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">arrow_forward</span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-primary/20 flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary mb-2">hub</span>
                      <span className="text-xs font-bold uppercase">Hub BAIBEBALO</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 text-xs text-slate-500 dark:text-slate-400 italic border-t border-slate-200 dark:border-slate-800 w-full text-center">
                  Diagramme architectural du service de notification
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
                3. Définir les déclencheurs (Triggers)
              </h2>
              <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                Vous pouvez choisir parmi une liste de 12 événements prédéfinis. Les plus courants sont :
              </p>
              <ul className="list-disc pl-5 space-y-2 mb-6 text-slate-700 dark:text-slate-300">
                <li>
                  <strong>SUCCESS :</strong> Transaction validée.
                </li>
                <li>
                  <strong>FAILED :</strong> Échec du paiement (solde insuffisant, etc).
                </li>
                <li>
                  <strong>REFUNDED :</strong> Remboursement effectué.
                </li>
                <li>
                  <strong>PENDING :</strong> Paiement en attente de vérification manuelle.
                </li>
              </ul>
            </article>
            
            {/* Feedback Section */}
            <section className="py-12 flex flex-col items-center text-center">
              <h4 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
                Cet article vous a-t-il aidé ?
              </h4>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all font-medium group">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">
                    thumb_up
                  </span>
                  Oui, merci !
                </button>
                <button className="flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-medium group">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-red-500">
                    thumb_down
                  </span>
                  Pas vraiment
                </button>
              </div>
              <div className="mt-10 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl w-full flex items-center justify-between">
                <div className="text-left">
                  <p className="font-bold text-slate-900 dark:text-white">Vous ne trouvez pas votre réponse ?</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nos experts sont disponibles pour vous aider 24/7.
                  </p>
                </div>
                <button className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors">
                  Ouvrir un ticket
                </button>
              </div>
            </section>
          </div>
        </main>
        
        {/* Right Mini-TOC */}
        <aside className="hidden xl:flex w-64 flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Sur cette page
          </h4>
          <div className="space-y-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            <a
              href="#acces-parametres"
              className="block hover:text-primary transition-colors border-l-2 border-primary pl-3 text-primary"
            >
              Accéder aux paramètres
            </a>
            <a
              href="#flux-travail"
              className="block hover:text-primary transition-colors pl-3 border-l-2 border-transparent"
            >
              Flux de travail
            </a>
            <a
              href="#declencheurs"
              className="block hover:text-primary transition-colors pl-3 border-l-2 border-transparent"
            >
              Définir les déclencheurs
            </a>
            <a
              href="#modeles-emails"
              className="block hover:text-primary transition-colors pl-3 border-l-2 border-transparent"
            >
              Modèles d'emails
            </a>
          </div>
          <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="rounded-xl bg-primary/5 p-4">
              <p className="text-xs font-bold text-primary mb-2">PRO TIP</p>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Utilisez les variables{' '}
                <span className="bg-primary/10 px-1 rounded text-primary">&#123;&#123;user_name&#125;&#125;</span>{' '}
                pour personnaliser vos messages.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
};

export default KnowledgeBaseArticle;
