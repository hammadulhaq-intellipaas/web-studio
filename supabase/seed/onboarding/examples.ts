import type { OnbExample } from '../../../src/lib/onboarding/types.ts';

/**
 * Worked examples for the brief writer: a filled form in, the finished brief out. Angelica
 * will replace this synthetic one with two or three from real projects (Functional Med,
 * Artz). Kept short on purpose — every example rides along in the prompt.
 */
export const examples: OnbExample[] = [
  {
    id: 'example_physio',
    title: 'Physiotherapiepraxis, 6 Seiten, Deutsch, Terminbuchung',
    sort: 10,
    active: true,
    answers: {
      locale: 'de',
      contact_company: 'Physio Nordend',
      legal_name: 'Physio Nordend Lena Hartmann e.K.',
      legal_form: 'e.K.',
      address_city: '60318 Frankfurt am Main',
      service_scope: 'one_region',
      regions_served: 'Frankfurt Nordend, Bornheim, Westend',
      catalogue: 'Krankengymnastik\nManuelle Therapie\nLymphdrainage\nHausbesuche',
      usps: 'Termine innerhalb einer Woche, alle Kassen, barrierefreier Zugang',
      tagline: '__dont_know',
      booked_package: 'gold',
      booked_page_band: '58',
      page_list: 'Startseite\nLeistungen\n- Krankengymnastik\n- Manuelle Therapie\n- Lymphdrainage\nTeam\nKontakt & Anfahrt',
      visitor_action: 'booking',
      tone_scale: 3,
      personality_scale: 2,
      references: [
        {
          _id: 'r1',
          url: 'https://www.beispiel-physio.de',
          likes: 'Ruhige Farben, große Fotos der Praxisräume, Termin-Button oben rechts',
          dislikes: 'Zu viel Text auf der Startseite',
        },
      ],
      brand_colours: '#2A7F62, #F4F1EA',
      languages: 'single',
      integrations: ['booking', 'maps', 'reviews'],
      booking_provider: 'Doctolib',
      integrations_contact: 'Lena Hartmann',
      gbp_link: 'https://g.page/physio-nordend',
      legal_pages: 'reuse',
      legal_reviewer: 'Lena Hartmann',
      sells_to_consumers: 'no',
      launch_date: '2026-11-02',
      launch_date_fixed: 'no',
      content_ready_date: '2026-10-05',
      opening_hours: null,
    },
    brief: {
      who: {
        content_markdown:
          'Physio Nordend (Physio Nordend Lena Hartmann e.K.) ist eine Physiotherapiepraxis in 60318 Frankfurt am Main. Sie betreut Patientinnen und Patienten in Frankfurt Nordend, Bornheim und Westend.\n\nLeistungen, in der Schreibweise der Praxis:\n- Krankengymnastik\n- Manuelle Therapie\n- Lymphdrainage\n- Hausbesuche\n\nWarum Patienten sich für die Praxis entscheiden: Termine innerhalb einer Woche, alle Kassen, barrierefreier Zugang.',
        still_needed: ['Slogan oder Claim (als „weiß ich nicht“ markiert)'],
        sources: ['contact_company', 'legal_name', 'address_city', 'regions_served', 'catalogue', 'usps'],
      },
      goals: {
        content_markdown:
          'Das Wichtigste, das ein Besucher tun soll: **einen Termin buchen**. Sehr wichtig ist außerdem der Anruf. Eher wichtig: der Besuch vor Ort und eine Anfrage. Kaufen und Anmelden spielen keine Rolle.',
        still_needed: [],
        sources: ['visitor_actions'],
      },
      pages: {
        content_markdown:
          'Gebucht: Paket Gold, 5–8 Seiten. Geplant sind 6 Seiten:\n- Startseite\n- Leistungen\n  - Krankengymnastik\n  - Manuelle Therapie\n  - Lymphdrainage\n- Team\n- Kontakt & Anfahrt',
        still_needed: [],
        sources: ['booked_package', 'booked_page_band', 'page_count', 'page_list'],
      },
      look: {
        content_markdown:
          'Tonalität: **Freundlich, aber professionell** (3 von 5). Persönlichkeit: **Dezent** (2 von 5).\n\nReferenz: https://www.beispiel-physio.de – gefällt: ruhige Farben, große Fotos der Praxisräume, Termin-Button oben rechts. Gefällt nicht: zu viel Text auf der Startseite.\n\nMarkenfarben: #2A7F62, #F4F1EA.',
        still_needed: ['Fotos der Praxisräume', 'Angabe, ob ein Markenhandbuch existiert', 'Logo als Vektordatei – ja/nein'],
        sources: ['tone_scale', 'personality_scale', 'references', 'brand_colours'],
      },
      dates: {
        content_markdown:
          'Gewünschter Start: 2026-11-02 (nicht fest). Texte und Fotos liegen bis 2026-10-05 vor. Der Bau hängt an den Praxisfotos und dem Zugang zum Doctolib-Konto (Lena Hartmann).',
        still_needed: [],
        sources: ['launch_date', 'launch_date_fixed', 'content_ready_date', 'integrations_contact'],
      },
    },
  },
];
