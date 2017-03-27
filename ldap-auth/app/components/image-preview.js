import Component from 'ember-component';
import observer from 'ember-metal/observer';

export default Component.extend({
  previewOpen: false,
  maxSize: false,

  onOpen: observer('previewOpen', function() {
    if (this.get('previewOpen')) {
      this.set('maxSize', false);
    }
  }),

  actions: {
    closeDialog() {
      this.setProperties({ previewOpen: false });
    },

    onImageDblClick() {
      this.toggleProperty('maxSize');
    },
  },
});
