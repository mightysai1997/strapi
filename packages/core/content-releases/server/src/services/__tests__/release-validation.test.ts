import type { CreateReleaseAction } from '../../../../shared/contracts/release-actions';
import createReleaseValidationService from '../validation';

const baseStrapiMock = {
  ee: {
    features: {
      get: jest.fn(),
    },
  },
  utils: {
    errors: {
      ValidationError: jest.fn(),
    },
  },
  contentType: jest.fn(),
};

describe('Release Validation service', () => {
  describe('validateEntryContentType', () => {
    it('throws an error if the content type does not exist', () => {
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: baseStrapiMock });

      expect(() => releaseValidationService.validateEntryContentType('api::plop.plop')).toThrow(
        'No content type found for uid api::plop.plop'
      );
    });
  });

  describe('validateUniqueEntry', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        contentType: jest.fn().mockReturnValue({
          options: {
            draftAndPublish: true,
          },
        }),
        entityService: {
          findOne: jest.fn().mockReturnValue(null),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      const mockReleaseAction: CreateReleaseAction.Request['body'] = {
        entry: {
          id: 1,
          contentType: 'api::category.category',
        },
        type: 'publish',
      };

      expect(() =>
        releaseValidationService.validateUniqueEntry(1, mockReleaseAction)
      ).rejects.toThrow('No release found for id 1');
    });

    it('throws an error if a contentType entry already exists in the release', () => {
      const strapiMock = {
        ...baseStrapiMock,
        contentType: jest.fn().mockReturnValue({
          options: {
            draftAndPublish: true,
          },
        }),
        entityService: {
          findOne: jest.fn().mockReturnValue({
            actions: [
              {
                contentType: 'api::category.category',
                entry: {
                  id: 1,
                },
              },
            ],
          }),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      const mockReleaseAction: CreateReleaseAction.Request['body'] = {
        entry: {
          id: 1,
          contentType: 'api::category.category',
        },
        type: 'publish',
      };

      expect(() =>
        releaseValidationService.validateUniqueEntry(1, mockReleaseAction)
      ).rejects.toThrow(
        'Entry with id 1 and contentType api::category.category already exists in release with id 1'
      );
    });
  });
  describe('validatePendingReleasesLimit', () => {
    it('should throw an error if the default pending release limit has been reached', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            findWithCount: jest.fn().mockReturnValue([[], 4]),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      expect(() => releaseValidationService.validatePendingReleasesLimit()).rejects.toThrow(
        'You have reached the maximum number of pending releases'
      );
    });

    it('should pass if the default pending release limit has NOT been reached', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            findWithCount: jest.fn().mockReturnValue([[], 2]),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      await expect(releaseValidationService.validatePendingReleasesLimit()).resolves.not.toThrow();
    });

    it('should throw an error if the license pending release limit has been reached', () => {
      const strapiMock = {
        ...baseStrapiMock,
        ee: {
          features: {
            get: jest.fn().mockReturnValue({
              options: {
                maximumReleases: 5,
              },
            }),
          },
        },
        db: {
          query: jest.fn().mockReturnValue({
            findWithCount: jest.fn().mockReturnValue([[], 5]),
          }),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      expect(() => releaseValidationService.validatePendingReleasesLimit()).rejects.toThrow(
        'You have reached the maximum number of pending releases'
      );
    });

    it('should pass if the license pending release limit has NOT been reached', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        ee: {
          features: {
            get: jest.fn().mockReturnValue({
              options: {
                maximumReleases: 5,
              },
            }),
          },
        },
        db: {
          query: jest.fn().mockReturnValue({
            findWithCount: jest.fn().mockReturnValue([[], 4]),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      await expect(releaseValidationService.validatePendingReleasesLimit()).resolves.not.toThrow();
    });
  });
});
