import { IClient } from '../types/interfaces';
import WebSocket from 'ws';
import bytes from 'bytes';
import { logger } from './logger';

export default class WSPool {
  private pool: Map<string, IClient>;

  constructor() {
    this.pool = new Map();

    this.startPingPongProtocol();
    this.infoToOutput();
  }

  /**
   * Add client to pool
   * @param {string} wsID
   * @param {WebSocket} ws
   */
  public addClient(wsID: string, ws: WebSocket): IClient {
    const client: IClient = { ws, bindings: new Set(), isReady: false, isClose: false, wsConnectionID: wsID };
    this.pool.set(wsID, client);
    return this.pool.get(wsID);
  }

  /**
   * Delete client from Pool by wsID
   * @param {string} wsID
   */
  public deleteClient(wsID: string): boolean {
    return this.pool.delete(wsID);
  }

  /**
   * Returns client by wsID
   * @param {string} wsID
   */
  public getClient(wsID: string): IClient {
    return this.pool.get(wsID);
  }

  /**
   * Sending message to WebSocket if this OPEN
   * @param {string} wsID
   * @param {string} message
   */
  public sendMessage(wsID: string, message: string, notSendToLogs?: boolean): void {
    const client = this.getClient(wsID);
    if (!client) {
      return;
    }

    if (client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    client.ws.send(message, (err: Error) => {
      if (err) {
        logger.error('Message to WebSocket Error', { message: err.message });
        return;
      }

      if (!notSendToLogs) {
        const length = bytes(message.length || 0).toLowerCase();
        logger.debug('Message was sent to WebSocket', { length, wsConnectionID: wsID });
      }
    });
  }

  /**
   * Starts pingPongProtocol
   */
  private startPingPongProtocol(): void {
    setInterval(() => {
      for (const wsConnectionID of this.pool.keys()) {
        const message = JSON.stringify({ type: 'ping', wsConnectionID });
        this.sendMessage(wsConnectionID, message, true);
      }
    }, 5000).unref();
  }

  /**
   * Onform to ouput about total connections
   */
  private infoToOutput(): void {
    setInterval(() => {
      const params = { connections: this.pool.size, queues: 0 };
      this.pool.forEach(client => client && client.isReady && params.queues++);
      logger.info('Information from WebSockets Pool', { ...params });
    }, 100000).unref();
  }
}
