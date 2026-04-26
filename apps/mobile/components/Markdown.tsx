import MarkdownDisplay from 'react-native-markdown-display';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  body: { color: '#f4f4f5', fontSize: 15, lineHeight: 22 },
  heading1: { color: '#f4f4f5', fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  heading2: { color: '#f4f4f5', fontSize: 18, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  heading3: { color: '#f4f4f5', fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  paragraph: { color: '#f4f4f5', marginVertical: 4 },
  list_item: { color: '#f4f4f5', marginVertical: 2 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  strong: { color: '#f4f4f5', fontWeight: '700' },
  em: { color: '#f4f4f5', fontStyle: 'italic' },
  code_inline: {
    color: '#fde68a',
    backgroundColor: '#27272a',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  code_block: {
    backgroundColor: '#0a0a0a',
    color: '#f4f4f5',
    padding: 12,
    borderRadius: 6,
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  hr: { backgroundColor: '#3f3f46', height: 1, marginVertical: 12 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#52525b',
    paddingLeft: 12,
    marginVertical: 6,
  },
});

export function Markdown({ children }: { children: string }) {
  return <MarkdownDisplay style={styles}>{children}</MarkdownDisplay>;
}
