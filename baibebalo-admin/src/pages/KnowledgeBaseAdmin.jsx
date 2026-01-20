import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const KnowledgeBaseAdmin = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      id: 'validation',
      title: 'Validation',
      description: 'Procédures d\'approbation des comptes et flux KYC.',
      icon: 'verified_user',
      color: 'bg-primary/10 text-primary',
    },
    {
      id: 'litiges',
      title: 'Litiges',
      description: 'Protocoles de résolution des conflits et remboursements.',
      icon: 'gavel',
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      id: 'technique',
      title: 'Technique',
      description: 'Maintenance de la plateforme et documentation API.',
      icon: 'settings_suggest',
      color: 'bg-emerald-500/10 text-emerald-600',
    },
  ];

  const articles = [
    {
      id: 'article-1',
      title: 'Nouveau workflow d\'approbation pour les comptes Business',
      description:
        'Cette procédure détaille les étapes de vérification manuelle pour les entreprises à haut volume transactionnel suite à la mise à jour de sécurité v4.2...',
      category: 'KYC & Compliance',
      updatedAt: 'Il y a 2h',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCIq5mr82XRqErJpw86tINq32Xf0Ot9V7UGSBydNiDvmt5Snrd6nxxU-BS9hCV3edhu1M2oqzbu3SGDEGsrnZoaEUsBv9g-fb-y6cOVKsQrWPiUwYDuxeRAALY2DoKJk-TNj1VhLgDsclokeH6xu764TkidSttSQk1ul1aBCxPb0bY7EUdjg1yvP6uDGxGcIu0IsFJWdhKN_kfWbmfUSzK_1JhbYJuNVVti_bopFZRW9tAFFHr6j8kx-gsXm-xELgcmCCn5_74Tht4-',
      authors: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB7W6nMYtaoOL7uINKY1Erqqv1BfS7YsGhnVRCy_CPiPeq0UHXQKlPooH0IKi1e0tzEH691cmslWxRoZfc4EOZnPh0pGLEypSAerH-Mh8DJaK6ZqtiI7GhPZUV_G1Jayd35tX9NNqsDjFnn18d9e5LpJ-8SVujrZc49iPwvXOfxX_RM-0DEP9jq2i9KIyaicq-o1WlSxxopQyboocHh4iwkJRacQV-lwQvz92zjUtFTJ0sbfLHWxn9Dmn5744vuod7attJ4H0l8zUba',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB0GZ2QRNQuXR1as6Zl0M3hLSAI4NkcP1OkOJXIXpUak7guMCcAWQBPsnskPXBK2Jyffs_U7azxwxgvY5afCgUTeIRepx-gzvcX_JSXaZspIkK_r89kU2LzXpkOg5F347ItViNoVkgLG8FxjGghl5m-JfvdXoJCwls26j5-jgY6JiXKT0096b4IwTA8HBoHHPnhb61q532_zVttgd0HPRtO_D2FZlqIB7OJYDJ8yfemMUvXy0BoLNQUi9jBODPM_IGfEZqwh2QeamFh',
      ],
    },
    {
      id: 'article-2',
      title: 'Guide de réinitialisation des accès administrateur Niveau 2',
      description:
        'En cas de perte de clé 2FA, suivez ce protocole rigoureux pour restaurer les accès sans compromettre l\'intégrité de la plateforme...',
      category: 'Maintenance',
      updatedAt: 'Hier',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDBHfzKvbqsx1CaF1rHUSn8dC0NjAc5_-rf6KUZYfMO_tsBIlq0TNPFekeinXW4D71k_8BSuaMqrANK1HYNSEGp7kFNIuiovABhG0gnWXqbl5HRSSTvCWLH9MrYMn5EOoHiWhXYMirQOaYdVXfL4MQDS1uwVAKyWTUyQ0ddfP3WPO-R9bX7QLtwwUTSIr2v-XVzf5DG0qTzPZ_mFXTF2xetzO71ead3y18w2Rju3eeCGD-vxBlYQ_VLHuF9_rKMeWQbOFEI7W9Cw8lP',
      authors: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB13Sggjq3WOaDtVDRsGrgGVw4KweoCX-FKHywQj8cdPiNhilOH98fjaMR7nPZz2TbSByVQVipeOhWpE-jFuBmiYyVTfXReYgHiiZmGGXeicS6H51xX6WEtjXqG6rNeqM8KsITHYwCnLCBb32LzoqvzSNmBPsf7DahwCOCUKfGFmAqvPVKiVRe7x1k5YCQTxGZnqR0JcKavMHtxmly8rJ2fbb_FZMOh9ZQO0l3dp2TLmpyuCfoW3SZcwxf_T4XemkYES0bLhzG8voh9',
      ],
    },
  ];

  const trendingArticles = [
    {
      title: 'Guide de connexion Admin sécurisée',
      views: '1.2k',
      category: 'Support',
    },
    {
      title: 'Remboursements transactions erronées',
      views: '840',
      category: 'Litiges',
    },
    {
      title: 'Configuration des webhooks',
      views: '520',
      category: 'Technique',
    },
  ];

  const popularTags = ['#KYC', '#Remboursement', '#API', '#Sécurité', '#Bugs', '#Workflow'];

  return (
    <Layout>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
        {/* Page Heading */}
        <div className="mb-10">
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            Base de Connaissances
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
            Centre de ressources interne pour la gestion des procédures, guides techniques et assistance client.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column: Categories and Main Content */}
          <div className="xl:col-span-8 space-y-10">
            {/* Category Grid */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Catégories Principales</h3>
                <button className="text-primary text-sm font-semibold hover:underline">
                  Voir tout
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all cursor-pointer group shadow-sm"
                  >
                    <div
                      className={`size-12 ${category.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <span className="material-symbols-outlined">{category.icon}</span>
                    </div>
                    <h4 className="text-slate-900 dark:text-white font-bold mb-2">{category.title}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Detailed Article Feed */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Articles Récents</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-primary/5 rounded-lg text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined">filter_list</span>
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="flex flex-col md:flex-row gap-6 p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div
                      className="md:w-48 h-32 flex-shrink-0 bg-center bg-cover rounded-lg overflow-hidden"
                      style={{ backgroundImage: `url("${article.image}")` }}
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-0.5 ${
                              article.category === 'KYC & Compliance'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-emerald-500/10 text-emerald-600'
                            } text-[10px] font-bold uppercase rounded tracking-wider`}
                          >
                            {article.category}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-xs">• Mis à jour {article.updatedAt}</span>
                        </div>
                        <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2 hover:text-primary cursor-pointer transition-colors">
                          {article.title}
                        </h5>
                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{article.description}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {article.authors.map((author, idx) => (
                            <div
                              key={idx}
                              className="size-6 rounded-full border-2 border-white dark:border-slate-800 bg-cover bg-center"
                              style={{ backgroundImage: `url("${author}")` }}
                            />
                          ))}
                        </div>
                        <Link
                          to={`/support/knowledge-base/${article.id}`}
                          className="text-sm font-semibold text-primary flex items-center gap-1 group"
                        >
                          Lire l'article{' '}
                          <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar */}
          <div className="xl:col-span-4 space-y-8">
            {/* Quick Search / Filter for Sidebar */}
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <h4 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">
                Besoin d'aide rapide ?
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                Consultez notre assistant de documentation intelligent.
              </p>
              <button className="w-full bg-white dark:bg-slate-800 border border-primary/20 text-primary py-2 rounded-lg font-bold text-sm hover:bg-primary/5 transition-all">
                Lancer l'assistant
              </button>
            </div>

            {/* Trending / Most Viewed */}
            <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white">Les plus consultés</h4>
                <span className="material-symbols-outlined text-amber-500 text-lg">trending_up</span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {trendingArticles.map((article, idx) => (
                  <a
                    key={idx}
                    href="#"
                    className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1">
                      {article.title}
                    </p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {article.views} vues • {article.category}
                    </span>
                  </a>
                ))}
              </div>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-center">
                <button className="text-xs font-bold text-primary uppercase tracking-tighter">
                  Voir toutes les statistiques
                </button>
              </div>
            </section>

            {/* Tags Cloud */}
            <section>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Mots-clés populaires</h4>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-500 dark:text-slate-400 hover:border-primary cursor-pointer transition-all"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Maintenance Alert */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">info</span>
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">
                    Maintenance prévue
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Mise à jour système le 15 Nov à 02:00 UTC. Durée estimée: 30 min.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KnowledgeBaseAdmin;
