import { existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { Kitsu } from './kitsu/kitsu.js';
import { pathJoin, titleFromAnimeFileName, toEpisodeNumberStr, truncateStr } from './utils.js';
import { Help } from './help.js';
import { KitsuCacheItem, KitsuCache } from './kitsu/kitsu-types.js';
import { Config } from './config.js';

type WatchConfig = {
    forcedEpNumber: number;
    fileEpNumber: number;
    workingDir: string;
};

export async function watchAnime(
    epName: string,
    epNumStrings: [string, string],
    workingDir: string
) {
    validateParams([epName, epNumStrings, workingDir]);
    _con.info(`Working directory: ;bg;${workingDir}`);
    const [fileEpNumStr, forcedEpNumStr] = epNumStrings;

    tryCreateWatchedDir(workingDir);
    const epNumStr = toEpisodeNumberStr(Number(fileEpNumStr));
    const fansubFileNames = filterSubsPleaseFiles(workingDir, epName, `- ${epNumStr}`);

    const cachedAnime = getCachedAnimeFromFiles(fansubFileNames, epName, epNumStr);
    const validCache = validateCachedAnime(cachedAnime, fansubFileNames, epNumStr);

    await setAnimeProgress(validCache, {
        workingDir,
        forcedEpNumber: Number(forcedEpNumStr),
        fileEpNumber: Number(fileEpNumStr),
    });
    moveFileToWatchedDir(fansubFileNames[0], workingDir);
}

function validateParams(params: [string, string[], string]) {
    const [epName, epNumbers, workingDir] = params;

    if (!existsSync(workingDir)) {
        _con.error(`Working directory invalid: ;y;${workingDir}`);
        process.exit(1);
    }

    const hasInvalidArgs =
        !epName ||
        !epNumbers.length ||
        isNaN(Number(epNumbers[0])) ||
        isNaN(Number(epNumbers[1]));

    if (hasInvalidArgs) {
        _con.chainError([
            'Incorrect Argument Syntax',
            `;by;Read the syntax below and try again`,
            '',
        ]);
        const defaultHelp = Help.findHelp('default');
        if (defaultHelp) Help.displayHelp(defaultHelp);
        process.exit(1);
    }
}

function tryCreateWatchedDir(workingDir: string) {
    const watchedDir = pathJoin(workingDir, 'watched');

    if (!existsSync(watchedDir)) {
        mkdirSync(watchedDir);
        _con.info(`Watched directory created: ;by;${watchedDir}`);
    }
}

function filterSubsPleaseFiles(workingDir: string, epName: string, epNumSyntax: string) {
    return readdirSync(workingDir, { withFileTypes: true })
        .filter((file) => file.isFile())
        .map((file) => file.name.toLowerCase())
        .filter(
            (name) =>
                name.includes('[subsplease]') &&
                name.includes(epName) &&
                name.includes(epNumSyntax)
        );
}

function getCachedAnimeFromFiles(fileNames: string[], epName: string, epNumStr: string) {
    if (!fileNames.length) {
        _con.error(`;by;${epName} ;x;episode ;by;${epNumStr} ;x;does NOT exist`);
        process.exit(1);
    }

    if (fileNames.length == 1) {
        return Kitsu.animeCache.filter(
            (anime) =>
                anime.jpTitle.toLowerCase().includes(epName) ||
                anime.enTitle.toLowerCase().includes(epName)
        );
    }
    displayErrorTooManyFiles(fileNames, epName, epNumStr);
    process.exit(1);
}

function displayErrorTooManyFiles(fileNames: string[], epName: string, epNumStr: string) {
    const errorChain = ['', `;r;More than one file name found`];

    for (const fileName of fileNames) {
        const trimmedFileName = truncateStr(fileName.split('- ' + epNumStr)[0].trimEnd(), 60);
        errorChain.push(`;by;${trimmedFileName} ;x;- ${epNumStr}`);
    }

    _con.chainError(errorChain);
}

function validateCachedAnime(cache: KitsuCache, fileNames: string[], epNumStr: string) {
    if (!cache.length) {
        _con.chainError([
            '',
            `;r;Watch List Incomplete`,
            `;bc;Missing: ;g;${titleFromAnimeFileName(fileNames[0], epNumStr)}`,
        ]);
        process.exit(1);
    }

    if (cache.length > 1) {
        const errorChain = ['', `;r;Multiple Cached Titles Found`];
        cache.forEach((anime) => errorChain.push(`;bc;Title: ;x;${anime.jpTitle}`));
        _con.chainError([...errorChain, `;by;Use a more unique name to reference the episode`]);
        process.exit(1);
    }
    return cache[0];
}

async function setAnimeProgress(cachedItem: KitsuCacheItem, config: WatchConfig) {
    const progress = await Kitsu.updateAnime(
        `https://kitsu.io/api/edge/library-entries/${cachedItem.libID}`,
        {
            data: {
                id: cachedItem.libID,
                type: 'library-entries',
                attributes: {
                    progress: config.forcedEpNumber || config.fileEpNumber,
                },
            },
        }
    );
    // Mutates config Class item cache
    cachedItem.epProgress = progress;
    _con.chainInfo([
        '',
        `;bc;Jap Title: ;g;${cachedItem.jpTitle}`,
        `;bc;Eng Title: ;g;${cachedItem.enTitle}`,
        `;bc;Progress Set: ;g;${progress} ;by;/ ;m;${cachedItem.epCount || 'unknown'}`,
    ]);
    Config.save();
}

function moveFileToWatchedDir(fileName: string, workingDir: string) {
    renameSync(pathJoin(workingDir, fileName), pathJoin(workingDir, 'watched', fileName));
    _con.info(`;bc;Moved To: ;by;${pathJoin(workingDir, 'watched')}`);
}
