/**
 * Hotspot geometry expressed as percentages of the hero photograph, so the
 * targets scale with the image at every viewport width.
 * Mapping follows shelf order: leftmost = CAM 1 … rightmost = CAM 4.
 */
export type CameraHotspot = {
  cam: string;
  label: string;
  to: "/news" | "/videos" | "/highlights" | "/photos";
  /** left / top / width / height, all in % of the image box. */
  area: { left: number; top: number; width: number; height: number };
};

export const cameraHotspots: CameraHotspot[] = [
  {
    cam: "CAM 1",
    label: "PHOTOS",
    to: "/photos",
    area: { left: 56.5, top: 2.5, width: 30, height: 39 },
  },
  {
    cam: "CAM 2",
    label: "HIGHLIGHTS",
    to: "/highlights",
    area: { left: 51.5, top: 47, width: 19.5, height: 36 },
  },
  {
    cam: "CAM 3",
    label: "VIDEOS & CLIPS",
    to: "/videos",
    area: { left: 31, top: 19, width: 21.5, height: 35 },
  },
  {
    cam: "CAM 4",
    label: "CAMPUS NEWS",
    to: "/news",
    area: { left: 9.5, top: 43, width: 20.5, height: 46 },
  },
];
