import { describe, it } from 'vitest';
import { createServer } from '../../../app';

describe('Bank feed mock routes', () => {
  it('Should dump routes', async () => {
    const app = await createServer();
    await app.ready();
    console.log(app.printRoutes());
  });
});

