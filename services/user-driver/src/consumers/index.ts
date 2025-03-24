// src/consumers/index.ts
import { setupAuthConsumer } from './auth.consumer';

export const setupEventConsumers = async () => {
  await setupAuthConsumer();
};
