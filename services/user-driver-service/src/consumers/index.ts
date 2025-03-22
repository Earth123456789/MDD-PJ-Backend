// src/consumers/index.ts
import { setupAuthConsumer } from './auth.consumer';
import { setupOrderConsumer } from './order-matching.consumer';

export const setupEventConsumers = async () => {
  await setupAuthConsumer();
  await setupOrderConsumer();
};
