import type { SVGProps, ReactElement } from "react";
import type { IconKey } from "@/lib/data";

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

const paths: Record<IconKey, (p: P) => ReactElement> = {
  search: (p) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>),
  calendar: (p) => (<svg {...base(p)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>),
  video: (p) => (<svg {...base(p)}><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3" /></svg>),
  folder: (p) => (<svg {...base(p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>),
  file: (p) => (<svg {...base(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>),
  gavel: (p) => (<svg {...base(p)}><path d="m14.5 12.5-8 8a2.1 2.1 0 0 1-3-3l8-8" /><path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8M3 21h6" /></svg>),
  mail: (p) => (<svg {...base(p)}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>),
  stamp: (p) => (<svg {...base(p)}><path d="M5 22h14M9 13a3 3 0 0 1 6 0c0 1 .5 2 2 2a2 2 0 0 1 2 2v1H5v-1a2 2 0 0 1 2-2c1.5 0 2-1 2-2" /><path d="M12 13V5a2 2 0 0 0-4 0v2" /></svg>),
  family: (p) => (<svg {...base(p)}><circle cx="9" cy="7" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M15 21v-1a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v1" /></svg>),
  home: (p) => (<svg {...base(p)}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>),
  shield: (p) => (<svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>),
  building: (p) => (<svg {...base(p)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></svg>),
  truck: (p) => (<svg {...base(p)}><path d="M14 18V6a1 1 0 0 0-1-1H2v13M14 9h4l3 3v6M3 18a2 2 0 1 0 4 0M15 18a2 2 0 1 0 4 0M7 18h6" /></svg>),
  calculator: (p) => (<svg {...base(p)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></svg>),
  book: (p) => (<svg {...base(p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></svg>),
  balance: (p) => (<svg {...base(p)}><path d="M12 3v18M7 21h10M5 7h14M12 3 5 7M12 3l7 7M5 7 2 13a3 3 0 0 0 6 0L5 7M19 7l-3 6a3 3 0 0 0 6 0l-3-6" /></svg>),
  lock: (p) => (<svg {...base(p)}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>),
  chat: (p) => (<svg {...base(p)}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></svg>),
  phone: (p) => (<svg {...base(p)}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2z" /></svg>),
  user: (p) => (<svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>),
  sparkles: (p) => (<svg {...base(p)}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.7 1.8L21.5 17l-1.8.7L19 19l-.7-1.3L16.5 17l1.8-.2zM5 4l.5 1.3L7 5.8l-1.5.5L5 7.6l-.5-1.3L3 5.8l1.5-.5z" /></svg>),
  check: (p) => (<svg {...base(p)}><path d="m20 6-11 11-5-5" /></svg>),
  clock: (p) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>),
  star: (p) => (<svg {...base({ fill: "currentColor", stroke: "none", ...p })}><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>),
  badge: (p) => (<svg {...base(p)}><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" /><path d="m9 12 2 2 4-4" /></svg>),
  bolt: (p) => (<svg {...base({ fill: "currentColor", stroke: "none", ...p })}><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>),
  document: (p) => (<svg {...base(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></svg>),
  landmark: (p) => (<svg {...base(p)}><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" /></svg>),
  money: (p) => (<svg {...base(p)}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>),
  alert: (p) => (<svg {...base(p)}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>),
  scale: (p) => (<svg {...base(p)}><path d="M12 3v18M5 21h14M12 3 6 5M12 3l6 2M6 5 3 12a3 3 0 0 0 6 0L6 5M18 5l-3 7a3 3 0 0 0 6 0l-3-7" /></svg>),
  briefcase: (p) => (<svg {...base(p)}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M2 13h20" /></svg>),
  id: (p) => (<svg {...base(p)}><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8" cy="10" r="2" /><path d="M5 16a3 3 0 0 1 6 0M14 9h5M14 13h5M14 16h3" /></svg>),
  arrow: (p) => (<svg {...base(p)}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>),
  chevron: (p) => (<svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>),
  plus: (p) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>),
  filter: (p) => (<svg {...base(p)}><path d="M22 3H2l8 9.5V19l4 2v-8.5z" /></svg>),
  x: (p) => (<svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>),
  send: (p) => (<svg {...base(p)}><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>),
  menu: (p) => (<svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>),
  location: (p) => (<svg {...base(p)}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>),
};

export function Icon({ name, ...props }: { name: IconKey } & P) {
  const C = paths[name] ?? paths.sparkles;
  return C(props);
}
