import { register } from '../src/index';

describe('basic spec', () => {
  it('should export functions', () => {
    expect(register).toBeDefined();
  });
});
