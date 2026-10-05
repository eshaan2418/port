import type * as THREE from "three";

/**
 * Scene objects other systems need to raycast against, registered by the
 * components that own them (no React context needed in the frame loop).
 *  - blockers: simple building volumes; the camera boom pulls in when one is
 *    between the camera and the character; clicks on them walk to that door
 *  - ground:   the walkable surface for click/tap-to-walk
 *  - canvas:   the WebGL canvas
 */
export const registry = {
  blockers: [] as THREE.Object3D[],
  ground: null as THREE.Object3D | null,
  /** invisible capsule around Eshaan: click / tap him to get the camera back */
  player: null as THREE.Object3D | null,
  /** the WebGL canvas (pointer lock target for POV) */
  canvas: null as HTMLCanvasElement | null,
};
