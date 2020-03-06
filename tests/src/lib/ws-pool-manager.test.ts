import WSPoolManager from '../../../src/lib/ws-pool-manager';
import { IClient } from '../../../src/types/interfaces';
import WebSocket from 'ws';

const poolManager = new WSPoolManager();
const wsID = 'wsConnectionID';

const testClient = poolManager.addClient(wsID, {} as WebSocket);

function checkClient(client: IClient) {
  expect(client).toBeDefined();
  expect(client).toHaveProperty('ws');
  expect(client).toHaveProperty('bindings');
  expect(client).toHaveProperty('isReady');
  expect(client).toHaveProperty('wsConnectionID');

  expect(client.isReady).toBe(false);
  expect(Array.from(client.bindings)).toHaveLength(0);
  expect(client.wsConnectionID).toBe(wsID);
}

test('Add client to Pool', () => {
  checkClient(testClient);
});

test('Getting client from Pool', () => {
  checkClient(poolManager.getClient(wsID));
});

describe('Deleting Client from pool', () => {
  test('Delete', () => {
    poolManager.deleteClient(wsID);
    expect(poolManager.getClient(wsID)).toBeUndefined();
  });

  test('Get client # return undefined', () => {
    expect(poolManager.getClient(wsID)).toBeUndefined();
  });
});
