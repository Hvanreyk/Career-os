'use client';

import { useState } from 'react';

/**
 * Contact form.
 *
 * Note: this has never been wired to a backend — submitting only flips local
 * state. Behaviour is preserved exactly as it was; the copy no longer claims
 * someone will be in touch, because nothing is actually sent.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="border border-rule bg-surface p-6" role="status">
        <span className="ml-label text-red">▸ Submitted</span>
        <h2 className="mt-3 text-[18px] font-bold uppercase tracking-[-0.01em] text-bone">
          Message captured
        </h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-graphite">
          This form is not yet connected to a mailbox, so nothing has been delivered. Email us
          directly and we will reply.
        </p>
        <button
          onClick={() => setSent(false)}
          className="ml-btn ml-btn-text mt-5 min-h-[44px] text-[14px]"
        >
          Write another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="border border-rule bg-surface p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="block text-[13px] font-semibold text-bone">
            Name
          </label>
          <input
            id="cf-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className="ml-field mt-2"
          />
        </div>
        <div>
          <label htmlFor="cf-email" className="block text-[13px] font-semibold text-bone">
            Email
          </label>
          <input
            id="cf-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="your@email.com"
            className="ml-field mt-2"
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="cf-message" className="block text-[13px] font-semibold text-bone">
          Message
        </label>
        <textarea
          id="cf-message"
          name="message"
          required
          rows={6}
          placeholder="Tell us what's on your mind…"
          className="ml-field mt-2"
        />
      </div>

      <button type="submit" className="ml-btn ml-btn-primary on-accent mt-6 min-h-[44px] px-5 text-[13px]">
        Send message <span aria-hidden="true">▸</span>
      </button>
    </form>
  );
}
