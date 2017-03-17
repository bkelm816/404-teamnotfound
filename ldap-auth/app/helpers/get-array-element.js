import Helper from 'ember-helper';

export function getArrayElement([array, index]) {
  return array[index];
}

export default Helper.helper(getArrayElement);
