/**
 * Document scanning & PDF upload service.
 * Uses expo-image-picker for camera/photo, expo-document-picker for PDFs,
 * and Gemini vision to extract document fields.
 */

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { extractDocumentFields } from '../lib/gemini';
import type { DocumentType } from './storageCache';

interface ScanResult {
  fields: Record<string, string>;
}

/** Launch camera, capture a photo, extract fields via Gemini. */
export async function scanDocument(documentType: DocumentType): Promise<ScanResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets[0].base64) return null;

  const fields = await extractDocumentFields(
    result.assets[0].base64,
    result.assets[0].mimeType || 'image/jpeg',
    documentType,
  );
  return { fields };
}

/** Pick a photo from library, extract fields via Gemini. */
export async function pickDocumentImage(documentType: DocumentType): Promise<ScanResult | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets[0].base64) return null;

  const fields = await extractDocumentFields(
    result.assets[0].base64,
    result.assets[0].mimeType || 'image/jpeg',
    documentType,
  );
  return { fields };
}

/** Pick a PDF file, read as base64, extract fields via Gemini. */
export async function pickDocumentPDF(documentType: DocumentType): Promise<ScanResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];

  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fields = await extractDocumentFields(base64, 'application/pdf', documentType);
  return { fields };
}
