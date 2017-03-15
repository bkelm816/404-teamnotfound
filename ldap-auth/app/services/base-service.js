import Service from 'ember-service';
import RSVP from 'rsvp';
import fetch from 'fetch';

export default Service.extend({
  fetch(adress, params = {}, body = null) {
    params.headers = {
      'Accept': 'application/json', // jscs:ignore disallowQuotedKeysInObjects
      'Content-Type': 'application/json', // jscs:ignore disallowQuotedKeysInObjects
    };

    if (body) {
      params.body = JSON.stringify(body);
    }

    return new RSVP.Promise((resolve, reject) => {
      fetch(adress, params).then((response) => {
        if (response.ok) {
          response.json().then((parsedResponse) => {
            resolve(parsedResponse);
          });
        } else {
          reject({
            errorCode: response.status,
            errorMessage: response.statusText,
          });
        }
      }).catch((error) => {
        reject({ errorMessage: error });
      });
    });
  },
});
