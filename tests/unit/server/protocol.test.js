import { describe, expect, it } from 'vitest'
import { CODE_ALPHABET, CODE_LENGTH, NAME_MAX, cleanName, normalizeCode, randomCode, uniqueName } from '../../../server/protocol.js'

describe('normalizeCode', () => {
  it('makes a typed code upper case and drops the spaces around it', () => {
    expect(normalizeCode(' k7qx ')).toBe('K7QX')
    expect(normalizeCode('K7QX')).toBe('K7QX')
  })

  it('gives null for a code with the wrong length', () => {
    expect(normalizeCode('K7Q')).toBe(null)
    expect(normalizeCode('K7QXC')).toBe(null)
    expect(normalizeCode('')).toBe(null)
  })

  it('gives null for a code with a character that is not in the alphabet (vowels, Y, 0, O, 1, I...)', () => {
    for (const bad of ['A', 'E', 'Y', '0', 'O', '1', 'I', 'L', 'S', '5', 'B', '8', '-', ' ']) {
      expect(normalizeCode('K7Q' + bad)).toBe(null)
    }
    expect(normalizeCode('K 7Q')).toBe(null)
  })

  it('gives null for something that is not a string', () => {
    expect(normalizeCode(undefined)).toBe(null)
    expect(normalizeCode(null)).toBe(null)
    expect(normalizeCode(1234)).toBe(null)
  })
})

describe('randomCode', () => {
  it('gives CODE_LENGTH characters from CODE_ALPHABET', () => {
    for (let i = 0; i < 200; i++) {
      const code = randomCode()
      expect(code).toHaveLength(CODE_LENGTH)
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch)
      expect(normalizeCode(code)).toBe(code)
    }
  })

  it('uses the random function it is given, also at the edges 0 and almost 1', () => {
    expect(randomCode(() => 0)).toBe(CODE_ALPHABET[0].repeat(CODE_LENGTH))
    expect(randomCode(() => 0.999999)).toBe(CODE_ALPHABET.at(-1).repeat(CODE_LENGTH))
    expect(randomCode(() => 1)).toBe(CODE_ALPHABET.at(-1).repeat(CODE_LENGTH))
  })
})

describe('cleanName', () => {
  it('gives capital letters, keeps accents, numbers and single spaces, and drops everything else', () => {
    expect(cleanName('  sala   do João!!  ')).toBe('SALA DO JOÃO')
    expect(cleanName('porão\tdo rock 2')).toBe('PORÃO DO ROCK 2')
    expect(cleanName('<b>hi</b>  💀 ok_ok')).toBe('BHIB OKOK')
    expect(cleanName('ação ÇÉÜ ñ')).toBe('AÇÃO ÇÉÜ Ñ')
  })

  it('cuts the name to NAME_MAX (16) characters, with no space at the end', () => {
    expect(NAME_MAX).toBe(16)
    expect(cleanName('a very long room name 123')).toBe('A VERY LONG ROOM')
    expect(cleanName('abcdefghijklmno pq')).toBe('ABCDEFGHIJKLMNO')
  })

  it('gives an empty text when nothing usable is left, or for something that is not a string', () => {
    expect(cleanName('  !!?  ')).toBe('')
    expect(cleanName('日本')).toBe('')
    expect(cleanName(undefined)).toBe('')
    expect(cleanName(42)).toBe('')
  })
})

describe('uniqueName', () => {
  it('keeps a free name, and adds 2, 3, ... to a taken one', () => {
    expect(uniqueName('ROCK', new Set())).toBe('ROCK')
    expect(uniqueName('ROCK', new Set(['ROCK']))).toBe('ROCK 2')
    expect(uniqueName('ROCK', new Set(['ROCK', 'ROCK 2']))).toBe('ROCK 3')
    expect(uniqueName('ROCK', new Set(['ROCK 2']))).toBe('ROCK')
  })

  it('cuts a long name so it stays at 16 characters with the number', () => {
    expect(uniqueName('ABCDEFGHIJKLMNOP', new Set(['ABCDEFGHIJKLMNOP']))).toBe('ABCDEFGHIJKLMN 2')
    expect(uniqueName('ABCDEFGHIJKLMN P', new Set(['ABCDEFGHIJKLMN P']))).toBe('ABCDEFGHIJKLMN 2')
    expect(uniqueName('ABCDEFGHIJKLM OP', new Set(['ABCDEFGHIJKLM OP']))).toBe('ABCDEFGHIJKLM 2')
  })
})
