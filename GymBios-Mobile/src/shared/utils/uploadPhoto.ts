import { Platform } from 'react-native';

import { apiClient } from '@/core/network/apiClient';
import { env } from '@/core/platform/config';

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * Uploads a locally-picked photo (a device file:// URI on native, or a
 * blob:/data: URI on web, from expo-image-picker) to the backend and returns
 * the relative URL it was stored at (e.g. "/uploads/photos/xxx.jpg"). Resolve
 * that with resolveImageUrl() before using it as an Image source.
 *
 * Uses a platform-specific FormData body — RN's FormData accepts the
 * {uri, name, type} object shape for a file part, but a real browser (Expo
 * web) needs an actual Blob, so on web we first materialize one via
 * fetch(uri).then(r => r.blob()). Content-Type is deliberately left unset:
 * the platform computes the multipart boundary itself.
 *
 * On native the request goes through XMLHttpRequest, not fetch: since SDK 52+
 * Expo replaces the global fetch with expo/fetch, whose FormData encoder
 * throws "Unsupported FormDataPart implementation" on {uri, name, type} parts.
 * RN's XHR still streams those local files natively.
 */
export async function uploadPhoto(localUri: string): Promise<string> {
  console.log('[uploadPhoto] called with', localUri, 'platform', Platform.OS);

  const filename = localUri.split('/').pop()?.split('?')[0] || `photo-${Date.now()}.jpg`;
  const extension = (/\.(\w+)$/.exec(filename)?.[1] || 'jpg').toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension] || 'image/jpeg';

  const formData = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(localUri).then((r) => r.blob());
    console.log('[uploadPhoto] web blob type=', blob.type, 'size=', blob.size);
    formData.append('file', blob, `photo.${extension}`);
  } else {
    formData.append('file', {
      uri: localUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);
  }

  const commonHeaders = apiClient.defaults.headers.common as Record<string, string>;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (commonHeaders.Authorization) headers.Authorization = commonHeaders.Authorization;
  if (commonHeaders['X-Tenant-ID']) headers['X-Tenant-ID'] = commonHeaders['X-Tenant-ID'];
  if (commonHeaders['X-Active-Branch-Id']) headers['X-Active-Branch-Id'] = commonHeaders['X-Active-Branch-Id'];

  const targetUrl = `${env.apiBaseUrl}/mobile/uploads/photos`;
  console.log('[uploadPhoto] POSTing to', targetUrl);

  const { status, body } =
    Platform.OS === 'web'
      ? await fetch(targetUrl, { method: 'POST', headers, body: formData }).then(
          async (r) => ({ status: r.status, body: await r.text() }),
        )
      : await postWithXhr(targetUrl, headers, formData);

  console.log('[uploadPhoto] response status', status);

  if (status < 200 || status >= 300) {
    console.error('[uploadPhoto] upload failed', status, body);
    throw new Error(`Photo upload failed (${status})`);
  }

  const data = JSON.parse(body) as { url: string };
  console.log('[uploadPhoto] success, url=', data.url);
  return data.url;
}

function postWithXhr(
  url: string,
  headers: Record<string, string>,
  body: FormData,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error('Photo upload failed (network error)'));
    xhr.ontimeout = () => reject(new Error('Photo upload timed out'));
    xhr.timeout = 60000;
    xhr.send(body);
  });
}
