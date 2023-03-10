import readline from 'readline';
import { createSpinner } from './cli/cli-spinner.js';
import { pathBasename } from './utils.js';

type HexColor = string;
type ColorCode = keyof typeof _consoleColors;

const _tagOffsetLength = 3; // [, ], :
let _maxTagLength = 10 - _tagOffsetLength;
let _showColor = true;

const _consoleColors = {
    /** Black */
    k: '\u001B[30m',
    /** Bright Black */
    bk: '\u001B[90m',
    /** Bright White */
    bw: '\u001B[97m',
    /** Red */
    r: '\u001B[31m',
    /** Bright Red */
    br: '\u001B[91m',
    /** Dark Green */
    g: '\u001B[32m',
    /** Bright Green */
    bg: '\u001B[92m',
    /** Yellow */
    y: '\u001B[33m',
    /** Bright Yellow */
    by: '\u001B[93m',
    /** Blue */
    b: '\u001B[34m',
    /** Bright Blue */
    bb: '\u001B[94m',
    /** Magenta */
    m: '\u001B[35m',
    /** Bright Magenta */
    bm: '\u001B[95m',
    /** Cyan */
    c: '\u001B[36m',
    /** Bright Cyan */
    bc: '\u001B[96m',
    /** Default Color */
    x: '\u001B[39m',
    /** Default Background Color */
    xbg: '\u001B[49m',
    /** Reset All */
    xx: '\u001B[0m',
};

const _colorCodeMap = (function () {
    const map = new Map<string, string>();
    for (const key in _consoleColors) {
        const k = key as ColorCode;
        map.set(k, _consoleColors[k]);
    }
    return map;
})();

export class ConsoleLogger {
    static readonly consoleColors = _consoleColors;

    static get showColor() {
        return _showColor;
    }

    static set showColor(val: boolean) {
        _showColor = val;
    }

    static set maxTagLength(val: number) {
        _maxTagLength = val;
    }

    static info(msg: string) {
        log('info', msg, 'g');
    }

    static error(msg: string) {
        log('error', msg, 'r');
    }

    static chainInfo(msgs: string[]) {
        chainLogs(msgs, 'info');
    }

    static chainError(msgs: string[]) {
        chainLogs(msgs, 'error');
    }

    static toString(color: ColorCode, tag: string, msg: string) {
        return colorStr(`;${color};${toTag(tag)} ;x;${msg}`);
    }

    static print(color: string, tag: string, msg: string) {
        log(tag, msg, color);
    }

    static promptRaw(msg: string) {
        return this.toString('m', 'prompt', msg);
    }

    static async prompt(query: string) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const answer = await new Promise<string>((rs) => {
            // It's cleaner to have prompt spaced from prior logs
            console.log('');
            rl.question(this.promptRaw(query), rs);
        });
        rl.close();
        return answer;
    }

    static addCustomColor(code: string, color: HexColor) {
        const [r, g, b] = toRGBFromHex(color);
        if (code.length > 3) {
            throw Error('color code must be between 1 and 3 characters long');
        }
        if (_colorCodeMap.has(code)) {
            throw Error(`color code "${code}" already exists`);
        }
        _colorCodeMap.set(code, `\u001B[38;2;${r};${g};${b}m`);
    }

    static printLoader(msg = 'Loading', color = 'by') {
        const loaderStr = getLoaderStr(color);
        const loadMsg = `;bg;*** ;x;${msg} ;bg;***`;
        const spinner = createSpinner(colorStr(`${loaderStr} ;x;${loadMsg}`));
        spinner.start(13);
        return spinner.stop;
    }

    static getLoadPrinter(color = 'by') {
        let spinner: ReturnType<typeof createSpinner> | undefined;
        const loaderStr = getLoaderStr(color);
        return {
            start: (msg = 'Loading') => {
                const loadMsg = `;bg;*** ;by;${msg} ;bg;***`;
                spinner = createSpinner(colorStr(`${loaderStr} ;x;${loadMsg}`));
                spinner.start(13);
            },
            stop: () => {
                if (!spinner) {
                    throw Error('you must start loader before you can stop it');
                }
                spinner.stop();
                spinner = undefined;
            },
        };
    }

    static debug(...args: any[]) {
        const stack = Error('').stack;
        if (!stack) return;
        const [offender, filePath, lineNumber] = getStackInfo(stack);
        this.print('b', 'debug', `;br;${'#'.repeat(65)}\n`);
        console.log(colorStr(';x;\n'), ...args, '\n\n');
        this.print(
            'y',
            'log',
            `;g;Exec ;m;by ;g;${offender || 'file'} ;m;in file ;g;${pathBasename(
                filePath
            )} ;m;at line ;g;${lineNumber}`
        );
        this.print('b', 'debug', `;br;${'#'.repeat(65)}\n`);
        console.log('');
    }
}

function getLoaderStr(color = 'by') {
    const spinCount = 4;
    const spins = '@spin'.repeat(spinCount);
    return `${' '.repeat(_maxTagLength - spinCount)};bm;[;${color};${spins};bm;]:`;
}

function chainLogs(logs: string[], type: 'error' | 'info') {
    const print = type == 'info' ? ConsoleLogger.info : ConsoleLogger.error;
    logs.forEach((log) => {
        if (log) print(log);
        else console.log('');
    });
}

function log(tagName: string, msg: string, color: string) {
    console.log(colorStr(`;${color};${toTag(tagName)};x; ${msg}`));
}

function toTag(tagName: string) {
    if (tagName.length > _maxTagLength) {
        throw Error(`Tag longer than maxTagLength: [${tagName}]`);
    }
    const offsetLength = _maxTagLength - tagName.length;
    return `${' '.repeat(offsetLength)}[${tagName.toUpperCase()}]:`;
}

function colorStr(str: string) {
    const colorCodes = str.match(/;([a-z]){1,3};/g);
    if (!colorCodes) return str;

    const invalidCodes = colorCodes.filter((c) => !_colorCodeMap.has(c.replaceAll(';', '')));
    if (invalidCodes.length) {
        throw Error(`invalid color code(s) "${invalidCodes}"`);
    }

    let coloredStr = str;
    for (const [code, color] of _colorCodeMap) {
        const colorCode = `;${code};`;
        if (str.includes(colorCode)) {
            coloredStr = coloredStr.replaceAll(colorCode, _showColor ? color : '');
        }
    }

    return coloredStr;
}

function toRGBFromHex(hex: string) {
    // Match hex codes: FF00FF or FFF case insensitive
    const hexMatcher = /^[0-9a-f]{6}|[0-9a-f]{3}$/gi;
    if (!hexMatcher.test(hex)) {
        throw Error('invalid hex color');
    }
    const fullHex = hex.length > 3 ? hex : [...hex].map((c) => c + c).join('');
    const intFromHex = parseInt(fullHex, 16);
    return [(intFromHex >> 16) & 0xff, (intFromHex >> 8) & 0xff, intFromHex & 0xff];
}

function getStackInfo(stack: string) {
    const stackLines = stack.split('\n');
    if (!stackLines.length || stackLines[1].trim().indexOf('at ') != 0) {
        throw Error('not a stack trace');
    }
    const hasSourceMap = stack.includes('.ts:');
    const pathLines = stackLines.map((l) => l.trim().replace('file:///', ''));
    // Remove "Error" and Logger{} lines
    pathLines.splice(0, 2);
    const execLine = pathLines[0];
    const offenderFunc = execLine.includes(' (')
        ? execLine.split(' (')[0].replace('at ', '')
        : '';
    const [path, lineNumber] = execLine
        .split(hasSourceMap ? ':\\' : ':/')[1]
        .split(':')
        .map((v) => v.replace(')', ''));
    return [offenderFunc, pathBasename(path), lineNumber] as const;
}
