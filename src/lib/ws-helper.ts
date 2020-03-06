import { logger } from './logger';
import { IWsMessage } from '../types/interfaces';

export default class WSHelper {
  /**
   * Return 'IWsMessage' after parse data from client
   * @param {string} data
   * @returns {IWsMessage}
   */
  public parseMessgae(data: string): IWsMessage {
    try {
      return JSON.parse(data);
    } catch (e) {
      logger.warn('Could not parse subscribing ws message', { message: e.message, data });
      return null;
    }
  }

  /**
   * Returns Routing key by message
   * @param {IWsMessage} message
   * @returns {string}
   */
  public getRoutingKey(message: IWsMessage): string {
    const { method = '*', resource = '*', resourceID = '*', contextType = '*', contextID = '*' } = message;
    return `${method}.${resource}.${resourceID}.${contextType}.${contextID}`;
  }
}
