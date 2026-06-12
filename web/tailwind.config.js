/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        'indigo-700': '#4338ca',
        'indigo-600': '#4f46e5',
        'indigo-500': '#6366f1',
        'indigo-100': '#e0e7ff',
        'indigo-50':  '#eef2ff',
        // Slate scale
        'slate-900': '#0f172a',
        'slate-800': '#1e293b',
        'slate-700': '#334155',
        'slate-600': '#475569',
        'slate-500': '#64748b',
        'slate-400': '#94a3b8',
        'slate-300': '#cbd5e1',
        'slate-200': '#e2e8f0',
        'slate-150': '#eaeff4',
        'slate-100': '#f1f5f9',
        'slate-50':  '#f8fafc',
        // Status
        'red-600':    '#dc2626',
        'red-100':    '#fee2e2',
        'red-50':     '#fef2f2',
        'orange-600': '#ea580c',
        'orange-50':  '#fff7ed',
        'amber-600':  '#d97706',
        'amber-50':   '#fffbeb',
        'green-600':  '#16a34a',
        'green-50':   '#f0fdf4',
        'blue-600':   '#2563eb',
        'violet-600': '#7c3aed',
        'violet-50':  '#f5f3ff',
        'sky-600':    '#0284c7',
        'sky-50':     '#e0f2fe',
      },
      fontFamily: {
        sans:  ['Geist', 'Inter', 'Arial', 'sans-serif'],
        mono:  ['Geist Mono', 'monospace'],
      },
      fontSize: {
        '10.5': ['10.5px', { lineHeight: '1.4' }],
        '12.5': ['12.5px', { lineHeight: '1.4' }],
        '13':   ['13px',   { lineHeight: '1.45' }],
        '19':   ['19px',   { lineHeight: '1.3' }],
      },
      borderRadius: {
        '6':  '6px',
        '7':  '7px',
        '8':  '8px',
        '10': '10px',
        '12': '12px',
        '14': '14px',
      },
      boxShadow: {
        'sm':  '0 1px 2px rgba(15,23,42,.06)',
        'md':  '0 4px 12px rgba(15,23,42,.08)',
        'lg':  '0 12px 32px rgba(15,23,42,.14)',
        'card':'0 1px 2px rgba(15,23,42,.06), 0 1px 4px rgba(15,23,42,.04)',
      },
    },
  },
  plugins: [],
};
