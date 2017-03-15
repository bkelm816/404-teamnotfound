import Ember from 'ember';
import fetch from 'fetch';
import RSVP from 'rsvp';
import service from 'ember-service/inject';

export default Ember.Controller.extend({
  fetchService: service('base-service'),

  queryParams: ['unathourized'],
  unathourized: false,
});
