export type LineColor = { bg: string; text: string };

export const SUBWAY_LINE_COLORS: Record<string, LineColor> = {
	// IRT Broadway-Seventh Avenue Line (Red)
	'1': { bg: '#EE352E', text: '#FFFFFF' },
	'2': { bg: '#EE352E', text: '#FFFFFF' },
	'3': { bg: '#EE352E', text: '#FFFFFF' },

	// IRT Lexington Avenue Line (Green)
	'4': { bg: '#00933C', text: '#FFFFFF' },
	'5': { bg: '#00933C', text: '#FFFFFF' },
	'6': { bg: '#00933C', text: '#FFFFFF' },

	// IRT Flushing Line (Purple/Magenta)
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

	// IND Crosstown Line (Light Green/Lime)
	'G': { bg: '#6CBE45', text: '#FFFFFF' },

	// BMT Canarsie Line (Gray)
	'L': { bg: '#A7A9AC', text: '#000000' },

	// BMT Nassau Street Line (Brown)
	'J': { bg: '#996633', text: '#FFFFFF' },
	'Z': { bg: '#996633', text: '#FFFFFF' },

	// BMT Broadway Line (Yellow)
	'N': { bg: '#FCCC0A', text: '#000000' },
	'Q': { bg: '#FCCC0A', text: '#000000' },
	'R': { bg: '#FCCC0A', text: '#000000' },
	'W': { bg: '#FCCC0A', text: '#000000' },

	// 42nd Street Shuttle (Dark Gray)
	'S': { bg: '#808183', text: '#FFFFFF' },
	'GS': { bg: '#808183', text: '#FFFFFF' },
	'FS': { bg: '#808183', text: '#FFFFFF' },
	'SS': { bg: '#808183', text: '#FFFFFF' },

	// Staten Island Railway (Blue)
	'SI': { bg: '#0039A6', text: '#FFFFFF' },
	'SIR': { bg: '#0039A6', text: '#FFFFFF' },
};

export const getSubwayLineColor = (line: string): LineColor => {
	return SUBWAY_LINE_COLORS[line] || { bg: '#808080', text: '#FFFFFF' };
};
