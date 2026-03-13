import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// モック対象
vi.mock('child_process', () => ({
  exec: vi.fn(),
}))
vi.mock('util', () => ({
  promisify: (fn: any) => fn,
}))

// image-downloaderをモック
vi.mock('../image-downloader', () => ({
  downloadImage: vi.fn().mockResolvedValue({ success: true }),
  isValidImageUrl: vi.fn().mockReturnValue(true),
}))

// image-optimizerをモック
vi.mock('../image-optimizer', () => ({
  optimizeImage: vi.fn().mockResolvedValue({
    success: true,
    outputPath: '/tmp/test/optimized-0',
    width: 1000,
    height: 1000,
    optimizedSize: 50000,
  }),
  validateForJoom: vi.fn().mockReturnValue({ valid: true, issues: [] }),
  OptimizationOptions: {},
}))

// storageをモック
vi.mock('../storage', () => ({
  uploadFile: vi.fn().mockResolvedValue({ success: true, url: 'https://s3.example.com/test.jpg' }),
  generateProductImageKey: vi.fn().mockReturnValue('products/test/0.jpg'),
  deleteProductImages: vi.fn(),
}))

// cloudinaryをモック
vi.mock('../cloudinary-uploader', () => ({
  uploadToCloudinary: vi.fn(),
  isCloudinaryConfigured: vi.fn().mockReturnValue(false),
}))

// sharpをモック
vi.mock('sharp', () => {
  const mockSharp = vi.fn().mockReturnValue({
    metadata: vi.fn().mockResolvedValue({ width: 1000, height: 1000 }),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('test')),
    composite: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue({}),
  })
  return { default: mockSharp }
})

// fsをモック
vi.mock('fs/promises', () => ({
  default: {
    mkdtemp: vi.fn().mockResolvedValue('/tmp/joom-image-test'),
    rm: vi.fn().mockResolvedValue(undefined),
  },
}))

// loggerをモック
vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

import { exec } from 'child_process'
const mockExec = exec as unknown as any

describe('processImageForJoom - rembg integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('index=0の場合、removeBackgroundが呼ばれる', async () => {
    // rembgが利用可能（which rembgが成功）
    ;(mockExec as any).mockImplementation((cmd: string) => {
      if (cmd === 'which rembg') return Promise.resolve({ stdout: '/usr/bin/rembg' })
      if (cmd.startsWith('rembg i')) return Promise.resolve({ stdout: '' })
      return Promise.resolve({ stdout: '' })
    })

    const { processImageForJoom } = await import('../image-processor')
    const result = await processImageForJoom('https://example.com/image.jpg', 'prd-001', 0)

    // rembgが呼ばれたことを確認
    expect((mockExec as any)).toHaveBeenCalledWith('which rembg')
    // rembg iコマンドが呼ばれたことを確認
    const rembgCalls = (mockExec as any).mock.calls.filter((c: any[]) => typeof c[0] === 'string' && c[0].startsWith('rembg i'))
    expect(rembgCalls.length).toBe(1)
  })

  it('index>0の場合、removeBackgroundは呼ばれない', async () => {
    ;(mockExec as any).mockImplementation((_cmd: string) => {
      return Promise.resolve({ stdout: '' })
    })

    const { processImageForJoom } = await import('../image-processor')
    const result = await processImageForJoom('https://example.com/image.jpg', 'prd-001', 1)

    // rembg関連のコマンドが呼ばれていないことを確認
    const rembgCalls = (mockExec as any).mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && (c[0] === 'which rembg' || c[0].startsWith('rembg i'))
    )
    expect(rembgCalls.length).toBe(0)
  })

  it('rembgが未インストールの場合、フォールバックする', async () => {
    // which rembgが失敗
    ;(mockExec as any).mockImplementation((cmd: string) => {
      if (cmd === 'which rembg') return Promise.reject(new Error('not found'))
      return Promise.resolve({ stdout: '' })
    })

    const { processImageForJoom } = await import('../image-processor')
    const result = await processImageForJoom('https://example.com/image.jpg', 'prd-001', 0)

    // 処理自体は成功する（フォールバック）
    expect(result).toBeDefined()
    expect(result.processedUrl).toBeDefined()
  })

  it('rembgがタイムアウトした場合、フォールバックする', async () => {
    ;(mockExec as any).mockImplementation((cmd: string) => {
      if (cmd === 'which rembg') return Promise.resolve({ stdout: '/usr/bin/rembg' })
      if (cmd.startsWith('rembg i')) return Promise.reject(new Error('timeout'))
      return Promise.resolve({ stdout: '' })
    })

    const { processImageForJoom } = await import('../image-processor')
    const result = await processImageForJoom('https://example.com/image.jpg', 'prd-001', 0)

    // 処理自体は成功する（フォールバック）
    expect(result).toBeDefined()
    expect(result.processedUrl).toBeDefined()
  })
})
