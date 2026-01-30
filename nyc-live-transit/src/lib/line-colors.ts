// NYC Subway line colors based on MTA official colors
export const LINE_COLORS: Record<string, { bg: string; text: string }> = {
  // IRT Broadway-Seventh Avenue Line (Red)
  '1': { bg: '#EE352E', text: '#FFFFFF' },
  '2': { bg: '#EE352E', text: '#FFFFFF' },
  '3': { bg: '#EE352E', text: '#FFFFFF' },

  // IRT Lexington Avenue Line (Green)
  '4': { bg: '#00933C', text: '#FFFFFF' },
  '5': { bg: '#00933C', text: '#FFFFFF' },
  '6': { bg: '#00933C', text: '#FFFFFF' },

  // IRT Flushing Line (Purple)
  '7': { bg: '#B933AD', text: '#FFFFFF' },

  // IND Eighth Avenue Line (Blue)
  'A': { bg: '#0039A6', text: '#FFFFFF' },
  'C': { bg: '#0039A6', text: '#FFFFFF' },
  'E': { bg: '#0039A6', text: '#FFFFFF' },

  // IND Sixth Avenue Line (Orange)
  'B': { bg: '#FF6319', text: '#FFFFFF' },
  'D': { bg: '#FF6319', text: '#FFFFFF' },
  'F': { bg: '#FF6319', text: '#FFFFFF' },
  'M': { bg: '#FF6319', text: '#FFFFFF' },

  // BMT Broadway Line (Yellow)
  'N': { bg: '#FCCC0A', text: '#000000' },
  'Q': { bg: '#FCCC0A', text: '#000000' },
  'R': { bg: '#FCCC0A', text: '#000000' },
  'W': { bg: '#FCCC0A', text: '#000000' },

  // BMT Nassau Street Line (Brown)
  'J': { bg: '#996633', text: '#FFFFFF' },
  'Z': { bg: '#996633', text: '#FFFFFF' },

  // BMT Canarsie Line (Gray)
  'L': { bg: '#A7A9AC', text: '#000000' },

  // IND Crosstown Line (Light Green)
  'G': { bg: '#6CBE45', text: '#FFFFFF' },

  // Shuttles (Dark Gray)
  'GS': { bg: '#808183', text: '#FFFFFF' }, // 42nd St Shuttle
  'FS': { bg: '#808183', text: '#FFFFFF' }, // Franklin Ave Shuttle
  'H': { bg: '#808183', text: '#FFFFFF' },  // Rockaway Park Shuttle
  'S': { bg: '#808183', text: '#FFFFFF' },  // Generic shuttle

  // Staten Island Railway (Blue)
  'SI': { bg: '#0039A6', text: '#FFFFFF' },
  'SIR': { bg: '#0039A6', text: '#FFFFFF' },
};

export const LINE_GROUPS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7'],
  ['A', 'C', 'E'],
  ['B', 'D', 'F', 'M'],
  ['N', 'Q', 'R', 'W'],
  ['J', 'Z'],
  ['L'],
  ['G'],
  ['GS', 'FS'],
  ['SI'],
];

export const LINE_OPTIONS = LINE_GROUPS.flat();

export function getLineColor(line: string): { bg: string; text: string } {
  return LINE_COLORS[line] || { bg: '#808183', text: '#FFFFFF' };
}
