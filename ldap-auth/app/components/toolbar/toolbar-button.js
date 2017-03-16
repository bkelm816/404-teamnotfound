import Component from 'ember-component';
import computed from 'ember-computed';

export default Component.extend({
  icons: {
    delete: { image: 'delete', tooltip: 'Delete' },
    more: { image: 'more-vert' },
    filter: { image: 'filter-list', tooltip: 'Filter' },
    logoff: { image: 'exit-to-app', tooltip: 'Log out' },
    edit: { image: 'mode-edit', tooltip: 'Edit' },
    collapseStructure: { image: 'indeterminate-check-box', tooltip: 'Collapse structure' },
    add: { image: 'add', tooltip: 'Add' },
    download: { image: 'file-download', tooltip: 'Export' },
    arrowForward: { image: 'arrow forward', tooltip: 'Forward' },
    arrowBack: { image: 'arrow back', tooltip: 'Back' },
    refresh: { image: 'refresh', tooltip: 'Refresh' },
    viewList: { image: 'view list', tooltip: 'List Mode' },
    viewModule: { image: 'view module', tooltip: 'Block Mode' },
    home: { image: 'home', tooltip: 'Home' },
    upload: { image: 'file upload', tooltip: 'Upload' },
    info: { image: 'info', tooltip: 'Get Info' },
    close: { image: 'close', tooltip: 'Close' },
    videoLibrary: { image: 'video library', tooltip: 'Add Video' },
    preview: { image: 'remove red eye', tooltip: 'Preview' },
  },

  icon: computed('type', function() {
    return this.get(`icons.${this.type}`);
  }),
});
