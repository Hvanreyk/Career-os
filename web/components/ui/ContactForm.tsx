'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="glass rounded-2xl border border-gold-400/20 p-10 text-center h-full flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-gold-400/15 flex items-center justify-center mb-4">
          <Send className="w-6 h-6 text-gold-400" />
        </div>
        <h3 className="font-serif text-2xl font-bold text-white mb-2">Message sent</h3>
        <p className="text-slate-400 text-sm">
          Thanks for reaching out. We&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="glass rounded-2xl border border-white/8 p-8 space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
            Name
          </label>
          <input
            type="text"
            required
            placeholder="Your name"
            className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
            Email
          </label>
          <input
            type="email"
            required
            placeholder="your@email.com"
            className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
          Message
        </label>
        <textarea
          required
          rows={6}
          placeholder="Tell us what's on your mind..."
          className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors resize-none"
        />
      </div>
      <button
        type="submit"
        className="w-full py-3.5 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] hover:shadow-[0_0_36px_rgba(212,175,55,0.45)] flex items-center justify-center gap-2"
      >
        Send Message <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
