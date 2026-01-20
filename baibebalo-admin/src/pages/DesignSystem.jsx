import { useState } from 'react';
import Layout from '../components/layout/Layout';

const DesignSystem = () => {
  const [copiedColor, setCopiedColor] = useState(null);

  const handleCopyColor = (color, hex) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const colorPalette = [
    {
      name: 'Primary Blue',
      hex: '#0EA5E9',
      description: 'Brand identity, primary actions, active states.',
      bg: 'bg-[#0EA5E9]',
    },
    {
      name: 'Success Green',
      hex: '#10B981',
      description: 'Confirmations, positive trends, status: active.',
      bg: 'bg-[#10B981]',
    },
    {
      name: 'Danger Red',
      hex: '#EF4444',
      description: 'Errors, deletions, destructive actions.',
      bg: 'bg-[#EF4444]',
    },
    {
      name: 'Warning Orange',
      hex: '#F59E0B',
      description: 'Warnings, pending states, alerts.',
      bg: 'bg-[#F59E0B]',
    },
  ];

  const typography = [
    {
      name: 'Heading 1',
      element: <h1 className="text-4xl font-black leading-tight tracking-[-0.033em]">The quick brown fox</h1>,
      size: '32px / 900',
    },
    {
      name: 'Heading 2',
      element: <h2 className="text-2xl font-bold leading-tight">The quick brown fox</h2>,
      size: '24px / 700',
    },
    {
      name: 'Body Text',
      element: (
        <p className="text-base font-normal leading-relaxed text-slate-600 dark:text-slate-400">
          Designing is a plan for arranging elements in such a way as best to accomplish a particular purpose.
        </p>
      ),
      size: '16px / 400',
    },
    {
      name: 'Small Labels',
      element: <span className="text-sm font-semibold uppercase tracking-wider">The quick brown fox</span>,
      size: '14px / 600',
    },
  ];

  const buttonVariants = [
    {
      name: 'Primary',
      active: <button className="bg-primary hover:bg-primary/80 text-white text-sm font-semibold py-2 px-4 rounded transition-all">Action</button>,
      disabled: <button className="bg-primary/40 text-white/50 text-sm font-semibold py-2 px-4 rounded cursor-not-allowed">Disabled</button>,
    },
    {
      name: 'Secondary',
      active: (
        <button className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-sm font-semibold py-2 px-4 rounded transition-all">
          Cancel
        </button>
      ),
      disabled: (
        <button className="bg-slate-800 border border-slate-700 text-slate-600 text-sm font-semibold py-2 px-4 rounded cursor-not-allowed">
          Disabled
        </button>
      ),
    },
    {
      name: 'Success',
      active: <button className="bg-emerald-500 hover:bg-emerald-500/80 text-white text-sm font-semibold py-2 px-4 rounded transition-all">Submit</button>,
      disabled: <button className="bg-emerald-500/40 text-white/50 text-sm font-semibold py-2 px-4 rounded cursor-not-allowed">Disabled</button>,
    },
    {
      name: 'Danger',
      active: <button className="bg-red-500 hover:bg-red-500/80 text-white text-sm font-semibold py-2 px-4 rounded transition-all">Delete</button>,
      disabled: <button className="bg-red-500/40 text-white/50 text-sm font-semibold py-2 px-4 rounded cursor-not-allowed">Disabled</button>,
    },
  ];

  const badges = [
    { label: 'Active', class: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
    { label: 'Pending', class: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
    { label: 'Error', class: 'bg-red-500/20 text-red-500 border-red-500/30' },
    { label: 'New', class: 'bg-primary/20 text-primary border-primary/30' },
    { label: 'Archived', class: 'bg-slate-700 text-slate-300' },
  ];

  const grayScale = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

  return (
    <Layout>
      <div className="flex min-h-screen">
        {/* Sidebar Navigation */}
        <aside className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 bg-white dark:bg-slate-900">
          <div className="p-6 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined">diamond</span>
            </div>
            <div className="flex items-center gap-2">
              <img 
                src="/src/assets/Baibebalo_icon_sans_fond_orange.png" 
                alt="Baibebalo" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-white">BAIBEBALO</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Admin Dashboard</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Dashboard
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              Analytics
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">group</span>
              Users
            </a>
            <div className="pt-4 pb-2 px-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Resources</p>
            </div>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary border border-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                palette
              </span>
              Design System
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              Components
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              Settings
            </a>
          </nav>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 p-2">
              <div className="size-8 rounded-full bg-slate-300 dark:bg-slate-700 bg-cover bg-center" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-slate-900 dark:text-white">Alex Morgan</p>
                <p className="text-[10px] text-slate-500">Lead Designer</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-sm">unfold_more</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-12">
            {/* Page Heading */}
            <header className="mb-12">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-4">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Master Documentation
              </div>
              <h1 className="text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">
                Guide de Style & Design System
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                Centralized reference for the BAIBEBALO visual identity. This guide provides developers and designers
                with a standardized set of UI components, color tokens, and typography scales to ensure consistency
                across the dashboard.
              </p>
            </header>

            {/* 1. Color Palette */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <span className="flex items-center justify-center size-8 rounded bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs">
                  01
                </span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Color Palette</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {colorPalette.map((color) => (
                  <div
                    key={color.name}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm"
                  >
                    <div
                      className={`h-32 w-full ${color.bg} rounded-lg mb-4 flex items-end justify-end p-2 relative group cursor-pointer`}
                      onClick={() => handleCopyColor(color.name, color.hex)}
                    >
                      <span
                        className={`material-symbols-outlined text-white/50 cursor-pointer hover:text-white transition-colors ${
                          copiedColor === color.name ? 'text-white' : ''
                        }`}
                      >
                        {copiedColor === color.name ? 'check' : 'content_copy'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{color.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{color.hex}</p>
                    <p className="mt-2 text-[10px] text-slate-400">{color.description}</p>
                  </div>
                ))}
              </div>

              {/* Neutral Scale */}
              <div className="mt-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-xl">
                <h3 className="text-sm font-bold mb-4 text-slate-900 dark:text-white">Neutral Scale (Gray)</h3>
                <div className="flex h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  {grayScale.map((shade) => (
                    <div
                      key={shade}
                      className={`flex-1 bg-slate-${shade} group relative cursor-help hover:opacity-90 transition-opacity`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 text-slate-900 dark:text-white font-bold">
                        {shade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 2. Typography */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <span className="flex items-center justify-center size-8 rounded bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs">
                  02
                </span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Typography</h2>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Style</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Preview</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">
                        Size / Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {typography.map((type, index) => (
                      <tr key={type.name} className={index === 0 ? 'py-8' : 'py-6'}>
                        <td className="px-6 align-top text-xs text-slate-400">{type.name}</td>
                        <td className="px-6">{type.element}</td>
                        <td className="px-6 text-right font-mono text-xs text-slate-400">{type.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. Components */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <span className="flex items-center justify-center size-8 rounded bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs">
                  03
                </span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Core Components</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Buttons Matrix */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-xl">
                  <h3 className="text-sm font-bold mb-6 border-b border-slate-200 dark:border-slate-700 pb-4 text-slate-900 dark:text-white">
                    Button Variants
                  </h3>
                  <div className="space-y-8">
                    {buttonVariants.map((variant) => (
                      <div key={variant.name} className="grid grid-cols-3 gap-4 items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">{variant.name}</span>
                        {variant.active}
                        {variant.disabled}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badges & Inputs */}
                <div className="space-y-8">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-xl">
                    <h3 className="text-sm font-bold mb-6 border-b border-slate-200 dark:border-slate-700 pb-4 text-slate-900 dark:text-white">
                      Status Badges
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {badges.map((badge) => (
                        <span
                          key={badge.label}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.class}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-xl">
                    <h3 className="text-sm font-bold mb-6 border-b border-slate-200 dark:border-slate-700 pb-4 text-slate-900 dark:text-white">
                      Input Samples
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                          Full Name
                        </label>
                        <input
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-slate-200"
                          placeholder="John Doe"
                          type="text"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="size-10 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">search</span>
                        </button>
                        <button className="size-10 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">notifications</span>
                        </button>
                        <button className="size-10 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-sm">download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer Meta */}
            <footer className="mt-20 pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-slate-500 dark:text-slate-400">
              <p className="text-xs">Version 1.0.4 • Last updated Oct 2023</p>
              <div className="flex gap-4">
                <a href="#" className="text-xs hover:text-primary transition-colors">
                  Download Assets
                </a>
                <a href="#" className="text-xs hover:text-primary transition-colors">
                  GitHub Repository
                </a>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default DesignSystem;
