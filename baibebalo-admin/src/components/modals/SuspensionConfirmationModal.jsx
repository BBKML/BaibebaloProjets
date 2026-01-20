import { useState } from 'react';
import toast from 'react-hot-toast';

const SuspensionConfirmationModal = ({ isOpen, onClose, user, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  if (!isOpen || !user) return null;

  const handleConfirm = () => {
    if (!reason) {
      toast.error('Veuillez sélectionner une raison de suspension');
      return;
    }

    onConfirm({
      userId: user.id,
      reason,
      comments,
    });

    // Reset form
    setReason('');
    setComments('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 15, 18, 0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative w-full max-w-[520px] bg-white dark:bg-[#16272f] rounded-xl shadow-2xl border border-slate-300 dark:border-slate-700 overflow-hidden">
        {/* Warning Header */}
        <div className="pt-8 pb-4 flex flex-col items-center">
          <div className="size-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[40px]">warning</span>
          </div>
          <h2 className="text-slate-900 dark:text-white tracking-tight text-2xl font-bold leading-tight px-6 text-center">
            Suspendre l'utilisateur ?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 px-10 text-center">
            Cette action restreindra l'accès de l'utilisateur à la plateforme immédiatement.
          </p>
        </div>

        {/* Content Body */}
        <div className="px-8 py-4 space-y-6">
          {/* Selected User Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center gap-4">
            <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-700 bg-center bg-cover border-2 border-slate-300 dark:border-slate-600" />
            <div className="flex flex-col flex-1">
              <p className="text-slate-900 dark:text-white text-base font-bold leading-tight">
                {user.name || 'Utilisateur'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">
                {user.email || 'email@example.com'}
              </p>
            </div>
            <div className="ml-auto">
              <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/20 text-primary px-2 py-1 rounded">
                ID: #{user.id?.slice(0, 4) || '0000'}
              </span>
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-4">
            {/* Dropdown Reason */}
            <div className="flex flex-col gap-2">
              <label htmlFor="suspension-reason" className="text-white text-sm font-semibold flex items-center gap-1">
                Raison de la suspension <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="suspension-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="flex w-full appearance-none rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-700 dark:border-slate-700 bg-slate-800 dark:bg-slate-800 h-12 px-4 text-sm font-normal cursor-pointer"
                >
                  <option disabled value="">
                    Sélectionner une raison
                  </option>
                  <option value="behavior">Comportement inapproprié</option>
                  <option value="inactivity">Inactivité prolongée</option>
                  <option value="fraud">Fraude suspectée</option>
                  <option value="terms">Violation des conditions d'utilisation</option>
                  <option value="other">Autre raison</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#8eb9cc]">
                  <span className="material-symbols-outlined">keyboard_arrow_down</span>
                </div>
              </div>
            </div>

            {/* Additional Comments */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-semibold">
                Commentaires additionnels <span className="text-[#8eb9cc] font-normal text-xs">(Optionnel)</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-700 dark:border-slate-700 bg-slate-800 dark:bg-slate-800 p-3 text-sm font-normal min-h-[100px] placeholder:text-[#8eb9cc]/50"
                placeholder="Précisez les détails pour l'historique administratif..."
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-800/30 dark:bg-slate-800/30 p-6 mt-4 flex gap-3 border-t border-slate-700 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer items-center justify-center rounded-lg h-12 bg-transparent hover:bg-white/5 text-white border border-slate-700 dark:border-slate-700 text-sm font-bold transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[1.5] cursor-pointer items-center justify-center rounded-lg h-12 bg-red-500 hover:bg-red-600 text-white flex gap-2 text-sm font-bold shadow-lg shadow-red-500/20 transition-all"
          >
            <span className="material-symbols-outlined text-sm">block</span>
            Confirmer la suspension
          </button>
        </div>

        {/* Security Badge */}
        <div className="pb-4 pt-2 flex justify-center items-center gap-1.5 opacity-40">
          <span className="material-symbols-outlined text-[14px] text-slate-500">lock</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
            Action Journalisée - Admin ID: 442
          </span>
        </div>
      </div>
    </div>
  );
};

export default SuspensionConfirmationModal;
