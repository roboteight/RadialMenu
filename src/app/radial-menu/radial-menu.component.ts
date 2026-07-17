import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem } from './menu-item.model';

interface FlatNode {
  node: MenuItem;
  parent: MenuItem | null;
  depth: number;
  index: number;
  total: number;
}

@Component({
  selector: 'app-radial-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radial-menu.component.html',
  styleUrl: './radial-menu.component.scss'
})
export class RadialMenuComponent {
  @Input() menuData: MenuItem = {
    id: 'root',
    label: 'Main',
    children: [
      {
        id: 'media',
        label: 'Media',
        children: [
          {id: 'music', label: 'Music'},
          {id: 'video', label: 'Video'},
          {id: 'photos', label: 'Photos'}
        ]
      },
      {
        id: 'settings',
        label: 'Settings',
        children: [
          {id: 'display', label: 'Display'},
          {id: 'sound', label: 'Sound'}
        ]
      },
      {id: 'profile', label: 'Profile'},
      {
        id: 'analytics', label: 'Stats',
        children: [
          {
            id: 'daves', label: 'Daves',
            children: [
              {id: 'didk', label: 'Daves I don\'t know'},
              {id: 'dik', label: 'Daves I know'}
            ]
          }
        ]
      },
    ]
  };



  @Output() itemSelected = new EventEmitter<MenuItem>();

  // State maps tracking expanding nodes dynamically
  expandedMap: { [key: string]: boolean } = {};
  private calculatedCoords: { [key: string]: { x: number; y: number } } = {};

  /**
   * Flattened, depth-first walk of the whole tree (always includes every
   * node regardless of expanded state, matching the "kept mounted" CSS
   * transition strategy). The template renders this list twice — once for
   * connectors, once for buttons — so the connector lands at a lower DOM
   * index than every button and can never paint on top of one.
   */
  get flatNodes(): FlatNode[] {
    const result: FlatNode[] = [];
    const walk = (node: MenuItem, parent: MenuItem | null, depth: number, index: number, total: number): void => {
      result.push({ node, parent, depth, index, total });
      node.children?.forEach((child, i) => walk(child, node, depth + 1, i, node.children!.length));
    };
    walk(this.menuData, null, 0, 0, 1);
    return result;
  }

  trackByNodeId(_index: number, item: FlatNode): string {
    return item.node.id;
  }

  onNodeClick(event: Event, node: MenuItem, parent: MenuItem | null): void {
    event.stopPropagation(); // Prevents clicks leaking into parent nodes

    if (node.children && node.children.length > 0) {
      this.expandedMap[node.id] = !this.expandedMap[node.id];

      // If closing a node, clean up map states below it
      if (!this.expandedMap[node.id]) {
        this.collapseChildren(node);
      }
    } else {
      this.itemSelected.emit(node);
    }
  }

  // Closes menu if clicking on blank canvas zones
  @HostListener('document:click')
  collapseAll(): void {
    this.expandedMap = {};
  }

  private collapseChildren(node: MenuItem): void {
    if (node.children) {
      node.children.forEach(child => {
        this.expandedMap[child.id] = false;
        this.collapseChildren(child);
      });
    }
  }

  /** A node is only shown once its parent has been expanded into view. */
  isVisible(parent: MenuItem | null, depth: number): boolean {
    return depth === 0 || (!!parent && this.expandedMap[parent.id]);
  }

  /**
   * Generates spatial geometric layout rules based on parent location.
   * Until this node's parent is expanded, it reports the parent's own
   * position rather than its target ring position, so the CSS transition
   * carries it smoothly from underneath the parent out to its spread-out
   * spot (and back again on collapse) instead of popping in already spread.
   */
  getCoords(node: MenuItem, parent: MenuItem | null, depth: number, index: number, total: number): { x: number; y: number } {
    if (depth === 0) return { x: 0, y: 0 };

    const parentPos = parent ? this.calculatedCoords[parent.id] || { x: 0, y: 0 } : { x: 0, y: 0 };
    const stepRadius = 100 + (depth - 1) * 30; // Ring expansion stride values

    let currentAngle = 0;

    if (depth === 1) {
      // Level 1: Distribute items evenly around a full 360 degree circle
      currentAngle = (index * (Math.PI * 2)) / total - Math.PI / 2;
    } else if (parent) {
      // Level 2+: Extract backward vector angle to map a sub-arc path away from the center
      const grandParentPos = this.calculatedCoords[`${parent.id}_calculated_parent`] || { x: 0, y: 0 };
      const parentAngle = Math.atan2(parentPos.y - grandParentPos.y, parentPos.x - grandParentPos.x);

      const angleSpan = Math.PI * 0.75; // 135 degree forward layout wedge
      const angleStart = parentAngle - angleSpan / 2;
      currentAngle = total > 1 ? angleStart + (index * angleSpan) / (total - 1) : parentAngle;
    }

    const target = {
      x: parentPos.x + Math.cos(currentAngle) * stepRadius,
      y: parentPos.y + Math.sin(currentAngle) * stepRadius
    };

    // Maintain global layout graph register (descendants need this node's
    // fully-expanded position, regardless of whether it's visible yet).
    this.calculatedCoords[node.id] = target;
    this.calculatedCoords[`${node.id}_calculated_parent`] = parentPos;

    return this.isVisible(parent, depth) ? target : parentPos;
  }

  /**
   * Line from a node's parent out to the node's own spread-out position, so
   * each option gets a visible spoke connecting it back to the menu it
   * belongs to. Relies on getCoords having already cached both nodes'
   * fully-expanded positions (called here to guarantee that for the node
   * itself; the parent's is cached from its own earlier template pass).
   */
  getConnector(node: MenuItem, parent: MenuItem | null, depth: number, index: number, total: number): { x: number; y: number; angle: number; length: number } {
    if (depth === 0 || !parent) return { x: 0, y: 0, angle: 0, length: 0 };

    this.getCoords(node, parent, depth, index, total);
    const parentPos = this.calculatedCoords[parent.id] || { x: 0, y: 0 };
    const target = this.calculatedCoords[node.id] || parentPos;

    const dx = target.x - parentPos.x;
    const dy = target.y - parentPos.y;

    return {
      x: parentPos.x,
      y: parentPos.y,
      angle: Math.atan2(dy, dx) * (180 / Math.PI),
      length: Math.sqrt(dx * dx + dy * dy)
    };
  }
}
