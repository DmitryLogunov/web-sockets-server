/* tslint:disable:no-namespace interface-name */

declare namespace NodeJS {
  interface Global {
    config: import('./interfaces').IConfig;
  }
}

declare module 'stack-trace';
declare module 'js-yaml';
declare module 'bytes';
