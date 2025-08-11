
import fs from 'fs';
import { logToFile } from '../logger';

jest.mock('fs');

describe('logToFile', () => {
  it('should append a message to the log file', () => {
    const message = 'test message';
    logToFile(message);

    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(message),
      expect.any(Function)
    );
  });
});
