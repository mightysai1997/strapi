'use strict';

const { isArray } = require('lodash/fp');

const traverseEntity = require('../traverse-entity');
const { getNonWritableAttributes } = require('../content-types');
const visitors = require('./visitors');
const utils = require('./utils');

module.exports = {
  contentAPI: {
    input(data, schema, { auth } = {}) {
      if (isArray(data)) {
        return Promise.all(data.map(entry => this.input(entry, schema, { auth })));
      }

      const nonWritableAttributes = getNonWritableAttributes(schema);

      const transforms = [
        // Remove non writable attributes
        traverseEntity(visitors.restrictedFields(nonWritableAttributes), { schema }),
      ];

      if (auth) {
        // Remove restricted relations
        transforms.push(
          traverseEntity(visitors.removeRestrictedRelations(auth, 'input'), { schema })
        );
      }

      return utils.pipeAsync(...transforms)(data);
    },

    output(data, schema, { auth } = {}) {
      if (isArray(data)) {
        return Promise.all(data.map(entry => this.output(entry, schema, { auth })));
      }

      const transforms = [
        traverseEntity(visitors.removePassword, { schema }),
        traverseEntity(visitors.removePrivate, { schema }),
      ];

      if (auth) {
        transforms.push(
          traverseEntity(visitors.removeRestrictedRelations(auth, 'output'), { schema })
        );
      }

      return utils.pipeAsync(...transforms)(data);
    },
  },

  eventHub(data, schema) {
    if (isArray(data)) {
      return Promise.all(data.map(entry => this.eventHub(entry, schema)));
    }

    return utils.pipeAsync(
      traverseEntity(visitors.removePassword, { schema }),
      traverseEntity(visitors.removePrivate, { schema })
    )(data);
  },

  utils,
  visitors,
};
