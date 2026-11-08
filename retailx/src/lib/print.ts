// Native print / PDF helpers (expo-print + expo-sharing). Page building + company credit live in pageHtml.ts.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export { pageHtml, creditHtml, escapeHtml } from './pageHtml';

export const printHtml = (html: string) => Print.printAsync({ html });

/** Renders to a PDF file and opens the share sheet. */
export async function sharePdf(html: string, title: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error('shareFailed');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
}
