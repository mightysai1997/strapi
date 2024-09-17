/* eslint-disable check-file/filename-naming-convention */
import * as qs from 'qs';
import { matchPath } from 'react-router-dom';

import type { RBACMiddleware } from '@strapi/admin/strapi-admin';

const localeMiddleware: RBACMiddleware = (ctx) => (next) => (permissions) => {
  const match = matchPath('/content-manager/:collectionType/:model?/:id', ctx.pathname);

  if (!match) {
    return next(permissions);
  }

  const search = qs.parse(ctx.search);

  if (typeof search !== 'object') {
    return next(permissions);
  }

  if (!('plugins' in search && typeof search.plugins === 'object')) {
    return next(permissions);
  }

  if (
    !(
      'i18n' in search.plugins &&
      typeof search.plugins.i18n === 'object' &&
      !Array.isArray(search.plugins.i18n)
    )
  ) {
    return next(permissions);
  }

  const { locale } = search.plugins.i18n;

  if (typeof locale !== 'string') {
    return next(permissions);
  }

  // const doLog = permissions.some((permission) => {
  //   return permission?.subject?.includes('homepage');
  // });

  // if (doLog) {
  //   console.trace('__local');
  //   console.log('__local localeMiddleware locale stuff', search, locale, typeof locale);
  //   console.log('__local i18n rbac middle before', locale, permissions);
  // }
  const revisedPermissions = permissions.filter(
    (permission) =>
      !permission.properties?.locales || permission.properties.locales.includes(locale)
  );
  // if (doLog) {
  //   console.log('__local i18n rbac middle', locale, revisedPermissions);
  // }

  return next(revisedPermissions);
};

export { localeMiddleware };
