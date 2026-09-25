import { describe, expect, it } from 'vitest';
import { renderCustomerEmail, type CustomerEmailVariant, type EmailContext } from '@/lib/emails';
import { makeCatalog, makeSelection } from './fixtures/catalog';
import { priceSelection } from '@/lib/quotes/price';
import type { Locale } from '@/lib/types';

/**
 * The letters a customer actually receives. Two of them carry the same prices but say very
 * different things: the copy of their own enquiry is theirs to look over, the quote the
 * team sends is the one they are asked to accept.
 */
const catalog = makeCatalog();

function render(variant: CustomerEmailVariant, locale: Locale = 'en') {
  const priced = priceSelection(catalog, makeSelection({ selectedAddons: { cookie: true } }), locale);
  const ctx: EmailContext = {
    lead: { id: 'l1', vorname: 'Angelica', nachname: 'Sy', firma: 'Sy GmbH', email: 'a@example.com', telefon: null, ziel: null },
    locale,
    catalog,
    bundleName: 'Gold',
    personaLabel: null,
    receipt: priced.receipt,
    totals: priced.totals,
    voucher: null,
    variant,
    customerLink: 'https://web-studio.intellipaas.io/en?c=Gm96Mr81cJaD4keFQhucL',
  };
  return renderCustomerEmail(ctx);
}

describe('the customer quote emails', () => {
  it('the enquiry copy asks them to review, not to accept', () => {
    const { html } = render('new');
    expect(html).toContain('Hello Angelica Sy,');
    expect(html).toContain('Here is a copy of your website quote');
    expect(html).toContain('Review your quote');
    expect(html).not.toContain('Review and accept your quote');
    expect(html).toContain('You can review or change your selections using the button above.');
    expect(html).toContain('If the button does not work, use this link:');
    expect(html).toContain('Your quote details:');
    expect(html).toContain('Best regards,');
    expect(html).toContain('The IntelliPaaS Web Studio team');
  });

  it('the quote the team sends asks them to accept it, and says what follows', () => {
    const { html } = render('quote');
    expect(html).toContain('ready for your final review');
    expect(html).toContain('we will send you the onboarding form');
    expect(html).toContain('Review and accept your quote');
    // No "change your selections" nudge here: this one is for accepting.
    expect(html).not.toContain('You can review or change your selections');
    expect(html).toContain('If the button does not work, use this link:');
    expect(html).toContain('Quote details');
  });

  it('both carry the link as text as well as a button, because clients strip links', () => {
    for (const variant of ['new', 'quote'] as const) {
      const { html } = render(variant);
      const hits = html.split('https://web-studio.intellipaas.io/en?c=Gm96Mr81cJaD4keFQhucL').length - 1;
      expect(hits, variant).toBeGreaterThanOrEqual(3); // button href, fallback href, fallback text
    }
  });

  it('is written in German on a German quote', () => {
    const { html, subject } = render('quote', 'de');
    expect(subject).toContain('Angebot');
    expect(html).toContain('Angebot ansehen und annehmen');
    expect(html).toContain('Mit freundlichen Grüßen');
    expect(html).not.toContain('Best regards');
  });
});
