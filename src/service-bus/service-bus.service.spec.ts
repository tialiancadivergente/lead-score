import { ServiceBusService } from './service-bus.service';

describe('ServiceBusService lock renewal', () => {
  it('passes the requested renewal duration to the receiver without changing defaults for other consumers', () => {
    const receiver = {
      subscribe: jest.fn(() => ({ close: async () => undefined })),
    };
    const client = { createReceiver: jest.fn(() => receiver) };
    const service = new ServiceBusService(client as any);
    service.createQueueProcessor({
      queueName: 'export',
      maxAutoLockRenewalMs: 7_200_000,
      onMessage: async () => undefined,
    });
    expect(client.createReceiver).toHaveBeenLastCalledWith('export', {
      maxAutoLockRenewalDurationInMs: 7_200_000,
    });
    service.createQueueProcessor({
      queueName: 'other',
      onMessage: async () => undefined,
    });
    expect(client.createReceiver).toHaveBeenLastCalledWith('other', {});
  });
});
