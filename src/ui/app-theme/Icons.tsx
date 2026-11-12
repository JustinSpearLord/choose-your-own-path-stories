import type { ReactNode } from 'react';

function Svg({ size = 20, sw = 2, children, fill }: { size?: number; sw?: number; children: ReactNode; fill?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const BackIcon = ({ size }: P) => (
  <Svg size={size}>
    <polyline points="15 18 9 12 15 6" />
  </Svg>
);
export const ChevronIcon = ({ size = 16 }: P) => (
  <Svg size={size}>
    <polyline points="9 18 15 12 9 6" />
  </Svg>
);
export const GearIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </Svg>
);
export const PlayIcon = ({ size = 18 }: P) => (
  <Svg size={size} fill>
    <path d="M7 4l12 8-12 8z" />
  </Svg>
);
export const DownloadIcon = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Svg>
);
export const UploadIcon = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Svg>
);
export const PenIcon = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);
export const FileIcon = ({ size = 28 }: P) => (
  <Svg size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </Svg>
);
export const PathIcon = ({ size = 18 }: P) => (
  <Svg size={size}>
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M6 8v4a4 4 0 0 0 4 4h6" />
  </Svg>
);
export const RewindIcon = ({ size = 14 }: P) => (
  <Svg size={size} sw={2.5}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" />
  </Svg>
);
export const SparkIcon = ({ size = 22 }: P) => (
  <Svg size={size}>
    <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />
  </Svg>
);
export const ImageIcon = ({ size = 22 }: P) => (
  <Svg size={size}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </Svg>
);
export const SaveIcon = ({ size = 16 }: P) => (
  <Svg size={size}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
  </Svg>
);
export const ArrowIcon = ({ size = 20 }: P) => (
  <Svg size={size} sw={2.5}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Svg>
);
export const LinkIcon = ({ size = 22 }: P) => (
  <Svg size={size}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.700 1.700" />
    <path d="M14 11a5 5 0 0 0-7.500-.500l-3 3a5 5 0 0 0 7 7l1.700-1.700" />
  </Svg>
);
