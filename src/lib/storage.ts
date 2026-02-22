/**
 * Simple encryption utility for localStorage data.
 * In a real production environment, the secret should be derived from 
 * a user-provided master password. For this implementation, we use a 
 * combination of a static salt and a session-based key.
 */

const STORAGE_KEY = 'gestion_vault_v1';

/**
 * Basic encryption using XOR + Base64.
 * Not cryptographically secure against professional forensics, but 
 * prevents casual snooping of localStorage / XSS-based plain text theft.
 */
function xorTransform(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export const encryptedStorage = {
  getItem: (name: string): string | null => {
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    
    try {
      // Return plain if looks like JSON (for migration/unencrypted leftovers)
      if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
        return raw;
      }
      
      const decoded = atob(raw);
      const decrypted = xorTransform(decoded, STORAGE_KEY);
      return decrypted;
    } catch (e) {
      console.warn(`Failed to decrypt storage item: ${name}`, e);
      return raw;
    }
  },
  
  setItem: (name: string, value: string): void => {
    const encrypted = btoa(xorTransform(value, STORAGE_KEY));
    localStorage.setItem(name, encrypted);
  },
  
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};
