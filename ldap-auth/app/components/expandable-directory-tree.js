import Component from 'ember-component';
import computed from 'ember-computed';
import observer from 'ember-metal/observer';

export default Component.extend({
  classNames: ['expandable-tree'],

  treeClassNames: computed('root', 'selectedCategory.hash', 'node.hash', function() {
    let node = this.get('node');
    if (!node) {
      return '';
    }

    let classNames = `${node.hash} directory-item full-row`;

    if (this.get('root')) {
      classNames += ' root-row';
    }

    if (this.get('selectedCategory').hash === node.hash) {
      classNames += ' selected';
    }

    return classNames;
  }),

  collapseStructure: observer('collapseTrigger', function() {
    this.set('node.expanded', false);
  }),

  actions: {
    onRowClick() {
      let node = this.get('node');

      this.sendAction('changeCWD', node.hash);

      if (!(node.id !== this.get('selectedCategory').id && node.expanded)) {
        this.toggleProperty('node.expanded');
      }
    },
  },
});
