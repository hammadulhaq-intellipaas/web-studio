import Image from 'next/image';
import { BLUE, BODY, BORDER, INK, MUTED } from '@/components/funnel/tokens';
import { inLocale, normalizeSiteUrl, publicImageUrl, siteDomain, type ShowcaseInput } from '@/lib/showcase/shared';
import type { Locale } from '@/lib/types';

/** Quotation marks the visitor's language uses; any the editor typed are dropped first. */
const MARKS: Record<Locale, [string, string]> = { de: ['„', '“'], en: ['“', '”'] };
const stripMarks = (text: string) => text.replace(/^["'„“”‚‘’»«]+|["'„“”‚‘’»«]+$/g, '').trim();

/**
 * One website we built, as the homepage will show it: the screenshot on top, the owner's
 * words, then who they are, and the site's domain. The whole card is one link to the site.
 * The admin editor renders the same card as its preview, so what the team sees is what ships.
 */
export function ShowcaseCard({ item, locale }: { item: ShowcaseInput; locale: Locale }) {
  const url = normalizeSiteUrl(item.site_url);
  const domain = url ? siteDomain(url) : '';
  const name = item.business_name || domain || item.owner_name;
  const quote = stripMarks(inLocale(item.quote_de, item.quote_en, locale));
  const title = inLocale(item.owner_title_de, item.owner_title_en, locale);
  const about = inLocale(item.about_de, item.about_en, locale);
  const role = [title, item.business_name].filter(Boolean).join(' · ');
  const [open, close] = MARKS[locale];
  const initials = item.owner_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  const body = (
    <>
      <div style={{ position: 'relative', aspectRatio: '16 / 10', background: '#EEF2F8', borderBottom: `1px solid ${BORDER}` }}>
        {item.screenshot_path ? (
          <Image
            src={publicImageUrl(item.screenshot_path)}
            alt={locale === 'de' ? `Startseite von ${name}` : `Homepage of ${name}`}
            fill
            sizes="(max-width: 640px) 100vw, 540px"
            style={{ objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 13, color: MUTED }}>Screenshot</span>
        )}
      </div>
      <div style={{ padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {quote && (
          <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.55, fontWeight: 500, color: INK, textWrap: 'pretty' }}>
            {open}
            {quote}
            {close}
          </blockquote>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: quote ? 18 : 0 }}>
          <span
            style={{
              position: 'relative',
              flex: 'none',
              width: 44,
              height: 44,
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#E8F0FF',
              color: BLUE,
              display: 'grid',
              placeItems: 'center',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {item.photo_path ? (
              <Image src={publicImageUrl(item.photo_path)} alt={item.owner_name} fill sizes="44px" style={{ objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: INK }}>{item.owner_name}</span>
            {role && <span style={{ display: 'block', fontSize: 13, lineHeight: 1.4, color: BODY }}>{role}</span>}
          </span>
        </div>
        {about && <p style={{ margin: '14px 0 0', fontSize: 13.5, lineHeight: 1.5, color: BODY }}>{about}</p>}
        {domain && (
          <span
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              alignSelf: 'flex-end',
              fontSize: 13.5,
              fontWeight: 700,
              color: BLUE,
            }}
          >
            {domain} ↗
          </span>
        )}
      </div>
    </>
  );

  const frame = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#ffffff',
    border: `1px solid ${BORDER}`,
    borderRadius: 18,
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform .15s, box-shadow .15s, border-color .15s',
  } as const;

  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="hov-card" style={frame} data-testid="showcase-card">
      {body}
    </a>
  ) : (
    <div style={frame} data-testid="showcase-card">
      {body}
    </div>
  );
}
