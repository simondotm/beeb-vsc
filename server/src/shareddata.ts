import { MarkupKind, ParameterInformation, MarkupContent } from 'vscode-languageserver';

type beebasmFunction = {
	label: string;
	documentation?: MarkupContent;
	parameters: ParameterInformation[];
	return?: string;
};

type beebasmCommand = {
	label: string;
	documentation?: MarkupContent;
};

export const beebasmFunctions: beebasmFunction[] = [
	{
		label: 'LO',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'LO(val) or <val. Return lsb of 16-bit expression (like \'val MOD 256\') e.g.',
			'```beebasm',
			'LO(640)',
			'LO(&3000)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Expression that evaluates to a 16-bit value.',
		},
		],
		return: 'Byte',
	},
	{
		label: 'HI',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'HI(val) or <val. Return msb of 16-bit expression (like \'val DIV 256\') e.g.',
			'```beebasm',
			'HI(640)',
			'HI(&3000)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Expression that evaluates to a 16-bit value.',
		},
		],
		return: 'Byte',
	},
	// SQR(val)           Return square root of val
	{
		label: 'SQR',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'SQR(val). Return square root of val e.g.',
			'```beebasm',
			'SQR(4)',
			'SQR(9)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'Double',
	},
	// SIN(val)           Return sine of val
	{
		label: 'SIN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'SIN(val). Return sine of val e.g.',
			'```beebasm',
			'SIN(x)',
			'SIN(PI/2)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression for angle in radians.',
		},
		],
		return: 'Double',
	},
	// COS(val)           Return cosine of val
	{
		label: 'COS',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'COS(val). Return cosine of val e.g.',
			'```beebasm',
			'COS(x)',
			'COS(PI/2)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression for angle in radians.',
		},
		],
		return: 'Double',
	},
	// TAN(val)           Return tangent of val
	{
		label: 'TAN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'TAN(val). Return tangent of val e.g.',
			'```beebasm',
			'TAN(x)',
			'TAN(PI/2)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression for angle in radians.',
		},
		],
		return: 'Double',
	},
	// ASN(val)           Return arc-sine of val
	{
		label: 'ASN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'ASN(val). Return arc-sine of val e.g.',
			'```beebasm',
			'ASN(x)',
			'ASN(1)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression for ratio.',
		},
		],
		return: 'Double',
	},
	// ACS(val)           Return arc-cosine of val
	{
		label: 'ACS',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'ACS(val). Return arc-cosine of val e.g.',
			'```beebasm',
			'ACS(x)',
			'ACS(1)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression for ratio.',
		},
		],
		return: 'Double',
	},
	// ATN(val)           Return arc-tangent of val
	{
		label: 'ATN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'ATN(val). Return arc-tangent of val e.g.',
			'```beebasm',
			'ATN(x)',
			'ATN(1)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression for ratio.',
		},
		],
		return: 'Double',
	},
	// RAD(val)           Convert degrees to radians
	{
		label: 'RAD',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'RAD(val). Convert degrees to radians e.g.',
			'```beebasm',
			'RAD(180)',
			'RAD(360)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression for angle in degrees.',
		},
		],
		return: 'Double',
	},
	// DEG(val)           Convert radians to degrees
	{
		label: 'DEG',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'DEG(val). Convert radians to degrees e.g.',
			'```beebasm',
			'DEG(PI)',
			'DEG(PI/2)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression for angle in radians.',
		},
		],
		return: 'Double',
	},
	// INT(val)           Round to integer (towards zero)
	{
		label: 'INT',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'INT(val). Round to integer (towards zero) e.g.',
			'```beebasm',
			'INT(1.5) ; returns 1',
			'INT(-1.5) ; returns -1',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'Integer',
	},
	// ABS(val)           Take the absolute value
	{
		label: 'ABS',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'ABS(val). Take the absolute value e.g.',
			'```beebasm',
			'ABS(1.5) ; returns 1.5',
			'ABS(-1.5) ; returns 1.5',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'Double',
	},
	// SGN(val)           Return -1, 0 or 1, depending on the sign of the argument
	{
		label: 'SGN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'SGN(val). Return -1, 0 or 1, depending on the sign of the argument e.g.',
			'```beebasm',
			'SGN(1.5) ; returns 1',
			'SGN(-1.5) ; returns -1',
			'SGN(0) ; returns 0',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'Integer',
	},
	// RND(val)           RND(1) returns a random number between 0 and 1
	// 					  RND(n) returns an integer between 0 and n-1
	{
		label: 'RND',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'RND(val). RND(1) returns a random number between 0 and 1 e.g.',
			'```beebasm',
			'RND(1)',
			'```',
			'RND(n) returns an integer between 0 and n-1 e.g.',
			'```beebasm',
			'RND(10)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'Double',
	},
	// NOT(val)           Return the bitwise 1's complement of val
	{
		label: 'NOT',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'NOT(val). Return the bitwise 1\'s complement of val e.g.',
			'```beebasm',
			'NOT(0)',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Integer expression.',
		},
		],
		return: 'Integer',
	},
	// LOG(val)           Return the base 10 log of val
	{
		label: 'LOG',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'LOG(val). Return the base 10 log of val e.g.',
			'```beebasm',
			'LOG(100) ; returns 2',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'Double',
	},
	// LN(val)            Return the natural log of val
	{
		label: 'LN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'LN(val). Return the natural log of val e.g.',
			'```beebasm',
			'LN(EXP(1)) ; returns 1',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'Double',
	},
	// EXP(val)           Return e raised to the power of val
	{
		label: 'EXP',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'EXP(val). Return e raised to the power of val e.g.',
			'```beebasm',
			'EXP(0) ; returns 1',
			'EXP(1) ; returns 2.718281828459045',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'Double',
	},
	// VAL(str)           Return the value of a decimal number in a string
	{
		label: 'VAL',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'VAL(str). Return the value of a decimal number in a string e.g.',
			'```beebasm',
			'VAL("1.5") ; returns 1.5',
			'VAL("-1.5") ; returns -1.5',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		],
		return: 'Double',
	},
	// EVAL(str)          Return the value of an expression in a string
	{
		label: 'EVAL',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'EVAL(str). Return the value of an expression in a string e.g.',
			'```beebasm',
			'EVAL("1+2") ; returns 3',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		],
		return: 'Type that matches the result of the expression',
	},
	// STR$(val)          Return the number val converted to a string
	{
		label: 'STR$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'STR$(val). Return the number val converted to a string e.g.',
			'```beebasm',
			'STR$(1.5) ; returns "1.5"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'String',
	},
	// STR$~(val)         Return the number val converted to a string in hexadecimal
	{
		label: 'STR$~',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'STR$~(val). Return the number val converted to a string in hexadecimal e.g.',
			'```beebasm',
			'STR$~(255) ; returns "FF"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Numeric expression.',
		},
		],
		return: 'String',
	},
	// LEN(str)           Return the length of str
	{
		label: 'LEN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'LEN(str). Return the length of a string e.g.',
			'```beebasm',
			'LEN("abc") ; returns 3',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		],
		return: 'Integer',
	},
	// CHR$(val)          Return a string with a single character with ASCII value val
	{
		label: 'CHR$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'CHR$(val). Return a string with a single character with ASCII value val e.g.',
			'```beebasm',
			'CHR$(65) ; returns "A"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'val',
			documentation: 'Integer expression.',
		},
		],
		return: 'String',
	},
	// ASC(str)           Return the ASCII value of the first character of str
	{
		label: 'ASC',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'ASC(str). Return the ASCII value of the first character of str e.g.',
			'```beebasm',
			'ASC("A") ; returns 65',
			'ASC("ABC") ; returns 65',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		],
		return: 'Integer',
	},
	// MID$(str,index,length)	Return length characters of str starting at (one-based) index
	{
		label: 'MID$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'MID$(str,index,length). Return length characters of str starting at (one-based) index e.g.',
			'```beebasm',
			'MID$("ABCD",2,2) ; returns "BC"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		{
			label: 'index',
			documentation: 'Integer expression.',
		},
		{
			label: 'length',
			documentation: 'Integer expression.',
		},
		],
		return: 'String',
	},
	// LEFT$(str,length)  Return the first length characters of str
	{
		label: 'LEFT$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'LEFT$(str,length). Return the first length characters of str e.g.',
			'```beebasm',
			'LEFT$("ABCD",2) ; returns "AB"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		{
			label: 'length',
			documentation: 'Integer expression.',
		},
		],
		return: 'String',
	},
	// RIGHT$(str,length) Return the last length characters of str
	{
		label: 'RIGHT$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'RIGHT$(str,length). Return the last length characters of str e.g.',
			'```beebasm',
			'RIGHT$("ABCD",2) ; returns "CD"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		{
			label: 'length',
			documentation: 'Integer expression.',
		},
		],
		return: 'String',
	},
	// STRING$(count,str)	Return str repeated count times
	{
		label: 'STRING$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'STRING$(count,str). Return str repeated count times e.g.',
			'```beebasm',
			'STRING$(3,"A*") ; returns "A*A*A*"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'count',
			documentation: 'Integer expression.',
		},
		{
			label: 'str',
			documentation: 'String expression.',
		},
		],
		return: 'String',
	},
	// LOWER$(str)        Return str converted to lowercase
	{
		label: 'LOWER$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'LOWER$(str). Return str converted to lowercase e.g.',
			'```beebasm',
			'LOWER$("ABC") ; returns "abc"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		],
		return: 'String',
	},
	// UPPER$(str)        Return str converted to uppercase
	{
		label: 'UPPER$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'UPPER$(str). Return str converted to uppercase e.g.',
			'```beebasm',
			'UPPER$("abc") ; returns "ABC"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'str',
			documentation: 'String expression.',
		},
		],
		return: 'String',
	},
	// TIME$              Return assembly date/time in format "Day,DD Mon Year.HH:MM:SS"
	{
		label: 'TIME$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'TIME$. Return assembly date/time in format "Day,DD Mon Year.HH:MM:SS" e.g.',
			'```beebasm',
			'TIME$ ; returns date/time in format "Wed,01 Jan 2020.00:00:00"',
			'```',
		].join('\n'),
		},
		parameters: [],
		return: 'String',
	},
	// TIME$("fmt")       Return assembly date/time in a format determined by "fmt", which
	// 					  is the same format used by the C library strftime()
	{
		label: 'TIME$',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'TIME$("fmt"). Return assembly date/time in a format determined by "fmt", which',
			'is the same format used by the C library strftime() e.g.',
			'```beebasm',
			'TIME$("%a,%d %b %Y.%H:%M:%S") ; returns date/time in format "Wed,01 Jan 2020.00:00:00"',
			'```',
		].join('\n'),
		},
		parameters: [
		{
			label: 'fmt',
			documentation: 'String expression.',
		},
		],
		return: 'String',
	},
];

export const beebasmCommands: beebasmCommand[] = [
	// PRINT
	{
		label: 'PRINT',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Displays some text. PRINT takes a comma-separated list of strings or values.',
			'To print a value in hex, prefix the expression with a \'~\' character.',
			'Examples:',
			'```beebasm',
			'PRINT "Value of label \'start\' =", ~start',
			'PRINT "numdots =", numdots, "dottable size =", dotend-dotstart',
			'```',
			'You can use FILELINE$ in PRINT commands to show the current file and line number.',
			'CALLSTACK$ will do the same but for all the parent macro and include files as well.'
		].join('\n'),
		},
	},
	// CPU
	{
		label: 'CPU',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Selects the target CPU, which determines the range of instructions that will be accepted.',
			'The default is 0, which provides the original 6502 instruction set. The only current',
			'alternative is 1, which provides the 65C02 instruction set (including PLX, TRB etc,',
			'but not the Rockwell additions like BBR).',
			'```beebasm',
			'CPU 1',
			'```',
		].join('\n'),
		},
	},
	// ORG
	{
		label: 'ORG',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Set the address to be assembled from. This can be changed multiple times during a',
			'source file if you wish (for example) to assemble two separate blocks of code at',
			'different addresses, but share the labels between both blocks. This is exactly',
			'equivalent to BBC BASIC\'s P%=<addr>.',
			'```beebasm',
			'ORG &3000',
			'```',
		].join('\n'),
		},
	},
	// INCLUDE
	{
		label: 'INCLUDE',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Includes the specified source file in the code at this point.',
			'```beebasm',
			'INCLUDE "filename"',
			'```',
		].join('\n'),
		},
	},
	// EQUB
	{
		label: 'EQUB',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Insert the specified byte(s) into the code. Note, unlike BBC BASIC,',
			'that a comma-separated sequence can be inserted.',
			'```beebasm',
			'EQUB 1,2,3',
			'```',
		].join('\n'),
		},
	},
	// EQUD
	{
		label: 'EQUD',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Insert the specified 32-bit word(s) into the code.',
			'```beebasm',
			'EQUD &12345678',
			'```',
		].join('\n'),
		},
	},
	// EQUS
	{
		label: 'EQUS',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Inserts the specified string into the code. Note that this can take a comma-separated',
			'list of parameters which may also include bytes. So, to zero-terminate a string,',
			'you can write:',
			'```beebasm',
			'EQUS "My string", 0',
			'```',
			'In fact, under the surface, there is no difference between EQUS and EQUB,',
			'which is also able to take strings!',
		].join('\n'),
		},
	},
	//EQUW
	{
		label: 'EQUW',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Insert the specified 16-bit word(s) into the code.',
			'```beebasm',
			'EQUW &1234',
			'```',
		].join('\n'),
		},
	},
	// ASSERT a [, b, c, ...]	Abort assembly if any of the expressions is false.
	{
		label: 'ASSERT',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Abort assembly if any of the expressions is false.',
			'```beebasm',
			'ASSERT 1=1',
			'```',
		].join('\n'),
		},
	},
	//SAVE
	{
		label: 'SAVE',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Saves out object code to either a DFS disc image (if one has been specified), or',
			'to the current directory as a standalone file. The filename is optional only if',
			'a name is specified with -o on the command line. A source file must have at least',
			'one SAVE statement in it, otherwise nothing will be output.',
			'BeebAsm will warn if this is the case.',
			'```beebasm',
			'SAVE "filename", start, end [, exec [, reload] ]',
			'```',
			'\'exec\' can be optionally specified as the execution address of the file when',
			'saved to a disc image.',
			'\'reload\' can additionally be specified to save the file on the disc image to',
			'a different address to that which it was saved from. Use this to assemble code at',
			'I\'ts \'native\' address, but which loads at a DFS-friendly address, ready to be',
			'relocated to its correct address upon execution.',
		].join('\n'),
		},
	},
	// IF...ELIF...ELSE...ENDIF
	{
		label: 'IF',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`IF...ELIF...ELSE...ENDIF`',
			'Use to assemble conditionally. Like anything else in BeebAsm, these statements',
			'can be placed on one line, separated by colons, but even if they are, ENDIF',
			'must be present to denote the end of the IF block (unlike BBC BASIC).',
			'Examples of use:',
			'```beebasm',
			'\\ build a rather strange table',
			'FOR n, 0, 9',
			'IF (n AND 1) = 0',
			'	a = n*n',
			'ELSE',
			'	a = -n*n',
			'ENDIF',
			'EQUB a',
			'NEXT',
			'IF debugraster:LDA #3:STA &FE21:ENDIF',
			'```',
		].join('\n'),
		},
	},
	// ALIGN <alignment>
	{
		label: 'ALIGN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Used to align the address pointer to the next boundary, e.g. use ALIGN &100 to move',
			'to the next page (useful perhaps for positioning a table at a page boundary so that',
			'index accesses don\'t incur a "page crossed" penalty.',
			'```beebasm',
			'ALIGN &100',
			'```',
		].join('\n'),
		},
	},
	// SKIPTO <addr>
	{
		label: 'SKIPTO',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Moves the address pointer to the specified address. An error is generated if this',
			'address is behind the current address pointer.',
			'```beebasm',
			'SKIPTO &3000',
			'```',
		].join('\n'),
		},
	},
	// SKIP <bytes>
	{
		label: 'SKIP',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Moves the address pointer on by the specified number of bytes. Use this to reserve',
			'a space of a fixed size in the code.',
			'```beebasm',
			'SKIP 2',
			'```',
		].join('\n'),
		},
	},
	// GUARD <addr>	
	{
		label: 'GUARD',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Puts a \'guard\' on the specified address which will cause an error if you attempt',
			'to assemble code over this address.',
			'```beebasm',
			'GUARD &3000',
			'```',
		].join('\n'),
		},
	},
	// CLEAR <start>, <end>
	{
		label: 'CLEAR',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`CLEAR <start>, <end>`',
			'Clears all guards between the <start> and <end> addresses specified. This can',
			'also be used to reset a section of memory which has had code assembled in',
			'it previously. BeebAsm will complain if you attempt to assemble code over',
			'previously assembled code at the same address without having CLEARed it first.',
			'```beebasm',
			'CLEAR &3000, &4000',
			'```',
		].join('\n'),
		},
	},
	// INCBIN "filename"
	{
		label: 'INCBIN',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'Includes the specified binary file in the object code at this point.',
			'```beebasm',
			'INCBIN "filename"',
			'```',
		].join('\n'),
		},
	},
	// MAPCHAR <ascii code>, <remapped code>
	// MAPCHAR <start ascii code>, <end ascii code>, <remapped code>
	{
		label: 'MAPCHAR',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`MAPCHAR <ascii code>, <remapped code>',
			'`MAPCHAR <start ascii code>, <end ascii code>, <remapped code>`',
			'By default, when EQUS "string" is assembled, the ASCII codes of each character are',
			'written into the object code. MAPCHAR allows you to specify which value should be',
			'written to the object code for each character.',
			'Suppose you have a font which contains the following symbols - space, followed by',
			'A-Z, followed by digits 0-9, followed by .',
			'You could specify this with MAPCHAR as follows:',
			'```beebasm',
			'MAPCHAR \' \', 0',
			'MAPCHAR \'A\',\'Z\', 1',
			'MAPCHAR \'0\',\'9\', 27',
			'MAPCHAR \'.\', 37',
			'```',
			'Now, when writing strings with EQUS, these codes will be written out instead of the',
			'default ASCII codes.',
		].join('\n'),
		},
	},
	// PUTFILE <host filename>, [<beeb filename>,] <start addr> [,<exec addr>]
	{
		label: 'PUTFILE',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`PUTFILE <host filename>, [<beeb filename>,] <start addr> [,<exec addr>]`',
			'This provides a convenient way of copying a file from the host OS directly to the',
			'output disc image. If no \'beeb filename\' is provided, the host filename will be',
			'used (and must therefore be 7 characters or less in length). A start address must',
			'be provided (and optionally an execution address can be provided too).',
			'```beebasm',
			'PUTFILE "hostfile", "beebfile", &3000',
			'PUTFILE "hostfile", &3000',
			'```',
		].join('\n'),
		},
	},
	// PUTTEXT <host filename>, [<beeb filename>,] <start addr> [,<exec addr>]
	{
		label: 'PUTTEXT',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`PUTTEXT <host filename>, [<beeb filename>,] <start addr> [,<exec addr>]`',
			'This command is the same as PUTFILE, except that the host file is assumed to be',
			'a text file and its line endings will be automatically converted to CR',
			'(the BBC standard line ending) from any of CR, LF, CRLF or LFCR.',
			'```beebasm',
			'PUTTEXT "hostfile", "beebfile", &3000',
			'PUTTEXT "hostfile", &3000',
			'```',
		].join('\n'),
		},
	},
	// PUTBASIC <host filename> [,<beeb filename>]
	{
		label: 'PUTBASIC',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`PUTBASIC <host filename> [,<beeb filename>]`',
			'This takes a BASIC program as a plain text file on the host OS, tokenises it,',
			'and outputs it to the disc image as a native BASIC file. Credit to Thomas Harte',
			'for the BASIC tokenising routine. Line numbers can be provided in the text file',
			'if desired, but if not present they will be automatically generated.',
			'```beebasm',
			'PUTBASIC "hostfile", "beebfile"',
			'PUTBASIC "hostfile"',
			'```',
		].join('\n'),
		},
	},
	// MACRO <name> [,<parameter list...>]
	{
		label: 'MACRO',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`MACRO <name> [,<parameter list...>]`',
			'This pair of commands is used to define assembler macros. Their use is best',
			'illustrated by an example:',
			'```beebasm',
			'MACRO ADDI8 addr, val',
			'IF val=1',
			'INC addr',
			'ELIF val>1',
			'CLC',
			'LDA addr',
			'ADC #val',
			'STA addr',
			'ENDIF',
			'ENDMACRO',
			'```',
			'This defines a macro called ADDI8 ("ADD Immediate 8-bit") whose function is to add a constant to a memory address. It expects two parameters: the memory address and the constant value. The body of the macro contains an IF block which will generate the most appropriate code according to the constant value passed in.',
			'Then, at any point afterwards, the macro can be used as follows:',
			'```beebasm',
			'ADDI8 &900, 1            ; increment address &900 by 1',
			'ADDI8 bonus, 10          ; add 10 to the memory location \'bonus\'',
			'ADDI8 pills, pill_add    ; pills += pill_add',
			'```',
		].join('\n'),
		},
	},
	// ERROR "message"
	{
		label: 'ERROR',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`ERROR "message"`',
			'Causes BeebAsm to abort assembly with the provided error message. This can be',
			'useful for enforcing certain constraints on generated code, for example:',
			'```beebasm',
			'.table',
			'FOR n, 1, 32',
			'	EQUB 255 / n',
			'NEXT',
			'',
			'IF HI(P%)<>HI(table)',
			'	ERROR "Table crosses page boundary"',
			'ENDIF',
			'```',
		].join('\n'),
		},
	},
	// COPYBLOCK <start>,<end>,<dest>
	{
		label: 'COPYBLOCK',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`COPYBLOCK <start>,<end>,<dest>`',
			'Copies a block of assembled data from one location to another. This is',
			'useful to copy code assembled at one location into a program\'s data area',
			'for relocation at run-time.',
			'```beebasm',
			'COPYBLOCK &3000, &4000, &0D00',
			'```',
		].join('\n'),
		},
	},
	// RANDOMIZE <n>
	{
		label: 'RANDOMIZE',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`RANDOMIZE <n>`',
			'Seed the random number generator used by the RND() function. If this',
			'is not used, the random number generator is seeded based on the',
			'current time and so each build of a program using RND() will be different.',
			'```beebasm',
			'RANDOMIZE 0',
			'```',
		].join('\n'),
		},
	},
	// ASM <str>
	{
		label: 'ASM',
		documentation: {
		kind: MarkupKind.Markdown,
		value: [
			'`ASM <str>`',
			'Assemble the supplied assembly language string. For example:',
			'```beebasm',
			'ASM "LDA #&41"',
			'```',
		].join('\n'),
		},
	},
];

export type opcodeinfo = {
	mnemonic: string;
	addressing: string;
	bytecode: string;
	cycles: string;
	description: string;
	operation: string;
	flags: string;
};

export const opcodeData: Map<number, opcodeinfo> = new Map<number, opcodeinfo> ([
[0, {mnemonic: "BRK",addressing: "", bytecode: "00", cycles: "7", description: "Force Interrupt", operation: "PC + 2↓, [FFFE] → PCL, [FFFF] → PCH", flags: "-----1--"}],
[1, {mnemonic: "ORA",addressing: "(a8,X)", bytecode: "01", cycles: "6", description: "Logical OR", operation: "A ∨ M → A", flags: "N-----Z-"}],
[5, {mnemonic: "ORA",addressing: "a8", bytecode: "05", cycles: "3", description: "Logical OR", operation: "A ∨ M → A", flags: "N-----Z-"}],
[6, {mnemonic: "ASL",addressing: "a8", bytecode: "06", cycles: "5", description: "Arithmetic Shift Left", operation: "C ← /M7...M0/ ← 0", flags: "N-----ZC"}],
[8, {mnemonic: "PHP",addressing: "", bytecode: "08", cycles: "3", description: "Push Processor Status", operation: "P↓", flags: "--------"}],
[9, {mnemonic: "ORA",addressing: "#d8", bytecode: "09", cycles: "2", description: "Logical OR", operation: "A ∨ M → A", flags: "N-----Z-"}],
[10, {mnemonic: "ASL",addressing: "A", bytecode: "0A", cycles: "2", description: "Arithmetic Shift Left", operation: "C ← /M7...M0/ ← 0", flags: "N-----ZC"}],
[13, {mnemonic: "ORA",addressing: "a16", bytecode: "0D", cycles: "4", description: "Logical OR", operation: "A ∨ M → A", flags: "N-----Z-"}],
[14, {mnemonic: "ASL",addressing: "a16", bytecode: "0E", cycles: "6", description: "Arithmetic Shift Left", operation: "C ← /M7...M0/ ← 0", flags: "N-----ZC"}],
[16, {mnemonic: "BPL",addressing: "r8", bytecode: "10", cycles: "2+t+p", description: "Branch if Plus", operation: "Branch on N = 0", flags: "--------"}],
[17, {mnemonic: "ORA",addressing: "(a8),Y", bytecode: "11", cycles: "5+p", description: "Logical OR", operation: "A ∨ M → A", flags: "N-----Z-"}],
[21, {mnemonic: "ORA",addressing: "a8,X", bytecode: "15", cycles: "4", description: "Logical OR", operation: "A ∨ M → A", flags: "N-----Z-"}],
[22, {mnemonic: "ASL",addressing: "a8,X", bytecode: "16", cycles: "6", description: "Arithmetic Shift Left", operation: "C ← /M7...M0/ ← 0", flags: "N-----ZC"}],
[24, {mnemonic: "CLC",addressing: "", bytecode: "18", cycles: "2", description: "Clear Carry Flag", operation: "0 → C", flags: "-------0"}],
[25, {mnemonic: "ORA",addressing: "a16,Y", bytecode: "19", cycles: "4+p", description: "Logical OR", operation: "A ∨ M → A", flags: "N-----Z-"}],
[29, {mnemonic: "ORA",addressing: "a16,X", bytecode: "1D", cycles: "4+p", description: "Logical OR", operation: "A ∨ M → A", flags: "N-----Z-"}],
[30, {mnemonic: "ASL",addressing: "a16,X", bytecode: "1E", cycles: "7", description: "Arithmetic Shift Left", operation: "C ← /M7...M0/ ← 0", flags: "N-----ZC"}],
[32, {mnemonic: "JSR",addressing: "a16", bytecode: "20", cycles: "6", description: "Jump to Subroutine", operation: "PC + 2↓, [PC + 1] → PCL, [PC + 2] → PCH", flags: "--------"}],
[33, {mnemonic: "AND",addressing: "(a8,X)", bytecode: "21", cycles: "6", description: "Logical AND", operation: "A ∧ M → A", flags: "N-----Z-"}],
[36, {mnemonic: "BIT",addressing: "a8", bytecode: "24", cycles: "3", description: "Bit Test", operation: "A ∧ M, M7 → N, M6 → V", flags: "NV----Z-"}],
[37, {mnemonic: "AND",addressing: "a8", bytecode: "25", cycles: "3", description: "Logical AND", operation: "A ∧ M → A", flags: "N-----Z-"}],
[38, {mnemonic: "ROL",addressing: "a8", bytecode: "26", cycles: "5", description: "Rotate Left", operation: "C ← /M7...M0/ ← C", flags: "N-----ZC"}],
[40, {mnemonic: "PLP",addressing: "", bytecode: "28", cycles: "4", description: "Pull Processor Status", operation: "P↑", flags: "NV--DIZC"}],
[41, {mnemonic: "AND",addressing: "#d8", bytecode: "29", cycles: "2", description: "Logical AND", operation: "A ∧ M → A", flags: "N-----Z-"}],
[42, {mnemonic: "ROL",addressing: "A", bytecode: "2A", cycles: "2", description: "Rotate Left", operation: "C ← /M7...M0/ ← C", flags: "N-----ZC"}],
[44, {mnemonic: "BIT",addressing: "a16", bytecode: "2C", cycles: "4", description: "Bit Test", operation: "A ∧ M, M7 → N, M6 → V", flags: "NV----Z-"}],
[45, {mnemonic: "AND",addressing: "a16", bytecode: "2D", cycles: "4", description: "Logical AND", operation: "A ∧ M → A", flags: "N-----Z-"}],
[46, {mnemonic: "ROL",addressing: "a16", bytecode: "2E", cycles: "6", description: "Rotate Left", operation: "C ← /M7...M0/ ← C", flags: "N-----ZC"}],
[48, {mnemonic: "BMI",addressing: "r8", bytecode: "30", cycles: "2+t+p", description: "Branch if Minus", operation: "Branch on N = 1", flags: "--------"}],
[49, {mnemonic: "AND",addressing: "(a8),Y", bytecode: "31", cycles: "5+p", description: "Logical AND", operation: "A ∧ M → A", flags: "N-----Z-"}],
[53, {mnemonic: "AND",addressing: "a8,X", bytecode: "35", cycles: "4", description: "Logical AND", operation: "A ∧ M → A", flags: "N-----Z-"}],
[54, {mnemonic: "ROL",addressing: "a8,X", bytecode: "36", cycles: "6", description: "Rotate Left", operation: "C ← /M7...M0/ ← C", flags: "N-----ZC"}],
[56, {mnemonic: "SEC",addressing: "", bytecode: "38", cycles: "2", description: "Set Carry Flag", operation: "1 → C", flags: "-------1"}],
[57, {mnemonic: "AND",addressing: "a16,Y", bytecode: "39", cycles: "4+p", description: "Logical AND", operation: "A ∧ M → A", flags: "N-----Z-"}],
[61, {mnemonic: "AND",addressing: "a16,X", bytecode: "3D", cycles: "4+p", description: "Logical AND", operation: "A ∧ M → A", flags: "N-----Z-"}],
[62, {mnemonic: "ROL",addressing: "a16,X", bytecode: "3E", cycles: "7", description: "Rotate Left", operation: "C ← /M7...M0/ ← C", flags: "N-----ZC"}],
[64, {mnemonic: "RTI",addressing: "", bytecode: "40", cycles: "6", description: "Return from Interrupt", operation: "P↑ PC↑", flags: "NV--DIZC"}],
[65, {mnemonic: "EOR",addressing: "(a8,X)", bytecode: "41", cycles: "6", description: "Exclusive OR", operation: "A ⊻ M → A", flags: "N-----Z-"}],
[69, {mnemonic: "EOR",addressing: "a8", bytecode: "45", cycles: "3", description: "Exclusive OR", operation: "A ⊻ M → A", flags: "N-----Z-"}],
[70, {mnemonic: "LSR",addressing: "a8", bytecode: "46", cycles: "5", description: "Logical Shift Right", operation: "0 → /M7...M0/ → C", flags: "0-----ZC"}],
[72, {mnemonic: "PHA",addressing: "", bytecode: "48", cycles: "3", description: "Push Accumulator", operation: "A↓", flags: "--------"}],
[73, {mnemonic: "EOR",addressing: "#d8", bytecode: "49", cycles: "2", description: "Exclusive OR", operation: "A ⊻ M → A", flags: "N-----Z-"}],
[74, {mnemonic: "LSR",addressing: "A", bytecode: "4A", cycles: "2", description: "Logical Shift Right", operation: "0 → /M7...M0/ → C", flags: "0-----ZC"}],
[76, {mnemonic: "JMP",addressing: "a16", bytecode: "4C", cycles: "3", description: "Jump", operation: "[PC + 1] → PCL, [PC + 2] → PCH", flags: "--------"}],
[77, {mnemonic: "EOR",addressing: "a16", bytecode: "4D", cycles: "4", description: "Exclusive OR", operation: "A ⊻ M → A", flags: "N-----Z-"}],
[78, {mnemonic: "LSR",addressing: "a16", bytecode: "4E", cycles: "6", description: "Logical Shift Right", operation: "0 → /M7...M0/ → C", flags: "0-----ZC"}],
[80, {mnemonic: "BVC",addressing: "r8", bytecode: "50", cycles: "2+t+p", description: "Branch if Overflow Clear", operation: "Branch on V = 0", flags: "--------"}],
[81, {mnemonic: "EOR",addressing: "(a8),Y", bytecode: "51", cycles: "5+p", description: "Exclusive OR", operation: "A ⊻ M → A", flags: "N-----Z-"}],
[85, {mnemonic: "EOR",addressing: "a8,X", bytecode: "55", cycles: "4", description: "Exclusive OR", operation: "A ⊻ M → A", flags: "N-----Z-"}],
[86, {mnemonic: "LSR",addressing: "a8,X", bytecode: "56", cycles: "6", description: "Logical Shift Right", operation: "0 → /M7...M0/ → C", flags: "0-----ZC"}],
[88, {mnemonic: "CLI",addressing: "", bytecode: "58", cycles: "2", description: "Clear Interrupt Disable", operation: "0 → I", flags: "-----0--"}],
[89, {mnemonic: "EOR",addressing: "a16,Y", bytecode: "59", cycles: "4+p", description: "Exclusive OR", operation: "A ⊻ M → A", flags: "N-----Z-"}],
[93, {mnemonic: "EOR",addressing: "a16,X", bytecode: "5D", cycles: "4+p", description: "Exclusive OR", operation: "A ⊻ M → A", flags: "N-----Z-"}],
[94, {mnemonic: "LSR",addressing: "a16,X", bytecode: "5E", cycles: "7", description: "Logical Shift Right", operation: "0 → /M7...M0/ → C", flags: "0-----ZC"}],
[96, {mnemonic: "RTS",addressing: "", bytecode: "60", cycles: "6", description: "Return from Subroutine", operation: "PC↑, PC + 1 → PC", flags: "--------"}],
[97, {mnemonic: "ADC",addressing: "(a8,X)", bytecode: "61", cycles: "6", description: "Add with Carry", operation: "A + M + C → A, C", flags: "NV----ZC"}],
[101, {mnemonic: "ADC",addressing: "a8", bytecode: "65", cycles: "3", description: "Add with Carry", operation: "A + M + C → A, C", flags: "NV----ZC"}],
[102, {mnemonic: "ROR",addressing: "a8", bytecode: "66", cycles: "5", description: "Rotate Right", operation: "C → /M7...M0/ → C", flags: "N-----ZC"}],
[104, {mnemonic: "PLA",addressing: "", bytecode: "68", cycles: "4", description: "Pull Accumulator", operation: "A↑", flags: "N-----Z-"}],
[105, {mnemonic: "ADC",addressing: "#d8", bytecode: "69", cycles: "2", description: "Add with Carry", operation: "A + M + C → A, C", flags: "NV----ZC"}],
[106, {mnemonic: "ROR",addressing: "A", bytecode: "6A", cycles: "2", description: "Rotate Right", operation: "C → /M7...M0/ → C", flags: "N-----ZC"}],
[108, {mnemonic: "JMP",addressing: "(a16)", bytecode: "6C", cycles: "5", description: "Jump", operation: "[PC + 1] → PCL, [PC + 2] → PCH", flags: "--------"}],
[109, {mnemonic: "ADC",addressing: "a16", bytecode: "6D", cycles: "4", description: "Add with Carry", operation: "A + M + C → A, C", flags: "NV----ZC"}],
[110, {mnemonic: "ROR",addressing: "a16", bytecode: "6E", cycles: "6", description: "Rotate Right", operation: "C → /M7...M0/ → C", flags: "N-----ZC"}],
[112, {mnemonic: "BVS",addressing: "r8", bytecode: "70", cycles: "2+t+p", description: "Branch if Overflow Set", operation: "Branch on V = 1", flags: "--------"}],
[113, {mnemonic: "ADC",addressing: "(a8),Y", bytecode: "71", cycles: "5+p", description: "Add with Carry", operation: "A + M + C → A, C", flags: "NV----ZC"}],
[117, {mnemonic: "ADC",addressing: "a8,X", bytecode: "75", cycles: "4", description: "Add with Carry", operation: "A + M + C → A, C", flags: "NV----ZC"}],
[118, {mnemonic: "ROR",addressing: "a8,X", bytecode: "76", cycles: "6", description: "Rotate Right", operation: "C → /M7...M0/ → C", flags: "N-----ZC"}],
[120, {mnemonic: "SEI",addressing: "", bytecode: "78", cycles: "2", description: "Set Interrupt Disable", operation: "1 → I", flags: "-----1--"}],
[121, {mnemonic: "ADC",addressing: "a16,Y", bytecode: "79", cycles: "4+p", description: "Add with Carry", operation: "A + M + C → A, C", flags: "NV----ZC"}],
[125, {mnemonic: "ADC",addressing: "a16,X", bytecode: "7D", cycles: "4+p", description: "Add with Carry", operation: "A + M + C → A, C", flags: "NV----ZC"}],
[126, {mnemonic: "ROR",addressing: "a16,X", bytecode: "7E", cycles: "7", description: "Rotate Right", operation: "C → /M7...M0/ → C", flags: "N-----ZC"}],
[129, {mnemonic: "STA",addressing: "(a8,X)", bytecode: "81", cycles: "6", description: "Store Accumulator", operation: "A → M", flags: "--------"}],
[132, {mnemonic: "STY",addressing: "a8", bytecode: "84", cycles: "3", description: "Store Y Register", operation: "Y → M", flags: "--------"}],
[133, {mnemonic: "STA",addressing: "a8", bytecode: "85", cycles: "3", description: "Store Accumulator", operation: "A → M", flags: "--------"}],
[134, {mnemonic: "STX",addressing: "a8", bytecode: "86", cycles: "3", description: "Store X Register", operation: "X → M", flags: "--------"}],
[136, {mnemonic: "DEY",addressing: "", bytecode: "88", cycles: "2", description: "Decrement Y Register", operation: "Y - 1 → Y", flags: "N-----Z-"}],
[138, {mnemonic: "TXA",addressing: "", bytecode: "8A", cycles: "2", description: "Transfer X to Accumulator", operation: "X → A", flags: "N-----Z-"}],
[140, {mnemonic: "STY",addressing: "a16", bytecode: "8C", cycles: "4", description: "Store Y Register", operation: "Y → M", flags: "--------"}],
[141, {mnemonic: "STA",addressing: "a16", bytecode: "8D", cycles: "4", description: "Store Accumulator", operation: "A → M", flags: "--------"}],
[142, {mnemonic: "STX",addressing: "a16", bytecode: "8E", cycles: "4", description: "Store X Register", operation: "X → M", flags: "--------"}],
[144, {mnemonic: "BCC",addressing: "r8", bytecode: "90", cycles: "2+t+p", description: "Branch if Carry Clear", operation: "Branch on C = 0", flags: "--------"}],
[145, {mnemonic: "STA",addressing: "(a8),Y", bytecode: "91", cycles: "6", description: "Store Accumulator", operation: "A → M", flags: "--------"}],
[148, {mnemonic: "STY",addressing: "a8,X", bytecode: "94", cycles: "4", description: "Store Y Register", operation: "Y → M", flags: "--------"}],
[149, {mnemonic: "STA",addressing: "a8,X", bytecode: "95", cycles: "4", description: "Store Accumulator", operation: "A → M", flags: "--------"}],
[150, {mnemonic: "STX",addressing: "a8,Y", bytecode: "96", cycles: "4", description: "Store X Register", operation: "X → M", flags: "--------"}],
[152, {mnemonic: "TYA",addressing: "", bytecode: "98", cycles: "2", description: "Transfer Y to Accumulator", operation: "Y → A", flags: "N-----Z-"}],
[153, {mnemonic: "STA",addressing: "a16,Y", bytecode: "99", cycles: "5", description: "Store Accumulator", operation: "A → M", flags: "--------"}],
[154, {mnemonic: "TXS",addressing: "", bytecode: "9A", cycles: "2", description: "Transfer X to Stack Pointer", operation: "X → S", flags: "--------"}],
[157, {mnemonic: "STA",addressing: "a16,X", bytecode: "9D", cycles: "5", description: "Store Accumulator", operation: "A → M", flags: "--------"}],
[160, {mnemonic: "LDY",addressing: "#d8", bytecode: "A0", cycles: "2", description: "Load Y Register", operation: "M → Y", flags: "N-----Z-"}],
[161, {mnemonic: "LDA",addressing: "(a8,X)", bytecode: "A1", cycles: "6", description: "Load Accumulator", operation: "M → A", flags: "N-----Z-"}],
[162, {mnemonic: "LDX",addressing: "#d8", bytecode: "A2", cycles: "2", description: "Load X Register", operation: "M → X", flags: "N-----Z-"}],
[164, {mnemonic: "LDY",addressing: "a8", bytecode: "A4", cycles: "3", description: "Load Y Register", operation: "M → Y", flags: "N-----Z-"}],
[165, {mnemonic: "LDA",addressing: "a8", bytecode: "A5", cycles: "3", description: "Load Accumulator", operation: "M → A", flags: "N-----Z-"}],
[166, {mnemonic: "LDX",addressing: "a8", bytecode: "A6", cycles: "3", description: "Load X Register", operation: "M → X", flags: "N-----Z-"}],
[168, {mnemonic: "TAY",addressing: "", bytecode: "A8", cycles: "2", description: "Transfer Accumulator to Y", operation: "A → Y", flags: "N-----Z-"}],
[169, {mnemonic: "LDA",addressing: "#d8", bytecode: "A9", cycles: "2", description: "Load Accumulator", operation: "M → A", flags: "N-----Z-"}],
[170, {mnemonic: "TAX",addressing: "", bytecode: "AA", cycles: "2", description: "Transfer Accumulator to X", operation: "A → X", flags: "N-----Z-"}],
[172, {mnemonic: "LDY",addressing: "a16", bytecode: "AC", cycles: "4", description: "Load Y Register", operation: "M → Y", flags: "N-----Z-"}],
[173, {mnemonic: "LDA",addressing: "a16", bytecode: "AD", cycles: "4", description: "Load Accumulator", operation: "M → A", flags: "N-----Z-"}],
[174, {mnemonic: "LDX",addressing: "a16", bytecode: "AE", cycles: "4", description: "Load X Register", operation: "M → X", flags: "N-----Z-"}],
[176, {mnemonic: "BCS",addressing: "r8", bytecode: "B0", cycles: "2+t+p", description: "Branch if Carry Set", operation: "Branch on C = 1", flags: "--------"}],
[177, {mnemonic: "LDA",addressing: "(a8),Y", bytecode: "B1", cycles: "5+p", description: "Load Accumulator", operation: "M → A", flags: "N-----Z-"}],
[180, {mnemonic: "LDY",addressing: "a8,X", bytecode: "B4", cycles: "4", description: "Load Y Register", operation: "M → Y", flags: "N-----Z-"}],
[181, {mnemonic: "LDA",addressing: "a8,X", bytecode: "B5", cycles: "4", description: "Load Accumulator", operation: "M → A", flags: "N-----Z-"}],
[182, {mnemonic: "LDX",addressing: "a8,Y", bytecode: "B6", cycles: "4", description: "Load X Register", operation: "M → X", flags: "N-----Z-"}],
[184, {mnemonic: "CLV",addressing: "", bytecode: "B8", cycles: "2", description: "Clear Overflow Flag", operation: "0 → V", flags: "-0------"}],
[185, {mnemonic: "LDA",addressing: "a16,Y", bytecode: "B9", cycles: "4+p", description: "Load Accumulator", operation: "M → A", flags: "N-----Z-"}],
[186, {mnemonic: "TSX",addressing: "", bytecode: "BA", cycles: "2", description: "Transfer Stack Pointer to X", operation: "S → X", flags: "N-----Z-"}],
[188, {mnemonic: "LDY",addressing: "a16,X", bytecode: "BC", cycles: "4+p", description: "Load Y Register", operation: "M → Y", flags: "N-----Z-"}],
[189, {mnemonic: "LDA",addressing: "a16,X", bytecode: "BD", cycles: "4+p", description: "Load Accumulator", operation: "M → A", flags: "N-----Z-"}],
[190, {mnemonic: "LDX",addressing: "a16,Y", bytecode: "BE", cycles: "4+p", description: "Load X Register", operation: "M → X", flags: "N-----Z-"}],
[192, {mnemonic: "CPY",addressing: "#d8", bytecode: "C0", cycles: "2", description: "Compare Y Register", operation: "Y - M", flags: "N-----ZC"}],
[193, {mnemonic: "CMP",addressing: "(a8,X)", bytecode: "C1", cycles: "6", description: "Compare", operation: "A - M", flags: "N-----ZC"}],
[196, {mnemonic: "CPY",addressing: "a8", bytecode: "C4", cycles: "3", description: "Compare Y Register", operation: "Y - M", flags: "N-----ZC"}],
[197, {mnemonic: "CMP",addressing: "a8", bytecode: "C5", cycles: "3", description: "Compare", operation: "A - M", flags: "N-----ZC"}],
[198, {mnemonic: "DEC",addressing: "a8", bytecode: "C6", cycles: "5", description: "Decrement Memory", operation: "M - 1 → M", flags: "N-----Z-"}],
[200, {mnemonic: "INY",addressing: "", bytecode: "C8", cycles: "2", description: "Increment Y Register", operation: "Y + 1 → Y", flags: "N-----Z-"}],
[201, {mnemonic: "CMP",addressing: "#d8", bytecode: "C9", cycles: "2", description: "Compare", operation: "A - M", flags: "N-----ZC"}],
[202, {mnemonic: "DEX",addressing: "", bytecode: "CA", cycles: "2", description: "Decrement X Register", operation: "X - 1 → X", flags: "N-----Z-"}],
[204, {mnemonic: "CPY",addressing: "a16", bytecode: "CC", cycles: "4", description: "Compare Y Register", operation: "Y - M", flags: "N-----ZC"}],
[205, {mnemonic: "CMP",addressing: "a16", bytecode: "CD", cycles: "4", description: "Compare", operation: "A - M", flags: "N-----ZC"}],
[206, {mnemonic: "DEC",addressing: "a16", bytecode: "CE", cycles: "6", description: "Decrement Memory", operation: "M - 1 → M", flags: "N-----Z-"}],
[208, {mnemonic: "BNE",addressing: "r8", bytecode: "D0", cycles: "2+t+p", description: "Branch if Not Equal", operation: "Branch on Z = 0", flags: "--------"}],
[209, {mnemonic: "CMP",addressing: "(a8),Y", bytecode: "D1", cycles: "5+p", description: "Compare", operation: "A - M", flags: "N-----ZC"}],
[213, {mnemonic: "CMP",addressing: "a8,X", bytecode: "D5", cycles: "4", description: "Compare", operation: "A - M", flags: "N-----ZC"}],
[214, {mnemonic: "DEC",addressing: "a8,X", bytecode: "D6", cycles: "6", description: "Decrement Memory", operation: "M - 1 → M", flags: "N-----Z-"}],
[216, {mnemonic: "CLD",addressing: "", bytecode: "D8", cycles: "2", description: "Clear Decimal Mode", operation: "0 → D", flags: "----0---"}],
[217, {mnemonic: "CMP",addressing: "a16,Y", bytecode: "D9", cycles: "4+p", description: "Compare", operation: "A - M", flags: "N-----ZC"}],
[221, {mnemonic: "CMP",addressing: "a16,X", bytecode: "DD", cycles: "4+p", description: "Compare", operation: "A - M", flags: "N-----ZC"}],
[222, {mnemonic: "DEC",addressing: "a16,X", bytecode: "DE", cycles: "7", description: "Decrement Memory", operation: "M - 1 → M", flags: "N-----Z-"}],
[224, {mnemonic: "CPX",addressing: "#d8", bytecode: "E0", cycles: "2", description: "Compare X Register", operation: "X - M", flags: "N-----ZC"}],
[225, {mnemonic: "SBC",addressing: "(a8,X)", bytecode: "E1", cycles: "6", description: "Subtract with Carry", operation: "A - M - ~C → A", flags: "NV----ZC"}],
[228, {mnemonic: "CPX",addressing: "a8", bytecode: "E4", cycles: "3", description: "Compare X Register", operation: "X - M", flags: "N-----ZC"}],
[229, {mnemonic: "SBC",addressing: "a8", bytecode: "E5", cycles: "3", description: "Subtract with Carry", operation: "A - M - ~C → A", flags: "NV----ZC"}],
[230, {mnemonic: "INC",addressing: "a8", bytecode: "E6", cycles: "5", description: "Increment Memory", operation: "M + 1 → M", flags: "N-----Z-"}],
[232, {mnemonic: "INX",addressing: "", bytecode: "E8", cycles: "2", description: "Increment X Register", operation: "X + 1 → X", flags: "N-----Z-"}],
[233, {mnemonic: "SBC",addressing: "#d8", bytecode: "E9", cycles: "2", description: "Subtract with Carry", operation: "A - M - ~C → A", flags: "NV----ZC"}],
[234, {mnemonic: "NOP",addressing: "", bytecode: "EA", cycles: "2", description: "No Operation", operation: "No operation", flags: "--------"}],
[236, {mnemonic: "CPX",addressing: "a16", bytecode: "EC", cycles: "4", description: "Compare X Register", operation: "X - M", flags: "N-----ZC"}],
[237, {mnemonic: "SBC",addressing: "a16", bytecode: "ED", cycles: "4", description: "Subtract with Carry", operation: "A - M - ~C → A", flags: "NV----ZC"}],
[238, {mnemonic: "INC",addressing: "a16", bytecode: "EE", cycles: "6", description: "Increment Memory", operation: "M + 1 → M", flags: "N-----Z-"}],
[240, {mnemonic: "BEQ",addressing: "r8", bytecode: "F0", cycles: "2+t+p", description: "Branch if Equal", operation: "Branch on Z = 1", flags: "--------"}],
[241, {mnemonic: "SBC",addressing: "(a8),Y", bytecode: "F1", cycles: "5+p", description: "Subtract with Carry", operation: "A - M - ~C → A", flags: "NV----ZC"}],
[245, {mnemonic: "SBC",addressing: "a8,X", bytecode: "F5", cycles: "4", description: "Subtract with Carry", operation: "A - M - ~C → A", flags: "NV----ZC"}],
[246, {mnemonic: "INC",addressing: "a8,X", bytecode: "F6", cycles: "6", description: "Increment Memory", operation: "M + 1 → M", flags: "N-----Z-"}],
[248, {mnemonic: "SED",addressing: "", bytecode: "F8", cycles: "2", description: "Set Decimal Flag", operation: "1 → D", flags: "----1---"}],
[249, {mnemonic: "SBC",addressing: "a16,Y", bytecode: "F9", cycles: "4+p", description: "Subtract with Carry", operation: "A - M - ~C → A", flags: "NV----ZC"}],
[253, {mnemonic: "SBC",addressing: "a16,X", bytecode: "FD", cycles: "4+p", description: "Subtract with Carry", operation: "A - M - ~C → A", flags: "NV----ZC"}],
[254, {mnemonic: "INC",addressing: "a16,X", bytecode: "FE", cycles: "7", description: "Increment Memory", operation: "M + 1 → M", flags: "N-----Z-"}]
]);