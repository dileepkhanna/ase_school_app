import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET) should return ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);

    // Your ResponseTransformInterceptor might wrap responses.
    // We support both raw and wrapped.
    if (res.body?.data) {
      expect(res.body.data).toBeDefined();
      expect(res.body.success).toBe(true);
    } else {
      expect(res.body).toBeDefined();
    }
  });

  it('/api (GET) should 404', async () => {
    await request(app.getHttpServer()).get('/api').expect(404);
  });
});
