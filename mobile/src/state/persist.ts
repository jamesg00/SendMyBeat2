import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// Small JSON files in the app's documents folder, so in-progress work survives closing the app.
// On web nothing is saved.
const dir = Platform.OS !== 'web' ? new Directory(Paths.document, 'state') : null;

export function readJSON<T>(name: string): T | null {
  try {
    const f = dir && new File(dir, `${name}.json`);
    return f?.exists ? (JSON.parse(f.textSync()) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(name: string, data: unknown) {
  try {
    if (!dir) return;
    if (!dir.exists) dir.create({ intermediates: true });
    new File(dir, `${name}.json`).write(JSON.stringify(data));
  } catch {
    // saving is best effort
  }
}

export function removeJSON(name: string) {
  try {
    const f = dir && new File(dir, `${name}.json`);
    if (f?.exists) f.delete();
  } catch {
    // already gone
  }
}

// Saved work (this folder and Upload Studio's draft folder) belongs to one account.
const WORK_DIRS = ['state', 'studio'];

/** Forget all saved work on this device (on sign-out). */
export function clearSavedWork() {
  if (!dir) return;
  for (const name of WORK_DIRS) {
    try {
      const d = new Directory(Paths.document, name);
      if (d.exists) d.delete();
    } catch {
      // already gone
    }
  }
}

/** Keep saved work only if it was made by this account; a different account starts clean. */
export function claimSavedWork(userId: string) {
  if (readJSON<{ id: string }>('owner')?.id === userId) return;
  clearSavedWork();
  writeJSON('owner', { id: userId });
}
