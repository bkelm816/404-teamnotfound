import { camelize } from 'ember-string';
import Mixin from 'ember-metal/mixin';

const NONE = {
  id: 0,
  name: 'None',
};

export default Mixin.create({
  computeSubtree(id, nodeList) {
    let children = nodeList.filter((node) => {
      return (node.parent_id === id); // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
    });

    children = children.sortBy('name');
    children.forEach((child) => {
      child.children = this.computeSubtree(child.id, nodeList);
    });

    return children;
  },

  findObject(array, name, property='name') {
    if (name === 'None') {
      return NONE;
    } else {
      return (array.find((item) => {
        return name === item[property];
      }) || NONE);
    }
  },

  findMultipleLevelObjects(objectToSearch, searchValues, property) {
    let result = [];
    let findingObject = this.findObject(objectToSearch.children, searchValues[0], property);

    for (let i = 1; i < searchValues.length; i++) {
      result.push(findingObject);

      if (findingObject.children) {
        findingObject = this.findObject(findingObject.children, searchValues[i], property);
      }
    }

    if (findingObject) {
      result.push(findingObject);
    }

    return result;
  },

  computeSubtreeObjects(id, nodeList) {
    let tree = this.computeSubtree(id, nodeList);
    let treeObject = {};

    tree.forEach((node) => {
      treeObject[camelize(node.name)] = node;
    });

    return treeObject;
  },

  //returns the path taken to get to a certain object in a tree
  findPathInTree(tree, target, property='id') {
    if (tree[property] === target) {
      return [tree];
    } else if (tree.children) {
      let result = [];
      for (let i = 0; i < tree.children.length && !result.length; i++) {
        let subPath = this.findPathInTree(tree.children[i], target, property);

        if (subPath.length) {
          result.push(tree, ...subPath);
        }
      }

      return result;
    } else {
      return [];
    }
  },

  //returns an object in a tree
  findInTree(tree, target, property='id') {
    if (tree[property] === target) {
      return tree;
    } else if (tree.children) {
      let result;
      for (let i = 0; i < tree.children.length && !result; i++) {
        result = this.findInTree(tree.children[i], target, property);

        if (result) {
          return result;
        }
      }
    }

    return null;
  },
});
