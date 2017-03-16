import Component from 'ember-component';

/*
generic delete dialog.
Parent route must implement actions:
  - confirmDelete to perform delete operation
  - (optional) exitSuccessful to handle delete completion
*/
export default Component.extend({
  dialogOpen: false,
  deleteError: null,
  deleteSuccessful: false,
  exitSuccessful:true,

  actions: {
    closeDialog() {
      this.setProperties({ dialogOpen: false, deleteError: false });
      if (this.get('deleteSuccessful') === true) {
        this.set('deleteSuccessful', false);
        this.sendAction('exitSuccessful');
      }
    },
  },
});
