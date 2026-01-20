import { useState } from 'react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';

const NotificationTemplates = () => {
  const [activeTab, setActiveTab] = useState('push');
  const [selectedTemplate, setSelectedTemplate] = useState('order-confirmed');
  const [title, setTitle] = useState('New Order Received! 🛍️');
  const [message, setMessage] = useState(
    'Hello {{customer_name}}, your order #{{order_id}} has been placed successfully. Thank you for shopping with BAIBEBALO!'
  );
  const [deepLink, setDeepLink] = useState('orders/{{order_uuid}}');

  const templates = [
    { id: 'order-confirmed', name: 'Commande Confirmée', category: 'client', icon: 'check_circle' },
    { id: 'delivery-route', name: 'Livreur en Route', category: 'client', icon: 'local_shipping' },
    { id: 'stock-alert', name: 'Alerte Stock', category: 'client', icon: 'inventory_2' },
    { id: 'welcome-client', name: 'Bienvenue Client', category: 'client', icon: 'person_add' },
    { id: 'order-cancelled', name: 'Annulation Commande', category: 'system', icon: 'cancel' },
    { id: 'password-reset', name: 'Réinitialisation MDP', category: 'system', icon: 'password' },
  ];

  const variables = [
    { name: 'customer_name', label: 'Nom du client' },
    { name: 'order_id', label: 'ID Commande' },
    { name: 'total_amount', label: 'Montant total' },
    { name: 'order_date', label: 'Date commande' },
    { name: 'items_count', label: 'Nombre d\'articles' },
    { name: 'order_uuid', label: 'UUID Commande' },
    { name: 'shipping_address', label: 'Adresse livraison' },
    { name: 'tracking_number', label: 'Numéro de suivi' },
  ];

  const handleInsertVariable = (varName, field = 'message') => {
    const textarea = document.querySelector(`textarea[name="${field}"]`) || document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = field === 'title' ? title : message;
      const newText = currentValue.substring(0, start) + `{{${varName}}}` + currentValue.substring(end);
      if (field === 'title') {
        setTitle(newText);
      } else {
        setMessage(newText);
      }
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
      }, 0);
    }
  };

  const handleSave = () => {
    toast.success('Template sauvegardé avec succès');
  };

  const handleTest = () => {
    toast.success('Message de test envoyé');
  };

  const titleCharacterCount = title.length;
  const messageCharacterCount = message.length;
  const maxTitleCharacters = 40;
  const maxMessageCharacters = 150;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumbs & Heading */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="hover:text-primary cursor-pointer">Templates</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-slate-900 dark:text-white">Push Notifications</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">New Order Push</h1>
                <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black uppercase rounded">
                  Active
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-mono font-medium">ID: TMP-4829-NO</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal mt-1">
                Configure dynamic push notifications for customer orders
              </p>
            </div>
            <button className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors font-bold text-sm">
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Back to List</span>
            </button>
          </div>
        </div>

        {/* Main Layout: Editor & Preview */}
        <div className="flex flex-col lg:flex-row gap-8 flex-1">
          {/* Left Column: Editor */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Content Editor Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Template Editor</h3>
              </div>
              <div className="p-6 flex flex-col gap-6">
                {/* Title Field */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label htmlFor="notification-title" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Notification Title
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {titleCharacterCount} / {maxTitleCharacters}
                    </span>
                  </div>
                  <input
                    id="notification-title"
                    name="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent text-slate-900 dark:text-white font-medium outline-none transition-all"
                  />
                </div>
                {/* Body Field */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label htmlFor="message-body" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Message Body
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {messageCharacterCount} / {maxMessageCharacters}
                    </span>
                  </div>
                  <textarea
                    id="message-body"
                    name="message"
                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent text-slate-900 dark:text-white font-medium outline-none transition-all resize-none leading-relaxed"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                {/* Deep Link Field */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="deep-link" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Deep Link Action
                  </label>
                  <div className="flex">
                    <div className="bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-lg px-3 flex items-center text-xs font-bold text-slate-500">
                      app://
                    </div>
                    <input
                      id="deep-link"
                      type="text"
                      value={deepLink}
                      onChange={(e) => setDeepLink(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-r-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent text-slate-900 dark:text-white font-mono text-sm outline-none transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Determine where the user lands when they tap the notification.</p>
                </div>
              </div>
            </div>
            {/* Variable Tags Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">terminal</span>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Dynamic Variables</h3>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    search
                  </span>
                  <input
                    className="pl-8 pr-3 py-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-xs focus:ring-1 focus:ring-primary outline-none w-32 md:w-48"
                    placeholder="Search tags..."
                    type="text"
                  />
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium italic">
                  Click a tag to insert it at your cursor position:
                </p>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable) => (
                    <button
                      key={variable.name}
                      onClick={() => handleInsertVariable(variable.name, 'message')}
                      className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all rounded-md text-xs font-bold font-mono border border-primary/20"
                    >
                      {`{{${variable.name}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Right Column: Live Preview */}
          <div className="lg:w-[400px] flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex items-center justify-center sticky top-24">
              {/* Mobile Frame */}
              <div className="relative w-[280px] h-[560px] bg-slate-900 rounded-[3rem] overflow-hidden border-[6px] border-slate-800 shadow-2xl">
                {/* Top Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-20" />
                {/* Screen Content */}
                <div
                  className="w-full h-full bg-cover bg-center flex flex-col p-4 pt-12"
                  style={{
                    backgroundImage:
                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDryNxmmW014EU3AuE90RtrDQ2tq501HRdn72dghjmnwTdGzLe8z4A41kH9D2Had0CqXGp86oFqiW6m3c0nQ5oZFPZoe386GNoKHKR36YhRar4vznBA4c6GsO7d8t9-8esEahW1QInU1v-Nkqf-O8T2dEZb-lj18tGKTT8pgNx1kYGtdaYh_UyIZHcxz0nOpXGWxmLGwJfmpA_1pDtyOGX0OAwiUVMy9LN3CkYrOLozULHOR2wRX-xuTdKd2TMz0q8h6cyiXGK4TRSd")',
                  }}
                >
                  {/* Lock Screen Clock */}
                  <div className="text-center text-white mb-8">
                    <h4 className="text-5xl font-light">14:02</h4>
                    <p className="text-sm font-medium opacity-80">Monday, October 23</p>
                  </div>
                  {/* Push Notification Mockup */}
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="size-5 bg-orange-500 rounded flex items-center justify-center">
                          <svg fill="none" height="12" viewBox="0 0 48 48" width="12" xmlns="http://www.w3.org/2000/svg">
                            <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z" fill="white" />
                          </svg>
                        </div>
                        <img 
                          src="/src/assets/Baibebalo_icon_sans_fond_orange.png" 
                          alt="Baibebalo" 
                          className="h-6 w-auto"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">now</span>
                    </div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-white mb-0.5">{title}</h5>
                    <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">{message}</p>
                  </div>
                  {/* Bottom Unlock Indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-white/40 rounded-full" />
                </div>
                {/* Floating Tooltip */}
                <div className="absolute -bottom-4 right-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase rounded shadow-xl flex items-center gap-2">
                  <span className="flex size-2 bg-green-500 rounded-full animate-ping" />
                  Live Preview Active
                </div>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">info</span>
                <div>
                  <h4 className="text-xs font-bold text-primary mb-1 uppercase">Pro Tip</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ensure your notification titles are under 40 characters to avoid truncation on small devices. Current
                    character count is optimal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4">
          <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Last Modified</span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Today at 10:45 AM by Sarah K.</span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="size-1.5 bg-green-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Active - High Delivery</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-6 py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-all">
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Update Production Template
              </button>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
};

export default NotificationTemplates;
