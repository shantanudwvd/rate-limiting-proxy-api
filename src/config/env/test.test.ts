import testConfig from './test';

describe('Test Config', () => {
    it('should have the correct test configuration', () => {
        expect(testConfig).toBeDefined();
        expect(testConfig.db).toBeDefined();
        expect(testConfig.logs).toBeDefined();
        expect(testConfig.logs.level).toBe('error');
    });
});