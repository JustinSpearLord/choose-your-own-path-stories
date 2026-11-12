// The 28 built-in pixel scenes, each a list of rectangles on a 64x36 grid, drawn in order.
// Same approach and palette as tools/make_package.py. A PNG at public/art/<name>.png replaces one.
import { BUILTIN_ART, type BuiltinArt, isBuiltinArt } from '../format/art';

/** x, y, width, height, color, optional opacity. */
export type Rect = [number, number, number, number, string, number?];

export const SCENE_W = 64;
export const SCENE_H = 36;

const INK = '#0E0C14';
const GROUND = '#1B1726';
const SHADE = '#2B2440';
const WOOD = '#6B5A45';
const WOOD_D = '#4A3D2F';
const WOOD_L = '#8A6E4E';
const GOLD = '#E8B44C';
const PALE = '#F3E3B0';
const STONE = '#3A3346';
const STONE_L = '#6E6A76';
const WATER = '#22304A';
const WAVE = '#3E5478';
const LEAF = '#2F4A3A';
const LEAF_L = '#3D5E48';
const WHITE = '#EDE8F5';

const STAR_AT: [number, number][] = [
  [9, 3],
  [22, 6],
  [44, 2],
  [58, 5],
  [30, 4],
  [15, 9],
  [37, 8],
  [3, 7],
];
const stars = (color = WHITE): Rect[] => STAR_AT.map(([x, y]) => [x, y, 1, 1, color]);
const moon = (x = 48, y = 4, color = PALE): Rect[] => [
  [x, y + 1, 5, 5, color],
  [x + 1, y, 3, 7, color],
];

const night = (): Rect[] => [[0, 0, 64, 36, '#1F1B33'], [0, 8, 64, 8, '#2A2342'], ...stars()];
const dusk = (): Rect[] => [
  [0, 0, 64, 36, '#2A2342'],
  [0, 10, 64, 6, '#3A2E55'],
  [0, 16, 64, 6, '#4D3A63'],
  ...stars(),
];
const day = (): Rect[] => [
  [0, 0, 64, 36, '#3F5F7F'],
  [0, 9, 64, 7, '#56789A'],
  [0, 16, 64, 6, '#86A3B5'],
];
const storm = (): Rect[] => [
  [0, 0, 64, 36, '#1B1F2B'],
  [0, 7, 64, 7, '#262C3B'],
  [0, 14, 64, 7, '#323A4C'],
];
const clouds = (color: string, opacity = 1): Rect[] => [
  [6, 4, 12, 2, color, opacity],
  [9, 3, 6, 1, color, opacity],
  [34, 7, 14, 2, color, opacity],
  [38, 6, 7, 1, color, opacity],
];

const pine = (x: number, base: number, color: string, h = 9): Rect[] => [
  [x + 2, base - h, 1, 2, color],
  [x + 1, base - h + 2, 3, 2, color],
  [x, base - h + 4, 5, h - 5, color],
  [x + 2, base - 1, 1, 2, INK],
];
const pines = (xs: number[], base: number, color: string, h = 9): Rect[] => xs.flatMap((x) => pine(x, base, color, h));
const lantern = (x: number, y: number, lit: boolean, post = 8): Rect[] => [
  ...(lit ? ([[x - 3, y - 2, 7, 7, GOLD, 0.22]] as Rect[]) : []),
  [x, y + 2, 1, post, INK],
  [x - 1, y, 3, 3, lit ? GOLD : STONE],
];
const house = (x: number, y: number, w: number, h: number, wall: string, roof: string, lit = false): Rect[] => [
  [x, y, w, h, wall],
  [x - 1, y - 2, w + 2, 2, roof],
  [x + 1, y - 4, w - 2, 2, roof],
  [x + Math.floor(w / 2) - 1, y + h - 3, 2, 3, INK],
  [x + 1, y + 1, 2, 2, lit ? GOLD : INK],
];
const ripples = (list: [number, number, number][], color = WAVE): Rect[] => list.map(([x, y, w]) => [x, y, w, 1, color]);
const road = (color = WOOD): Rect[] => [
  [32, 26, 2, 2, color],
  [31, 28, 4, 2, color],
  [30, 30, 6, 2, color],
  [29, 32, 8, 2, color],
  [28, 34, 10, 2, color],
];
const treeline = (color = SHADE): Rect[] => [
  [0, 20, 10, 16, color],
  [6, 17, 8, 19, color],
  [12, 14, 6, 22, color],
  [18, 18, 10, 18, color],
  [32, 19, 12, 17, color],
  [42, 15, 8, 21, color],
  [50, 18, 14, 18, color],
];
const torch = (x: number, y: number): Rect[] => [
  [x - 2, y - 2, 5, 6, GOLD, 0.2],
  [x, y, 1, 2, GOLD],
  [x, y + 2, 1, 3, WOOD_D],
];
const column = (x: number, top: number, bottom: number, color: string): Rect[] => [
  [x, top, 3, bottom - top, color],
  [x - 1, top, 5, 1, color],
  [x - 1, bottom - 1, 5, 1, color],
];
const arch = (x: number, y: number, w: number, h: number, color: string, inside: string): Rect[] => [
  [x, y, w, h, color],
  [x + 2, y + 3, w - 4, h - 3, inside],
  [x + 3, y + 2, w - 6, 1, inside],
];
const room = (wall: string, wallDark: string, floor: string, floorY = 26): Rect[] => [
  [0, 0, 64, 36, wall],
  [0, 0, 64, 4, wallDark],
  [0, floorY, 64, 36 - floorY, floor],
  [0, floorY, 64, 1, wallDark],
];
const hillBand = (y: number, color: string): Rect[] => [
  [0, y + 2, 64, 36 - y, color],
  [4, y, 18, 2, color],
  [30, y + 1, 22, 1, color],
];

const SCENES: Record<BuiltinArt, () => Rect[]> = {
  default: () => [...night(), ...moon(), [0, 30, 64, 6, GROUND], [0, 28, 20, 2, GROUND], [40, 29, 24, 1, GROUND]],

  forest: () => [
    ...day(),
    [50, 4, 5, 5, PALE],
    ...pines([1, 9, 17, 41, 49, 57], 24, '#3A5A4A', 12),
    [0, 22, 64, 14, '#2B4436'],
    ...pines([5, 24, 34, 53], 31, LEAF, 13),
    [0, 31, 64, 5, '#1F3328'],
    [26, 33, 14, 3, WOOD_D],
    [10, 33, 4, 1, LEAF_L],
    [46, 34, 5, 1, LEAF_L],
  ],
  forest_night: () => [
    ...night(),
    ...moon(46, 3),
    ...pines([1, 9, 17, 41, 49, 57], 24, '#231F38', 12),
    [0, 22, 64, 14, '#1D1A2E'],
    ...pines([5, 24, 34, 53], 31, '#161326', 13),
    [0, 31, 64, 5, INK],
    [26, 33, 14, 3, '#241E30'],
    [30, 27, 1, 1, GOLD],
    [33, 27, 1, 1, GOLD],
  ],
  road: () => [
    ...day(),
    [48, 4, 5, 5, PALE],
    ...treeline('#3A5A4A'),
    [0, 26, 64, 10, '#2B4436'],
    ...road(WOOD_L),
    ...lantern(40, 18, false),
    ...lantern(24, 22, false, 5),
  ],
  road_dusk: () => [
    ...dusk(),
    ...moon(),
    ...treeline(),
    [0, 26, 64, 10, GROUND],
    ...road(),
    ...lantern(40, 18, true),
    ...lantern(24, 22, false, 5),
    ...lantern(17, 26, false, 3),
  ],
  mountain_pass: () => [
    ...day(),
    [0, 14, 20, 22, '#4A5670'],
    [4, 10, 12, 4, '#4A5670'],
    [8, 7, 5, 3, '#4A5670'],
    [9, 7, 3, 2, WHITE],
    [40, 12, 24, 24, '#3D4860'],
    [46, 8, 12, 4, '#3D4860'],
    [50, 5, 5, 3, '#3D4860'],
    [51, 5, 3, 2, WHITE],
    [16, 22, 30, 14, '#2E3648'],
    [0, 28, 64, 8, '#252B3A'],
    ...road(STONE_L),
    [12, 30, 3, 2, STONE],
    [48, 31, 4, 2, STONE],
  ],
  field: () => [
    ...day(),
    [10, 4, 5, 5, PALE],
    ...clouds(WHITE, 0.5),
    ...hillBand(18, '#4F7A4C'),
    [0, 24, 64, 12, '#6E8E48'],
    [0, 29, 64, 7, '#8A9A4C'],
    ...[3, 11, 19, 27, 35, 43, 51, 59].map((x): Rect => [x, 27 + (x % 3), 1, 3, GOLD]),
    [44, 14, 1, 8, WOOD_D],
    [41, 11, 7, 5, '#3A5A4A'],
    [42, 10, 5, 1, '#3A5A4A'],
  ],
  camp: () => [
    ...night(),
    ...moon(8, 3),
    ...pines([0, 8, 50, 58], 25, '#231F38', 12),
    [0, 25, 64, 11, GROUND],
    [38, 17, 14, 9, '#5A4A3A'],
    [40, 15, 10, 2, '#5A4A3A'],
    [43, 13, 4, 2, '#5A4A3A'],
    [44, 20, 3, 6, INK],
    [20, 20, 13, 9, GOLD, 0.18],
    [24, 27, 6, 1, WOOD_D],
    [25, 24, 4, 3, '#E2725B'],
    [26, 22, 2, 3, GOLD],
    [26, 25, 2, 1, PALE],
    [14, 27, 5, 2, WOOD],
  ],

  river: () => [
    ...day(),
    [0, 16, 64, 4, '#3A5A4A'],
    ...pines([2, 10, 46, 56], 18, '#2F4A3A', 8),
    [0, 20, 64, 16, '#2E5A78'],
    [0, 20, 64, 1, '#86A3B5', 0.5],
    ...ripples(
      [
        [6, 23, 8],
        [40, 25, 10],
        [18, 29, 12],
        [48, 32, 8],
        [4, 33, 6],
      ],
      '#5E8AA8',
    ),
    [0, 34, 14, 2, '#2B4436'],
    [26, 26, 3, 2, STONE_L],
    [34, 30, 4, 2, STONE_L],
  ],
  river_dusk: () => [
    ...dusk(),
    [0, 18, 14, 3, GROUND],
    [46, 15, 18, 2, GROUND],
    [40, 17, 24, 4, GROUND],
    ...lantern(54, 8, false, 7),
    [0, 21, 64, 15, WATER],
    [0, 19, 64, 3, WHITE, 0.1],
    ...ripples([
      [4, 24, 6],
      [44, 27, 8],
      [8, 31, 10],
      [50, 33, 6],
      [30, 34, 8],
    ]),
    [19, 21, 6, 6, GOLD, 0.2],
    [38, 12, 1, 17, WOOD_L],
    [24, 19, 3, 7, INK],
    [21, 23, 2, 2, GOLD],
    [18, 26, 24, 3, WOOD],
    [20, 29, 20, 1, WOOD_D],
  ],
  marsh: () => [
    [0, 0, 64, 36, '#1F1B33'],
    [0, 8, 64, 8, '#2A2342'],
    ...stars('#C9C2D8'),
    [0, 14, 64, 6, GROUND],
    [0, 20, 64, 16, '#1C2A40'],
    [0, 18, 64, 3, WHITE, 0.08],
    [22, 22, 20, 5, '#9FD8C8', 0.25],
    ...ripples(
      [
        [26, 25, 10],
        [8, 30, 8],
        [44, 32, 9],
      ],
      '#2E4260',
    ),
    ...Array.from({ length: 16 }, (_, i): Rect => {
      const x = i < 8 ? i * 2 : 48 + (i - 8) * 2;
      return [x, 18 + ((x * 7) % 9), 1, 18 - ((x * 7) % 9), LEAF];
    }),
    ...[1, 4, 7, 10, 13, 50, 53, 56, 59, 62].map((x): Rect => [x, 22 + ((x * 5) % 7), 1, 14, LEAF_L]),
    [6, 30, 14, 3, WOOD_D],
    [8, 29, 10, 1, WOOD],
  ],
  harbor: () => [
    ...dusk(),
    [0, 20, 64, 16, WATER],
    [0, 19, 64, 2, WHITE, 0.1],
    ...ripples([
      [6, 24, 8],
      [22, 31, 10],
      [4, 33, 6],
    ]),
    [34, 22, 30, 3, WOOD],
    ...[36, 44, 52, 60].map((x): Rect => [x, 25, 2, 11, WOOD_D]),
    ...house(48, 13, 12, 9, '#3A3346', GROUND, true),
    [8, 18, 14, 3, WOOD_D],
    [10, 21, 10, 1, INK],
    [15, 6, 1, 12, WOOD_L],
    [16, 7, 6, 8, '#C9C2D8'],
    ...lantern(40, 14, true, 6),
  ],
  sea_storm: () => [
    ...storm(),
    ...clouds('#12151E'),
    [26, 2, 16, 3, '#12151E'],
    [30, 5, 1, 4, PALE],
    [29, 9, 1, 3, PALE],
    [30, 12, 1, 3, PALE],
    [0, 21, 64, 15, '#1C2A40'],
    ...ripples(
      [
        [0, 21, 10],
        [14, 22, 12],
        [30, 21, 8],
        [44, 23, 14],
        [4, 27, 14],
        [26, 29, 16],
        [48, 31, 12],
        [10, 33, 10],
      ],
      '#4A6488',
    ),
    ...ripples(
      [
        [2, 20, 4],
        [32, 20, 4],
        [50, 22, 5],
      ],
      WHITE,
    ),
    [20, 22, 16, 3, WOOD_D],
    [22, 25, 12, 1, INK],
    [27, 10, 1, 12, WOOD_L],
    [28, 12, 6, 7, '#9A94A6'],
  ],

  village: () => [
    ...day(),
    [10, 4, 5, 5, PALE],
    ...hillBand(18, '#4F7A4C'),
    [0, 26, 64, 10, '#5E7A48'],
    ...house(4, 18, 12, 9, '#8A6E4E', '#7A3B33'),
    ...house(22, 16, 14, 11, '#9A8468', '#5A4A3A'),
    ...house(44, 19, 12, 8, '#8A6E4E', '#7A3B33'),
    [26, 9, 2, 3, STONE],
    [0, 31, 64, 5, WOOD_L],
    [18, 27, 1, 3, WOOD_D],
    [17, 25, 3, 2, LEAF_L],
  ],
  village_night: () => [
    ...night(),
    ...moon(),
    [0, 26, 64, 10, GROUND],
    ...house(4, 18, 12, 9, SHADE, INK, true),
    ...house(22, 16, 14, 11, '#332B4A', INK),
    ...house(44, 19, 12, 8, SHADE, INK, true),
    [0, 31, 64, 5, '#241E30'],
    // the well
    [38, 27, 6, 4, STONE],
    [37, 26, 8, 1, STONE_L],
    [38, 22, 1, 4, WOOD_D],
    [43, 22, 1, 4, WOOD_D],
    [37, 21, 8, 1, WOOD_D],
  ],
  market: () => [
    ...day(),
    [0, 14, 64, 10, '#6E6A76'],
    [0, 12, 20, 2, '#5A4A3A'],
    [44, 11, 20, 3, '#5A4A3A'],
    [0, 24, 64, 12, '#8A8494'],
    ...[6, 26, 46].flatMap((x, i): Rect[] => [
      [x, 17, 12, 2, ['#E2725B', '#5CC8B4', GOLD][i]],
      [x + 2, 17, 2, 2, WHITE],
      [x + 6, 17, 2, 2, WHITE],
      [x + 10, 17, 2, 2, WHITE],
      [x, 19, 1, 8, WOOD_D],
      [x + 11, 19, 1, 8, WOOD_D],
      [x, 24, 12, 3, WOOD],
      [x + 2, 23, 2, 1, ['#A8C66C', '#E2725B', '#A8C66C'][i]],
      [x + 6, 23, 3, 1, [GOLD, GOLD, '#E2725B'][i]],
    ]),
    [20, 26, 2, 5, INK],
    [40, 27, 2, 5, SHADE],
    [0, 33, 64, 3, '#6E6A76'],
  ],
  tavern: () => [
    ...room('#3A2A22', '#2A1E18', '#4A3D2F'),
    [0, 8, 64, 1, WOOD_D],
    // bar and shelves
    [38, 10, 22, 1, WOOD_L],
    [38, 15, 22, 1, WOOD_L],
    ...[40, 44, 48, 52, 56].map((x, i): Rect => [x, 7 + (i % 2) * 5, 2, 3, ['#5CC8B4', GOLD, '#E2725B'][i % 3]]),
    [36, 20, 26, 6, WOOD],
    [36, 19, 26, 1, WOOD_L],
    // hearth
    [4, 10, 14, 16, STONE],
    [7, 16, 8, 10, INK],
    [9, 21, 4, 5, '#E2725B'],
    [10, 19, 2, 4, GOLD],
    [2, 14, 18, 14, GOLD, 0.12],
    // table and stools
    [22, 27, 12, 2, WOOD_L],
    [27, 29, 2, 5, WOOD_D],
    [19, 30, 3, 4, WOOD_D],
    [34, 30, 3, 4, WOOD_D],
    [26, 25, 2, 2, PALE],
  ],
  house_interior: () => [
    ...room('#332B3D', '#241E30', '#4A3D2F'),
    // window with night outside
    [42, 8, 10, 9, WOOD_D],
    [43, 9, 8, 7, '#2A2342'],
    [47, 9, 1, 7, WOOD_D],
    [44, 10, 1, 1, WHITE],
    // fireplace
    [6, 10, 16, 16, STONE],
    [5, 9, 18, 2, STONE_L],
    [9, 16, 10, 10, INK],
    [12, 21, 4, 5, '#E2725B'],
    [13, 19, 2, 4, GOLD],
    [4, 14, 20, 14, GOLD, 0.12],
    // table, stool, hanging net
    [30, 24, 14, 2, WOOD_L],
    [32, 26, 1, 6, WOOD_D],
    [41, 26, 1, 6, WOOD_D],
    [48, 27, 4, 5, WOOD_D],
    [34, 22, 2, 2, GOLD],
    [56, 6, 1, 12, WOOD_L],
    [54, 18, 6, 1, WOOD_L],
    [0, 33, 64, 3, '#3A2E26'],
  ],

  ruins: () => [
    ...dusk(),
    ...moon(10, 4),
    [0, 26, 64, 10, GROUND],
    ...column(8, 12, 27, STONE),
    ...column(20, 17, 27, STONE),
    ...column(50, 9, 27, STONE),
    ...arch(30, 11, 14, 16, STONE, '#3A2E55'),
    [6, 11, 20, 2, STONE],
    [18, 25, 6, 2, STONE_L],
    [44, 27, 5, 2, STONE_L],
    [56, 28, 4, 1, STONE_L],
    [2, 24, 3, 3, LEAF],
    [47, 22, 2, 5, LEAF],
  ],
  abbey: () => [
    ...dusk(),
    [0, 27, 64, 9, GROUND],
    [14, 14, 36, 14, '#332B4A'],
    [12, 12, 40, 2, SHADE],
    [26, 6, 12, 8, '#332B4A'],
    [28, 3, 8, 3, SHADE],
    [31, 0, 2, 3, SHADE],
    [30, 1, 4, 1, SHADE],
    [30, 21, 4, 7, INK],
    [31, 20, 2, 1, INK],
    ...[17, 22, 40, 45].map((x): Rect => [x, 18, 2, 5, GOLD]),
    [31, 9, 2, 3, PALE],
    [29, 28, 6, 8, WOOD],
    ...lantern(8, 20, true, 6),
  ],
  bell_tower: () => [
    [0, 0, 64, 36, '#3A2E55'],
    [0, 0, 64, 10, '#4D3A63'],
    [0, 10, 64, 10, '#5E4870'],
    [0, 26, 64, 10, GOLD, 0.24],
    [0, 30, 64, 6, '#F3CD7A', 0.35],
    [26, 4, 12, 28, GROUND],
    [24, 2, 16, 3, GROUND],
    [31, 0, 2, 2, GROUND],
    [29, 8, 6, 6, INK],
    [30, 9, 4, 4, WOOD_L],
    [31, 13, 2, 1, WOOD_L],
    [0, 28, 22, 8, WATER],
    [42, 28, 22, 8, WATER],
    [22, 31, 20, 5, WATER],
    ...[4, 8, 12, 16, 46, 50, 54, 58].map((x): Rect => [x, 27, 1, 2, '#C9C2D8']),
  ],
  crypt: () => [
    ...room('#211D2C', '#16131F', '#2A2536', 27),
    ...arch(4, 6, 14, 21, '#2E2A3A', INK),
    ...arch(46, 6, 14, 21, '#2E2A3A', INK),
    // stone coffin
    [24, 22, 16, 6, STONE],
    [23, 20, 18, 2, STONE_L],
    [31, 21, 2, 1, INK],
    [29, 23, 6, 1, '#2E2A3A'],
    ...torch(21, 10),
    ...torch(42, 10),
    [8, 30, 3, 1, STONE_L],
    [50, 32, 4, 1, STONE_L],
    [30, 31, 2, 1, WHITE],
  ],
  cave: () => [
    [0, 0, 64, 36, '#16131F'],
    [10, 6, 44, 24, '#231F30'],
    [18, 10, 30, 18, '#2E2940'],
    // stalactites and stalagmites
    ...[6, 16, 27, 38, 50, 58].map((x, i): Rect => [x, 0, 3, 5 + (i % 3) * 3, '#16131F']),
    ...[12, 44, 55].map((x, i): Rect => [x, 26 - i * 2, 3, 10 + i * 2, '#16131F']),
    [0, 29, 64, 7, '#100E18'],
    // pool with a faint light
    [22, 27, 20, 4, WATER],
    [26, 28, 12, 1, '#9FD8C8', 0.5],
    [28, 14, 8, 12, '#9FD8C8', 0.1],
    [31, 18, 2, 2, '#CFF3E8'],
  ],
  dungeon: () => [
    ...room('#26222F', '#16131F', '#1E1A27', 27),
    ...Array.from({ length: 12 }, (_, i): Rect => [4 + i * 5, 6 + (i % 2) * 6, 3, 1, '#16131F']),
    // cell bars
    [34, 8, 22, 19, INK],
    ...[36, 40, 44, 48, 52].map((x): Rect => [x, 8, 1, 19, STONE_L]),
    [34, 8, 22, 1, STONE_L],
    [34, 17, 22, 1, STONE_L],
    ...torch(14, 11),
    // chain and a bowl
    [24, 6, 1, 7, STONE_L],
    [23, 13, 3, 1, STONE_L],
    [8, 29, 5, 2, WOOD_D],
    [20, 31, 8, 1, '#16131F'],
  ],

  castle_gate: () => [
    ...dusk(),
    ...moon(8, 3),
    [0, 28, 64, 8, GROUND],
    [8, 12, 48, 17, '#332B4A'],
    ...[8, 16, 24, 32, 40, 48].map((x): Rect => [x, 10, 4, 2, '#332B4A']),
    [2, 6, 10, 23, SHADE],
    [52, 6, 10, 23, SHADE],
    ...[2, 6, 10, 52, 56, 60].map((x): Rect => [x, 4, 2, 2, SHADE]),
    [6, 12, 2, 3, GOLD],
    [56, 12, 2, 3, GOLD],
    ...arch(24, 14, 16, 15, '#231F38', INK),
    ...[28, 31, 34].map((x): Rect => [x, 17, 1, 12, STONE]),
    [26, 21, 12, 1, STONE],
    [26, 29, 12, 7, WOOD],
    ...torch(21, 18),
    ...torch(42, 18),
  ],
  castle_hall: () => [
    ...room('#2E2840', '#1F1B2D', '#3A3346', 27),
    ...column(6, 4, 28, STONE_L),
    ...column(22, 4, 28, STONE_L),
    ...column(39, 4, 28, STONE_L),
    ...column(55, 4, 28, STONE_L),
    // banners
    [13, 6, 5, 11, '#9C4A5A'],
    [15, 17, 1, 2, '#9C4A5A'],
    [46, 6, 5, 11, '#3D6FB0'],
    [48, 17, 1, 2, '#3D6FB0'],
    [15, 9, 1, 3, GOLD],
    [48, 9, 1, 3, GOLD],
    // far door and carpet
    [28, 12, 8, 15, INK],
    [29, 11, 6, 1, INK],
    [28, 28, 8, 8, '#7A3B4A'],
    [26, 32, 12, 4, '#7A3B4A'],
    ...torch(26, 14),
    ...torch(37, 14),
  ],
  library: () => [
    ...room('#2A2233', '#1B1622', '#4A3D2F', 28),
    // shelves full of books
    ...[2, 24, 46].flatMap((x): Rect[] => [
      [x, 5, 16, 23, WOOD_D],
      ...[7, 13, 19, 25].map((y): Rect => [x + 1, y - 1, 14, 5, '#1B1622']),
      ...Array.from({ length: 28 }, (_, i): Rect => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        const colors = ['#9C4A5A', '#3D6FB0', '#A8C66C', GOLD, '#7A6FB0', '#5CC8B4', '#C9C2D8'];
        return [x + 1 + col * 2, 7 + row * 6, 2, 4 - ((col + row) % 2), colors[(col * 3 + row * 5 + x) % 7]];
      }),
    ]),
    // reading desk with a candle
    [19, 27, 8, 2, WOOD_L],
    [22, 29, 2, 5, WOOD_D],
    [22, 23, 3, 4, GOLD, 0.25],
    [23, 25, 1, 2, PALE],
    [23, 24, 1, 1, GOLD],
    [41, 22, 4, 12, WOOD],
    [41, 22, 1, 12, WOOD_L],
    [44, 22, 1, 12, WOOD_L],
    ...[24, 27, 30].map((y): Rect => [42, y, 2, 1, WOOD_L]),
  ],
  throne_room: () => [
    ...room('#2A2040', '#1B1530', '#3A3346', 27),
    ...column(4, 4, 28, STONE_L),
    ...column(57, 4, 28, STONE_L),
    // tall windows
    [14, 6, 5, 14, '#4D3A63'],
    [16, 6, 1, 14, INK],
    [45, 6, 5, 14, '#4D3A63'],
    [47, 6, 1, 14, INK],
    // dais, carpet and throne
    [20, 25, 24, 3, STONE_L],
    [23, 23, 18, 2, STONE],
    [28, 28, 8, 8, '#9C4A5A'],
    [27, 8, 10, 15, GOLD],
    [28, 6, 2, 2, GOLD],
    [34, 6, 2, 2, GOLD],
    [31, 5, 2, 3, GOLD],
    [29, 10, 6, 9, '#7A3B4A'],
    [26, 17, 2, 6, WOOD_L],
    [36, 17, 2, 6, WOOD_L],
    [29, 19, 6, 4, '#9C4A5A'],
    ...torch(10, 12),
    ...torch(53, 12),
  ],
};

const cache = new Map<string, Rect[]>();

/** The rectangles for a built-in scene. Unknown names draw `default`. */
export function sceneRects(name: string): Rect[] {
  const key: BuiltinArt = isBuiltinArt(name) ? name : 'default';
  let rects = cache.get(key);
  if (!rects) {
    rects = SCENES[key]();
    cache.set(key, rects);
  }
  return rects;
}

export const ALL_SCENES: readonly BuiltinArt[] = BUILTIN_ART;

/** Plain words for screen readers, e.g. "river at dusk". */
export function sceneLabel(name: string): string {
  const key = isBuiltinArt(name) ? name : 'default';
  if (key === 'default') return 'a night sky';
  return key.replace(/_dusk$/, ' at dusk').replace(/_night$/, ' at night').replace(/_/g, ' ');
}
