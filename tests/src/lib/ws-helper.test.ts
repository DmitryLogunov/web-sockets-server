import WSHelper from '../../../src/lib/ws-helper';
import { IWsMessage } from '../../../src/types/interfaces';

const helper = new WSHelper();

describe('Get Routing Key', () => {
  test('Parse message with: resource, context', () => {
    const messgae: IWsMessage = {
      type: 'type',
      resource: 'resource',
      resourceID: '1',
      contextType: 'context',
      contextID: '2'
    };

    const routingkey = helper.getRoutingKey(messgae);

    expect(routingkey).toBeDefined();
    expect(routingkey).toBe('*.resource.1.context.2');
  });

  test('Parse empty message', () => {
    const messgae: IWsMessage = { type: 'type' };

    const routingkey = helper.getRoutingKey(messgae);

    expect(routingkey).toBeDefined();
    expect(routingkey).toBe('*.*.*.*.*');
  });
});
