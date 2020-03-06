import WebSocket from 'ws';

export interface ILogSettings {
  level: string;
  format: number;
  colorize: boolean;
  transports?: string;
  filename?: string;
}

export interface IRabbitmq {
  url: string;
  exchange: string;
  queuesDurable: boolean;
  autoDeleteQueues: boolean;
}

export interface IConfig {
  port: number;
  logSettings: ILogSettings;
  rabbitmq: IRabbitmq;
}

export interface IClient {
  wsConnectionID: string;
  ws: WebSocket;
  bindings: Set<string>;
  isReady: boolean;
  isClose: boolean;
}

export interface IWsMessage {
  type: string;
  resource?: string;
  resourceID?: string;
  contextType?: string;
  contextID?: string;
  wsConnectionID?: string;
  method?: string;
}

export interface ILogger {
  info: ILoggerFunction;
  debug: ILoggerFunction;
  error: ILoggerFunction;
  warn: ILoggerFunction;
}

export type ILoggerFunction = (message: string, params?: object, trace?: string[], label?: string) => void;

export interface ILogData {
  level: string;
  message: string;
  label?: string;
  params?: object;
}

export interface IParseStack {
  fileName: string;
  line: number;
}

export interface ILogLevel {
  [level: string]: number;
}
