import { join, basename } from 'path';
import { z, ZodSchema } from 'zod';

export type FansubFilenameData = {
    fansub: string;
    title: string;
    epNum: number;
    paddedEpNum: string;
    season: string | undefined;
};

export function parseWithZod<T extends ZodSchema>(
    schema: T,
    data: unknown,
    failedSchemaName: string
) {
    const zodResp = schema.safeParse(data);
    if (!zodResp.success) {
        const errorMsgArray = [
            `;r;Failed To Parse ;by;${failedSchemaName} ;r;Schema`,
            ...zodResp.error.issues.map((issue) => {
                return `;y;${issue.path};x;: ${
                    issue.message == 'Required' ? 'Missing or Undefined' : issue.message
                }`;
            }),
        ];
        return [errorMsgArray, null] as const;
        // process.exit(1);
    }
    return [null, zodResp.data as z.infer<T>] as const;
}

type AsyncError = {
    success: false;
    error: Error;
};
type AsyncSuccess<T> = {
    success: true;
    data: T;
};

type AsyncResponse<T> = Promise<AsyncError | AsyncSuccess<T>>;

export async function tryCatchAsync<T>(p: Promise<T>): AsyncResponse<T> {
    try {
        const data = await p;
        return {
            success: true,
            data,
        };
    } catch (e) {
        if (e instanceof Error) {
            return {
                success: false,
                error: e,
            };
        }
        return {
            success: false,
            error: Error('unknown error', { cause: e }),
        };
    }
}

export function fitStringEnd(str: string, maxLength: number) {
    if (str.length > maxLength) {
        throw Error(`cannot fit "${str}" inside a length of ${maxLength}`);
    }
    return `${str}${' '.repeat(maxLength - str.length)}`;
}

export function getColoredTimeWatchedStr(seconds: number) {
    const { hours, days, months } = getTimeUnits(seconds);
    const leftOverMinutes = (hours % 1) * 60;
    const coloredMinutesLeft = `;y;${leftOverMinutes.toFixed(0)} ;g;Minutes`;
    const coloredHours = `;y;${Math.floor(hours)} ;g;Hours`;
    const coloredDays = `;y;${hours.toFixed(1)} ;g;Days`;
    const coloredMonths = `;y;${months.toFixed(1)} ;g;Months`;

    const allTimeStr = months >= 1 ? coloredMonths : days >= 1 ? coloredDays : coloredHours;

    return {
        allTimeStr,
        hoursAndMinutesLeft: `${coloredHours};g;, ${coloredMinutesLeft}`,
    };
}

export function getTimeUnits(seconds: number) {
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const months = days / 30;
    return {
        minutes,
        hours,
        days,
        months,
    };
}

export const toReadableBytes = createReadableBytesFunc();
export function createReadableBytesFunc() {
    const m = new Map();
    m.set('TB', 1_099_511_627_776);
    m.set('GB', 1_073_741_824);
    m.set('MB', 1_048_576);
    m.set('KB', 1_024);

    return function toMaxReadableBytes(bytes: number) {
        for (const [strSize, byteSize] of m) {
            if (bytes >= byteSize) {
                return `${(bytes / byteSize).toFixed(2)} ${strSize}`;
            }
        }
        throw Error(`cannot determine size of "${bytes}" bytes`);
    };
}

export function parseFansubFilename(name: string) {
    const fansubRegEx =
        /^\[([\w|\d|\s-]+)\]\s(.+)(\sS[0-9]{1,2})?\s([0-9]{2,4}|S([0-9]{2})E([0-9]{2,4})|[0-9]{2,4}v[0-9])(\s|\.)/gi;
    const parts = fansubRegEx.exec(name);
    if (!parts) {
        const errorMessage =
            name.toLowerCase().includes('(batch)') || name.toLowerCase().includes('[batch]')
                ? 'This is a batch file, which means the season is over.'
                : 'Try to find another fansub group.';
        return [{ parseError: errorMessage, fileName: name }, null] as const;
    }
    return [null, serializeFansubFilename(parts)] as const;
}

function serializeFansubFilename(filenameParts: string[]) {
    const [, fansub, title, seasonP, epNumP, seasonAlt, epNumAlt] = filenameParts;

    let epNum = 0;
    let paddedEpNum = '';
    let season = '';

    if (seasonAlt) {
        epNum = Number(epNumAlt);
        paddedEpNum = epNumAlt;
        season = seasonAlt;
    } else {
        epNum = Number(epNumP);
        paddedEpNum = epNumP.includes('v') ? epNumP.split('v')[0] : epNumP;
        season = seasonP;
    }

    const filenameData: FansubFilenameData = {
        fansub,
        title: title[title.length - 1] == '-' ? title.substring(0, title.length - 2) : title,
        epNum,
        paddedEpNum,
        season,
    };
    return filenameData;
}

export function wait(delay = 500) {
    return new Promise((rs) => {
        setTimeout(() => {
            rs('');
        }, delay);
    });
}

export const pathJoin = join;
export const pathBasename = basename;
