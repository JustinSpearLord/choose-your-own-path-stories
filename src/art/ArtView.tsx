import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { isImagePath } from '../format/art';
import { type ImageSource, useImageUrl } from './images';
import { portraitRects, PORTRAIT_SIZE } from './portrait';
import { type Rect, SCENE_H, SCENE_W, sceneLabel, sceneRects } from './scenes';

const OVERRIDES: ReadonlySet<string> = new Set(typeof __ART_OVERRIDES__ === 'undefined' ? [] : __ART_OVERRIDES__);

function Rects({ rects }: { rects: Rect[] }) {
  return (
    <>
      {rects.map(([x, y, w, h, fill, opacity], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} opacity={opacity} />
      ))}
    </>
  );
}

/** A built-in scene drawn as crisp SVG rectangles, cropped to fill its box. */
export const BuiltinScene = memo(function BuiltinScene({ name }: { name: string }) {
  return (
    <svg
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <Rects rects={sceneRects(name)} />
    </svg>
  );
});

/**
 * A bundled image that fills its box, cropped to fit. In pixel style it is scaled by a whole number
 * of device pixels with no smoothing, so small art stays crisp.
 */
function CoverImage({ src, pixel }: { src: string; pixel: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !pixel) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pixel]);

  let style: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
  if (pixel) {
    style = { ...style, imageRendering: 'pixelated' };
    if (natural && size && size.w > 0 && size.h > 0) {
      const dpr = window.devicePixelRatio || 1;
      const k = Math.max(1, Math.ceil(Math.max((size.w * dpr) / natural.w, (size.h * dpr) / natural.h) - 0.001));
      const w = (natural.w * k) / dpr;
      const h = (natural.h * k) / dpr;
      style = {
        position: 'absolute',
        left: (size.w - w) / 2,
        top: (size.h - h) / 2,
        width: w,
        height: h,
        maxWidth: 'none',
        imageRendering: 'pixelated',
        display: 'block',
      };
    }
  }
  return (
    <div ref={box} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <img
        src={src}
        alt=""
        draggable={false}
        style={style}
        onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      />
    </div>
  );
}

export interface ArtViewProps {
  /** Built-in art name or bundled image path. */
  art: string | undefined;
  source?: ImageSource;
  /** False for `imageStyle: "smooth"`. */
  pixel?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Read out by screen readers. Leave out when the art is decoration. */
  label?: string;
}

/** Scene art or a cover: a bundled image when the path resolves, else a built-in scene. */
export function ArtView({ art, source, pixel = true, className, style, label }: ArtViewProps) {
  const path = isImagePath(art) ? art : null;
  const url = useImageUrl(source, path);
  const name = path ? 'default' : (art ?? 'default');
  let inner;
  if (path && url === undefined) inner = null; // still loading: keep the box, draw nothing yet
  else if (path && url) inner = <CoverImage src={url} pixel={pixel} />;
  else if (OVERRIDES.has(name)) inner = <CoverImage src={`${import.meta.env.BASE_URL}art/${name}.png`} pixel />;
  else inner = <BuiltinScene name={name} />;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <div className={className} style={{ overflow: 'hidden', background: '#1F1B33', ...style }} data-art={art ?? 'default'} {...a11y}>
      {inner}
    </div>
  );
}

export function artLabel(art: string | undefined): string {
  return isImagePath(art) ? 'Scene art' : `Pixel art scene: ${sceneLabel(art ?? 'default')}`;
}

export interface PortraitProps {
  id: string;
  name: string;
  color: string;
  portrait?: string;
  source?: ImageSource;
  pixel?: boolean;
  size?: number;
}

/** A character's face: their bundled portrait, or a generated pixel face in their color. */
export function Portrait({ id, name, color, portrait, source, pixel = true, size = 32 }: PortraitProps) {
  const path = isImagePath(portrait) ? portrait : null;
  const url = useImageUrl(source, path);
  const box: CSSProperties = { width: size, height: size, flex: 'none', display: 'block', background: '#2A2342' };
  if (path && url) {
    return (
      <img
        src={url}
        alt={`Portrait of ${name}`}
        style={{ ...box, objectFit: 'cover', imageRendering: pixel ? 'pixelated' : 'auto' }}
        data-portrait="bundled"
      />
    );
  }
  return (
    <svg
      viewBox={`0 0 ${PORTRAIT_SIZE} ${PORTRAIT_SIZE}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Portrait of ${name}`}
      style={box}
      data-portrait="generated"
    >
      <Rects rects={portraitRects(id, color)} />
    </svg>
  );
}
