/**
 * heic-convert ships no type declarations, and `await import(...)` is
 * type-checked where the previous bare `require(...)` was not. Minimal
 * declaration so the dynamic import in lib/media/process-image.ts compiles.
 */
declare module 'heic-convert' {
  type HeicConvertOptions = {
    buffer: Buffer;
    format: 'JPEG' | 'PNG';
    quality?: number;
  };
  const convert: (options: HeicConvertOptions) => Promise<ArrayBuffer>;
  export default convert;
}
