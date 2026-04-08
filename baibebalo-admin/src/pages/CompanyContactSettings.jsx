import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsAPI } from '../api/settings';

const COMPANY_KEYS = [
  'company_facebook',
  'company_instagram',
  'company_tiktok',
  'company_whatsapp',
  'company_email',
  'company_contact_1_name',
  'company_contact_1_phone',
  'company_contact_2_name',
  'company_contact_2_phone',
  'company_contact_3_name',
  'company_contact_3_phone',
  'company_contact_4_name',
  'company_contact_4_phone',
];

const getInitialCompanySettings = (apiSettings) => {
  const out = {};
  COMPANY_KEYS.forEach((key) => {
    const v = apiSettings[key]?.value;
    out[key] = v !== undefined && v !== null ? String(v) : '';
  });
  return out;
};

const CompanyContactSettings = () => {
  const queryClient = useQueryClient();
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsAPI.getSettings(),
    retry: 2,
  });

  const apiSettings = settingsData?.data?.settings || {};
  const [form, setForm] = useState(getInitialCompanySettings(apiSettings));

  useEffect(() => {
    if (Object.keys(apiSettings).length > 0) {
      setForm(getInitialCompanySettings(apiSettings));
    }
  }, [settingsData]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const settings = {};
      COMPANY_KEYS.forEach((key) => {
        settings[key] = {
          value: values[key] || '',
          description: key.startsWith('company_contact_')
            ? (key.endsWith('_name') ? 'Contact - Nom' : 'Contact - Téléphone')
            : `Coordonnée ${key.replace('company_', '')}`,
          is_public: true,
        };
      });
      return settingsAPI.updateSettings(settings);
    },
    onSuccess: () => {
      toast.success('Coordonnées enregistrées. Les apps utiliseront ces valeurs après rafraîchissement.');
      queryClient.invalidateQueries(['app-settings']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Erreur lors de la sauvegarde');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Chargement...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Coordonnées de l&apos;entreprise
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Ces coordonnées sont affichées dans les apps Client, Livreur et Restaurant (Aide, Contact, À propos).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Réseaux sociaux */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Réseaux sociaux</h3>
              <p className="text-sm text-slate-500 mt-1">URLs et numéro WhatsApp</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Facebook (URL)</label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-4 text-sm"
                  placeholder="https://facebook.com/..."
                  value={form.company_facebook}
                  onChange={(e) => handleChange('company_facebook', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Instagram (URL)</label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-4 text-sm"
                  placeholder="https://instagram.com/..."
                  value={form.company_instagram}
                  onChange={(e) => handleChange('company_instagram', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">TikTok (URL)</label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-4 text-sm"
                  placeholder="https://tiktok.com/..."
                  value={form.company_tiktok}
                  onChange={(e) => handleChange('company_tiktok', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">WhatsApp (numéro)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-4 text-sm"
                  placeholder="+2250700000000"
                  value={form.company_whatsapp}
                  onChange={(e) => handleChange('company_whatsapp', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Contact</h3>
              <p className="text-sm text-slate-500 mt-1">Email principal et contacts (nom + téléphone)</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email principal</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-4 text-sm"
                  placeholder="contact@baibebalo.ci"
                  value={form.company_email}
                  onChange={(e) => handleChange('company_email', e.target.value)}
                />
              </div>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact {n} – Nom
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-4 text-sm"
                      placeholder={`Nom contact ${n}`}
                      value={form[`company_contact_${n}_name`]}
                      onChange={(e) => handleChange(`company_contact_${n}_name`, e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact {n} – Téléphone
                    </label>
                    <input
                      type="tel"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 px-4 text-sm"
                      placeholder="+225..."
                      value={form[`company_contact_${n}_phone`]}
                      onChange={(e) => handleChange(`company_contact_${n}_phone`, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"
          >
            {saveMutation.isPending ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                Sauvegarde...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default CompanyContactSettings;
