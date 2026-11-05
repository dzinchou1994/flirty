import type { MetadataRoute } from 'next';
import { getAppName } from '@/lib/site';

/**
 * Icons are deliberately empty until the app has a name and a mark. Add
 * app/icon.png (512x512) and app/apple-icon.png, then list them here —
 * without icons a browser will not offer "add to home screen".
 */
export default function manifest(): MetadataRoute.Manifest {
  const name = getAppName();
  return {
    name,
    short_name: name,
    description: 'Dating in Georgia',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08080c',
    theme_color: '#08080c',
    icons: [],
  };
}
