import Ember from 'ember';
import TreeMixin from 'ldap-auth/mixins/tree';
import { module, test } from 'qunit';

module('Unit | Mixin | tree');

// Replace this with your real tests.
test('it works', function(assert) {
  let TreeObject = Ember.Object.extend(TreeMixin);
  let subject = TreeObject.create();
  assert.ok(subject);
});
