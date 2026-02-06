import { cn } from '../lib/utils'

describe('cn', () => {
  it('joins class names and filters falsy values', () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c')
  })
})
