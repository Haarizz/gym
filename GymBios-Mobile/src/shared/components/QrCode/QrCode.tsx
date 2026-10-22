import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
// @ts-ignore - qr.js ships no type declarations
import QRCodeGenerator from 'qr.js/lib/QRCode';
// @ts-ignore - qr.js ships no type declarations
import ErrorCorrectLevel from 'qr.js/lib/ErrorCorrectLevel';

interface QrCodeProps {
  value: string;
  size: number;
}

/** Scannable QR rendered with react-native-svg (same qr.js encoder as the receipt PDFs). */
export function QrCode({ value, size }: QrCodeProps) {
  const { path, cellCount } = useMemo(() => {
    const qr = new QRCodeGenerator(-1, ErrorCorrectLevel.M);
    qr.addData(value);
    qr.make();
    const cells: boolean[][] = qr.modules;
    return {
      cellCount: cells.length,
      path: cells
        .map((row, r) => row.map((isDark, c) => (isDark ? `M${c} ${r}h1v1h-1Z` : '')).join(''))
        .join(''),
    };
  }, [value]);

  // A 2-cell quiet zone keeps phone cameras locking on against any background.
  const view = cellCount + 4;
  return (
    <Svg width={size} height={size} viewBox={`-2 -2 ${view} ${view}`}>
      <Rect x={-2} y={-2} width={view} height={view} fill="#ffffff" />
      <Path d={path} fill="#000000" />
    </Svg>
  );
}
