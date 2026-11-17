import { gridCover } from '@/lib/media/grid-cover';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Small public cover for a grid card. The stored photo is often a data URI. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const bytes = await gridCover(id);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
}
