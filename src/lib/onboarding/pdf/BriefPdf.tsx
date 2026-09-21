import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Locale } from '@/lib/types';
import { sanitizeForPdf } from '../guardrails';
import type { BriefSectionContent, FormFlag, OnbBriefSection, OnboardingFormRecord } from '../types';
import { loc } from '../types';
import { MarkdownBlocks } from './markdown';

/**
 * The confirmed brief as an A4 document, in the client's language. Built-in Helvetica
 * covers German typography (ä ö ü ß € „“ – —); emoji are stripped by sanitizeForPdf.
 */

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 60, paddingHorizontal: 52, fontFamily: 'Helvetica', fontSize: 10.5, color: '#2A3A52' },
  brand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: '#E4E9F2' },
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#0F2440' },
  brandDot: { color: '#1E5EFF' },
  eyebrow: { fontSize: 8, letterSpacing: 1.2, color: '#7A879B', textTransform: 'uppercase' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: '#0F2440', marginBottom: 6, letterSpacing: -0.4 },
  subtitle: { fontSize: 11, color: '#4A5872', marginBottom: 4 },
  meta: { fontSize: 9, color: '#7A879B', marginBottom: 22 },
  section: { marginBottom: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  sectionNum: { width: 18, height: 18, borderRadius: 5, backgroundColor: '#EDF3FF', color: '#1E5EFF', fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center', paddingTop: 4, marginRight: 8 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#0F2440' },
  stillNeeded: { marginTop: 6, backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#F1D18A', borderRadius: 6, padding: 8 },
  stillNeededTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#7A4B0F', marginBottom: 3 },
  stillNeededItem: { fontSize: 9.5, color: '#7A4B0F', lineHeight: 1.4 },
  systemSection: { backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#F1D18A', borderRadius: 8, padding: 12 },
  confirm: { marginTop: 10, borderTopWidth: 1.5, borderTopColor: '#E4E9F2', paddingTop: 14 },
  confirmTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#0F2440', marginBottom: 4 },
  confirmText: { fontSize: 10, color: '#4A5872', lineHeight: 1.5 },
  flags: { marginTop: 14, padding: 10, backgroundColor: '#F5F7FB', borderRadius: 6 },
  flagsTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#7A879B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  flagItem: { fontSize: 9.5, color: '#4A5872', lineHeight: 1.4 },
  footer: { position: 'absolute', left: 52, right: 52, bottom: 28, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E4E9F2', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#7A879B', width: '82%', paddingRight: 12, lineHeight: 1.35 },
  pageNumber: { fontSize: 8, color: '#7A879B', width: '18%', textAlign: 'right' },
});

const LABELS: Record<Locale, Record<string, string>> = {
  de: {
    eyebrow: 'Web Studio · Website-Briefing',
    title: 'Briefing',
    formId: 'Briefing-Nr.',
    date: 'Stand',
    stillNeeded: 'Was wir noch brauchen',
    confirmed: 'Bestätigt',
    confirmedBy: 'Bestätigt von {name} am {date} · Bedingungen {terms}',
    notConfirmed: 'Noch nicht bestätigt',
    flags: 'Hinweise für das Team (intern)',
    page: 'Seite',
  },
  en: {
    eyebrow: 'Web Studio · Website brief',
    title: 'Brief',
    formId: 'Brief no.',
    date: 'As of',
    stillNeeded: 'What we still need',
    confirmed: 'Confirmed',
    confirmedBy: 'Confirmed by {name} on {date} · terms {terms}',
    notConfirmed: 'Not yet confirmed',
    flags: 'Notes for the team (internal)',
    page: 'Page',
  },
};

function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

export interface BriefPdfProps {
  record: OnboardingFormRecord;
  sections: OnbBriefSection[];
  content: Record<string, BriefSectionContent>;
  footerText: string;
  /** Team copy only: flags rendered on the last page. Omitted for the client's copy. */
  flags?: FormFlag[];
}

export function BriefPdf({ record, sections, content, footerText, flags }: BriefPdfProps) {
  const locale = record.locale;
  const L = LABELS[locale];
  const company = sanitizeForPdf(record.company ?? '');
  const now = record.confirmed?.at ?? record.updated_at;

  return (
    <Document title={`${L.title} ${company}`.trim()} author="IntelliPaaS Web Studio" language={locale}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brand} fixed>
          <Text style={styles.brandName}>
            IntelliPaaS<Text style={styles.brandDot}>.io</Text>
          </Text>
          <Text style={styles.eyebrow}>{L.eyebrow}</Text>
        </View>

        <Text style={styles.title}>{company || L.title}</Text>
        {record.name && <Text style={styles.subtitle}>{sanitizeForPdf(record.name)}{record.email ? ` · ${record.email}` : ''}</Text>}
        <Text style={styles.meta}>
          {L.formId} {record.id} · {L.date} {formatDate(now, locale)}
        </Text>

        {sections.map((section, i) => {
          const body = content[section.id];
          if (!body) return null;
          const isSystem = section.generated_by === 'system';
          return (
            <View key={section.id} style={[styles.section, isSystem ? styles.systemSection : {}]} wrap={!isSystem}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionNum}>{i + 1}</Text>
                <Text style={styles.sectionTitle}>{sanitizeForPdf(loc(section as unknown as Record<string, unknown>, 'title', locale))}</Text>
              </View>
              <MarkdownBlocks markdown={body.content_markdown} keyPrefix={section.id} />
              {!isSystem && body.still_needed.length > 0 && (
                <View style={styles.stillNeeded}>
                  <Text style={styles.stillNeededTitle}>{L.stillNeeded}</Text>
                  {body.still_needed.map((item, j) => (
                    <Text key={j} style={styles.stillNeededItem}>
                      – {sanitizeForPdf(item)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.confirm} wrap={false}>
          <Text style={styles.confirmTitle}>{record.confirmed ? L.confirmed : L.notConfirmed}</Text>
          {record.confirmed && (
            <Text style={styles.confirmText}>
              {L.confirmedBy
                .replace('{name}', sanitizeForPdf(record.confirmed.name))
                .replace('{date}', formatDate(record.confirmed.at, locale))
                .replace('{terms}', record.confirmed.terms_version)}
            </Text>
          )}
        </View>

        {flags && flags.length > 0 && (
          <View style={styles.flags} wrap={false}>
            <Text style={styles.flagsTitle}>{L.flags}</Text>
            {flags.map((f, i) => (
              <Text key={i} style={styles.flagItem}>
                • {f.code}
                {f.detail ? ` · ${f.detail}` : ''} ({f.severity}, {f.source})
                {f.data ? ` ${JSON.stringify(f.data)}` : ''}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{sanitizeForPdf(footerText)}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${L.page} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
