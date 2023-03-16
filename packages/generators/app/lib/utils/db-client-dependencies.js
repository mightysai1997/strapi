'use strict';

const sqlClientModule = {
  mysql: { mysql: '2.18.1' },
  postgres: { pg: '8.8.0' },
  sqlite: { 'better-sqlite3': '8.0.1' },
  'sqlite-legacy': { sqlite3: '^5.0.2' },
  mysql2: { mysql2: '3.2.0' },
};

/**
 * Client dependencies
 */
module.exports = ({ client }) => {
  switch (client) {
    case 'sqlite':
    case 'sqlite-legacy':
    case 'postgres':
    case 'mysql':
    case 'mysql2':
      return {
        ...sqlClientModule[client],
      };

    default:
      throw new Error(`Invalid client "${client}"`);
  }
};
