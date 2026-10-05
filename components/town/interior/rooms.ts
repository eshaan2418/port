import * as THREE from "three";
import type { HomeRoom } from "@/lib/schedule";

/**
 * The Home dollhouse lives on its own stage below the city (it's a diorama
 * you fade into, not a camera that flies through walls). Three floors of a
 * brownstone, front wall removed: kitchen (ground), study, bedroom (top).
 */
export const STAGE = new THREE.Vector3(0, -60, 0);

/** each interior's diorama stage, far enough apart that they never see each other */
export const STAGES = {
  home: STAGE,
  experience: new THREE.Vector3(160, -60, 0),
  projects: new THREE.Vector3(-160, -60, 0),
  extracurriculars: new THREE.Vector3(0, -60, 160),
  education: new THREE.Vector3(0, -60, -160),
} as const;
export const HOUSE = { w: 6.4, d: 4.2, floorH: 2.7, wall: 0.22 };

export type RoomDef = {
  id: HomeRoom;
  label: string;
  floor: number;
  /** backdrop + streak tint for this room's mood */
  mood: string;
};

export const ROOMS: RoomDef[] = [
  { id: "bedroom", label: "bedroom", floor: 2, mood: "#26345F" },
  { id: "study", label: "study", floor: 1, mood: "#5FB8AE" },
  { id: "kitchen", label: "kitchen", floor: 0, mood: "#F08A4B" },
];

export const roomDef = (id: HomeRoom) => ROOMS.find((r) => r.id === id)!;
export const floorY = (floor: number) => STAGE.y + floor * HOUSE.floorH;
