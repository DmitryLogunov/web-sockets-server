import initConfig from './lib/init-config';
global.config = initConfig('config.yaml');

import { logger } from './lib/logger';

import WebSocket from 'ws';

import WSPoolManager from './lib/ws-pool-manager';
import RabbitMQClient from './lib/mq-client';
import WSHelper from './lib/ws-helper';
import { IncomingMessage } from 'http';

const { port, rabbitmq } = global.config;

const poolManager = new WSPoolManager();
const mqClient = new RabbitMQClient(rabbitmq, poolManager);
const helper = new WSHelper();

if (!module.parent) {
  mqClient.once('ready', () => {
    const wss = new WebSocket.Server({ clientTracking: true, port });
    logger.info('WebSocket Server listeting', { port });
    wss.on('connection', connectionCallback);
  });
}

/**
 * Callback for connection WebSockets
 * @param {WebSocket} ws
 * @param {IncomingMessage} req
 */
function connectionCallback(ws: WebSocket, req: IncomingMessage): void {
  const wsConnectionID = req.headers['sec-websocket-key'].toString();
  const client = poolManager.addClient(wsConnectionID, ws);
  logger.info('New client is connect', { wsConnectionID });

  ws.on('message', async (rawMsg: string) => {
    const message = helper.parseMessgae(rawMsg);
    if (!message) {
      return;
    }

    if (!client.isReady) {
      await mqClient.startConsume(wsConnectionID);
    }

    const routingKey = helper.getRoutingKey(message);
    if (message.type === 'subscribe') {
      mqClient.bindQueue(wsConnectionID, routingKey);
    } else if (message.type === 'unsubscribe') {
      mqClient.unbindQueue(wsConnectionID, routingKey);
    }
  });

  ws.on('close', () => {
    client.isClose = true;
    setImmediate(() => mqClient.deleteClient(wsConnectionID));
  });
}
