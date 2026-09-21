import { StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { sanitizeForPdf } from '../guardrails';

/**
 * The brief writer is constrained to a markdown subset — paragraphs, "- " bullets and
 * **bold** — and this maps exactly that onto react-pdf primitives. Anything else renders
 * as plain text rather than breaking the PDF.
 */

const styles = StyleSheet.create({
  paragraph: { fontSize: 10.5, lineHeight: 1.5, marginBottom: 6, color: '#2A3A52' },
  bullet: { flexDirection: 'row', marginBottom: 3, paddingLeft: 4 },
  bulletDot: { width: 12, fontSize: 10.5, lineHeight: 1.5, color: '#1E5EFF' },
  bulletText: { flex: 1, fontSize: 10.5, lineHeight: 1.5, color: '#2A3A52' },
  bold: { fontFamily: 'Helvetica-Bold', color: '#0F2440' },
  list: { marginBottom: 6 },
});

const BULLET_RE = /^(\s*)[-*•]\s+(.*)$/;

/** `**bold**` runs become Helvetica-Bold spans. */
export function inline(text: string, key: string): ReactElement[] {
  const parts = sanitizeForPdf(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={`${key}-${i}`} style={styles.bold}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      <Text key={`${key}-${i}`}>{part.replace(/\*/g, '')}</Text>
    ),
  );
}

type Run = { kind: 'para'; lines: string[] } | { kind: 'list'; items: { text: string; nested: boolean }[] };

/** Consecutive bullet lines form a list; everything else a paragraph — mixed blocks split into both. */
function runsOf(block: string): Run[] {
  const runs: Run[] = [];
  for (const raw of block.split('\n')) {
    if (!raw.trim()) continue;
    const bullet = BULLET_RE.exec(raw);
    if (bullet) {
      const item = { text: bullet[2], nested: bullet[1].length >= 2 };
      const last = runs[runs.length - 1];
      if (last?.kind === 'list') last.items.push(item);
      else runs.push({ kind: 'list', items: [item] });
    } else {
      const last = runs[runs.length - 1];
      if (last?.kind === 'para') last.lines.push(raw.trim());
      else runs.push({ kind: 'para', lines: [raw.trim()] });
    }
  }
  return runs;
}

export function MarkdownBlocks({ markdown, keyPrefix = 'md' }: { markdown: string; keyPrefix?: string }) {
  const blocks = markdown
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const out: ReactElement[] = [];
  blocks.forEach((block, bi) => {
    runsOf(block).forEach((run, ri) => {
      const key = `${keyPrefix}-${bi}-${ri}`;
      if (run.kind === 'list') {
        out.push(
          <View key={key} style={styles.list}>
            {run.items.map((item, li) => (
              <View key={`${key}-${li}`} style={[styles.bullet, item.nested ? { paddingLeft: 16 } : {}]}>
                <Text style={styles.bulletDot}>{item.nested ? '–' : '•'}</Text>
                <Text style={styles.bulletText}>{inline(item.text, `${key}-${li}`)}</Text>
              </View>
            ))}
          </View>,
        );
        return;
      }
      // Headings the model was told not to use: strip the hashes and render bold.
      const text = run.lines.join('\n');
      const heading = /^#{1,6}\s+/.test(text);
      out.push(
        <Text key={key} style={[styles.paragraph, heading ? styles.bold : {}]}>
          {inline(text.replace(/^#{1,6}\s+/, ''), key)}
        </Text>,
      );
    });
  });
  return <>{out}</>;
}
