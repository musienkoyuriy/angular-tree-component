import { ElementRef } from 'angular2/core';
import { TreeModel } from './tree.model';
import { ITreeNode } from '../defs/api';
import { TREE_EVENTS } from '../constants/events'; 

const _ = require('lodash');

export class TreeNode implements ITreeNode {
  private _isExpanded: boolean = false;
  get isExpanded() { return this._isExpanded };

  private _isActive: boolean = false;
  get isActive() { return this._isActive };

  get isFocused() { return this.treeModel.focusedNode == this };
  children: TreeNode[];
  level: number;
  elementRef:ElementRef;
  private _originalNode: any;
  get originalNode() { return this._originalNode };

  constructor(public data:any, public parent:TreeNode = null, public treeModel:TreeModel) {
    this.level = this.parent ? this.parent.level + 1 : 0;
    if (data[this.options.childrenField]) {
      this.children = data[this.options.childrenField]
        .map(c => new TreeNode(c, this, treeModel));      
    }
  }

  // helper get functions:
  get isCollapsed() { return !this.isExpanded }
  get isLeaf() { return !this.hasChildren }
  get hasChildren() { return this.data.hasChildren || this.children }
  get isRoot() { return !this.parent }
  get realParent() { return this.isRoot ? null : this.parent }

  // proxy to treeModel:
  get options() { return this.treeModel.options }
  fireEvent(event) { this.treeModel.fireEvent(event) }

  // field accessors:
  get displayField() {
    return this.data[this.options.displayField];
  }

  // traversing:
  findAdjacentSibling(steps) {
    let index = this._getIndexInParent();
    return this.parent && this.parent.children[index + steps];
  }

  findNextSibling() {
    return this.findAdjacentSibling(+1);
  }

  findPreviousSibling() {
    return this.findAdjacentSibling(-1);
  }

  getFirstChild() {
    return this.children && _.first(this.children);
  }
  getLastChild() {
    return this.children && _.last(this.children);
  }

  findNextNode(goInside = true) {
    return goInside && this.isExpanded && this.getFirstChild() ||
           this.findNextSibling() ||
           this.parent && this.parent.findNextNode(false);
  }

  findPreviousNode() {
    let previousSibling = this.findPreviousSibling();
    if (!previousSibling) {
      return this.realParent
    }
    return previousSibling.isCollapsed
      ? previousSibling
      : previousSibling.getLastChild();
  }

  private _getIndexInParent() {
    return this.parent && this.parent.children.indexOf(this);
  }

  // helper methods:
  toggle() {
    this._isExpanded = !this.isExpanded;
    this.fireEvent({ eventName: TREE_EVENTS.onToggle, node: this, isExpanded: this.isExpanded });
  }

  private _activate() {
    this._isActive = true;
    this.fireEvent({ eventName: TREE_EVENTS.onActivate, node: this });
    this.focus();
  }

  private _deactivate() {
    this._isActive = false;
    this.fireEvent({ eventName: TREE_EVENTS.onDeactivate, node: this });
  }

  toggleActivated() {
    if (this.isActive) {
      this._deactivate();
      this.treeModel.activeNode = null;
    }
    else {
      if (this.treeModel.activeNode) {
        this.treeModel.activeNode._deactivate();
      }
      this._activate();
      this.treeModel.activeNode = this;
    }
    this.fireEvent({ eventName: TREE_EVENTS.onActiveChanged, node: this, isActive: this.isActive });
  }

  focus() {
    let previousNode = this.treeModel.focusedNode;
    this.treeModel.focusedNode = this;
    if (previousNode) {
      this.fireEvent({ eventName: TREE_EVENTS.onBlur, node: previousNode });
    }
    this.fireEvent({ eventName: TREE_EVENTS.onFocus, node: this });
  }

  blur() {
    let previousNode = this.treeModel.focusedNode;
    this.treeModel.focusedNode = null;
    if (previousNode) {
      this.fireEvent({ eventName: TREE_EVENTS.onBlur, node: this });
    }
  }
}
