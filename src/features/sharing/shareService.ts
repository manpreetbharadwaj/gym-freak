import { RefObject } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { ShareCardFormat, shareFormats } from './types';

export async function renderShareCard(ref: RefObject<View | null>, format: ShareCardFormat) {
  if (!ref.current) throw new Error('The share card is not ready yet.');
  const size = shareFormats[format];
  return captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: size.width, height: size.height });
}

/** Opens the OS-owned share surface. Returning means the sheet opened, not that an external post was published. */
export async function shareCardFile(uri: string, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
}

export async function shareText(message: string, url?: string) {
  return Share.share(Platform.OS === 'ios' && url ? { message, url } : { message: url ? `${message}\n${url}` : message });
}

export async function copyShareLink(url: string) {
  await Clipboard.setStringAsync(url);
}

export async function saveShareImage(uri: string) {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) throw new Error('Allow photo access to save the share image.');
  return MediaLibrary.createAssetAsync(uri);
}
