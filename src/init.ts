import { Config } from './lib/config.js';
import { Kitsu } from './lib/kitsu/kitsu.js';
import { ConsoleLogger } from './lib/logger.js';
import { Printer } from './lib/printer/printer.js';

// Fetch creates a warning
process.removeAllListeners('warning');
global._con = ConsoleLogger;

await Config.init({
    setupNewConfig: async () => {
        Printer.print([null, ['py', ['Working Directory', `${process.cwd()}`]]]);
        await Kitsu.init();
        Config.set('useColor', true);
    },
    setDefaultProps: (config) => {
        config.useColor ??= true;
        if (config.kitsu) {
            config.kitsu.cache ??= [];
        }
        if (config.kitsu && !config.kitsu.fileBindings) {
            config.kitsu.fileBindings = [];
        }
        if (config.kitsu?.stats) {
            config.kitsu.stats.secondsSpentWatching ??= 0;
            config.kitsu.stats.completedSeries ??= 0;
        }
        return config;
    },
});

_con.showColor = Config.get('useColor');
