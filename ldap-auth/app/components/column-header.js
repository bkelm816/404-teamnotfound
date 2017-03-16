import Component from 'ember-component';

export default Component.extend({
  click() {
    this.sendAction('columnHeaderClicked', this.get('property'));
  },
});
