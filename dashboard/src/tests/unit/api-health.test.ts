import { describe, it, expect } from 'vitest';

describe('GET /api/health', () => {
  it('returns ok status with timestamp', async () => {
    const { GET } = await import('../../routes/api/health/+server');
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
    expect(new Date(data.timestamp).getTime()).not.toBeNaN();
  });
});
