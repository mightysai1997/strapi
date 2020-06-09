/*
 *
 * LeftMenu
 *
 */

import React, {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
} from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';

import { UserContext, hasPermissions, request } from 'strapi-helper-plugin';
import {
  LeftMenuLinksSection,
  LeftMenuFooter,
  LeftMenuHeader,
  LinksContainer,
} from '../../components/LeftMenu';
import { generateModelsLinks } from './utils';
import init from './init';
import reducer, { initialState } from './reducer';
import Loader from './Loader';
import Wrapper from './Wrapper';

const LeftMenu = forwardRef(({ version, plugins }, ref) => {
  const location = useLocation();
  const permissions = useContext(UserContext);
  const [
    {
      collectionTypesSectionLinks,
      generalSectionLinks,
      isLoading,
      pluginsSectionLinks,
      singleTypesSectionLinks,
    },
    dispatch,
  ] = useReducer(reducer, initialState, () => init(initialState, plugins));
  const generalSectionLinksFiltered = useMemo(
    () => generalSectionLinks.filter(link => link.isDisplayed),
    [generalSectionLinks]
  );
  const pluginsSectionLinksFiltered = useMemo(
    () => pluginsSectionLinks.filter(link => link.isDisplayed),
    [pluginsSectionLinks]
  );

  const singleTypesSectionLinksFiltered = useMemo(
    () => singleTypesSectionLinks.filter(link => link.isDisplayed),
    [singleTypesSectionLinks]
  );
  const collectTypesSectionLinksFiltered = useMemo(
    () => collectionTypesSectionLinks.filter(link => link.isDisplayed),
    [collectionTypesSectionLinks]
  );

  const getModels = async () => {
    const requestURL = '/content-manager/content-types';

    try {
      const { data } = await request(requestURL, { method: 'GET' });
      const formattedData = generateModelsLinks(data);

      // TODO maybe we should display a loader while permissions are being checked
      dispatch({
        type: 'GET_MODELS_SUCCEEDED',
        data: formattedData,
      });
    } catch (err) {
      console.log(err);
      strapi.notification.error('notification.error');
    }
  };

  // Make the getModels method available for all the other plugins
  // So they can regenerate the menu when they need
  // It's specially used in the content type builder
  useImperativeHandle(ref, () => ({
    getModels,
  }));

  useEffect(() => {
    const getLinksPermissions = async () => {
      const checkPermissions = async (index, permissionsToCheck) => {
        const hasPermission = await hasPermissions(permissions, permissionsToCheck);

        return { index, hasPermission };
      };

      const generateArrayOfPromises = array =>
        array.map((_, index) => checkPermissions(index, array[index].permissions));

      const generalSectionLinksArrayOfPromises = generateArrayOfPromises(generalSectionLinks);
      const pluginsSectionLinksArrayOfPromises = generateArrayOfPromises(pluginsSectionLinks);

      await getModels();
      // TODO check permissions form models

      const generalSectionResults = await Promise.all(generalSectionLinksArrayOfPromises);
      const pluginsSectionResults = await Promise.all(pluginsSectionLinksArrayOfPromises);

      dispatch({
        type: 'SET_LINK_PERMISSIONS',
        data: {
          generalSectionLinks: generalSectionResults,
          pluginsSectionLinks: pluginsSectionResults,
        },
      });

      dispatch({
        type: 'TOGGLE_IS_LOADING',
      });
    };

    getLinksPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrapper>
      <Loader show={isLoading} />
      <LeftMenuHeader />
      <LinksContainer>
        {collectTypesSectionLinksFiltered.length && (
          <LeftMenuLinksSection
            section="collectionType"
            name="collectionType"
            links={collectTypesSectionLinksFiltered}
            location={location}
            searchable
          />
        )}
        {singleTypesSectionLinksFiltered.length && (
          <LeftMenuLinksSection
            section="singleType"
            name="singleType"
            links={singleTypesSectionLinksFiltered}
            location={location}
            searchable
          />
        )}
        <LeftMenuLinksSection
          section="plugins"
          name="plugins"
          links={pluginsSectionLinksFiltered}
          location={location}
          searchable={false}
          emptyLinksListMessage="app.components.LeftMenuLinkContainer.noPluginsInstalled"
        />
        {generalSectionLinksFiltered.length && (
          <LeftMenuLinksSection
            section="general"
            name="general"
            links={generalSectionLinksFiltered}
            location={location}
            searchable={false}
          />
        )}
      </LinksContainer>
      <LeftMenuFooter key="footer" version={version} />
    </Wrapper>
  );
});

LeftMenu.propTypes = {
  version: PropTypes.string.isRequired,
  plugins: PropTypes.object.isRequired,
};

export default LeftMenu;
