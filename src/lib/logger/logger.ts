import { resolve } from 'path';
import winston from 'winston';

import { ILogger, ILogSettings, ILoggerFunction, ILogData, IParseStack, ILogLevel } from '@/src/types/interfaces';

const { combine, timestamp, json, colorize, align, printf, simple } = winston.format;

export default class Logger implements ILogger {
  private logLevel: string;
  private format: any;
  private numLogLevel: ILogLevel;
  private colorize: boolean;
  private transports: string[];
  private logfilePath: string;

  constructor(settings?: ILogSettings) {
    const settingsKeys = settings ? Object.keys(settings) : [];
    this.logLevel = settingsKeys.includes('level') ? settings.level : 'info';
    this.format = settingsKeys.includes('format') ? this.getFormat(settings.format) : this.getFormat(1);

    if (settingsKeys.includes('colorize')) {
      this.colorize = settings.colorize;
    }
    if (settingsKeys.includes('transports')) {
      this.transports = settings.transports.split(',');
    }
    if (settingsKeys.includes('filename')) {
      this.logfilePath = resolve(process.cwd() + `/${settings.filename}`);
    }

    this.numLogLevel = {
      debug: 4,
      error: 1,
      info: 3,
      warn: 2
    };
  }

  public info: ILoggerFunction = (message, params = {}, trace = [], label = '') => {
    this.print('info', message, params, trace, label);
  };

  public debug: ILoggerFunction = (message, params = {}, trace = [], label = '') => {
    this.print('debug', message, params, trace, label);
  };

  public error: ILoggerFunction = (message, params = {}, trace = [], label = '') => {
    this.print('error', message, params, trace, label);
  };

  public warn: ILoggerFunction = (message, params = {}, trace = [], label = '') => {
    this.print('warn', message, params, trace, label);
  };

  /**
   * Prints log out
   *
   * @param level
   * @param message
   * @param params
   * @param trace
   * @param label
   */
  private print(level: string, message: string, params: object, trace: string[], label: string) {
    if (!this.checkLevel(level)) {
      return;
    }

    if (typeof trace === 'object' && trace.length && typeof trace[0] === 'object') {
      const stack = this.parseStackTrace(trace[0]);
      if (typeof stack === 'object') {
        label = stack.fileName + ':' + stack.line + (label !== '' ? ':' + label : '');
      }
    }

    if (typeof params === 'string' && params !== '' && label === '') {
      label = params;
      params = {};
    }

    const logData: ILogData = { level, message };

    if (label !== '') {
      logData.label = label;
    }
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
      logData.params = params;
    }

    const winstonTransports: any[] | null = [];

    if (this.transports && this.transports.includes('file')) {
      winstonTransports.push(
        new winston.transports.File({
          filename: this.logfilePath || 'combined.log'
        })
      );
    }
    if (!this.transports || this.transports.includes('console')) {
      winstonTransports.push(new winston.transports.Console());
    }

    this.printLog(logData, winstonTransports);
  }

  /**
   * Checks log level
   *
   * @param level
   */
  private checkLevel(level: string): boolean {
    return this.numLogLevel[this.logLevel] >= this.numLogLevel[level];
  }

  /**
   * Parses stack trase
   *
   * @param stackTrace
   */

  private parseStackTrace(stackTrace: any): IParseStack {
    if (typeof stackTrace === 'undefined') {
      return {} as IParseStack;
    }

    try {
      const fileName = stackTrace
        .getFileName()
        .split('/')
        .slice(-1)[0];
      const line = stackTrace.getLineNumber();

      return { fileName, line };
    } catch (e) {
      return {} as IParseStack;
    }
  }

  /**
   * Creates winston logger
   *
   * @param transports
   */
  private logger(transports: any[]) {
    return winston.createLogger({
      format: this.format(),
      level: 'debug',
      transports
    });
  }

  /**
   * Prints log using transports from parameters
   *
   * @param logData
   * @param transports
   */
  private printLog(logData: ILogData, transports: any[]) {
    this.logger(transports).log(logData);
  }

  /**
   * Defines custom format
   */
  private customFormat() {
    return combine(
      this.isColorize(),
      timestamp(),
      align(),
      printf((info: any) => {
        const { label, level, message, params, timestamp: timeStamp } = info;
        const arrParams: string[] = [];
        for (const key in params) {
          if (params.hasOwnProperty(key)) {
            const msg = key.concat(' -> ', params[key]);
            arrParams.push(msg);
          }
        }
        const ts = timeStamp.slice(0, 19).replace('T', ' ');
        const myLabel = label ? `[${label}]` : '';
        return `${ts} [${level}]: ${message} ${myLabel} ${arrParams.join(' :: ')}`;
      })
    );
  }

  /**
   * Defines JSON log format
   */
  private jsonFormat() {
    return combine(timestamp(), json());
  }

  /**
   * Returns of it's colorize or not
   */
  private isColorize() {
    return this.colorize ? colorize() : simple();
  }

  /**
   * Returns format
   *
   * @param num
   */

  private getFormat(num: number): any {
    const formats: any = {
      1: this.customFormat,
      2: this.jsonFormat
    };

    return formats[num] || formats[1];
  }
}
