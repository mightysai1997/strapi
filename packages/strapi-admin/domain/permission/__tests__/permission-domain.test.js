'use strict';

const domain = require('../');

describe('Permission Domain', () => {
  describe('addCondition', () => {
    test(`Init the condition array if it doesn't exists`, async () => {
      const permission = {};

      const newPermission = domain.addCondition('foo', permission);

      expect(permission).not.toHaveProperty('conditions');
      expect(newPermission).toHaveProperty('conditions', ['foo']);
    });

    test('Adds the new condition to the permission.conditions property', async () => {
      const permission = { conditions: ['foo'] };

      const newPermission = domain.addCondition('bar', permission);

      expect(permission).toHaveProperty('conditions', ['foo']);
      expect(newPermission).toHaveProperty('conditions', ['foo', 'bar']);
    });

    test(`Don't add the new condition to the permission.conditions property if it's already been added`, async () => {
      const permission = { conditions: ['foo'] };

      const newPermission = domain.addCondition('foo', permission);

      expect(permission).toHaveProperty('conditions', ['foo']);
      expect(newPermission).toHaveProperty('conditions', ['foo']);
    });
  });

  describe('removeCondition', () => {
    test('Can remove added condition from permission.conditions', () => {
      const permission = { conditions: ['foo', 'bar'] };

      const newPermission = domain.removeCondition('foo', permission);

      expect(permission).toHaveProperty('conditions', ['foo', 'bar']);
      expect(newPermission).toHaveProperty('conditions', ['bar']);
    });

    test(`Do not remove anything if the condition isn't present in permission.conditions`, () => {
      const permission = { conditions: ['foo', 'bar'] };

      const newPermission = domain.removeCondition('foobar', permission);

      expect(permission).toHaveProperty('conditions', ['foo', 'bar']);
      expect(newPermission).toHaveProperty('conditions', ['foo', 'bar']);
    });
  });

  describe('create', () => {
    test('Removes unwanted fields', () => {
      const permission = {
        id: 1,
        action: 'foo',
        subject: 'bar',
        properties: {},
        conditions: [],
        foo: 'bar',
      };

      const newPermission = domain.create(permission);

      expect(newPermission).not.toHaveProperty('foo');
    });
  });

  describe('createBoundAbstractDomain', () => {
    test('Create a bound abstract domain that prevent direct mutation on bound permission', () => {
      const permission = { action: 'foo', subject: 'bar', properties: {} };
      const domainFactory = perm => ({
        addCondition(condition) {
          Object.assign(perm, domain.addCondition(condition, perm));
          return this;
        },
      });

      const abstractDomain = domain.createBoundAbstractDomain(domainFactory, permission);

      abstractDomain.permission.action = 'bar';

      expect(abstractDomain.permission).toHaveProperty('action', 'foo');
      expect(permission).toHaveProperty('action', 'foo');

      abstractDomain.addCondition('foobar');

      abstractDomain.permission.conditions = null;

      expect(abstractDomain.permission).toHaveProperty('conditions', ['foobar']);
      expect(permission).toHaveProperty('conditions', ['foobar']);
    });
  });

  describe('getSanitizedPermissionFields', () => {
    test('Returns a new permission without the invalid fields', () => {
      const invalidPermission = { action: 'foo', subject: 'bar', properties: {}, foo: 'bar' };

      const permission = domain.getSanitizedPermissionFields(invalidPermission);

      expect(permission).not.toHaveProperty('foo');
    });
  });

  describe('setProperty', () => {
    test('Can set a new property and its value', () => {
      const permission = { properties: {} };

      const newPermission = domain.setProperty('foo', 'bar', permission);

      expect(permission).toHaveProperty('properties', {});
      expect(newPermission).toHaveProperty('properties', { foo: 'bar' });
    });

    test('Can update the value of an existing property', () => {
      const permission = { properties: { foo: 'bar' } };

      const newPermission = domain.setProperty('foo', 'foobar', permission);

      expect(permission).toHaveProperty('properties', { foo: 'bar' });
      expect(newPermission).toHaveProperty('properties', { foo: 'foobar' });
    });

    test('Can perform a deep update on a property', () => {
      const permission = { properties: { foo: { bar: { foobar: null } } }, bar: 'foo' };

      const newPermission = domain.setProperty('foo.bar.foobar', 1, permission);

      expect(permission).toHaveProperty('properties.foo.bar.foobar', null);
      expect(newPermission).toHaveProperty('properties.foo.bar.foobar', 1);
    });
  });

  describe('deleteProperty', () => {
    test('Can delete an existing property', () => {
      const permission = { properties: { foo: 'bar', bar: 'foo' } };

      const newPermission = domain.deleteProperty('foo', permission);

      expect(permission).toHaveProperty('properties', { foo: 'bar', bar: 'foo' });
      expect(newPermission).toHaveProperty('properties', { bar: 'foo' });
    });

    test('Delete a non-existing property does nothing', () => {
      const permission = { properties: { foo: 'bar' } };

      const newPermission = domain.deleteProperty('bar', permission);

      expect(permission).toHaveProperty('properties', { foo: 'bar' });
      expect(newPermission).toHaveProperty('properties', { foo: 'bar' });
    });

    test('Can perform a deep delete on a property', () => {
      const permission = { properties: { foo: { bar: { foobar: null, barfoo: 2 } } }, bar: 'foo' };

      const newPermission = domain.deleteProperty('foo.bar.barfoo', permission);

      expect(permission).toHaveProperty('properties.foo.bar', { foobar: null, barfoo: 2 });
      expect(newPermission).toHaveProperty('properties.foo.bar', { foobar: null });
    });
  });

  describe('toPermission', () => {
    test('Handle single permission object and call domain.create', () => {
      const permission = {
        id: 1,
        action: 'foo',
        subject: 'bar',
        properties: {},
        conditions: [],
        foo: 'bar',
      };

      const newPermission = domain.toPermission(permission);

      expect(newPermission).not.toHaveProperty('foo');
    });

    test('Handle multiple permission object and call domain.create', () => {
      const permissions = [
        {
          id: 1,
          action: 'foo',
          subject: 'bar',
          properties: {},
          conditions: [],
          foo: 'bar',
        },
        {
          id: 2,
          action: 'foo',
          subject: 'bar',
          properties: {},
          conditions: [],
          foo: 'bar',
        },
      ];

      const newPermissions = domain.toPermission(permissions);

      newPermissions.forEach(p => expect(p).not.toHaveProperty('foo'));
    });
  });
});
