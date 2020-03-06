import amqp, { Channel, Connection } from 'amqplib';
import { logger } from './logger';

import { IRabbitmq } from '@/src/types/interfaces';
import WSPool from './ws-pool-manager';
import { EventEmitter } from 'events';

export default class RabbitMQClient extends EventEmitter {
  private readonly rabbitMqOptions: IRabbitmq;
  private readonly poolManager: WSPool;

  private connection: Connection;
  private channel: Channel;

  constructor(rabbitMqOptions: IRabbitmq, wsPool: WSPool) {
    super();
    this.rabbitMqOptions = rabbitMqOptions;
    this.poolManager = wsPool;

    this.createConnection();
  }

  /**
   * Starting to consume
   * At first make assert for queue with options, then create consume, then switch client to is ready
   * @param {string} wsID
   */
  public async startConsume(wsID: string): Promise<boolean | void> {
    const client = this.poolManager.getClient(wsID);
    if (!client || (client && client.isClose) || (client && client.isReady)) {
      return;
    }

    const { autoDeleteQueues: autoDelete, queuesDurable: durable } = this.rabbitMqOptions;
    return this.channel
      .assertQueue(wsID, { autoDelete, durable })
      .then(() => this.createConsume(wsID))
      .then(() => (client.isReady = true))
      .catch(err => logger.error('An error occurred at the start consuming', { message: err.message }));
  }

  /**
   * Clears bindings of client, then deletes queue, then deletes client from pool
   * @param {string} wsID
   */
  public async deleteClient(wsID: string): Promise<boolean | void> {
    return this.clearBindings(wsID)
      .then(() => this.deleteQueue(wsID))
      .then(() => this.poolManager.deleteClient(wsID))
      .catch((err: Error) => logger.error('There was an error deleting client', { message: err.message }));
  }

  /**
   * Binding a queue for WebSocketID by routingKey
   * If client is not ready or client is closed or binding is exist then do not bindings
   * @param {string} wsID
   * @param {string} routingKey
   */
  public async bindQueue(wsID: string, routingKey: string): Promise<void> {
    const client = this.poolManager.getClient(wsID);
    if (!client) {
      return;
    }

    const { isReady, isClose, bindings } = client;
    if (!isReady || isClose || bindings.has(routingKey)) {
      return;
    }

    return this.channel
      .bindQueue(wsID, this.rabbitMqOptions.exchange, routingKey)
      .then(() => {
        bindings.add(routingKey);
        logger.debug('Binding by routingKey', { wsConnectionID: wsID, routingKey });
      })
      .catch(err => logger.error('Bind Queue Error', { message: err.message }));
  }

  /**
   * Unbinding a queue for WebSocketID by routingKey, then remove binding from client
   * @param {string} wsID
   * @param {string} routingKey
   */
  public async unbindQueue(wsID: string, routingKey: string): Promise<void> {
    const client = this.poolManager.getClient(wsID);
    if (!client) {
      return;
    }

    return this.channel
      .unbindQueue(wsID, this.rabbitMqOptions.exchange, routingKey)
      .then(() => {
        client.bindings.delete(routingKey);
        logger.debug('Unbinding by routingKey', { wsConnectionID: wsID, routingKey });
      })
      .catch(err => logger.error('Unbind Queue Error', { message: err.message }));
  }

  /**
   * Delete queue by wsID
   * @param {string} wsID
   */
  private async deleteQueue(wsID: string): Promise<void> {
    return this.channel
      .deleteQueue(wsID)
      .then(() => logger.info('Queue is deleted', { wsConnectionID: wsID }))
      .catch(err => logger.error('Delete Queue Error', { message: err.message }));
  }

  /**
   * Creates a consumer by wsID
   * @param {string} wsID
   */
  private createConsume(wsID: string): Promise<amqp.Replies.Consume> {
    return this.channel.consume(wsID, async data => {
      if (!data || (data && !data.content)) {
        return;
      }

      this.poolManager.sendMessage(wsID, data.content.toString());
    });
  }

  /**
   * Clears bindings by wsID
   * @param {string} wsID
   */
  private async clearBindings(wsID: string): Promise<void> {
    const client = this.poolManager.getClient(wsID);
    const bindings: Set<string> = client ? client.bindings : new Set();
    if (!bindings.size) {
      return;
    }

    const { exchange } = this.rabbitMqOptions;
    const arrayForUnbindigs = Array.from(bindings).map(rk => this.channel.unbindQueue(wsID, exchange, rk));

    return Promise.all(arrayForUnbindigs)
      .then(() => logger.info('Bindings has been clear', { wsConnectionID: wsID }))
      .catch(err => logger.error('Clear bindings Error', { message: err.message }));
  }

  /**
   * Object RabbitMQClient initialization
   */
  private async createConnection(): Promise<void> {
    try {
      const { url, exchange } = this.rabbitMqOptions;
      this.connection = await amqp.connect(url);

      this.connection.on('close', this.errorMqConnection);
      this.connection.on('error', this.errorMqConnection);

      this.channel = await this.connection.createChannel();
      logger.info('Connect to RabbitMQ succefuly', { url, exchange });

      this.emit('ready', true);
    } catch (err) {
      logger.error('Filed connect to RabbitMQ.Error', { message: err.message });
      process.exit(1);
    }
  }

  /**
   * Callback for close or error MQ
   * @param {Error} err
   */
  private async errorMqConnection(err: Error): Promise<void> {
    logger.error('Error message from RabbitMQ', { message: err.message });
    process.exit(1);
  }
}
