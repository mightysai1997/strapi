import type Koa from 'koa';
import { errors } from '@strapi/utils';
import { RELEASE_MODEL_UID } from '../constants';
import { validateRelease } from './validation/release';
import type {
  CreateRelease,
  UpdateRelease,
  GetRelease,
  Release,
} from '../../../shared/contracts/releases';
import type { UserInfo } from '../../../shared/types';
import { getService } from '../utils';

type ReleaseWithPopulatedActions = Release & { actions: { count: number } };

const formatDataObject = (releases: ReleaseWithPopulatedActions[]) => {
  return releases.map((release) => {
    const { actions, ...releaseData } = release;

    return {
      ...releaseData,
      actions: {
        meta: {
          count: actions.count,
        },
      },
    };
  });
};

const releaseController = {
  async findMany(ctx: Koa.Context) {
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    await permissionsManager.validateQuery(ctx.query);
    const query = await permissionsManager.sanitizeQuery(ctx.query);

    const isPaginatedRequest =
      query && Object.keys(query).some((key) => ['page', 'pageSize'].includes(key));

    if (isPaginatedRequest) {
      const { results, pagination } = await getService('release', { strapi }).findPage(query);
      // Format the data object
      const data = formatDataObject(results);

      ctx.body = { data, meta: { pagination } };
    } else {
      const results = await getService('release', { strapi }).findMany(query);
      ctx.body = { data: formatDataObject(results) };
    }
  },

  async findOne(ctx: Koa.Context) {
    const id: GetRelease.Request['params']['id'] = ctx.params.id;

    const result = (await getService('release', { strapi }).findOne(
      Number(id)
    )) as ReleaseWithPopulatedActions | null;

    if (!result) {
      throw new errors.NotFoundError(`Release not found for id: ${id}`);
    }

    const { actions, ...release } = result;

    // Format the data object
    const data = {
      ...release,
      actions: {
        meta: {
          count: actions.count,
        },
      },
    };

    ctx.body = { data };
  },

  async create(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseArgs: CreateRelease.Request['body'] = ctx.request.body;

    await validateRelease(releaseArgs);

    const releaseService = getService('release', { strapi });
    const release = await releaseService.create(releaseArgs, { user });

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(release),
    };
  },

  async update(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseArgs: UpdateRelease.Request['body'] = ctx.request.body;
    const id: UpdateRelease.Request['params']['id'] = ctx.params.id;

    await validateRelease(releaseArgs);

    const releaseService = getService('release', { strapi });
    const release = await releaseService.update(id, releaseArgs, { user });

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(release),
    };
  },
};

export default releaseController;
