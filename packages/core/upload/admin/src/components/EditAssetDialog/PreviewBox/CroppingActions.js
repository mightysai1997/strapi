import React from 'react';
import PropTypes from 'prop-types';
import { IconButton } from '@strapi/parts/IconButton';
import { FocusTrap } from '@strapi/parts/FocusTrap';
import { SimpleMenu, MenuItem } from '@strapi/parts/SimpleMenu';
import CloseAlertIcon from '@strapi/icons/CloseAlertIcon';
import CheckIcon from '@strapi/icons/CheckIcon';
import { Stack } from '@strapi/parts/Stack';
import { useIntl } from 'react-intl';
import getTrad from '../../../utils/getTrad';
import { CroppingActionRow } from './components';

export const CroppingActions = ({ onCancel, onValidate }) => {
  const { formatMessage } = useIntl();

  return (
    <FocusTrap onEscape={onCancel}>
      <CroppingActionRow justifyContent="flex-end" paddingLeft={3} paddingRight={3}>
        <Stack size={1} horizontal>
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.stop-crop'),
              defaultMessage: 'Stop cropping',
            })}
            icon={<CloseAlertIcon />}
            onClick={onCancel}
          />

          <SimpleMenu
            label={formatMessage({
              id: getTrad('control-card.crop'),
              defaultMessage: 'Crop',
            })}
            as={IconButton}
            icon={<CheckIcon />}
          >
            <MenuItem onClick={onValidate}>Crop the original asset</MenuItem>
            <MenuItem>Somewhere internal</MenuItem>
          </SimpleMenu>
        </Stack>
      </CroppingActionRow>
    </FocusTrap>
  );
};

CroppingActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
};
