import { useState } from 'react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';

const ValidateDriver = () => {
  const [driver] = useState({
    id: 'DRV-NEW-001',
    name: 'Jean Dupont',
    phone: '+33 6 12 34 56 78',
    email: 'jean.dupont@email.com',
    address: '12 Rue de la Liberté, Paris',
    vehicleType: 'Moto',
    license: 'AB-123-CD',
    avatar: null,
  });

  const [documents] = useState([
    {
      id: 'doc-1',
      type: 'Permis de Conduire',
      status: 'pending',
      preview: null,
    },
    {
      id: 'doc-2',
      type: 'Carte d\'Identité',
      status: 'pending',
      preview: null,
    },
  ]);

  const handleRequestInfo = () => {
    toast.success('Demande d\'informations supplémentaires envoyée');
  };

  const handleReject = () => {
    if (globalThis.confirm(`Êtes-vous sûr de vouloir rejeter la candidature de ${driver.name} ?`)) {
      toast.success(`Candidature de ${driver.name} rejetée`);
    }
  };

  const handleApprove = () => {
    if (globalThis.confirm(`Êtes-vous sûr de vouloir approuver la candidature de ${driver.name} ?`)) {
      toast.success(`Candidature de ${driver.name} approuvée avec succès`);
    }
  };

  const handleViewDocument = (docId) => {
    toast.info(`Ouverture du document ${docId}...`);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Validation de Nouveau Livreur
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Phase 3 sur 4 : Validation des documents</p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          {/* Profile Section */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Profil du Livreur</h2>
            <div className="flex items-start gap-6">
              {driver.avatar ? (
                <div
                  className="size-20 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${driver.avatar})` }}
                />
              ) : (
                <div className="size-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-black">
                  {driver.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{driver.name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                  <span className="material-symbols-outlined text-lg">motorcycle</span>
                  <span>Type de véhicule : {driver.vehicleType}</span>
                  <span className="mx-2">•</span>
                  <span>Licence : {driver.license}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Téléphone</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{driver.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Email</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{driver.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Adresse</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{driver.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Vérification des Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 flex items-center justify-center group cursor-pointer">
                    <span className="material-symbols-outlined text-4xl text-slate-400">description</span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                      <button
                        onClick={() => handleViewDocument(doc.id)}
                        className="size-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <span className="material-symbols-outlined text-slate-900">zoom_in</span>
                      </button>
                      <button
                        onClick={() => handleViewDocument(doc.id)}
                        className="size-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <span className="material-symbols-outlined text-slate-900">visibility</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{doc.type}</p>
                    <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-xs font-bold">
                      En attente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleRequestInfo}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-bold transition-colors"
            >
              Demander infos
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors shadow-sm"
              >
                REJETER
              </button>
              <button
                onClick={handleApprove}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-colors shadow-sm"
              >
                APPROUVER
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ValidateDriver;
