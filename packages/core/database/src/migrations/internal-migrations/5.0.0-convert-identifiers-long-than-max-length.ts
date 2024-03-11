import type { Knex } from 'knex';
import type { Migration } from '../common';
import type { Metadata } from '../../metadata';
import type { Database } from '../..';

type NameDiff<T> = {
  short: T;
  full: T;
};

type IdentifierDiffs = {
  indexes: NameDiff<{ index: number; key: string; tableName: string; indexName: string }>[];
  tables: NameDiff<{ index: number; key: string; tableName: string }>[];
  columns: NameDiff<{ index: number; key: string; tableName: string; columnName: string }>[];
};

// TODO: This is being run even on the creation of a new project, which means that it won't work until we add a check that db exists

export const renameIdentifiersLongerThanMaxLength: Migration = {
  name: '5.0.0-rename-identifiers-longer-than-max-length',
  async up(knex, db) {
    const md = db.metadata;
    const mdfull = db.metadataFull;

    // TODO: improve error handling everywhere

    const diffs = getDiffs(md, mdfull);

    // migrate indexes before tables so we know to target the original tableName
    for (const indexDiff of diffs.indexes) {
      await renameIndex(knex, db, indexDiff);
    }

    // migrate columns before table names so we know to target the original tableName
    for (const columnDiff of diffs.columns) {
      const { full, short } = columnDiff;
      const tableName = full.tableName;

      const hasTable = await knex.schema.hasTable(tableName);

      if (hasTable) {
        await knex.schema.table(tableName, async (table) => {
          const hasColumn = await knex.schema.hasColumn(tableName, full.columnName);

          if (hasColumn) {
            table.renameColumn(full.columnName, short.columnName);
          }
        });
      }
    }

    // migrate table names
    for (const tableDiff of diffs.tables) {
      const hasTable = await knex.schema.hasTable(tableDiff.full.tableName);

      if (hasTable) {
        await knex.schema.renameTable(tableDiff.full.tableName, tableDiff.short.tableName);
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};

type IndexDiff = NameDiff<{ index: number; key: string; tableName: string; indexName: string }>;

const renameIndex = async (knex: Knex, db: Database, diff: IndexDiff) => {
  const client = knex.client.driverName;
  const short = diff.short;
  const full = diff.full;

  if (full.indexName === short.indexName) {
    console.log(`not renaming index ${full.indexName} because name hasn't changed`);
    return;
  }

  if (client === 'mysql' || client === 'mariadb') {
    await knex.raw(
      `ALTER TABLE \`${full.tableName}\` RENAME INDEX \`${full.indexName}\` TO \`${short.indexName}\``
    );
  } else if (client === 'pg') {
    await knex.raw(`ALTER INDEX "${full.indexName}" RENAME TO "${short.indexName}"`);
  } else {
    // SQLite doesn't support renaming, so we have to drop and recreate it
    await recreateIndexSqlite(knex, full.indexName, short.indexName);
  }
};

// Select the definition of an index, drop it, and then recreate it
// That way, we do not reacreate from the model definition and potentially lose user modifications to it
const recreateIndexSqlite = async (knex: Knex, oldIndexName: string, newIndexName: string) => {
  if (oldIndexName === newIndexName) {
    console.log(`not dropping and recreating index ${oldIndexName} because it hasn't changed`);
  }

  // Get the CREATE INDEX statement used for this index
  const indexInfo = await knex
    .select('sql')
    .from('sqlite_master')
    .where('type', 'index')
    .andWhere('name', oldIndexName)
    .first();

  if (indexInfo && indexInfo.sql) {
    // Attempt to precisely target the index name in the CREATE INDEX statement
    const pattern = new RegExp(
      `(CREATE\\s+(UNIQUE\\s+)?INDEX\\s+(IF\\s+NOT\\s+EXISTS\\s+)?)${oldIndexName}(\\s+ON)`,
      'i'
    );
    const replacement = `$1${newIndexName}$4`;
    const newIndexSql = indexInfo.sql.replace(pattern, replacement);

    // Drop the existing index
    await knex.raw(`DROP INDEX IF EXISTS ??`, [oldIndexName]);

    // Recreate the index with a new name
    await knex.raw(newIndexSql);
  } else {
    console.log(`Index ${oldIndexName} not found or could not retrieve definition.`);
  }
};

function getDiffs(shortMap: Metadata, fullMap: Metadata) {
  const diffs = {
    tables: [],
    columns: [],
    indexes: [],
  } as IdentifierDiffs;

  const shortArr = Array.from(shortMap.entries());
  const fullArr = Array.from(fullMap.entries());

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shortArr.forEach(([key, shortenedObj], index) => {
    const [, fullObj] = fullArr[index];

    if (shortenedObj.tableName !== fullObj.tableName) {
      diffs.tables.push({
        full: {
          index,
          key: 'tableName',
          tableName: fullObj.tableName,
        },
        short: {
          index,
          key: 'tableName',
          tableName: shortenedObj.tableName,
        },
      });
    }

    // eslint-disable-next-line guard-for-in
    for (const attrKey in shortenedObj.attributes) {
      const attr1 = shortenedObj.attributes[attrKey] as any;
      const attr2 = fullObj.attributes[attrKey] as any;
      if (attr1 && attr2 && attr1.columnName !== attr2.columnName) {
        diffs.columns.push({
          short: {
            index,
            tableName: shortenedObj.tableName,
            key: `attributes.${attrKey}.columnName`,
            columnName: attr1.columnName,
          },
          full: {
            index,
            tableName: fullObj.tableName,
            key: `attributes.${attrKey}.columnName`,
            columnName: attr2.columnName,
          },
        });
      }
    }
  });

  return diffs;
}
