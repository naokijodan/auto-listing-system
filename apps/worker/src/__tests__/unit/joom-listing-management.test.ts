import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks available to all factories
const { mockPrisma, mockJoomClient } = vi.hoisted(() => {
  return {
    mockPrisma: {
      listing: {
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    },
    mockJoomClient: {
      enableProduct: vi.fn(),
      disableProduct: vi.fn(),
      deleteProduct: vi.fn(),
    },
  };
});

// Mock logger to keep output clean
vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock Prisma client used by processors
vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
}));

// Avoid pulling in heavy deps from publish service during import
vi.mock('../../lib/joom-publish-service', () => ({
  joomPublishService: {
    createJoomListing: vi.fn(),
    processImagesForListing: vi.fn(),
    publishToJoom: vi.fn(),
    dryRun: vi.fn(),
  },
  batchPublishService: {
    executeBatch: vi.fn(),
  },
  imagePipelineService: {
    processImages: vi.fn(),
  },
}));

// Mock Joom API client constructed inside the processor
vi.mock('../../lib/joom-api', () => ({
  JoomApiClient: vi.fn().mockImplementation(() => mockJoomClient),
}));

// Import target under test after mocks
import { processJoomPublishJob } from '../../processors/joom-publish';

describe('Joom listing management jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeJob = (data: any) => ({ id: 'job-1', data }) as any;

  it('disable-product: calls API and sets status to PAUSED', async () => {
    mockJoomClient.disableProduct.mockResolvedValue({ success: true });
    mockPrisma.listing.update.mockResolvedValue({ id: 'listing-1' });

    const job = makeJob({
      type: 'disable-product',
      listingId: 'listing-1',
      joomProductId: 'joom-123',
    });

    await processJoomPublishJob(job);

    expect(mockJoomClient.disableProduct).toHaveBeenCalledWith('joom-123');
    expect(mockPrisma.listing.update).toHaveBeenCalledWith({
      where: { id: 'listing-1' },
      data: { status: 'PAUSED' },
    });
  });

  it('enable-product: calls API and sets status to ACTIVE', async () => {
    mockJoomClient.enableProduct.mockResolvedValue({ success: true });
    mockPrisma.listing.update.mockResolvedValue({ id: 'listing-1' });

    const job = makeJob({
      type: 'enable-product',
      listingId: 'listing-1',
      joomProductId: 'joom-123',
    });

    await processJoomPublishJob(job);

    expect(mockJoomClient.enableProduct).toHaveBeenCalledWith('joom-123');
    expect(mockPrisma.listing.update).toHaveBeenCalledWith({
      where: { id: 'listing-1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        listedAt: expect.any(Date),
        errorMessage: null,
      }),
    });
  });

  it('delete-product: calls API and returns success', async () => {
    mockJoomClient.deleteProduct.mockResolvedValue({ success: true });

    const job = makeJob({
      type: 'delete-product',
      joomProductId: 'joom-123',
      joomListingId: 'listing-1',
    });

    const result = await processJoomPublishJob(job);

    expect(mockJoomClient.deleteProduct).toHaveBeenCalledWith('joom-123');
    expect(result).toEqual(
      expect.objectContaining({ success: true, joomProductId: 'joom-123', joomListingId: 'listing-1' })
    );
    // Current implementation does not update listing on delete
    expect(mockPrisma.listing.update).not.toHaveBeenCalled();
  });

  it('enable-product: throws on API error', async () => {
    mockJoomClient.enableProduct.mockResolvedValue({ success: false, error: { message: 'API error' } });

    const job = makeJob({
      type: 'enable-product',
      listingId: 'listing-1',
      joomProductId: 'joom-123',
    });

    await expect(processJoomPublishJob(job)).rejects.toThrow('Failed to enable product: API error');
    expect(mockPrisma.listing.update).not.toHaveBeenCalled();
  });

  it('disable-product: throws on API error', async () => {
    mockJoomClient.disableProduct.mockResolvedValue({ success: false, error: { message: 'API error' } });

    const job = makeJob({
      type: 'disable-product',
      listingId: 'listing-1',
      joomProductId: 'joom-123',
    });

    await expect(processJoomPublishJob(job)).rejects.toThrow('Failed to disable product: API error');
    expect(mockPrisma.listing.update).not.toHaveBeenCalled();
  });

  it('delete-product: returns failure without throwing on API error', async () => {
    mockJoomClient.deleteProduct.mockResolvedValue({ success: false, error: { message: 'Not found' } });

    const job = makeJob({
      type: 'delete-product',
      joomProductId: 'joom-404',
      joomListingId: 'listing-1',
    });

    const result = await processJoomPublishJob(job);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not found');
    expect(mockPrisma.listing.update).not.toHaveBeenCalled();
  });
});
