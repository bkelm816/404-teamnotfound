import Ember from 'ember';
import service from 'ember-service/inject';

export default Ember.Controller.extend({
  fetchService: service('base-service'),

  queryParams: ['unathourized'],
  unathourized: false,
});
