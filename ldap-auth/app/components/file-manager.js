import ContextMenuMixin from 'ember-context-menu';
import Component from 'ember-component';
import computed from 'ember-computed';
import fetch from 'fetch';
import getOwner from 'ember-getowner-polyfill';
import RSVP from 'rsvp';
import service from 'ember-service/inject';
import set from 'ember-metal/set';
import TreeMixin from 'ldap-auth/mixins/tree';
import $ from 'jquery';

const SIZE_UNITS = ['b', 'kb', 'mb', 'gb'];

const SORT = { asc: 'asc', desc: 'desc' };

const TRANSITIONS = { back: 'back', forward: 'forward' };

export default Component.extend(ContextMenuMixin, TreeMixin, {
  fetchService: service('base-service'),

  youtubeVideosEnabled: true,
  fetchingDirectory: true,
  column: 'mime',

  backHistory: [],
  forwardHistory: [],
  selectedFiles: [],
  cutFiles: [],

  filePickerOpen: false,
  getInfoOpen: false,
  defaultDisplay: true,
  sort: SORT.asc,
  searchText: '',

  contextMenu(e) {
    this.computeContextItems(e.target);
    this._super(...arguments);
  },

  didInsertElement() {
    return this.$().focus().attr({ tabindex: 1 });
  },

  keyDown(e) {
    let controller = this.get('controller');
    let dir;

    if (e.keyCode === 38) {
      dir = -1;
    } else if (e.keyCode === 40) {
      dir = 1;
    } else if (e.keyCode === 13) {
      let selectedFiles = controller.get('selectedFiles');

      if (selectedFiles.length === 1 && selectedFiles[0].mime === this.get('config').mimes.directory.name) {
        controller.send('changeCWD', selectedFiles[0].hash);
      }
    }

    if (dir) {
      controller.changeFileSelection({
        direction: dir,
        shiftKey: e.shiftKey,
        ctrKey: e.ctrlKey || e.metaKey,
      });
    }
  },

  config: computed(function() {
    return getOwner(this).resolveRegistration('config:environment');
  }),

  rootAPI: computed('config', function() {
    return this.get('config').rootAPI;
  }),

  fileItemsClassNames: computed('formattedFiles', 'selectedFiles', 'cutFiles', function() {
    let formattedFiles = this.get('formattedFiles');
    let selectedFiles = this.get('selectedFiles');
    let cutFiles = this.get('cutFiles');
    let fileItemsClassNames = [];

    formattedFiles.forEach((file) => {
      let classes = '';

      let fileFound = this.findObject(selectedFiles, file.hash, 'hash');
      if (fileFound.name !== 'None') {
        classes += 'selected';
      }

      fileFound = this.findObject(cutFiles, file.hash, 'hash');
      if (fileFound.name !== 'None') {
        classes += `${classes ? ' ' : ''}cut`;
      }

      fileItemsClassNames.push(classes);
    });

    return fileItemsClassNames;
  }),

  //list of current directory's files
  directoryFiles: computed('model', function() {
    let model = this.get('model');
    let _this = this;

    if (model) {
      return this.initializeDirectory(model);
    } else {
      this.get('fetchService').fetch(`${this.get('rootAPI')}file?cmd=open&target=${this.get('homeDir')}`, { method: 'GET' }).then((model) => {
        this.set('directoryFiles', this.initializeDirectory(model));
      }, function(error) {
        _this.get('flashMessages').warning(error.errorMessage.message);
        _this.set('fetchingDirectory', false);
      });
    }
  }),

  //list of current directory's files which are sorted or formatted in some way
  formattedFiles: computed('directoryFiles', function() {
    return this.get('directoryFiles');
  }),

  selectedFilesInfo: computed('selectedFiles', function() {
    let selectedFiles = this.get('selectedFiles');
    let selectedFilesInfo = { kind: '', size: 0, multiple: true, length: selectedFiles.length, sizeUnknown: false };

    if (selectedFiles.length > 1) {
      let kinds = { folders: 0, files: 0 };

      selectedFiles.forEach((file) => {
        if (file.mime !== this.get('config').mimes.directory.name) {
          selectedFilesInfo.size += file.size;
          kinds.files++;
        } else {
          selectedFilesInfo.sizeUnknown = true;
          kinds.folders++;
        }
      });

      this.setFileSizeString(selectedFilesInfo);

      if (kinds.folders) {
        selectedFilesInfo.kind = `${kinds.folders} Folders`;
      }

      if (kinds.files) {
        if (kinds.folders) {
          selectedFilesInfo.kind += ', ';
        }

        selectedFilesInfo.kind += `${kinds.files} Files`;
      }
    } else if (selectedFiles.length === 1) {
      selectedFilesInfo = selectedFiles[0];
    }

    return selectedFilesInfo;
  }),

  //TODO: Add icons to context-menu options when they are enabled on the 'ember-context-menu' addon
  computeContextItems(targetElement) {
    let _this = this;
    let cwd = this.get('cwd');
    this.set('getInfoOpen', false);

    if (!targetElement) {
      targetElement = document.activeElement;
    }

    let selectedFiles = this.get('selectedFiles').slice();
    let contextItems = [
      {
        label: 'Reload',
        action() {
          _this.send('refresh');
        },
      },
    ];

    if (this.get('cutFiles').length && cwd.write) {
      contextItems.push({
        label: 'Paste',
        action() {
          _this.pasteFiles();
        },
      });
    }

    let directoryTreeFile;
    while (targetElement &&
      !targetElement.classList.contains('file-item') && !targetElement.classList.contains('file-item-block')) {
      if (targetElement.classList.contains('directory-item')) {
        directoryTreeFile = this.findInTree(this.get('directoryTree'), targetElement.classList[0], 'hash');
        break;
      }

      if (targetElement.parentElement) {
        targetElement = targetElement.parentElement;
      } else {
        targetElement = null;
      }
    }

    let clickedFile = directoryTreeFile;

    if (!clickedFile && targetElement) {
      clickedFile = this.get('formattedFiles').find((file) => {
        return (file.hash === targetElement.classList[0]);
      });

      if (!selectedFiles.contains(clickedFile)) {
        selectedFiles = [clickedFile];
      }
    }

    contextItems.push({
      label: 'Get Info',
      action() {
        _this.send('toggleInfo', { clickedFile });
      },
    });

    if (clickedFile) {
      if (selectedFiles.length) {
        contextItems.push({
          label: 'Cut',
          action() {
            let cutFiles = selectedFiles;
            cutFiles.src = _this.get('cwd').hash;

            _this.set('cutFiles', cutFiles);
          },
        }, {
          label: 'Delete',
          action() {
            _this.deleteFiles();
          },
        });
      }

      if (selectedFiles.length === 1) {
        if (selectedFiles[0].write) {
          contextItems.push({
            label: 'Rename',
            action() {
              _this.renameFileStart();
            },
          });
        }

        if (selectedFiles[0].read) {
          contextItems.push({
            label: 'Download',
            action() {
              _this.send('download', { clickedFile });
            },
          });
        }
      }
    }

    this.setProperties({ selectedFiles, contextItems });
  },

  initializeDirectory(model) {
    if (!model.files.length) {
      return {};
    }

    let [directoryFiles, cwdChildren] = this.separateFiles(model);
    model.cwd.children = cwdChildren;
    model.cwd.expanded = true;

    this.setProperties({
      directoryTree: model.cwd,
      cwd: model.cwd,
    });

    this.set('fetchingDirectory', false);
    return directoryFiles;
  },

  //separates the files based on the type and sets all the necessary properties
  separateFiles(model, search=false) {
    let directoryFiles = [];
    let cwdChildren = [];
    let parentPath = '';
    directoryFiles.size = 0;

    if (!search) {

      //finds the path through the directory tree and returns it as an array (ex: Media/Body Parts)
      let path = this.findPathInTree(this.get('directoryTree') || model.cwd, model.cwd.hash, 'hash');

      path.forEach((node) => {
        parentPath += node.name + '/';
      });
    }

    model.files.forEach((file) => {
      if (file.mime && (search || file.phash === model.cwd.hash)) {
        let config = this.get('config');

        if (!file.size) {
          file.size = 0;
        }

        directoryFiles.size += file.size;

        this.setFileSizeString(file);
        this.setFilePermissionString(file);
        this.setFileKind(file);
        set(file, 'pathString', parentPath + file.name);

        if (file.mime === config.mimes.directory.name) {
          cwdChildren.push(file);
        } else if (!config.mimes.video || file.mime !== config.mimes.video.name) {
          set(file, 'link', `${config.linkBaseURL}${file.hash}`);
        } else if (config.mimes.video && file.mime === config.mimes.video.name) {
          let id = file.tmb.split('vi/')[1].split('/')[0];
          set(file, 'link', `${config.youtubeBaseURL}${id}`);
        }

        directoryFiles.push(file);
      }
    });

    let sortedDirectoryFiles = directoryFiles.sortBy(this.get('column'));
    sortedDirectoryFiles.size = directoryFiles.size;

    this.setFileSizeString(sortedDirectoryFiles);
    this.set('cwdPath', parentPath.substring(0, parentPath.length - 1));

    return [sortedDirectoryFiles, cwdChildren];
  },

  //sets the permission string (ex: 'Read and Write')
  setFilePermissionString(file) {
    let string = '';

    if (file.read) {
      string = 'Read';

      if (file.write) {
        string += ' and Write';
      }
    } else if (file.write) {
      string = 'Write';
    }

    set(file, 'permissionString', string);
  },

  //sets the size string (ex: '000 kb')
  setFileSizeString(file) {
    let unitIndex = 0;

    while (file.size >= 1000 && unitIndex < 3) {
      file.size /= 1000;
      unitIndex++;
    }

    set(file, 'sizeString', `${parseInt(file.size || 0)} ${SIZE_UNITS[unitIndex]}`);
  },

  //sets the type of file (ex: 'Video Media')
  setFileKind(file) {
    let config = this.get('config');

    Object.keys(config.mimes).forEach((key) => {
      if (file.mime === config.mimes[key].name) {
        set(file, 'kind', config.mimes[key].kind);
      }
    });
  },

  setInfoPopup({ clickedFile=null }={}) {
    let selectedFiles = this.get('selectedFiles');
    let filesInfo = this.get('selectedFilesInfo');

    if (clickedFile) {
      if (!selectedFiles.contains(clickedFile)) {
        filesInfo = clickedFile;
      }
    } else if (!selectedFiles.length) {
      filesInfo = this.get('cwd');
    }

    this.setProperties({ filesInfo });
  },

  //rename action to enable input
  renameFileStart() {
    let selectedFile = this.get('selectedFiles')[0];

    if (selectedFile.write) {
      this.setProperties({
        renaming: true,
        renamingId: selectedFile.hash,
        newName: selectedFile.name,
      });
    } else {
      this.get('flashMessages').warning('No permission to edit this file');
    }
  },

  pasteFiles() {
    let flashMessages = this.get('flashMessages');
    let cwd = this.get('cwd');
    let cutFiles = this.get('cutFiles');
    let targets = '';

    cutFiles.forEach((file) => {
      if (!file.rm) {
        flashMessages.warning('No permission to remove a file');
        return;
      }
    });

    if (cwd.write) {
      cutFiles.forEach((file) => {
        targets += `&targets%5B%5D=${file.hash}`;
      });

      if (targets) {
        let params = `cmd=paste&dst=${cwd.hash}${targets}&cut=1&src=${cutFiles.src}`;

        this.get('fetchService').fetch(`${this.get('rootAPI')}file?${params}`, { method: 'GET' }).then(() => {
          let directoryTree = this.get('directoryTree');

          //deleting folder rows from the directory tree view
          cutFiles.forEach((file) => {
            if (file.mime === this.get('config').mimes.directory.name) {
              let parent = this.findInTree(directoryTree, file.phash, 'hash');
              if (parent) {
                let children = parent.children.slice();
                children.splice(children.indexOf(file), 1);
                set(parent, 'children', children);
              }
            }
          });

          this.send('refresh');
        });
      }
    } else {
      flashMessages.warning('No permission to edit this directory');
    }
  },

  //opens confirm delete dialog and sets files up for deletion
  deleteFiles() {
    let selectedFiles = this.get('selectedFiles');
    let names = '';

    selectedFiles.forEach((file) => {
      if (!file.rm) {
        this.get('flashMessages').warning(`No permission to delete ${selectedFiles.length > 1 ? 'these' : 'this'} file`);
        return;
      }

      names += `, ${file.name}`;
    });

    this.set('filesToDeleteNames', names.substring(2));
    this.set('showDeleteDialog', true);
  },

  //select files with up and down arrow keys
  changeFileSelection({ direction, shiftKey, ctrKey }) {
    let selectedFiles = this.get('selectedFiles').slice();
    let formattedFiles = this.get('formattedFiles');

    let nextFileIndex = formattedFiles.indexOf(selectedFiles[selectedFiles.length - 1]) + direction;
    let initialIndex = formattedFiles.indexOf(selectedFiles[0]);

    if (!selectedFiles.length) {
      selectedFiles = [formattedFiles[direction === 1 ? 0 : formattedFiles.length - 1]];
    } else {
      if (nextFileIndex >= 0 && nextFileIndex < formattedFiles.length) {
        if (ctrKey) {
          if (direction === -1) {
            selectedFiles = formattedFiles.slice(0, initialIndex + 1);
            selectedFiles.reverse();
          } else {
            selectedFiles = formattedFiles.slice(initialIndex, formattedFiles.length);
          }
        } else if (shiftKey) {
          if (initialIndex > nextFileIndex) {
            selectedFiles = formattedFiles.slice(nextFileIndex, initialIndex + 1);
            selectedFiles.reverse();
          } else {
            selectedFiles = formattedFiles.slice(initialIndex, nextFileIndex + 1);
          }
        } else {
          selectedFiles = [formattedFiles[initialIndex + direction]];
        }
      } else if (!(initialIndex === 0 && direction === -1) && !ctrKey && !shiftKey &&
        !(initialIndex === formattedFiles.length - 1 && direction === 1)) {
        selectedFiles = [formattedFiles[initialIndex + direction]];
      }
    }

    this.set('selectedFiles', selectedFiles);

    if (this.get('getInfoOpen')) {
      this.setInfoPopup();
    }
  },

  actions: {
    toggleInfo({ clickedFile=null }) {
      if (!this.get('getInfoOpen')) {
        this.setInfoPopup({ clickedFile });
      }

      this.set('filePickerOpen', false);
      this.toggleProperty('getInfoOpen');
    },

    setFilePickerVar(value) {
      this.set('filePickerOpen', value);
    },

    //searches for a file through all directories
    onSearchKeydown(e) {
      if (e.keyCode === 13) {
        this.set('fetchingDirectory', true);

        this.get('fetchService').fetch(`${this.get('rootAPI')}file?cmd=search&q=${this.get('searchText')}`,
          { method: 'GET' }).then((result) => {
          this.setProperties({
            directoryFiles: this.separateFiles(result, true)[0],
            fetchingDirectory: false,
          });
        });
      }
    },

    //selects files on click
    onClickFile(file, e) {
      let previouslySelectedFiles = this.get('selectedFiles');
      let selectedFiles = [file];

      if (e.shiftKey && previouslySelectedFiles.length > 0) {
        let formattedFiles = this.get('formattedFiles');
        let firstFileIndex = formattedFiles.indexOf(previouslySelectedFiles[0]);
        let clickedFileIndex = formattedFiles.indexOf(file);

        let begin = clickedFileIndex;
        let end = firstFileIndex;
        if (firstFileIndex < clickedFileIndex) {
          begin = firstFileIndex + 1;
          end = clickedFileIndex + 1;
        }

        selectedFiles = [previouslySelectedFiles[0], ...formattedFiles.slice(begin, end)];
      } else if (e.ctrlKey || e.metaKey) {
        let index = previouslySelectedFiles.indexOf(file);

        if (index >= 0) {
          selectedFiles = previouslySelectedFiles.slice();
          selectedFiles.splice(index, 1);
        } else {
          selectedFiles = [...previouslySelectedFiles, file];
        }
      }

      this.setProperties({ selectedFiles });
    },

    //double click any file
    onDblClickFile(file) {
      if (file.read) {
        if (!this.get('renaming')) {
          if (file.mime === this.get('config').mimes.directory.name) {
            this.send('changeCWD', file.hash, { expand: true });
          } else {
            window.open(file.link);
          }
        }
      } else {
        this.get('flashMessages').warning('No permission to access this file');
      }
    },

    //deselect files
    deselect(data) {
      data = data.target;

      while (data.offsetParent !== null && !data.offsetParent.classList.contains('directory-container')) {
        if (data.classList.contains('no-deselect-area')) {
          return;
        }

        data = data.offsetParent;
      }

      this.set('selectedFiles', []);
    },

    changeDisplayType() {
      this.toggleProperty('defaultDisplay');
    },

    //change cwd (reload from db)
    changeCWD(targetHash, options={}) {
      this.set('fetchingDirectory', true);

      this.get('fetchService').fetch(`${this.get('rootAPI')}file?cmd=open&target=${targetHash}`, { method: 'GET' }).then((result) => {
        let [directoryFiles, cwdChildren] = this.separateFiles(result);
        let cwd = this.findInTree(this.get('directoryTree'), targetHash, 'hash');

        if (!cwd || !cwd.children || options.refresh) {
          set(cwd, 'children', cwdChildren);
        }

        if (options.expand) {
          set(cwd, 'expanded', true);
        }

        let backHistory = this.get('backHistory').slice();
        let forwardHistory = this.get('forwardHistory').slice();
        let oldCwd = this.get('cwd');

        if (options.transitionType !== TRANSITIONS.back) {
          if (cwd.hash !== oldCwd.hash) {
            backHistory.push(oldCwd);
          }

          if (options.transitionType !== TRANSITIONS.forward) {
            forwardHistory = [];
          }
        } else {
          forwardHistory.push(oldCwd);
          backHistory.splice(backHistory.length - 1, 1);
        }

        if (options.transitionType === TRANSITIONS.forward) {
          forwardHistory.splice(forwardHistory.length - 1, 1);
        }

        this.setProperties({
          backHistory,
          forwardHistory,
          directoryFiles,
          cwd: cwd,
          selectedFiles: [],
          fetchingDirectory: false,
        });
      });
    },

    //go back or forward in the browsed history
    backOrForward(label) {
      let history = this.get(`${label}History`);

      if (history.length > 0) {
        this.send('changeCWD', history.slice(-1)[0].hash, { transitionType: label, expand: true });
      }
    },

    //refresh cwd
    refresh() {
      this.send('changeCWD', this.get('cwd').hash, { refresh: true });
    },

    home() {
      this.send('changeCWD', this.get('homeDir'), { refresh: true });
    },

    columnHeaderClicked(property) {
      let formattedFiles = this.get('formattedFiles').slice();
      let sort = SORT.asc;

      if (this.get('column') === property) {
        sort = (this.get('sort') === SORT.asc) ? SORT.desc : SORT.asc;
      }

      formattedFiles = this.get('directoryFiles').sortBy(property);
      if (sort === SORT.desc) {
        formattedFiles.reverse();
      }

      this.setProperties({
        column: property,
        sort,
        formattedFiles,
      });
    },

    resetSearch() {
      this.set('searchText', '');
      this.send('refresh');
    },

    //TODO: add support for multiple files when ember-file-picker is able to support it
    //called when file selected with file-picker is finished loading
    fileLoaded(file) {
      this.set('filePickerOpen', false);

      const formData = new FormData();
      formData.append('cmd', 'upload');
      formData.append('target', this.get('cwd').hash);
      formData.append('upload[]', file, file.name);

      return new RSVP.Promise((resolve, reject) => {
        fetch(`${this.get('rootAPI')}file`, {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
        }).then(() => {
          this.send('refresh');
        }).catch((error) => {
          reject({ errorMessage: error });
        });
      });
    },

    //updates the file name in the db if it was changed
    renameFile(file) {
      let newName = this.get('newName');

      this.set('renaming', false);

      if (newName === file.name) {
        return;
      }

      set(file, 'name', newName);

      this.get('fetchService').fetch(`${this.get('rootAPI')}file?cmd=rename&target=${file.hash}&name=${newName}`, { method: 'GET' })
        .then(() => {
          this.send('refresh');
        });
    },

    //calls action 'renameFile' if enter is pressed
    onRenameInputKeydown(actionName, file, e) {
      if (e.keyCode === 13) {
        this.send(actionName, file);
      }
    },

    //if dialog is confirmed, delete the files selected for deletion
    confirmDelete() {
      let targetHashes = '';
      this.get('selectedFiles').forEach((file) => {
        let splitHash = file.hash.split('_');
        targetHashes += `&targets%5B%5D=${splitHash[0]}_${splitHash[1]}`;
      });

      if (targetHashes) {
        this.get('fetchService').fetch(`${this.get('rootAPI')}file?cmd=rm${targetHashes}`, { method: 'GET' }).then((result) => {
          if (result.removed.length) {
            this.set('deleteSuccessful', true);
          } else {
            this.set('deleteError', 'Failed to delete files.');
          }
        });
      }
    },

    //opens video input dialog when button is clicked
    openVideoDialog() {
      this.set('videoDialogOpen', true);
    },

    //closes video input dialog
    closeVideoDialog() {
      this.setProperties({
        videoUrl: '',
        videoName: '',
        videoDialogOpen: false,
        videoUrlError: '',
      });

      this.send('refresh');
    },

    //adds video to db based on input from video dialog
    addVideo() {
      let url = this.get('videoUrl');
      let name = this.get('videoName');

      let valid = /^(https?\:\/\/)?((www\.)?youtube\.com)\/watch\?v\=.+$/;
      if (!valid.test(url)) {
        this.set('videoUrlError', 'Invalid link.');
        return;
      }

      if (!name) {
        this.set('videoUrlError', 'No name entered.');
        return;
      }

      let newVideo = {
        url,
        name,
        directory: this.get('cwd').hash,
      };

      this.set('videoDialogOpen', false);
      this.get('fetchService').fetch(`${this.get('rootAPI')}file/youtube`, { method: 'POST' }, newVideo).then(() => {
        this.send('closeVideoDialog');
      });
    },

    //opens image preview dialog when button is clicked
    openPreviewDialog() {
      this.set('previewOpen', true);
    },

    //image-preview component action to select previous or next image
    previousOrNextPreview(next=true) {
      let mod = (!next) ? -1 : 1;
      let config = this.get('config');
      let formattedFiles = this.get('formattedFiles');
      let index = formattedFiles.indexOf(this.get('selectedFiles')[0]) + mod;

      while (!formattedFiles[index] || formattedFiles[index].mime === config.mimes.directory.name ||
        formattedFiles[index].mime === config.mimes.video.name) {
        index = index + mod;
        if (index > formattedFiles.length - 1) {
          index = 0;
        } else if (index < 0) {
          index = formattedFiles.length - 1;
        }
      }

      this.set('selectedFiles', [formattedFiles[index]]);
    },

    download({ clickedFile=null }) {
      let file = clickedFile || this.get('selectedFiles')[0];

      fetch(`${this.get('rootAPI')}file?cmd=file&target=${file.hash}&download=1`, {
        method: 'GET',
        headers: {
          'X-CSRF-Token': this.get('csrfToken'),
        },
      }).then((resp) => resp.json()).then((data) => {
        //let url = window.URL.createObjectURL(blob);
        let a = $('.download-link')[0];

        a.href = `data:image/jpeg;base64,${data.content}`;
        a.download = 'test.jpeg';
        a.click();
        a.href = '';
      });
    },
  },
});
