/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { ConfigureStoreOptions } from '@reduxjs/toolkit';
import {
  defaultTestStoreConfig,
  render as renderAdmin,
  RenderOptions,
  server,
} from '@strapi/admin/strapi-admin/tests';
import { waitFor, RenderResult, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { releaseApi } from '../src/services/release';

const storeConfig: ConfigureStoreOptions = {
  preloadedState: defaultTestStoreConfig.preloadedState,
  reducer: {
    ...defaultTestStoreConfig.reducer,
    [releaseApi.reducerPath]: releaseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => [
    ...defaultTestStoreConfig.middleware(getDefaultMiddleware),
    releaseApi.middleware,
  ],
};

const render = (
  ui: React.ReactElement,
  options: RenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } =>
  renderAdmin(ui, { ...options, providerOptions: { storeConfig } });

export { render, waitFor, act, screen, server };
