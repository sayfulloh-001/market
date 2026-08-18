import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/authRoutes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Raqamli Mahalla Backend Tests', () => {
  it('should request Telegram Auth link for phone number', async () => {
    const res = await request(app)
      .post('/api/auth/request-telegram')
      .send({ phone: '+998901234567' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.phone).toBe('+998901234567');
    expect(res.body.botLink).toBeDefined();
  });

  it('should return error when phone is missing', async () => {
    const res = await request(app)
      .post('/api/auth/request-telegram')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
