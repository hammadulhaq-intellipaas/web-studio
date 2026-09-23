import { describe, expect, it } from 'vitest';
import { prefillFromLead, type PrefillSource } from '@/lib/onboarding/prefill';
import { clearHidden } from '@/lib/onboarding/logic';
import { makeDefinition } from './fixtures/onboarding';

const def = makeDefinition();

const lead = (over: Partial<PrefillSource> = {}): PrefillSource => ({
  vorname: 'Lena',
  nachname: 'Hartmann',
  firma: 'Physio Nordend',
  email: 'lena@physio-nordend.de',
  source_url: 'https://www.physio-nordend.de',
  drive_link: null,
  config: { bundle: 'gold', answers: { pages: '58', hasSite: 'website' } },
  stage2: null,
  ...over,
});

describe('prefillFromLead', () => {
  it('copies the contact block and what the quote itself says', () => {
    const out = prefillFromLead(lead());
    expect(out.contact_name).toEqual({ v: 'Lena Hartmann', src: 'lead' });
    expect(out.contact_company?.v).toBe('Physio Nordend');
    expect(out.contact_email?.v).toBe('lena@physio-nordend.de');
    expect(out.booked_package?.v).toBe('gold');
    expect(out.booked_page_band?.v).toBe('58');
  });

  it('maps all four "do you have a site" answers onto the two project types', () => {
    const type = (hasSite: string) => prefillFromLead(lead({ config: { bundle: 'gold', answers: { hasSite } } })).project_type?.v;
    expect(type('website')).toBe('changes');
    expect(type('none')).toBe('new');
    expect(type('social')).toBe('new');
    expect(type('concept')).toBe('new');
  });

  it('only carries the existing URL when they said they have a website', () => {
    expect(prefillFromLead(lead()).existing_url?.v).toBe('https://www.physio-nordend.de');
    const social = lead({ config: { bundle: 'gold', answers: { hasSite: 'social' } } });
    expect(prefillFromLead(social).existing_url).toBeUndefined();
  });

  it('leaves the package empty for a bundle the form does not offer', () => {
    // BYOW is a real bundle but not one of the three packages the form asks about.
    expect(prefillFromLead(lead({ config: { bundle: 'byow', answers: {} } })).booked_package).toBeUndefined();
    expect(prefillFromLead(lead({ config: { bundle: '', answers: { pages: 'nonsense' } } })).booked_page_band).toBeUndefined();
  });

  it('takes the assets folder only when it is actually a link', () => {
    expect(prefillFromLead(lead({ drive_link: 'https://drive.google.com/drive/folders/x' })).assets_folder?.v).toBe(
      'https://drive.google.com/drive/folders/x',
    );
    expect(prefillFromLead(lead({ drive_link: 'ask Lena for it' })).assets_folder).toBeUndefined();
  });

  it('copies the intake answers that are the same question', () => {
    const out = prefillFromLead(
      lead({
        stage2: {
          fields: {
            rechtsform: 'e.K.',
            ustid: 'DE123456789',
            oeffnung: 'Mo bis Fr, 8 bis 18 Uhr',
            usps: 'Termine innerhalb einer Woche',
            socialp: 'instagram.com/physionordend',
            bewertungen: '4,9 auf Google',
            leistungen: 'Krankengymnastik\nManuelle Therapie',
            einsatz: 'Wir behandeln Rückenschmerzen.',
          },
        },
      }),
    );
    expect(out.legal_form?.v).toBe('e.K.');
    expect(out.vat_id?.v).toBe('DE123456789');
    expect(out.opening_hours?.v).toBe('Mo bis Fr, 8 bis 18 Uhr');
    expect(out.usps?.v).toBe('Termine innerhalb einer Woche');
    expect(out.social_profiles?.v).toBe('instagram.com/physionordend');
    expect(out.reviews?.v).toBe('4,9 auf Google');
    expect(out.catalogue?.v).toBe('Krankengymnastik\nManuelle Therapie');
    expect(out.business_one_liner?.v).toBe('Wir behandeln Rückenschmerzen.');
  });

  it('never guesses the legal name from a trading name', () => {
    // It goes verbatim onto the legal notice, and "Physio Nordend" is not "… e.K.".
    const out = prefillFromLead(lead({ stage2: { fields: { firmenname: 'Physio Nordend' } } }));
    expect(out.legal_name).toBeUndefined();
  });

  it('never infers the answers that would be wrong more often than right', () => {
    const out = prefillFromLead(
      lead({ config: { bundle: 'gold', answers: { hasSite: 'none', langs: '2', contact: 'booking', shop: 'shop' } } }),
    );
    for (const key of ['integrations', 'languages', 'visitor_action', 'sells_to_consumers', 'public_phone', 'page_list']) {
      expect(out[key]).toBeUndefined();
    }
  });

  it('marks everything it writes as coming from the quote', () => {
    const out = prefillFromLead(lead({ stage2: { fields: { ustid: 'DE1' } } }));
    expect(Object.values(out).every((a) => a.src === 'lead')).toBe(true);
  });

  it('survives the hidden-field pass, so nothing it writes is silently dropped', () => {
    const out = prefillFromLead(
      lead({ drive_link: 'https://drive.google.com/x', stage2: { fields: { rechtsform: 'e.K.', ustid: 'DE1', usps: 'Schnell' } } }),
    );
    const { answers, removed } = clearHidden(def.fields, out);
    expect(removed).toEqual({});
    expect(Object.keys(answers).sort()).toEqual(Object.keys(out).sort());
  });
});
