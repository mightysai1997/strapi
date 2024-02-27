import { Flex, Icon, Status, Typography } from '@strapi/design-system';
import { useNotification, useQueryParams } from '@strapi/helper-plugin';
import { ExclamationMarkCircle, Trash } from '@strapi/icons';
import {
  type HeaderActionComponent,
  unstable_useDocument,
  unstable_useDocumentActions as useDocumentActions,
  type DocumentActionComponent,
} from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { useI18n } from '../hooks/useI18n';
import { useGetLocalesQuery } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';
import { capitalize } from '../utils/strings';

import type { I18nBaseQuery } from '../types';

/* -------------------------------------------------------------------------------------------------
 * LocalePickerAction
 * -----------------------------------------------------------------------------------------------*/

const LocalePickerAction: HeaderActionComponent = ({ document, meta }) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams<I18nBaseQuery>();
  const { hasI18n, canCreate, canRead } = useI18n();
  const { data: locales = [] } = useGetLocalesQuery();

  if (!hasI18n || !Array.isArray(locales) || locales.length === 0) {
    return null;
  }

  const defaultLocale = locales.find((loc) => loc.isDefault)!;
  const currentLocale = query.plugins?.i18n?.locale || defaultLocale.code;

  const handleSelect = (value: string) => {
    setQuery({
      plugins: {
        ...query.plugins,
        i18n: {
          locale: value,
        },
      },
    });
  };

  const allCurrentLocales = [
    { status: getDocumentStatus(document, meta), locale: currentLocale },
    ...(meta?.availableLocales ?? []),
  ];

  return {
    label: formatMessage({
      id: getTranslation('Settings.locales.modal.locales.label'),
      defaultMessage: 'Locales',
    }),
    options: locales.map((locale) => {
      const currentLocaleDoc = allCurrentLocales.find((doc) =>
        'locale' in doc ? doc.locale === locale.code : false
      );
      const status = currentLocaleDoc?.status ?? 'draft';

      const permissionsToCheck = currentLocaleDoc ? canCreate : canRead;

      const statusVariant =
        status === 'draft' ? 'primary' : status === 'published' ? 'success' : 'alternative';

      return {
        disabled: !permissionsToCheck.includes(locale.code),
        value: locale.code,
        label: locale.name,
        startIcon: (
          <Status
            display="flex"
            paddingLeft="6px"
            paddingRight="6px"
            paddingTop="2px"
            paddingBottom="2px"
            showBullet={false}
            size={'S'}
            variant={statusVariant}
          >
            <Typography as="span" variant="pi" fontWeight="bold">
              {capitalize(status)}
            </Typography>
          </Status>
        ),
      };
    }),
    onSelect: handleSelect,
    value: currentLocale,
  };
};

type UseDocument = typeof unstable_useDocument;

const getDocumentStatus = (
  document: ReturnType<UseDocument>['document'],
  meta: ReturnType<UseDocument>['meta']
): 'draft' | 'published' | 'modified' => {
  const docStatus = document?.status;
  const statuses = meta?.availableStatus ?? [];

  /**
   * Creating an entry
   */
  if (!docStatus) {
    return 'draft';
  }

  /**
   * We're viewing a draft, but the document could have a published version
   */
  if (docStatus === 'draft' && statuses.find((doc) => doc.publishedAt !== null)) {
    return 'published';
  }

  return docStatus;
};

/* -------------------------------------------------------------------------------------------------
 * DeleteLocaleAction
 * -----------------------------------------------------------------------------------------------*/

const DeleteLocaleAction: DocumentActionComponent = ({
  document,
  documentId,
  model,
  collectionType,
}) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const toggleNotification = useNotification();
  const { delete: deleteAction } = useDocumentActions();
  const { hasI18n, canDelete } = useI18n();

  if (!hasI18n) {
    return null;
  }

  return {
    disabled: (document?.locale && !canDelete.includes(document.locale)) || !document,
    position: ['header', 'table-row'],
    label: formatMessage({
      id: getTranslation('actions.delete.label'),
      defaultMessage: 'Delete locale',
    }),
    icon: <StyledTrash />,
    variant: 'danger',
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: getTranslation('actions.delete.dialog.title'),
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" gap={2}>
          <Icon as={ExclamationMarkCircle} width={6} height={6} color="danger600" />
          <Typography as="p" variant="omega" textAlign="center">
            {formatMessage({
              id: getTranslation('actions.delete.dialog.body'),
              defaultMessage: 'Are you sure?',
            })}
          </Typography>
        </Flex>
      ),
      onConfirm: async () => {
        if (!documentId || !document?.locale) {
          console.error(
            "You're trying to delete a document without an id or locale, this is likely a bug with Strapi. Please open an issue."
          );

          toggleNotification({
            message: formatMessage({
              id: getTranslation('actions.delete.error'),
              defaultMessage: 'An error occurred while trying to delete the document locale.',
            }),
            type: 'warning',
          });

          return;
        }

        const res = await deleteAction({
          documentId,
          model,
          collectionType,
          params: { locale: document.locale },
        });

        if (!('error' in res)) {
          navigate({ pathname: `../${collectionType}/${model}` }, { replace: true });
        }
      },
    },
  };
};

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledTrash = styled(Trash)`
  path {
    fill: currentColor;
  }
`;

export { DeleteLocaleAction, LocalePickerAction };
