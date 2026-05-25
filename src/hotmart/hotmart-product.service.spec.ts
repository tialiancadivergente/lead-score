import { BadRequestException } from '@nestjs/common';
import { HotmartProduct } from '../database/entities/hotmart/hotmart-product.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { HotmartProductService } from './hotmart-product.service';

function makeRepo<T>() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value: Partial<T>) => value),
    save: jest.fn(),
    delete: jest.fn(),
  };
}

describe('HotmartProductService', () => {
  it('updates launch_id and relation when changing product launch', async () => {
    const repo = makeRepo<HotmartProduct>();
    const launchRepo = makeRepo<Launch>();
    const oldLaunch = { id: 'old-launch', name: 'old' } as Launch;
    const newLaunch = { id: 'new-launch', name: 'new' } as Launch;
    const row = {
      id: 'product-id',
      name: 'Produto',
      product_id: 123,
      active: true,
      launch_id: oldLaunch.id,
      launch: oldLaunch,
    } as HotmartProduct;

    repo.findOne
      .mockResolvedValueOnce(row)
      .mockImplementation(async ({ where }: { where: { id: string } }) => ({
        ...row,
        id: where.id,
        launch_id: newLaunch.id,
        launch: newLaunch,
      }));
    repo.save.mockImplementation(async (value: HotmartProduct) => value);
    launchRepo.findOne.mockResolvedValue(newLaunch);

    const service = new HotmartProductService(repo as never, launchRepo as never);

    const result = await service.update(row.id, { launch_id: newLaunch.id });

    expect(launchRepo.findOne).toHaveBeenCalledWith({
      where: { id: newLaunch.id },
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        launch_id: newLaunch.id,
        launch: newLaunch,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        launch_id: newLaunch.id,
        launch_name: newLaunch.name,
      }),
    );
  });

  it('clears launch_id and relation when product launch is removed', async () => {
    const repo = makeRepo<HotmartProduct>();
    const launchRepo = makeRepo<Launch>();
    const oldLaunch = { id: 'old-launch', name: 'old' } as Launch;
    const row = {
      id: 'product-id',
      name: 'Produto',
      product_id: 123,
      active: true,
      launch_id: oldLaunch.id,
      launch: oldLaunch,
    } as HotmartProduct;

    repo.findOne
      .mockResolvedValueOnce(row)
      .mockImplementation(async ({ where }: { where: { id: string } }) => ({
        ...row,
        id: where.id,
        launch_id: null,
        launch: null,
      }));
    repo.save.mockImplementation(async (value: HotmartProduct) => value);

    const service = new HotmartProductService(repo as never, launchRepo as never);

    const result = await service.update(row.id, { launch_id: null });

    expect(launchRepo.findOne).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        launch_id: null,
        launch: null,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        launch_id: null,
        launch_name: null,
      }),
    );
  });

  it('rejects an unknown launch', async () => {
    const repo = makeRepo<HotmartProduct>();
    const launchRepo = makeRepo<Launch>();
    repo.findOne.mockResolvedValue({
      id: 'product-id',
      name: 'Produto',
      product_id: 123,
      active: true,
    } as HotmartProduct);
    launchRepo.findOne.mockResolvedValue(null);

    const service = new HotmartProductService(repo as never, launchRepo as never);

    await expect(
      service.update('product-id', { launch_id: 'missing-launch' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
