'use strict';

const { ValidationError } = require('@strapi/utils').errors;

const entityValidator = require('../..');
const { models, nonExistentIds, existentIDs } = require('./utils/relations.testdata');

/**
 * Test that relations can be successfully validated and non existent relations
 * can be detected at the Dynamic Zone level.
 */
describe('Entity validator | Relations | Dynamic Zone', () => {
  const strapi = {
    components: {
      'basic.dev-compo': {},
    },
    db: {
      query() {
        return {
          count: ({
            where: {
              id: { $in },
            },
          }) => existentIDs.filter((value) => $in.includes(value)).length,
        };
      },
    },
    errors: {
      badRequest: jest.fn(),
    },
    getModel: (uid) => models.get(uid),
  };

  describe('Success', () => {
    const testData = [
      [
        'Connect',
        {
          DZ: [
            {
              __component: 'basic.dev-compo',
              categories: {
                disconnect: [],
                connect: existentIDs.slice(-3).map((id) => ({
                  id,
                })),
              },
            },
          ],
        },
      ],
      [
        'Set',
        {
          DZ: [
            {
              __component: 'basic.dev-compo',
              categories: {
                set: existentIDs.slice(-3).map((id) => ({
                  id,
                })),
              },
            },
          ],
        },
      ],
      [
        'Number',
        {
          DZ: [
            {
              __component: 'basic.dev-compo',
              categories: existentIDs[0],
            },
          ],
        },
      ],
      [
        'Array',
        {
          DZ: [
            {
              __component: 'basic.dev-compo',
              categories: existentIDs.slice(-3),
            },
          ],
        },
      ],
    ];

    test.each(testData)('%s', async (__, input = {}) => {
      global.strapi = strapi;
      const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
        isDraft: true,
      });
      await expect(res).resolves.not.toThrowError();
    });
  });

  describe('Error', () => {
    const expectedError = new ValidationError(
      `2 relation(s) of type api::category.category associated with this entity do not exist`
    );
    const testData = [
      [
        'Connect',
        {
          DZ: [
            {
              __component: 'basic.dev-compo',
              categories: {
                disconnect: [],
                connect: [existentIDs[0], ...nonExistentIds.slice(-2)].map((id) => ({
                  id,
                })),
              },
            },
          ],
        },
      ],
      [
        'Set',
        {
          DZ: [
            {
              __component: 'basic.dev-compo',
              categories: {
                set: [existentIDs[0], ...nonExistentIds.slice(-2)].map((id) => ({
                  id,
                })),
              },
            },
          ],
        },
      ],
      [
        'Array',
        {
          DZ: [
            {
              __component: 'basic.dev-compo',
              categories: [existentIDs[0], ...nonExistentIds.slice(-2)].map((id) => ({
                id,
              })),
            },
          ],
        },
      ],
    ];

    test.each(testData)('%s', async (__, input = {}) => {
      global.strapi = strapi;
      const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
        isDraft: true,
      });
      await expect(res).rejects.toThrowError(expectedError);
    });
  });
});
