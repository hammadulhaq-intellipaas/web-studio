import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Locale } from '@/lib/types';
import { sanitizeForPdf } from '../guardrails';
import type { OnboardingFormRecord } from '../types';
import { MarkdownBlocks } from './markdown';

/**
 * The client's own answers as an A4 document: what we understood, then every question and
 * answer by section. Available from the final review onwards, before and after they
 * confirm, so they can read it at leisure or share it internally. Nothing in it is written
 * by a model.
 */

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 60, paddingHorizontal: 52, fontFamily: 'Helvetica', fontSize: 10.5, color: '#2A3A52' },
  brand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: '#E4E9F2' },
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#0F2440' },
  brandDot: { color: '#1E5EFF' },
  eyebrow: { fontSize: 8, letterSpacing: 1.2, color: '#7A879B', textTransform: 'uppercase' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: '#0F2440', marginBottom: 6, letterSpacing: -0.4 },
  subtitle: { fontSize: 11, color: '#4A5872', marginBottom: 4 },
  meta: { fontSize: 9, color: '#7A879B', marginBottom: 14 },
  status: { fontSize: 9.5, color: '#1E4FD6', backgroundColor: '#EDF3FF', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 9, marginBottom: 20 },
  statusDraft: { color: '#7A4B0F', backgroundColor: '#FFF7E6' },
  blockTitle: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#0F2440', marginBottom: 8 },
  understood: { marginBottom: 22, padding: 12, borderWidth: 1, borderColor: '#E4E9F2', borderRadius: 8 },
  section: { marginBottom: 16 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#7A879B', marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#E4E9F2' },
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { width: '40%', paddingRight: 10, fontSize: 9.5, color: '#7A879B', lineHeight: 1.4 },
  value: { width: '60%', fontSize: 10, color: '#0F2440', lineHeight: 1.4 },
  empty: { color: '#A3AEC0' },
  footer: { position: 'absolute', left: 52, right: 52, bottom: 28, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E4E9F2', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#7A879B', width: '82%', paddingRight: 12, lineHeight: 1.35 },
  pageNumber: { fontSize: 8, color: '#7A879B', width: '18%', textAlign: 'right' },
});

const LABELS: Record<Locale, Record<string, string>> = {
  de: {
    eyebrow: 'Web Studio · Ihre Angaben',
    title: 'Ihre Angaben',
    formId: 'Briefing-Nr.',
    date: 'Stand',
    draft: 'Entwurf zur Durchsicht, noch nicht bestätigt.',
    confirmedBy: 'Bestätigt von {name} am {date}.',
    understood: 'Das haben wir verstanden',
    answers: 'Ihre Antworten',
    notProvided: 'Keine Angabe',
    page: 'Seite',
  },
  en: {
    eyebrow: 'Web Studio · Your answers',
    title: 'Your answers',
    formId: 'Brief no.',
    date: 'As of',
    draft: 'Draft for your review, not yet confirmed.',
    confirmedBy: 'Confirmed by {name} on {date}.',
    understood: 'What we have understood',
    answers: 'Your answers',
    notProvided: 'Not provided',
    page: 'Page',
  },
};

function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

export interface AnswersPdfSection {
  title: string;
  rows: { label: string; value: string }[];
}

export interface AnswersPdfProps {
  record: OnboardingFormRecord;
  understood: string;
  sections: AnswersPdfSection[];
  footerText: string;
}

export function AnswersPdf({ record, understood, sections, footerText }: AnswersPdfProps) {
  const locale = record.locale;
  const L = LABELS[locale];
  const company = sanitizeForPdf(record.company ?? '');
  const now = record.confirmed?.at ?? new Date().toISOString();

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
        {record.name && (
          <Text style={styles.subtitle}>
            {sanitizeForPdf(record.name)}
            {record.email ? ` · ${record.email}` : ''}
          </Text>
        )}
        <Text style={styles.meta}>
          {L.formId} {record.id} · {L.date} {formatDate(now, locale)}
        </Text>
        <Text style={record.confirmed ? styles.status : [styles.status, styles.statusDraft]}>
          {record.confirmed
            ? L.confirmedBy.replace('{name}', sanitizeForPdf(record.confirmed.name)).replace('{date}', formatDate(record.confirmed.at, locale))
            : L.draft}
        </Text>

        {understood.trim() && (
          <View style={styles.understood}>
            <Text style={styles.blockTitle}>{L.understood}</Text>
            <MarkdownBlocks markdown={understood} keyPrefix="understood" />
          </View>
        )}

        <Text style={styles.blockTitle}>{L.answers}</Text>
        {sections.map((section, i) =>
          section.rows.length === 0 ? null : (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionTitle}>{sanitizeForPdf(section.title)}</Text>
              {section.rows.map((row, j) => (
                <View key={j} style={styles.row} wrap={false}>
                  <Text style={styles.label}>{sanitizeForPdf(row.label)}</Text>
                  <Text style={row.value ? styles.value : [styles.value, styles.empty]}>{row.value ? sanitizeForPdf(row.value) : L.notProvided}</Text>
                </View>
              ))}
            </View>
          ),
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{sanitizeForPdf(footerText)}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${L.page} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
