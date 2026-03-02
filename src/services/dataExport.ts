import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import {
  loadTripsIndex,
  loadTripLocally,
  loadDocuments,
  loadInvitationsLocally,
  DOCUMENT_TYPE_CONFIG,
} from './storageCache';

function redactSecureFields(
  documents: Awaited<ReturnType<typeof loadDocuments>>
): typeof documents {
  return documents.map((doc) => {
    const config = DOCUMENT_TYPE_CONFIG[doc.type];
    if (!config) return doc;

    const redactedFields: Record<string, string> = {};
    const secureKeys = new Set(
      config.fields.filter((f) => f.secure).map((f) => f.key)
    );

    for (const [key, value] of Object.entries(doc.fields)) {
      if (secureKeys.has(key) && typeof value === 'string') {
        redactedFields[key] =
          value.length <= 4 ? value : '****' + value.slice(-4);
      } else {
        redactedFields[key] = value;
      }
    }

    return { ...doc, fields: redactedFields };
  });
}

export async function exportUserData(): Promise<void> {
  try {
    // 1. Load all user data
    const tripsIndex = await loadTripsIndex();
    const tripBlobs = await Promise.all(
      tripsIndex.map((entry) => loadTripLocally(entry.id))
    );
    const documents = await loadDocuments();
    const invitations = await loadInvitationsLocally();

    // 2. Redact secure document fields
    const redactedDocuments = redactSecureFields(documents);

    // 3. Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      trips: tripBlobs.filter(Boolean),
      documents: redactedDocuments,
      invitations,
    };

    // 4. Write to cache
    const filePath = `${cacheDirectory}traimate-export.json`;
    await writeAsStringAsync(
      filePath,
      JSON.stringify(exportData, null, 2)
    );

    // 5. Share
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Sharing not available',
        'Sharing is not available on this device. The export file has been saved to the app cache.'
      );
      return;
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Export My Data',
    });
  } catch (error) {
    console.error('Data export failed:', error);
    Alert.alert(
      'Export Failed',
      'An error occurred while exporting your data. Please try again.'
    );
  }
}
