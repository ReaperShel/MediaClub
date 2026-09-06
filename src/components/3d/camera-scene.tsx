import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useCallback, useState, memo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PerformanceMonitor } from "@react-three/drei";
import { useTransition } from "@/components/transition-context";

const glbCache = new Map<string, { scene: THREE.Group; box: THREE.Box3 }>();

function getCachedGLB(path: string) {
  return glbCache.get(path);
}

function setCachedGLB(path: string, scene: THREE.Group, box: THREE.Box3) {
  glbCache.set(path, { scene, box });
}

interface ModelConfig {
  id: string;
  path: string;
  label: string;
  route: string;
  baseRotation: { x: number; y: number; z: number };
  position: { x: number; z: number };
  displayScale: number;
  focusAnchor: { x: number; y: number; z: number };
  parallaxStrength: number;
}

const SHELF_TOP_Y = -2.6;
const SHELF_THICKNESS = 0.35;
const SHELF_Y = SHELF_TOP_Y - SHELF_THICKNESS / 2;
const SHELF_BOTTOM_Y = SHELF_TOP_Y - SHELF_THICKNESS;
const SHELF_WIDTH = 40;
const SHELF_DEPTH = 6.5;
const BACK_WALL_Z = -3.2;
const NICHE_CEILING_Y = 3.6;
const NICHE_WALL_HEIGHT = NICHE_CEILING_Y - SHELF_BOTTOM_Y;
const NICHE_WALL_CENTER_Y = (SHELF_BOTTOM_Y + NICHE_CEILING_Y) / 2;
const LIGHT_Y = NICHE_CEILING_Y + 0.05;
const LIGHT_Z = -0.8;
const TARGET_Y = -1.6;

const MODELS: ModelConfig[] = [
  {
    id: "photos",
    path: "/models/polaroid_one_step_camera.glb",
    label: "PHOTOS",
    route: "/photos",
    baseRotation: {
      x: THREE.MathUtils.degToRad(6),
      y: THREE.MathUtils.degToRad(15),
      z: 0,
    },
    position: { x: -8.5, z: 0.5 },
    displayScale: 2.7,
    focusAnchor: { x: 0, y: -0.5, z: 1.2 },
    parallaxStrength: 1.0,
  },
  {
    id: "highlights",
    path: "/models/gopro_hero_8.glb",
    label: "HIGHLIGHTS",
    route: "/highlights",
    baseRotation: { x: THREE.MathUtils.degToRad(7), y: 0, z: 0 },
    position: { x: -2.8, z: -0.6 },
    displayScale: 1.89,
    focusAnchor: { x: 0, y: 0, z: 0.9 },
    parallaxStrength: 0.75,
  },
  {
    id: "videos",
    path: "/models/enhanced_camera_web.glb",
    label: "VIDEOS",
    route: "/videos",
    baseRotation: { x: 0, y: THREE.MathUtils.degToRad(-25), z: 0 },
    position: { x: 2.8, z: 0.55 },
    displayScale: 2.98,
    focusAnchor: { x: 0, y: 0.2, z: 1.3 },
    parallaxStrength: 1.05,
  },
  {
    id: "news",
    path: "/models/canon_at-1_retro_camera.glb",
    label: "CAMPUS NEWS",
    route: "/news",
    baseRotation: { x: 0, y: 0, z: 0 },
    position: { x: 8.5, z: -0.2 },
    displayScale: 2.62,
    focusAnchor: { x: 0, y: 0, z: 1.1 },
    parallaxStrength: 0.85,
  },
];

const DESKTOP_SCALE = 1;
const TABLET_SCALE = 0.75;
const MOBILE_SCALE = 0.55;

const DESKTOP_SHELF = {
  width: 40,
  depth: 6.5,
  backWallZ: -3.2,
  ceilingY: 3.6,
};

const TABLET_SHELF = {
  width: 28,
  depth: 5,
  backWallZ: -2.5,
  ceilingY: 3.2,
};

const MOBILE_SHELF = {
  width: 22,
  depth: 10,
  backWallZ: -5,
  ceilingY: 4.0,
};

const DESKTOP_POSITIONS: Record<string, { x: number; z: number }> = {
  photos: { x: -8.5, z: 0.5 },
  highlights: { x: -2.8, z: -0.6 },
  videos: { x: 2.8, z: 0.55 },
  news: { x: 8.5, z: -0.2 },
};

const TABLET_POSITIONS: Record<string, { x: number; z: number }> = {
  photos: { x: -6.1, z: 0.4 },
  highlights: { x: -2.0, z: -0.4 },
  videos: { x: 2.0, z: 0.4 },
  news: { x: 6.1, z: -0.1 },
};

const MOBILE_POSITIONS: Record<string, { x: number; z: number }> = {
  photos: { x: -3.5, z: -2.0 },
  highlights: { x: 3.5, z: -2.0 },
  videos: { x: 3.5, z: 2.0 },
  news: { x: -3.5, z: 2.0 },
};

const MOBILE_LIGHT_Z_OFFSET = 0.1;

const CameraModel = memo(function CameraModel({
  modelConfig,
  onHover,
  onDragChange,
  onCameraClick,
  onFocusPoint,
  transitioningId,
  isTransitioning,
  parallaxMouse,
  responsivePosition,
  responsiveScale,
  isVisible,
  isTabVisible,
  isMobile,
}: {
  modelConfig: ModelConfig;
  onHover: (id: string | null) => void;
  onDragChange?: (dragging: boolean) => void;
  onCameraClick?: (id: string, route: string) => void;
  onFocusPoint?: (point: { x: number; y: number }) => void;
  transitioningId?: string | null;
  isTransitioning?: boolean;
  parallaxMouse: { x: number; y: number };
  responsivePosition: { x: number; z: number };
  responsiveScale: number;
  isVisible: boolean;
  isTabVisible: boolean;
  isMobile: boolean;
}) {
  const placementRef = useRef<THREE.Group>(null);
  const hoverRef = useRef<THREE.Group>(null);
  const baseOrientationRef = useRef<THREE.Group>(null);
  const userRotationRef = useRef<THREE.Group>(null);
  const normalizedRef = useRef<THREE.Group>(null);
  const loadedSceneRef = useRef<THREE.Object3D | null>(null);
  const userYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const totalDragRef = useRef(0);
  const hoverAnimRef = useRef({ scale: 1, z: 0, rotX: 0, rotY: 0 });
  const baseZRef = useRef(modelConfig.position.z);
  const tiltRef = useRef<THREE.Group>(null);
  const offsetRef = useRef<THREE.Group>(null);
  const responsiveScaleRef = useRef<THREE.Group>(null);
  const focusAnchorRef = useRef<THREE.Group>(null);
  const materialBoostsRef = useRef(
    new Map<
      THREE.Mesh,
      {
        originalRoughness: number;
        originalMetalness: number;
        originalEmissiveIntensity: number;
      }
    >()
  );
  const focusOpacityRef = useRef(1);
  const baseBottomYRef = useRef(0);
  const { camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const isFocused = isTransitioning && transitioningId === modelConfig.id;
  const isDimmed = isTransitioning && transitioningId !== modelConfig.id;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (baseOrientationRef.current) {
      baseOrientationRef.current.rotation.x = modelConfig.baseRotation.x;
      baseOrientationRef.current.rotation.y = modelConfig.baseRotation.y;
      baseOrientationRef.current.rotation.z = modelConfig.baseRotation.z;
    }
  }, [modelConfig.baseRotation.x, modelConfig.baseRotation.y, modelConfig.baseRotation.z]);

  const handlePointerDown = useCallback(
    (
      e: THREE.Event & {
        stopPropagation?: () => void;
        nativeEvent?: PointerEvent;
      }
    ) => {
      const nativeEvent = (e as unknown as { nativeEvent: PointerEvent }).nativeEvent;
      if (!nativeEvent) return;
      e.stopPropagation?.();
      isDraggingRef.current = true;
      lastPointerXRef.current = nativeEvent.clientX;
      pointerDownRef.current = {
        x: nativeEvent.clientX,
        y: nativeEvent.clientY,
      };
      totalDragRef.current = 0;
      setIsDragging(true);
      onDragChange?.(true);
    },
    [onDragChange]
  );

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current || !userRotationRef.current) return;
    const dx = e.clientX - lastPointerXRef.current;
    userYRef.current += dx * 0.005;
    lastPointerXRef.current = e.clientX;
    userRotationRef.current.rotation.y = userYRef.current;
    if (pointerDownRef.current) {
      const dist = Math.hypot(
        e.clientX - pointerDownRef.current.x,
        e.clientY - pointerDownRef.current.y
      );
      totalDragRef.current = Math.max(totalDragRef.current, dist);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    onDragChange?.(false);
    if (totalDragRef.current < 5) {
      if (onFocusPoint && focusAnchorRef.current) {
        const worldPos = new THREE.Vector3();
        focusAnchorRef.current.getWorldPosition(worldPos);
        const screenPos = worldPos.clone().project(camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
        onFocusPoint({ x, y });
      }
      onCameraClick?.(modelConfig.id, modelConfig.route);
    }
  }, [modelConfig.route, modelConfig.id, onDragChange, onCameraClick, onFocusPoint, camera]);

  const handleDoubleClick = useCallback(() => {
    if (userRotationRef.current) {
      userYRef.current = 0;
      userRotationRef.current.rotation.y = 0;
    }
  }, []);

  const handlePointerOver = useCallback(() => {
    setIsHovered(true);
    onHover(modelConfig.id);
  }, [modelConfig.id, onHover]);

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
    onHover(null);
  }, [onHover]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (isDraggingRef.current) handlePointerMove(e);
    };
    const onUp = () => {
      if (isDraggingRef.current) handlePointerUp();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();

    const processScene = (scene: THREE.Group) => {
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      scene.scale.setScalar((1.6 / maxDim) * modelConfig.displayScale);
      scene.position.set(-center.x, -center.y, -center.z);
      scene.updateMatrixWorld(true);

      if (baseOrientationRef.current && normalizedRef.current && userRotationRef.current) {
        normalizedRef.current.add(scene);
        loadedSceneRef.current = scene;
        if (placementRef.current) {
          placementRef.current.position.set(modelConfig.position.x, 0, modelConfig.position.z);
          placementRef.current.updateMatrixWorld(true);
        }
        if (hoverRef.current) {
          hoverRef.current.position.y = 0;
        }
        if (offsetRef.current) {
          offsetRef.current.position.y = 0;
        }
        if (responsiveScaleRef.current) {
          responsiveScaleRef.current.scale.setScalar(responsiveScale);
        }
        placementRef.current?.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(normalizedRef.current);
        const tableTopY = SHELF_TOP_Y;
        const adjustment = tableTopY + 0.01 - box.min.y;
        if (placementRef.current) {
          placementRef.current.position.y += adjustment;
          baseBottomYRef.current = placementRef.current.position.y - SHELF_TOP_Y;
          placementRef.current.updateMatrixWorld(true);
        }
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.visible = true;
            obj.frustumCulled = false;
            obj.castShadow = true;
            const mat = obj.material;
            if (!mat) return;
            const isGlass = [
              "glass",
              "lens",
              "display",
              "screen",
              "viewfinder",
              "window",
              "crystal",
            ].some((kw) => (mat.name || "").toLowerCase().includes(kw));
            const apply = (m: THREE.Material) => {
              (m as THREE.MeshStandardMaterial).transparent = isGlass
                ? (m as THREE.MeshStandardMaterial).transparent
                : false;
              (m as THREE.MeshStandardMaterial).opacity = 1;
              m.depthWrite = true;
              m.depthTest = true;
              if ((m as THREE.MeshStandardMaterial).alphaTest && !isGlass)
                (m as THREE.MeshStandardMaterial).alphaTest = 0;
              m.side = THREE.DoubleSide;
              m.needsUpdate = true;
            };
            if (Array.isArray(mat)) mat.forEach(apply);
            else apply(mat);

            const materials = Array.isArray(mat) ? mat : [mat];
            materials.forEach((m) => {
              if (m instanceof THREE.MeshStandardMaterial) {
                materialBoostsRef.current.set(obj, {
                  originalRoughness: m.roughness,
                  originalMetalness: m.metalness,
                  originalEmissiveIntensity: m.emissiveIntensity,
                });
              }
            });
          }
        });
      }
    };

    const cached = getCachedGLB(modelConfig.path);
    if (cached) {
      const cloned = cached.scene.clone(true);
      if (!cancelled) {
        processScene(cloned);
      }
      return;
    }

    loader.load(
      modelConfig.path,
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        setCachedGLB(modelConfig.path, scene, box);
        const cloned = scene.clone(true);
        processScene(cloned);
      },
      undefined,
      (error) => {
        if (!cancelled) {
          console.error("[CAMERA] GLB LOAD ERROR:", modelConfig.path, error);
        }
        if (modelConfig.id === "photos") {
          console.error("[Photos] GLB load error:", modelConfig.path, error);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    modelConfig.path,
    modelConfig.baseRotation,
    modelConfig.position,
    modelConfig.displayScale,
    responsiveScale,
  ]);

  useEffect(() => {
    const c = document.querySelector("canvas");
    if (!c) return;
    c.style.cursor = isDragging ? "grabbing" : isHovered ? "grab" : c.style.cursor;
  }, [isDragging, isHovered]);

  useEffect(() => {
    if (!placementRef.current || !normalizedRef.current || !loadedSceneRef.current) return;

    if (responsiveScaleRef.current) {
      responsiveScaleRef.current.scale.setScalar(responsiveScale);
    }
    placementRef.current.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(normalizedRef.current);
    const tableTopY = SHELF_TOP_Y;
    const adjustment = tableTopY + 0.01 - box.min.y;
    placementRef.current.position.y += adjustment;
    baseBottomYRef.current = placementRef.current.position.y - SHELF_TOP_Y;
  }, [responsiveScale]);

  useFrame((_, delta) => {
    if (!isVisible || !isTabVisible) return;

    const enableParallax = !isDragging && !isTransitioning && !prefersReducedMotion;

    const pmx = enableParallax ? parallaxMouse.x : 0;
    const pmy = enableParallax ? parallaxMouse.y : 0;
    const strength = modelConfig.parallaxStrength;

    const ppx = pmx * 0.08 * strength;
    const ppz = pmy * 0.06 * strength;
    const protY = pmx * THREE.MathUtils.degToRad(1.5) * strength;
    const protX = pmy * THREE.MathUtils.degToRad(0.75) * strength;

    if (placementRef.current) {
      placementRef.current.position.x = responsivePosition.x + ppx;
      placementRef.current.position.z = responsivePosition.z + ppz;
      placementRef.current.position.y = SHELF_TOP_Y + baseBottomYRef.current;
      placementRef.current.rotation.y = protY;
      placementRef.current.rotation.x = protX;
    }
    if (responsiveScaleRef.current) {
      responsiveScaleRef.current.scale.setScalar(responsiveScale);
    }

    const enableHover = !isTransitioning && !prefersReducedMotion;
    const enableFocus = !prefersReducedMotion;
    const targetScale =
      (isHovered && enableHover ? 1.04 : 1.0) + (isFocused && enableFocus ? 0.08 : 0);
    const targetZ = (isHovered && enableHover ? 0.08 : 0.0) + (isFocused && enableFocus ? 0.2 : 0);
    const targetRotY = isHovered && enableHover ? THREE.MathUtils.degToRad(3) : 0;
    const targetRotX = isHovered && enableHover ? THREE.MathUtils.degToRad(1.5) : 0;
    const targetFocusOpacity = isDimmed && enableFocus ? 0.6 : 1.0;

    const speed = prefersReducedMotion ? 20 : 10;
    const t = 1 - Math.exp(-speed * delta);

    hoverAnimRef.current.scale += (targetScale - hoverAnimRef.current.scale) * t;
    hoverAnimRef.current.z += (targetZ - hoverAnimRef.current.z) * t;
    hoverAnimRef.current.rotY += (targetRotY - hoverAnimRef.current.rotY) * t;
    hoverAnimRef.current.rotX += (targetRotX - hoverAnimRef.current.rotX) * t;
    focusOpacityRef.current += (targetFocusOpacity - focusOpacityRef.current) * t;

    if (hoverRef.current) {
      hoverRef.current.scale.setScalar(hoverAnimRef.current.scale);
      hoverRef.current.position.z = hoverAnimRef.current.z;
    }
    if (tiltRef.current) {
      tiltRef.current.rotation.y = hoverAnimRef.current.rotY;
      tiltRef.current.rotation.x = hoverAnimRef.current.rotX;
    }

    const needsMaterialUpdate =
      isHovered || isFocused || isDimmed || focusOpacityRef.current < 0.98;
    if (!prefersReducedMotion && materialBoostsRef.current.size > 0 && needsMaterialUpdate) {
      const boostTarget = isHovered && enableHover ? 1 : 0;
      const boostT = 1 - Math.exp(-8 * delta);
      materialBoostsRef.current.forEach((original, mesh) => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            const targetRoughness = boostTarget
              ? Math.max(0.2, original.originalRoughness * 0.7)
              : original.originalRoughness;
            const targetMetalness = boostTarget
              ? Math.min(0.9, original.originalMetalness + 0.15)
              : original.originalMetalness;
            const targetEmissiveIntensity = boostTarget
              ? original.originalEmissiveIntensity + 0.2
              : original.originalEmissiveIntensity;

            m.roughness += (targetRoughness - m.roughness) * boostT;
            m.metalness += (targetMetalness - m.metalness) * boostT;
            m.emissiveIntensity += (targetEmissiveIntensity - m.emissiveIntensity) * boostT;
            m.opacity += (focusOpacityRef.current - m.opacity) * boostT;
            m.transparent = m.opacity < 0.98;
            m.needsUpdate = true;
          }
        });
      });
    }
  });

  return (
    <group
      ref={placementRef}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onDoubleClick={handleDoubleClick}
    >
      <group
        ref={focusAnchorRef}
        position={[modelConfig.focusAnchor.x, modelConfig.focusAnchor.y, modelConfig.focusAnchor.z]}
      />
      <group ref={responsiveScaleRef}>
        <group ref={hoverRef}>
          <group ref={baseOrientationRef}>
            <group ref={userRotationRef}>
              <group ref={tiltRef}>
                <group ref={offsetRef}>
                  <group ref={normalizedRef} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

function ParallaxGroup({ children }: { children: React.ReactNode }) {
  return <group>{children}</group>;
}

function useParallaxMouse(
  isVisible: boolean,
  isDragging: boolean,
  isTransitioning: boolean,
  isTabVisible: boolean,
  isMobile: boolean
) {
  const { gl } = useThree();
  const target = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });
  const prefersReducedMotionRef = useRef(false);
  const isTouchDeviceRef = useRef(false);
  const isDraggingRef = useRef(isDragging);
  const isTransitioningRef = useRef(isTransitioning);
  const isVisibleRef = useRef(isVisible);
  const isTabVisibleRef = useRef(isTabVisible);
  const isMobileRef = useRef(isMobile);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);
  useEffect(() => {
    isTabVisibleRef.current = isTabVisible;
  }, [isTabVisible]);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    isTouchDeviceRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    if (prefersReducedMotionRef.current || isTouchDeviceRef.current || isMobileRef.current) return;
    const canvas = gl.domElement;
    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      target.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      target.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const handleLeave = () => {
      target.current.x = 0;
      target.current.y = 0;
      const c = document.querySelector("canvas");
      if (c) c.style.cursor = "default";
    };
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", handleLeave);
    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!isVisibleRef.current || !isTabVisibleRef.current) return;
    if (
      prefersReducedMotionRef.current ||
      isTouchDeviceRef.current ||
      isMobileRef.current ||
      isTransitioningRef.current ||
      isDraggingRef.current
    ) {
      target.current.x = 0;
      target.current.y = 0;
    }

    const damping = 0.06;
    const t = 1 - Math.exp(-damping * delta * 60);

    smooth.current.x += (target.current.x - smooth.current.x) * t;
    smooth.current.y += (target.current.y - smooth.current.y) * t;
  });

  return smooth.current;
}

const ShelfDisplay = memo(function ShelfDisplay({
  width,
  depth,
  backWallZ,
  ceilingY,
}: {
  width: number;
  depth: number;
  backWallZ: number;
  ceilingY: number;
}) {
  const shelfY = -2.6;
  const thickness = 0.35;
  const bottomY = shelfY - thickness;
  const wallHeight = ceilingY - bottomY;
  const wallCenterY = (bottomY + ceilingY) / 2;

  return (
    <group>
      <mesh position={[0, wallCenterY, backWallZ]} receiveShadow>
        <boxGeometry args={[width, wallHeight, 0.3]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.85} metalness={0.02} />
      </mesh>
      <mesh position={[-width / 2, wallCenterY, -0.25]} receiveShadow>
        <boxGeometry args={[0.2, wallHeight, depth]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.85} metalness={0.02} />
      </mesh>
      <mesh position={[width / 2, wallCenterY, -0.25]} receiveShadow>
        <boxGeometry args={[0.2, wallHeight, depth]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.85} metalness={0.02} />
      </mesh>
      <mesh position={[0, ceilingY, -0.25]} receiveShadow>
        <boxGeometry args={[width, 0.2, depth]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.85} metalness={0.02} />
      </mesh>
      <mesh position={[0, shelfY - thickness / 2, -0.25]} receiveShadow castShadow>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, ceilingY + 0.25, -0.25]} receiveShadow castShadow>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.5} metalness={0.05} />
      </mesh>
    </group>
  );
});

const ShelfLight = memo(function ShelfLight({
  cameraConfig,
  active,
  lightZOffset,
  cameraPosition,
  shadowSize,
  isMobile,
  isVisible,
  onToggle,
}: {
  cameraConfig: ModelConfig;
  active: boolean;
  lightZOffset: number;
  cameraPosition: { x: number; z: number };
  shadowSize: number;
  isMobile: boolean;
  isVisible: boolean;
  onToggle?: () => void;
}) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const housingRef = useRef<THREE.MeshStandardMaterial>(null);
  const fillLightRef = useRef<THREE.PointLight>(null);
  const frontFillRef = useRef<THREE.PointLight>(null);
  const currentIntensity = useRef(0);

  const [targetObj] = useState(() => {
    const obj = new THREE.Object3D();
    return obj;
  });

  const lightX = cameraPosition.x;
  const lightZ = cameraPosition.z + lightZOffset;
  const lightPos: [number, number, number] = [lightX, LIGHT_Y, lightZ];
  const targetPos: [number, number, number] = [lightX, TARGET_Y, cameraPosition.z];
  const fillPos: [number, number, number] = [lightX, SHELF_TOP_Y + 0.8, cameraPosition.z + 0.3];
  const frontFillPos: [number, number, number] = [
    lightX,
    SHELF_TOP_Y + 0.6,
    cameraPosition.z + 2.2,
  ];

  useFrame((_, delta) => {
    if (!isVisible) return;

    const target = active ? 1 : 0;
    const lerpFactor = 1 - Math.exp(-10 * delta);
    currentIntensity.current = THREE.MathUtils.lerp(currentIntensity.current, target, lerpFactor);
    const val = currentIntensity.current;

    if (lightRef.current) {
      lightRef.current.intensity = val * (isMobile ? 55 : 85);
      lightRef.current.castShadow = val > 0.01 && !isMobile;
    }
    if (fillLightRef.current) {
      fillLightRef.current.intensity = val * (isMobile ? 8 : 14);
    }
    if (frontFillRef.current) {
      frontFillRef.current.intensity = val * (isMobile ? 5 : 10);
    }
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = val * 8;
      glowRef.current.opacity = Math.max(0, val * 0.95);
    }
    if (housingRef.current) {
      housingRef.current.emissiveIntensity = val * 1.5;
    }
  });

  targetObj.position.set(targetPos[0], targetPos[1], targetPos[2]);

  return (
    <group>
      <primitive object={targetObj} />
      <spotLight
        ref={lightRef}
        position={lightPos}
        target={targetObj}
        angle={0.7}
        penumbra={0.6}
        distance={isMobile ? 12 : 18}
        decay={1.2}
        intensity={0}
        color="#fff5e8"
        castShadow={!isMobile}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-near={0.1}
        shadow-camera-far={isMobile ? 8 : 12}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <pointLight
        ref={fillLightRef}
        position={fillPos}
        intensity={0}
        distance={isMobile ? 6 : 10}
        decay={1.5}
        color="#fff8f0"
      />
      <pointLight
        ref={frontFillRef}
        position={frontFillPos}
        intensity={0}
        distance={isMobile ? 5 : 8}
        decay={1.5}
        color="#fff6ec"
      />
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          const c = document.querySelector("canvas");
          if (c) c.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          const c = document.querySelector("canvas");
          if (c) c.style.cursor = "default";
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
      >
        <mesh position={[lightX, LIGHT_Y + 0.04, LIGHT_Z]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 12]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[lightX, LIGHT_Y, LIGHT_Z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.06, 16]} />
          <meshStandardMaterial
            ref={housingRef}
            color="#1a1a1a"
            metalness={0.8}
            roughness={0.3}
            emissive="#fff5e8"
            emissiveIntensity={0}
          />
        </mesh>
        <mesh position={[lightX, LIGHT_Y - 0.04, LIGHT_Z + 0.04]}>
          <circleGeometry args={[0.16, 16]} />
          <meshStandardMaterial
            ref={glowRef}
            color="#fff5e8"
            emissive="#fff5e8"
            emissiveIntensity={0}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
});

function Scene({
  hoveredId,
  onHover,
  shadowSize,
  isVisible,
  isTabVisible,
  isMobile,
}: {
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  shadowSize: number;
  isVisible: boolean;
  isTabVisible: boolean;
  isMobile: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    const width = window.innerWidth;
    if (width >= 1200) return "desktop";
    if (width >= 768) return "tablet";
    return "mobile";
  });
  const { startTransition, isTransitioning, transitioningId } = useTransition();
  const parallaxMouse = useParallaxMouse(
    isVisible,
    isDragging,
    isTransitioning,
    isTabVisible,
    isMobile
  );
  const [lightToggled, setLightToggled] = useState<Set<string>>(new Set());
  const focusPointRef = useRef<{ x: number; y: number } | null>(null);
  const { gl } = useThree();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1200) setBreakpoint("desktop");
      else if (width >= 768) setBreakpoint("tablet");
      else setBreakpoint("mobile");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const shelfConfig =
    breakpoint === "mobile" ? MOBILE_SHELF : breakpoint === "tablet" ? TABLET_SHELF : DESKTOP_SHELF;
  const positions =
    breakpoint === "mobile"
      ? MOBILE_POSITIONS
      : breakpoint === "tablet"
        ? TABLET_POSITIONS
        : DESKTOP_POSITIONS;
  const scaleMultiplier =
    breakpoint === "mobile" ? MOBILE_SCALE : breakpoint === "tablet" ? TABLET_SCALE : DESKTOP_SCALE;

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  const handleFocusPoint = useCallback((point: { x: number; y: number }) => {
    focusPointRef.current = point;
  }, []);

  const handleCameraClick = useCallback(
    (id: string, route: string) => {
      const fp = focusPointRef.current;
      startTransition(id, route, fp ?? undefined);
    },
    [startTransition]
  );

  useEffect(() => {
    if (!isTransitioning) {
      focusPointRef.current = null;
    }
  }, [isTransitioning]);

  return (
    <ParallaxGroup>
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[2, 6, 4]}
        intensity={0.35}
        color="#ffe8d0"
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0002}
        shadow-normalBias={0.1}
      />
      <ShelfDisplay
        width={shelfConfig.width}
        depth={shelfConfig.depth}
        backWallZ={shelfConfig.backWallZ}
        ceilingY={shelfConfig.ceilingY}
      />
      {MODELS.map((m) => {
        const responsivePos = positions[m.id] || DESKTOP_POSITIONS[m.id] || m.position;
        const responsiveScale = scaleMultiplier;
        return (
          <CameraModel
            key={m.id}
            modelConfig={m}
            onHover={onHover}
            onDragChange={setIsDragging}
            onCameraClick={handleCameraClick}
            onFocusPoint={handleFocusPoint}
            transitioningId={transitioningId}
            isTransitioning={isTransitioning}
            parallaxMouse={parallaxMouse}
            responsivePosition={responsivePos}
            responsiveScale={responsiveScale}
            isVisible={isVisible}
            isTabVisible={isTabVisible}
            isMobile={isMobile}
          />
        );
      })}
      {MODELS.map((m) => {
        const pos = positions[m.id] || DESKTOP_POSITIONS[m.id] || m.position;
        const isToggled = lightToggled.has(m.id);
        return (
          <ShelfLight
            key={`light-${m.id}`}
            cameraConfig={m}
            active={hoveredId === m.id || isToggled}
            lightZOffset={breakpoint === "mobile" ? MOBILE_LIGHT_Z_OFFSET : -0.8}
            cameraPosition={pos}
            shadowSize={shadowSize}
            isMobile={isMobile}
            isVisible={isVisible}
            onToggle={() =>
              setLightToggled((prev) => {
                const next = new Set(prev);
                if (next.has(m.id)) next.delete(m.id);
                else next.add(m.id);
                return next;
              })
            }
          />
        );
      })}
    </ParallaxGroup>
  );
}

/**
 * Fires `onReady` once Three.js has rendered the first frame.
 * Must be placed inside the Canvas so it can use useFrame.
 */
function SceneReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    requestAnimationFrame(() => {
      onReady();
    });
  });
  return null;
}

export function CameraScene({
  hoveredId,
  onHover,
}: {
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const [height, setHeight] = useState("70vh");
  const [shadowSize, setShadowSize] = useState(1024);
  const [isVisible, setIsVisible] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setHeight("85vh");
        setShadowSize(512);
        setIsMobile(true);
      } else if (width < 1200) {
        setHeight("70vh");
        setShadowSize(1024);
        setIsMobile(false);
      } else {
        setHeight("70vh");
        setShadowSize(1024);
        setIsMobile(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const el = document.querySelector("[data-camera-scene]");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const crossfadeMs = prefersReducedMotion ? 120 : 500;
  const canvasOpacity = sceneReady ? 1 : 0;

  return (
    <div className="relative w-full" style={{ height }} data-camera-scene>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: canvasOpacity,
          transition: `opacity ${crossfadeMs}ms ease`,
          zIndex: 1,
        }}
      >
        <Canvas
          camera={{ position: [0, 1.5, 18], fov: 35, near: 0.01, far: 100 }}
          dpr={dpr}
          shadows
          gl={{
            antialias: !isMobile,
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          <Suspense fallback={null}>
            <PerformanceMonitor
              ms={1000}
              iterations={20}
              threshold={0.05}
              flipflops={3}
              step={0.1}
              bounds={() => [30, 55] as [number, number]}
              onDecline={() => setDpr([1, 1])}
              onIncline={() => setDpr([1, 1.5])}
            >
              <Scene
                hoveredId={hoveredId}
                onHover={onHover}
                shadowSize={shadowSize}
                isVisible={isVisible}
                isTabVisible={isTabVisible}
                isMobile={isMobile}
              />
              <SceneReadySignal onReady={handleSceneReady} />
            </PerformanceMonitor>
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
