import Logger from './logger';

const settings = global.config ? global.config.logSettings : null;
export const logger: Logger = new Logger(settings);
