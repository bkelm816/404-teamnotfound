import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('paper-input-autofocus', 'Integration | Component | paper input autofocus', {
  integration: true
});

test('it renders', function(assert) {

  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{paper-input-autofocus}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#paper-input-autofocus}}
      template block text
    {{/paper-input-autofocus}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
