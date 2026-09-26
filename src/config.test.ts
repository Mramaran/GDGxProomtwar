import { expect, it } from 'vitest';
import { missingFirebaseKeys } from './config';

it('lists the required Firebase settings that are empty', () => {
  const config = { apiKey: 'k', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: 'a' };
  expect(missingFirebaseKeys(config)).toEqual(['projectId']);
});
