"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import styles from "@/app/3d-preview/preview.module.css";

const GLB_ASSET_PATH = "/3d/cho-neo.glb";
const WALKING_EYE_HEIGHT = 1.65;
const WALKING_SPEED = 3.2;
const WALKING_ACCELERATION = 10;
const WALKING_WORLD_BOUNDS = {
  minX: -15.5,
  maxX: 35.5,
  minZ: -15.5,
  maxZ: 35.5,
};

type Destination = {
  name: string;
  x: number;
  z: number;
  color: number;
  shape: "box" | "cylinder" | "cone";
};

const DESTINATIONS: Destination[] = [
  { name: "Quầy Xã Giao", x: -5.2, z: -1.8, color: 0xc96f4a, shape: "box" },
  { name: "Ông Địa", x: 0, z: -4.4, color: 0xd8a24b, shape: "cylinder" },
  { name: "Xin Xăm", x: 5.2, z: -1.8, color: 0xb8687f, shape: "cone" },
  { name: "Hỏi Chợ Neo", x: -3.6, z: 3.2, color: 0x4d8c88, shape: "box" },
  { name: "Mẹo Vặt", x: 3.6, z: 3.2, color: 0x6d7fb3, shape: "cylinder" },
];

const PLAYER_COLLISION_RADIUS = 0.3;
const DESTINATION_COLLISION_PREFIXES = ["QXG_", "OD_", "XX_", "HCN_", "MV_"] as const;
const PROXIMITY_BUFFER = 1.5;

const DESTINATION_PROXIMITY_DEFINITIONS = [
  { prefix: "QXG_", name: "Quầy Xã Giao", cue: "Vào Quầy Xã Giao" },
  { prefix: "OD_", name: "Ông Địa", cue: "Đến Ông Địa" },
  { prefix: "XX_", name: "Xin Xăm", cue: "Xin Xăm" },
  { prefix: "HCN_", name: "Hỏi Chợ Neo", cue: "Hỏi Chợ Neo" },
  { prefix: "MV_", name: "Mẹo Vặt", cue: "Khám phá Mẹo Vặt" },
] as const;

const XIN_XAM_MESSAGES = [
  "Hôm nay, một bước nhỏ về phía điều làm lòng mình nhẹ hơn.",
  "Có những câu trả lời đến chậm; cứ bình tĩnh đi tiếp.",
  "Giữ lại điều chân thành, rồi để ngày mai mở thêm một lối.",
] as const;

const DESTINATION_ENTRY_ROUTES = {
  QXG_: {
    href: "/cho-neo/gossip?embed=1",
    label: "Quầy Xã Giao",
    eyebrow: "Gặp gỡ",
    theme: "social",
  },
  XX_: {
    href: "/xin-xam?embed=1",
    label: "Xin Xăm",
    eyebrow: "Tĩnh tâm",
    theme: "ritual",
  },
  HCN_: {
    href: "/cho-neo/hoi-cho-neo?embed=1",
    label: "Hỏi Chợ Neo",
    eyebrow: "Hỏi nghề",
    theme: "guide",
  },
  MV_: {
    href: "/meo-vat?embed=1",
    label: "Mẹo Vặt",
    eyebrow: "Mẹo nghề",
    theme: "practical",
  },
} as const;

type ProximityZone = {
  prefix: (typeof DESTINATION_PROXIMITY_DEFINITIONS)[number]["prefix"];
  name: string;
  cue: string;
  x: number;
  z: number;
  radius: number;
};

type CollisionVolume =
  | {
      kind: "box";
      label: string;
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      minZ: number;
      maxZ: number;
    }
  | {
      kind: "cylinder";
      label: string;
      minY: number;
      maxY: number;
      x: number;
      z: number;
      radius: number;
    };

type OngDiaSmokeParticle = {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
};

function boxToCollisionVolume(bounds: THREE.Box3, label: string): CollisionVolume | null {
  if (bounds.isEmpty()) return null;

  return {
    kind: "box",
    label,
    minX: bounds.min.x,
    maxX: bounds.max.x,
    minY: bounds.min.y,
    maxY: bounds.max.y,
    minZ: bounds.min.z,
    maxZ: bounds.max.z,
  };
}

function createFallbackCollisionVolumes(): CollisionVolume[] {
  const destinationVolumes = DESTINATIONS.map((destination) => {
    const halfWidth = destination.shape === "cylinder" ? 1.2 : 1.45;
    const halfDepth = destination.shape === "cylinder" ? 1.2 : 1.15;

    return {
      kind: "box" as const,
      label: `fallback ${destination.name}`,
      minX: destination.x - halfWidth,
      maxX: destination.x + halfWidth,
      minY: 0,
      maxY: 3,
      minZ: destination.z - halfDepth,
      maxZ: destination.z + halfDepth,
    };
  });

  return [
    ...destinationVolumes,
    {
      kind: "cylinder",
      label: "fallback central garden",
      minY: 0,
      maxY: 0.7,
      x: 0,
      z: 0,
      radius: 2.8,
    },
  ];
}

function createFallbackProximityZones(): ProximityZone[] {
  return DESTINATION_PROXIMITY_DEFINITIONS.map((definition) => {
    const destination = DESTINATIONS.find(({ name }) => name === definition.name);
    return {
      ...definition,
      x: destination?.x ?? 0,
      z: destination?.z ?? 0,
      radius: 2.5,
    };
  });
}

function createGlbProximityZones(root: THREE.Object3D): ProximityZone[] {
  const destinationBounds = new Map<string, THREE.Box3>();

  root.updateMatrixWorld(true);
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const definition = DESTINATION_PROXIMITY_DEFINITIONS.find(({ prefix }) =>
      child.name.startsWith(prefix),
    );
    if (!definition) return;

    const bounds = new THREE.Box3().setFromObject(child);
    if (bounds.isEmpty()) return;

    const existingBounds = destinationBounds.get(definition.prefix);
    if (existingBounds) {
      existingBounds.union(bounds);
    } else {
      destinationBounds.set(definition.prefix, bounds);
    }
  });

  return DESTINATION_PROXIMITY_DEFINITIONS.flatMap((definition) => {
    const bounds = destinationBounds.get(definition.prefix);
    if (!bounds) return [];

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    return [{
      ...definition,
      x: center.x,
      z: center.z,
      radius: Math.max(size.x, size.z) / 2 + PROXIMITY_BUFFER,
    }];
  });
}

function createGlbCollisionVolumes(root: THREE.Object3D): CollisionVolume[] {
  const destinationBounds = new Map<string, THREE.Box3>();
  const treeTrunks: CollisionVolume[] = [];
  let centralPlanterBounds: THREE.Box3 | null = null;

  root.updateMatrixWorld(true);
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const bounds = new THREE.Box3().setFromObject(child);
    if (bounds.isEmpty()) return;

    const destinationPrefix = DESTINATION_COLLISION_PREFIXES.find((prefix) =>
      child.name.startsWith(prefix),
    );
    if (destinationPrefix) {
      const existingBounds = destinationBounds.get(destinationPrefix);
      if (existingBounds) {
        existingBounds.union(bounds);
      } else {
        destinationBounds.set(destinationPrefix, bounds);
      }
      return;
    }

    if (child.name === "ENV_CENTER_PLANTER_Edge") {
      centralPlanterBounds = bounds;
      return;
    }

    if (
      child.name.startsWith("ENV_") &&
      (child.name.includes("TREE_") || child.name.includes("PALM_")) &&
      child.name.endsWith("_Trunk")
    ) {
      const center = bounds.getCenter(new THREE.Vector3());
      treeTrunks.push({
        kind: "cylinder",
        label: child.name,
        minY: bounds.min.y,
        maxY: bounds.max.y,
        x: center.x,
        z: center.z,
        radius: Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2,
      });
    }
  });

  const destinationVolumes = Array.from(destinationBounds.entries())
    .map(([prefix, bounds]) => boxToCollisionVolume(bounds, `${prefix} destination`))
    .filter((volume): volume is CollisionVolume => volume !== null);
  const centralPlanterVolume = centralPlanterBounds
    ? (() => {
        const center = centralPlanterBounds.getCenter(new THREE.Vector3());
        const size = centralPlanterBounds.getSize(new THREE.Vector3());
        return {
          kind: "cylinder" as const,
          label: "ENV_CENTER_PLANTER_Edge",
          minY: centralPlanterBounds.min.y,
          maxY: centralPlanterBounds.max.y,
          x: center.x,
          z: center.z,
          radius: Math.max(size.x, size.z) / 2,
        };
      })()
    : null;

  return [
    ...destinationVolumes,
    ...(centralPlanterVolume ? [centralPlanterVolume] : []),
    ...treeTrunks,
  ];
}

function isCollisionAt(x: number, z: number, volumes: CollisionVolume[]) {
  return volumes.some((volume) => {
    if (volume.kind === "box") {
      return (
        x > volume.minX - PLAYER_COLLISION_RADIUS &&
        x < volume.maxX + PLAYER_COLLISION_RADIUS &&
        z > volume.minZ - PLAYER_COLLISION_RADIUS &&
        z < volume.maxZ + PLAYER_COLLISION_RADIUS
      );
    }

    const dx = x - volume.x;
    const dz = z - volume.z;
    const radius = volume.radius + PLAYER_COLLISION_RADIUS;
    return dx * dx + dz * dz < radius * radius;
  });
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof CSS2DObject) {
      child.element.remove();
      return;
    }

    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Points)) return;

    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

function createDestination(destination: Destination, labelClassName: string) {
  const group = new THREE.Group();
  group.position.set(destination.x, 0, destination.z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.45, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0x6c5142, roughness: 0.9 }),
  );
  base.position.y = 0.12;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const bodyGeometry =
    destination.shape === "cylinder"
      ? new THREE.CylinderGeometry(0.72, 0.9, 1.8, 12)
      : destination.shape === "cone"
        ? new THREE.ConeGeometry(0.9, 2, 10)
        : new THREE.BoxGeometry(1.5, 1.8, 1.35);
  const body = new THREE.Mesh(
    bodyGeometry,
    new THREE.MeshStandardMaterial({ color: destination.color, roughness: 0.78 }),
  );
  body.position.y = 1.12;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 0.65, 4),
    new THREE.MeshStandardMaterial({ color: 0x3b2b2b, roughness: 0.84 }),
  );
  roof.position.y = 2.35;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  const label = document.createElement("div");
  label.className = labelClassName;
  label.textContent = destination.name;
  label.setAttribute("aria-hidden", "true");

  const labelObject = new CSS2DObject(label);
  labelObject.position.set(0, 3.05, 0);
  group.add(labelObject);

  return group;
}

function createWorldPlaceholder() {
  const group = new THREE.Group();

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.8, 0.28, 24),
    new THREE.MeshStandardMaterial({ color: 0xb49a72, roughness: 0.95 }),
  );
  plaza.position.y = 0.14;
  plaza.receiveShadow = true;
  group.add(plaza);

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 1.35, 6),
    new THREE.MeshStandardMaterial({ color: 0x315d61, roughness: 0.86 }),
  );
  canopy.position.y = 3.3;
  canopy.castShadow = true;
  group.add(canopy);

  const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2.9, 8);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x563f35, roughness: 0.9 });
  [-1.65, 1.65].forEach((x) => {
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(x, 1.55, 0);
    post.castShadow = true;
    group.add(post);
  });

  return group;
}

function createRuntimeLighting() {
  const group = new THREE.Group();
  group.name = "Phase 5 runtime lighting";

  group.add(new THREE.HemisphereLight(0xb9cbd1, 0x9a8068, 0.95));

  const sun = new THREE.DirectionalLight(0xffddb8, 1.0);
  sun.position.set(-8, 15, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  group.add(sun);

  const practicalLights = [
    { position: [-7.4, 3.0, -5.2], intensity: 0.8, distance: 5.0 },
    { position: [3.8, 3.0, 7.4], intensity: 0.65, distance: 4.5 },
    { position: [8.2, 3.0, 1.1], intensity: 0.7, distance: 4.5 },
    { position: [6.5, 3.0, -6.0], intensity: 0.65, distance: 4.5 },
    { position: [0.4, 2.8, 0.8], intensity: 0.5, distance: 4.5 },
  ] as const;

  practicalLights.forEach(({ position, intensity, distance }) => {
    const light = new THREE.PointLight(0xffb06a, intensity, distance, 2);
    light.position.set(...position);
    group.add(light);
  });

  return group;
}

function disableImportedLights(root: THREE.Object3D) {
  let count = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.Light)) return;

    child.visible = false;
    child.castShadow = false;
    count += 1;
  });
  return count;
}

export default function ChoNeo3DPreview() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mobileMovePadRef = useRef<HTMLDivElement>(null);
  const mobileMoveThumbRef = useRef<HTMLDivElement>(null);
  const mobileLookPadRef = useRef<HTMLDivElement>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeDestination, setActiveDestination] = useState<ProximityZone | null>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [isXinXamInteracting, setIsXinXamInteracting] = useState(false);
  const [xinXamResult, setXinXamResult] = useState<string | null>(null);
  const [destinationEntry, setDestinationEntry] = useState<ProximityZone | null>(null);
  const xinXamStartRef = useRef(false);
  const xinXamDismissRef = useRef(false);
  const destinationEntryRequestRef = useRef<ProximityZone["prefix"] | null>(null);
  const resumeDestinationEntryRef = useRef<(() => void) | null>(null);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activateDestination = () => {
    if (!activeDestination) return;

    // Ông Địa is ambient-only in Milestone 1.
    if (activeDestination.prefix === "OD_") {
      return;
    }

    if (activeDestination.prefix === "XX_") {
      xinXamStartRef.current = true;
      return;
    }

    if (activeDestination.prefix in DESTINATION_ENTRY_ROUTES) {
      destinationEntryRequestRef.current = activeDestination.prefix;
      return;
    }

    setInteractionMessage(`${activeDestination.name} — interaction ready`);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      setInteractionMessage(null);
      interactionTimerRef.current = null;
    }, 1600);
  };

  const dismissXinXam = () => {
    xinXamDismissRef.current = true;
    setIsXinXamInteracting(false);
    setXinXamResult(null);
  };

  const closeDestinationEntry = () => {
    if (resumeDestinationEntryRef.current) {
      resumeDestinationEntryRef.current();
      return;
    }
    setDestinationEntry(null);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let loadedAsset: THREE.Object3D | null = null;
    let collisionVolumes = createFallbackCollisionVolumes();
    let proximityZones = createFallbackProximityZones();
    let activeZoneId: ProximityZone["prefix"] | null = null;
    const touchDevice =
      window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    let touchWalkingActive = false;
    const touchMovement = new THREE.Vector2();
    let movePointerId: number | null = null;
    let lookPointerId: number | null = null;
    let lookTouchIdentifier: number | null = null;
    let lastLookX = 0;
    let lastLookY = 0;
    let xinXamInteractionActive = false;
    let xinXamParts: Array<{
      object: THREE.Object3D;
      position: THREE.Vector3;
      rotation: THREE.Euler;
      isHolder: boolean;
    }> = [];
    let xinXamAnimation: {
      elapsed: number;
      selectedStick: THREE.Object3D | null;
    } | null = null;
    let destinationEntryActive = false;
    let destinationEntryWasPointerLocked = false;
    let xinXamRitualLight: THREE.PointLight | null = null;
    let xinXamRitualFocus: THREE.Vector3 | null = null;
    let xinXamHeroStick: THREE.Group | null = null;
    let xinXamHeroStickOrigin: THREE.Vector3 | null = null;
    let xinXamCameraStartPosition: THREE.Vector3 | null = null;
    let xinXamCameraStartQuaternion: THREE.Quaternion | null = null;
    let xinXamCameraTargetPosition: THREE.Vector3 | null = null;
    let xinXamCameraTargetQuaternion: THREE.Quaternion | null = null;
    let ongDiaAmbience: {
      light: THREE.PointLight;
      smoke: THREE.Points;
      smokeMaterial: THREE.PointsMaterial;
      particles: OngDiaSmokeParticle[];
      positionAttribute: THREE.BufferAttribute;
      zone: ProximityZone;
      proximity: number;
      elapsed: number;
    } | null = null;
    setIsTouchDevice(touchDevice);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x91a8b0);
    scene.fog = new THREE.Fog(0x91a8b0, 28, 75);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(12, 11, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = styles.sceneCanvas;
    renderer.domElement.setAttribute("aria-label", "Interactive Chợ Neo 3D scene");
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = styles.labelLayer;
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 28;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.set(0, 1.25, 0);

    const walkingKeys = new Set<string>();
    const walkingPosition = new THREE.Vector3(0, WALKING_EYE_HEIGHT, 11.5);
    const walkingVelocity = new THREE.Vector2();
    const targetVelocity = new THREE.Vector2();
    const forward = new THREE.Vector2();
    const right = new THREE.Vector2();
    const cameraForward = new THREE.Vector3();
    const cameraRight = new THREE.Vector3();
    const timer = new THREE.Timer();
    timer.connect(document);
    let walkingYaw = 0;
    let walkingPitch = 0;

    const updateWalkingCamera = () => {
      camera.position.copy(walkingPosition);
      camera.rotation.order = "YXZ";
      camera.rotation.set(walkingPitch, walkingYaw, 0);
    };

    const enterWalkingMode = () => {
      if (xinXamInteractionActive) return;

      if (!touchDevice || !touchWalkingActive) {
        walkingPosition.set(0, WALKING_EYE_HEIGHT, 11.5);
        walkingVelocity.set(0, 0);
        walkingYaw = 0;
        walkingPitch = 0;
      }
      controls.enabled = false;
      updateWalkingCamera();

      if (touchDevice) {
        touchWalkingActive = true;
        setIsWalking(true);
        return;
      }

      if (typeof renderer.domElement.requestPointerLock !== "function") {
        controls.enabled = true;
        return;
      }

      void Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {
        controls.enabled = true;
      });
    };

    const showInteractionReady = (zone: ProximityZone | null) => {
      if (!zone) return;

      setInteractionMessage(`${zone.name} — interaction ready`);
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = setTimeout(() => {
        setInteractionMessage(null);
        interactionTimerRef.current = null;
      }, 1600);
    };

    const updateProximity = (walkingActive: boolean) => {
      if (!walkingActive) {
        if (activeZoneId !== null) {
          activeZoneId = null;
          setActiveDestination(null);
          setInteractionMessage(null);
        }
        return;
      }

      let nearestZone: ProximityZone | null = null;
      let nearestDistanceSq = Number.POSITIVE_INFINITY;
      proximityZones.forEach((zone) => {
        const dx = walkingPosition.x - zone.x;
        const dz = walkingPosition.z - zone.z;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq <= zone.radius * zone.radius && distanceSq < nearestDistanceSq) {
          nearestZone = zone;
          nearestDistanceSq = distanceSq;
        }
      });

      const nextZoneId = nearestZone?.prefix ?? null;
      if (nextZoneId === activeZoneId) return;

      activeZoneId = nextZoneId;
      setActiveDestination(nearestZone);
      setInteractionMessage(null);
      if (interactionTimerRef.current) {
        clearTimeout(interactionTimerRef.current);
        interactionTimerRef.current = null;
      }
    };

    const resetXinXamParts = () => {
      xinXamParts.forEach(({ object, position, rotation }) => {
        object.position.copy(position);
        object.rotation.copy(rotation);
      });
    };

    const startXinXamInteraction = () => {
      if (xinXamInteractionActive || activeZoneId !== "XX_") return;

      resetXinXamParts();
      if (xinXamHeroStick && xinXamHeroStickOrigin) {
        xinXamHeroStick.visible = false;
        xinXamHeroStick.position.copy(xinXamHeroStickOrigin);
        xinXamHeroStick.rotation.set(0, 0, -0.08);
        xinXamHeroStick.scale.setScalar(1);
      }
      const sticks = xinXamParts.filter(({ isHolder }) => !isHolder);
      const selectedStick =
        sticks[Math.floor(Math.random() * sticks.length)]?.object ?? null;

      xinXamInteractionActive = true;
      xinXamAnimation = {
        elapsed: 0,
        selectedStick,
      };

      xinXamCameraStartPosition = camera.position.clone();
      xinXamCameraStartQuaternion = camera.quaternion.clone();
      if (xinXamRitualFocus) {
        const focus = xinXamRitualFocus.clone();
        const towardPlayer = new THREE.Vector3(
          walkingPosition.x - focus.x,
          0,
          walkingPosition.z - focus.z,
        );
        if (towardPlayer.lengthSq() < 0.001) towardPlayer.set(0, 0, 1);
        towardPlayer.normalize();

        xinXamCameraTargetPosition = focus
          .clone()
          .addScaledVector(towardPlayer, 2.15);
        xinXamCameraTargetPosition.y = Math.max(
          WALKING_EYE_HEIGHT,
          focus.y + 0.55,
        );

        const lookCamera = camera.clone();
        lookCamera.position.copy(xinXamCameraTargetPosition);
        lookCamera.lookAt(focus.x, focus.y + 0.82, focus.z);
        xinXamCameraTargetQuaternion = lookCamera.quaternion.clone();
      }
      walkingKeys.clear();
      walkingVelocity.set(0, 0);
      touchMovement.set(0, 0);
      controls.enabled = false;
      setInteractionMessage(null);
      setXinXamResult(null);
      setIsXinXamInteracting(true);
      setIsWalking(false);
    };

    const finishXinXamInteraction = () => {
      const selectedObject = xinXamAnimation?.selectedStick ?? null;
      resetXinXamParts();

      if (selectedObject) {
        const selected = xinXamParts.find(({ object }) => object === selectedObject);
        if (selected) {
          selected.object.position.y = selected.position.y + 0.32;
          selected.object.rotation.z = selected.rotation.z + 0.08;
        }
      }

      xinXamAnimation = null;
      xinXamInteractionActive = false;
      xinXamCameraStartPosition = null;
      xinXamCameraStartQuaternion = null;
      xinXamCameraTargetPosition = null;
      xinXamCameraTargetQuaternion = null;
      if (xinXamRitualLight) xinXamRitualLight.intensity = 0;
      if (xinXamHeroStick) xinXamHeroStick.visible = false;
      setIsXinXamInteracting(false);
      setXinXamResult(null);
      destinationEntryRequestRef.current = "XX_";
    };

    const startDestinationEntry = () => {
      const requestedPrefix = destinationEntryRequestRef.current;
      destinationEntryRequestRef.current = null;
      if (
        !requestedPrefix ||
        !(requestedPrefix in DESTINATION_ENTRY_ROUTES) ||
        destinationEntryActive ||
        xinXamInteractionActive
      ) {
        return;
      }

      const zone = proximityZones.find(({ prefix }) => prefix === requestedPrefix);
      if (!zone) return;

      destinationEntryActive = true;
      destinationEntryWasPointerLocked = document.pointerLockElement === renderer.domElement;
      walkingKeys.clear();
      walkingVelocity.set(0, 0);
      touchMovement.set(0, 0);
      controls.enabled = false;
      setInteractionMessage(null);
      setDestinationEntry(zone);
      setIsWalking(false);

      if (destinationEntryWasPointerLocked) {
        document.exitPointerLock();
      }
    };

    resumeDestinationEntryRef.current = () => {
      if (!destinationEntryActive) {
        setDestinationEntry(null);
        return;
      }

      const shouldRestorePointerLock = destinationEntryWasPointerLocked;
      destinationEntryActive = false;
      destinationEntryWasPointerLocked = false;
      setDestinationEntry(null);
      resetXinXamParts();
      if (xinXamRitualLight) xinXamRitualLight.intensity = 0;
      if (xinXamHeroStick) xinXamHeroStick.visible = false;
      walkingKeys.clear();
      walkingVelocity.set(0, 0);
      touchMovement.set(0, 0);
      updateWalkingCamera();

      if (
        shouldRestorePointerLock &&
        typeof renderer.domElement.requestPointerLock === "function"
      ) {
        controls.enabled = false;
        try {
          void Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {
            controls.enabled = true;
            setIsWalking(false);
          });
        } catch {
          controls.enabled = true;
          setIsWalking(false);
        }
        return;
      }

      controls.enabled = !touchWalkingActive;
      setIsWalking(touchWalkingActive);
    };

    const handlePointerLockChange = () => {
      const pointerLocked = document.pointerLockElement === renderer.domElement;
      if (destinationEntryActive) {
        controls.enabled = false;
        walkingKeys.clear();
        walkingVelocity.set(0, 0);
        updateWalkingCamera();
        setIsWalking(false);
        return;
      }

      controls.enabled = !pointerLocked;
      walkingKeys.clear();
      if (pointerLocked) {
        setIsWalking(true);
      } else {
        walkingVelocity.set(0, 0);
        updateProximity(false);
        setIsWalking(false);
        const lookDirection = new THREE.Vector3(
          Math.sin(walkingYaw),
          0,
          -Math.cos(walkingYaw),
        );
        controls.target.set(
          walkingPosition.x + lookDirection.x * 4,
          1.25,
          walkingPosition.z + lookDirection.z * 4,
        );
        controls.update();
      }
    };

    const handleCanvasClick = () => {
      if (xinXamInteractionActive || destinationEntryActive) return;

      if (document.pointerLockElement !== renderer.domElement) {
        if (touchDevice) setHasInteracted(true);
        enterWalkingMode();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (
        destinationEntryActive ||
        document.pointerLockElement !== renderer.domElement
      ) return;

      walkingYaw -= event.movementX * 0.0022;
      walkingPitch = THREE.MathUtils.clamp(
        walkingPitch - event.movementY * 0.0022,
        -1.2,
        1.2,
      );
    };

    const movementCodes = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowLeft",
      "ArrowDown",
      "ArrowRight",
    ]);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (xinXamInteractionActive || destinationEntryActive) {
        if (movementCodes.has(event.code)) event.preventDefault();
        return;
      }

      if ((event.code === "KeyE" || event.code === "Enter") && activeZoneId) {
        event.preventDefault();
        if (activeZoneId === "XX_") {
          startXinXamInteraction();
        } else if (activeZoneId === "OD_") {
          return;
        } else if (activeZoneId in DESTINATION_ENTRY_ROUTES) {
          destinationEntryRequestRef.current = activeZoneId;
        } else {
          showInteractionReady(proximityZones.find(({ prefix }) => prefix === activeZoneId) ?? null);
        }
        return;
      }
      if (!movementCodes.has(event.code)) return;
      walkingKeys.add(event.code);
      if (document.pointerLockElement === renderer.domElement) {
        event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      walkingKeys.delete(event.code);
    };

    const updateMobileMovement = (event: PointerEvent) => {
      if (xinXamInteractionActive || destinationEntryActive) return;

      const pad = mobileMovePadRef.current;
      if (!pad || event.pointerId !== movePointerId) return;

      const rect = pad.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maxRadius = Math.min(rect.width, rect.height) * 0.34;
      const rawX = event.clientX - centerX;
      const rawY = event.clientY - centerY;
      const length = Math.hypot(rawX, rawY);
      const scale = length > maxRadius ? maxRadius / length : 1;
      const x = rawX * scale;
      const y = rawY * scale;

      // Screen Y grows downward; positive forward intent is therefore -Y.
      touchMovement.set(x / maxRadius, -y / maxRadius);
      if (mobileMoveThumbRef.current) {
        mobileMoveThumbRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    const resetMobileMovement = (event?: PointerEvent) => {
      if (event && event.pointerId !== movePointerId) return;
      movePointerId = null;
      touchMovement.set(0, 0);
      if (mobileMoveThumbRef.current) {
        mobileMoveThumbRef.current.style.transform = "translate(0, 0)";
      }
    };

    const handleMobileMoveDown = (event: PointerEvent) => {
      if (
        !touchDevice ||
        xinXamInteractionActive ||
        destinationEntryActive ||
        movePointerId !== null
      ) return;
      event.preventDefault();
      setHasInteracted(true);
      movePointerId = event.pointerId;
      mobileMovePadRef.current?.setPointerCapture(event.pointerId);
      enterWalkingMode();
      updateMobileMovement(event);
    };

    const handleMobileMoveUp = (event: PointerEvent) => {
      resetMobileMovement(event);
    };

    const handleMobileLookDown = (event: PointerEvent) => {
      if (
        touchDevice ||
        xinXamInteractionActive ||
        destinationEntryActive ||
        lookPointerId !== null
      ) return;
      event.preventDefault();
      setHasInteracted(true);
      lookPointerId = event.pointerId;
      lastLookX = event.clientX;
      lastLookY = event.clientY;
      mobileLookPadRef.current?.setPointerCapture(event.pointerId);
      enterWalkingMode();
    };

    const handleMobileLookMove = (event: PointerEvent) => {
      if (
        touchDevice ||
        xinXamInteractionActive ||
        destinationEntryActive ||
        event.pointerId !== lookPointerId
      ) return;
      event.preventDefault();
      walkingYaw -= (event.clientX - lastLookX) * 0.004;
      walkingPitch = THREE.MathUtils.clamp(walkingPitch - (event.clientY - lastLookY) * 0.004, -1.2, 1.2);
      lastLookX = event.clientX;
      lastLookY = event.clientY;
    };

    const handleMobileLookUp = (event: PointerEvent) => {
      if (event.pointerId === lookPointerId) lookPointerId = null;
    };

    const findTouch = (touches: TouchList, identifier: number) => {
      for (let index = 0; index < touches.length; index += 1) {
        const touch = touches.item(index);
        if (touch?.identifier === identifier) return touch;
      }
      return null;
    };

    const handleMobileLookTouchStart = (event: TouchEvent) => {
      if (
        !touchDevice ||
        xinXamInteractionActive ||
        destinationEntryActive ||
        lookTouchIdentifier !== null
      ) return;
      const touch = event.changedTouches.item(0);
      if (!touch) return;

      event.preventDefault();
      setHasInteracted(true);
      lookTouchIdentifier = touch.identifier;
      lastLookX = touch.clientX;
      lastLookY = touch.clientY;
      enterWalkingMode();
    };

    const handleMobileLookTouchMove = (event: TouchEvent) => {
      if (
        !touchDevice ||
        xinXamInteractionActive ||
        destinationEntryActive ||
        lookTouchIdentifier === null
      ) return;
      const touch = findTouch(event.touches, lookTouchIdentifier);
      if (!touch) return;

      event.preventDefault();
      walkingYaw -= (touch.clientX - lastLookX) * 0.004;
      walkingPitch = THREE.MathUtils.clamp(
        walkingPitch - (touch.clientY - lastLookY) * 0.004,
        -1.2,
        1.2,
      );
      lastLookX = touch.clientX;
      lastLookY = touch.clientY;
    };

    const handleMobileLookTouchEnd = (event: TouchEvent) => {
      if (lookTouchIdentifier === null) return;
      if (!findTouch(event.changedTouches, lookTouchIdentifier)) return;

      event.preventDefault();
      lookTouchIdentifier = null;
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    renderer.domElement.addEventListener("click", handleCanvasClick);
    mobileMovePadRef.current?.addEventListener("pointerdown", handleMobileMoveDown);
    mobileMovePadRef.current?.addEventListener("pointermove", updateMobileMovement);
    mobileMovePadRef.current?.addEventListener("pointerup", handleMobileMoveUp);
    mobileMovePadRef.current?.addEventListener("pointercancel", handleMobileMoveUp);
    if (touchDevice) {
      mobileLookPadRef.current?.addEventListener("touchstart", handleMobileLookTouchStart, { passive: false });
      mobileLookPadRef.current?.addEventListener("touchmove", handleMobileLookTouchMove, { passive: false });
      mobileLookPadRef.current?.addEventListener("touchend", handleMobileLookTouchEnd, { passive: false });
      mobileLookPadRef.current?.addEventListener("touchcancel", handleMobileLookTouchEnd, { passive: false });
    } else {
      mobileLookPadRef.current?.addEventListener("pointerdown", handleMobileLookDown);
      mobileLookPadRef.current?.addEventListener("pointermove", handleMobileLookMove);
      mobileLookPadRef.current?.addEventListener("pointerup", handleMobileLookUp);
      mobileLookPadRef.current?.addEventListener("pointercancel", handleMobileLookUp);
    }

    const runtimeLighting = createRuntimeLighting();
    scene.add(runtimeLighting);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 26),
      new THREE.MeshStandardMaterial({ color: 0x6d8b6d, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;

    const grid = new THREE.GridHelper(26, 26, 0x9bb59a, 0x7c9c84);
    grid.position.y = 0.012;

    const worldPlaceholder = createWorldPlaceholder();

    const fallbackEnvironment = new THREE.Group();
    fallbackEnvironment.name = "Three.js fallback environment";
    fallbackEnvironment.add(ground, grid, worldPlaceholder);

    DESTINATIONS.forEach((destination) => {
      fallbackEnvironment.add(createDestination(destination, styles.sceneLabel));
    });
    scene.add(fallbackEnvironment);

    let fallbackDisposed = false;

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const loader = new GLTFLoader();
    void fetch(GLB_ASSET_PATH, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("GLB asset not found");

        loader.load(GLB_ASSET_PATH, (gltf) => {
          if (disposed) {
            disposeObject(gltf.scene);
            return;
          }

          loadedAsset = gltf.scene;
          loadedAsset.position.y = 0;
          loadedAsset.scale.setScalar(1.2);
          scene.add(loadedAsset);
          loadedAsset.updateMatrixWorld(true);
          const loadedXinXamParts: Array<{
            object: THREE.Object3D;
            position: THREE.Vector3;
            rotation: THREE.Euler;
            isHolder: boolean;
          }> = [];
          loadedAsset.traverse((child) => {
            if (
              child.name === "XX_HOLDER_Cup" ||
              child.name.startsWith("XX_STICK_")
            ) {
              loadedXinXamParts.push({
                object: child,
                position: child.position.clone(),
                rotation: child.rotation.clone(),
                isHolder: child.name === "XX_HOLDER_Cup",
              });
            }
          });
          xinXamParts = loadedXinXamParts;

          const xinXamHolder = loadedAsset.getObjectByName("XX_HOLDER_Cup");
          if (xinXamHolder) {
            const ritualLightPosition = new THREE.Vector3();
            xinXamHolder.getWorldPosition(ritualLightPosition);
            const ritualLight = new THREE.PointLight(0xffc57b, 0, 4.2, 2);
            ritualLight.position.set(
              ritualLightPosition.x,
              ritualLightPosition.y + 0.45,
              ritualLightPosition.z,
            );
            runtimeLighting.add(ritualLight);
            xinXamRitualLight = ritualLight;
            xinXamRitualFocus = ritualLightPosition.clone();

            const heroStick = new THREE.Group();
            heroStick.name = "Xin Xam selected ritual stick";
            const shaft = new THREE.Mesh(
              new THREE.BoxGeometry(0.075, 1.22, 0.075),
              new THREE.MeshStandardMaterial({
                color: 0x8a4426,
                roughness: 0.62,
                metalness: 0.02,
                emissive: 0x3a1408,
                emissiveIntensity: 0.28,
              }),
            );
            shaft.position.y = 0.61;
            shaft.castShadow = true;

            const cap = new THREE.Mesh(
              new THREE.BoxGeometry(0.105, 0.13, 0.105),
              new THREE.MeshStandardMaterial({
                color: 0xd3a45f,
                roughness: 0.5,
                metalness: 0.08,
                emissive: 0x553011,
                emissiveIntensity: 0.22,
              }),
            );
            cap.position.y = 1.235;
            cap.castShadow = true;

            heroStick.add(shaft, cap);
            heroStick.position.set(
              ritualLightPosition.x,
              ritualLightPosition.y + 0.02,
              ritualLightPosition.z,
            );
            heroStick.rotation.z = -0.08;
            heroStick.visible = false;
            scene.add(heroStick);
            xinXamHeroStick = heroStick;
            xinXamHeroStickOrigin = heroStick.position.clone();
          }

          collisionVolumes = createGlbCollisionVolumes(loadedAsset);
          const loadedProximityZones = createGlbProximityZones(loadedAsset);
          proximityZones = loadedProximityZones.length === DESTINATION_PROXIMITY_DEFINITIONS.length
            ? loadedProximityZones
            : createFallbackProximityZones();

          const ongDiaZone = proximityZones.find(({ prefix }) => prefix === "OD_");
          if (ongDiaZone) {
            const smokeOrigin = new THREE.Vector3(ongDiaZone.x, 1.8, ongDiaZone.z);
            const vase = loadedAsset.getObjectByName("OD_PROP_Vase");
            vase?.getWorldPosition(smokeOrigin);
            smokeOrigin.y += 0.2;

            const light = new THREE.PointLight(0xffc47e, 0.12, 3.8, 2);
            light.position.set(smokeOrigin.x, smokeOrigin.y + 0.32, smokeOrigin.z);
            runtimeLighting.add(light);

            const particles: OngDiaSmokeParticle[] = [];
            const positions = new Float32Array(7 * 3);
            for (let index = 0; index < 7; index += 1) {
              const angle = index * 2.37;
              const radius = 0.025 + (index % 3) * 0.018;
              const particle = {
                x: Math.cos(angle) * radius,
                y: (index % 4) * 0.07,
                z: Math.sin(angle) * radius,
                phase: index * 0.63,
                speed: 0.55 + (index % 3) * 0.08,
              };
              particles.push(particle);
              positions[index * 3] = particle.x;
              positions[index * 3 + 1] = particle.y;
              positions[index * 3 + 2] = particle.z;
            }

            const smokeGeometry = new THREE.BufferGeometry();
            const positionAttribute = new THREE.BufferAttribute(positions, 3);
            smokeGeometry.setAttribute("position", positionAttribute);
            const smokeMaterial = new THREE.PointsMaterial({
              color: 0xd5c6aa,
              size: 0.085,
              transparent: true,
              opacity: 0.045,
              depthWrite: false,
              sizeAttenuation: true,
            });
            const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
            smoke.name = "Ông Địa ambient incense smoke";
            smoke.position.copy(smokeOrigin);
            scene.add(smoke);

            ongDiaAmbience = {
              light,
              smoke,
              smokeMaterial,
              particles,
              positionAttribute,
              zone: ongDiaZone,
              proximity: 0,
              elapsed: 0,
            };
          }

          disableImportedLights(loadedAsset);
          loadedAsset.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.remove(fallbackEnvironment);
          disposeObject(fallbackEnvironment);
          fallbackDisposed = true;
        }, undefined, () => {
          if (disposed) return;
        });
      })
      .catch(() => {
        if (disposed) return;
      });

    const render = () => {
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.05);
      const pointerLocked = document.pointerLockElement === renderer.domElement;
      const movementActive = pointerLocked || touchWalkingActive;

      if (xinXamStartRef.current) {
        xinXamStartRef.current = false;
        startXinXamInteraction();
      }

      if (destinationEntryRequestRef.current) {
        startDestinationEntry();
      }

      if (xinXamDismissRef.current) {
        xinXamDismissRef.current = false;
        xinXamInteractionActive = false;
        xinXamAnimation = null;
        resetXinXamParts();
        if (xinXamRitualLight) xinXamRitualLight.intensity = 0;
        if (xinXamHeroStick) xinXamHeroStick.visible = false;
        walkingVelocity.set(0, 0);
        touchMovement.set(0, 0);
        controls.enabled = !pointerLocked && !touchWalkingActive;
        updateWalkingCamera();
        setIsWalking(movementActive);
      }

      if (xinXamAnimation) {
        xinXamAnimation.elapsed += delta;
        const elapsed = xinXamAnimation.elapsed;
        const progress = THREE.MathUtils.clamp(elapsed / 3.85, 0, 1);
        const cameraProgress = THREE.MathUtils.smoothstep(progress, 0.0, 0.22);
        const shakeEnvelope =
          progress < 0.5
            ? Math.sin(THREE.MathUtils.clamp((progress - 0.12) / 0.38, 0, 1) * Math.PI)
            : 0;
        const shake = Math.sin(elapsed * 44) * 0.13 * shakeEnvelope;

        if (
          xinXamCameraStartPosition &&
          xinXamCameraStartQuaternion &&
          xinXamCameraTargetPosition &&
          xinXamCameraTargetQuaternion
        ) {
          camera.position.lerpVectors(
            xinXamCameraStartPosition,
            xinXamCameraTargetPosition,
            cameraProgress,
          );
          camera.quaternion
            .copy(xinXamCameraStartQuaternion)
            .slerp(xinXamCameraTargetQuaternion, cameraProgress);
        }

        if (xinXamRitualLight) {
          const lightRise = THREE.MathUtils.smoothstep(progress, 0.05, 0.3);
          const lightFall = 1 - THREE.MathUtils.smoothstep(progress, 0.78, 1);
          xinXamRitualLight.intensity = 0.14 + 1.35 * lightRise * lightFall;
        }

        xinXamParts.forEach(({ object, position, rotation, isHolder }) => {
          if (isHolder) {
            object.rotation.set(
              rotation.x + Math.sin(elapsed * 39) * 0.025 * shakeEnvelope,
              rotation.y + shake,
              rotation.z + Math.cos(elapsed * 45) * 0.035 * shakeEnvelope,
            );
          } else {
            object.rotation.set(
              rotation.x + shake * 0.5,
              rotation.y,
              rotation.z + shake * 0.8,
            );
          }
        });

        const selectedStick = xinXamParts.find(
          ({ object }) => object === xinXamAnimation?.selectedStick,
        );
        if (selectedStick && progress > 0.38) {
          const revealProgress = THREE.MathUtils.smoothstep(progress, 0.38, 0.62);
          selectedStick.object.position.y =
            selectedStick.position.y + revealProgress * 0.34;
        }

        if (xinXamHeroStick && xinXamHeroStickOrigin) {
          if (progress >= 0.4) {
            xinXamHeroStick.visible = true;
            const heroRise = THREE.MathUtils.smoothstep(progress, 0.4, 0.64);
            const heroSettle = THREE.MathUtils.smoothstep(progress, 0.64, 0.82);
            xinXamHeroStick.position.copy(xinXamHeroStickOrigin);
            xinXamHeroStick.position.y += heroRise * 1.34;
            xinXamHeroStick.rotation.z =
              -0.08 + Math.sin(elapsed * 3.4) * 0.035 * (1 - heroSettle);
            xinXamHeroStick.scale.setScalar(0.92 + heroRise * 0.08);
          } else {
            xinXamHeroStick.visible = false;
          }
        }

        if (progress >= 1) finishXinXamInteraction();
      }

      if (ongDiaAmbience) {
        ongDiaAmbience.elapsed += delta;
        const distanceToShrine = Math.hypot(
          walkingPosition.x - ongDiaAmbience.zone.x,
          walkingPosition.z - ongDiaAmbience.zone.z,
        );
        const targetProximity = 1 - THREE.MathUtils.smoothstep(
          distanceToShrine,
          ongDiaAmbience.zone.radius * 0.55,
          ongDiaAmbience.zone.radius * 2.1,
        );
        ongDiaAmbience.proximity +=
          (targetProximity - ongDiaAmbience.proximity) * (1 - Math.exp(-delta * 2.5));

        const flicker =
          0.95 +
          Math.sin(ongDiaAmbience.elapsed * 8.2) * 0.035 +
          Math.sin(ongDiaAmbience.elapsed * 17.1) * 0.018;
        ongDiaAmbience.light.intensity =
          (0.1 + ongDiaAmbience.proximity * 0.15) * flicker;
        ongDiaAmbience.smokeMaterial.opacity = 0.035 + ongDiaAmbience.proximity * 0.065;

        ongDiaAmbience.particles.forEach((particle, index) => {
          const cycle = (ongDiaAmbience.elapsed * particle.speed + particle.phase) % 1;
          const drift = 0.35 + cycle;
          const attributeIndex = index * 3;
          ongDiaAmbience.positionAttribute.array[attributeIndex] =
            particle.x + Math.sin(ongDiaAmbience.elapsed * 0.75 + particle.phase) * 0.035 * drift;
          ongDiaAmbience.positionAttribute.array[attributeIndex + 1] = particle.y + cycle * 0.62;
          ongDiaAmbience.positionAttribute.array[attributeIndex + 2] =
            particle.z + Math.cos(ongDiaAmbience.elapsed * 0.68 + particle.phase) * 0.028 * drift;
        });
        ongDiaAmbience.positionAttribute.needsUpdate = true;
      }

      const walkingActive =
        movementActive && !xinXamInteractionActive && !destinationEntryActive;

      if (walkingActive) {
        const forwardInput = touchWalkingActive
          ? touchMovement.y
          : (walkingKeys.has("KeyW") || walkingKeys.has("ArrowUp") ? 1 : 0) -
            (walkingKeys.has("KeyS") || walkingKeys.has("ArrowDown") ? 1 : 0);
        const strafeInput = touchWalkingActive
          ? touchMovement.x
          : (walkingKeys.has("KeyD") || walkingKeys.has("ArrowRight") ? 1 : 0) -
            (walkingKeys.has("KeyA") || walkingKeys.has("ArrowLeft") ? 1 : 0);

        if (touchWalkingActive) {
          updateWalkingCamera();
          camera.getWorldDirection(cameraForward);
          cameraForward.y = 0;
          cameraForward.normalize();
          cameraRight.crossVectors(cameraForward, camera.up).normalize();
          forward.set(cameraForward.x, cameraForward.z);
          right.set(cameraRight.x, cameraRight.z);
        } else {
          forward.set(Math.sin(walkingYaw), -Math.cos(walkingYaw));
          right.set(Math.cos(walkingYaw), Math.sin(walkingYaw));
        }
        targetVelocity.set(
          forward.x * forwardInput + right.x * strafeInput,
          forward.y * forwardInput + right.y * strafeInput,
        );
        if (targetVelocity.lengthSq() > 1) targetVelocity.normalize();
        targetVelocity.multiplyScalar(WALKING_SPEED);
        walkingVelocity.lerp(
          targetVelocity,
          1 - Math.exp(-WALKING_ACCELERATION * delta),
        );

        const nextX = THREE.MathUtils.clamp(
          walkingPosition.x + walkingVelocity.x * delta,
          WALKING_WORLD_BOUNDS.minX,
          WALKING_WORLD_BOUNDS.maxX,
        );
        const nextZ = THREE.MathUtils.clamp(
          walkingPosition.z + walkingVelocity.y * delta,
          WALKING_WORLD_BOUNDS.minZ,
          WALKING_WORLD_BOUNDS.maxZ,
        );
        const blockedX = isCollisionAt(nextX, walkingPosition.z, collisionVolumes);

        // Resolve one horizontal axis at a time so the player stops at a
        // coarse volume but can still slide naturally along its edge.
        if (!blockedX) {
          walkingPosition.x = nextX;
        }
        const blockedZ = isCollisionAt(walkingPosition.x, nextZ, collisionVolumes);
        if (!blockedZ) {
          walkingPosition.z = nextZ;
        }
        updateWalkingCamera();
      } else if (!xinXamInteractionActive && !destinationEntryActive) {
        controls.update();
      }

      updateProximity(movementActive || destinationEntryActive);
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    renderer.setAnimationLoop(render);

    return () => {
      disposed = true;
      resumeDestinationEntryRef.current = null;
      resizeObserver.disconnect();
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      renderer.domElement.removeEventListener("click", handleCanvasClick);
      mobileMovePadRef.current?.removeEventListener("pointerdown", handleMobileMoveDown);
      mobileMovePadRef.current?.removeEventListener("pointermove", updateMobileMovement);
      mobileMovePadRef.current?.removeEventListener("pointerup", handleMobileMoveUp);
      mobileMovePadRef.current?.removeEventListener("pointercancel", handleMobileMoveUp);
      if (touchDevice) {
        mobileLookPadRef.current?.removeEventListener("touchstart", handleMobileLookTouchStart);
        mobileLookPadRef.current?.removeEventListener("touchmove", handleMobileLookTouchMove);
        mobileLookPadRef.current?.removeEventListener("touchend", handleMobileLookTouchEnd);
        mobileLookPadRef.current?.removeEventListener("touchcancel", handleMobileLookTouchEnd);
      } else {
        mobileLookPadRef.current?.removeEventListener("pointerdown", handleMobileLookDown);
        mobileLookPadRef.current?.removeEventListener("pointermove", handleMobileLookMove);
        mobileLookPadRef.current?.removeEventListener("pointerup", handleMobileLookUp);
        mobileLookPadRef.current?.removeEventListener("pointercancel", handleMobileLookUp);
      }
      resetMobileMovement();
      lookPointerId = null;
      lookTouchIdentifier = null;
      if (interactionTimerRef.current) {
        clearTimeout(interactionTimerRef.current);
        interactionTimerRef.current = null;
      }
      controls.dispose();
      timer.dispose();
      renderer.setAnimationLoop(null);
      disposeObject(scene);
      if (!fallbackDisposed) disposeObject(fallbackEnvironment);
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    };
  }, []);

  const destinationEntryRoute = destinationEntry
    ? DESTINATION_ENTRY_ROUTES[
        destinationEntry.prefix as keyof typeof DESTINATION_ENTRY_ROUTES
      ]
    : null;

  const destinationThemeClass = destinationEntryRoute
    ? {
        social: styles.socialEntryTheme,
        ritual: styles.ritualEntryTheme,
        guide: styles.guideEntryTheme,
        practical: styles.practicalEntryTheme,
      }[destinationEntryRoute.theme]
    : "";

  return (
    <div ref={mountRef} className={styles.sceneRoot}>
      {!destinationEntry && (
        <div
          className={`${styles.walkingHint} ${isTouchDevice && hasInteracted ? styles.walkingHintFaded : ""}`}
          aria-live="polite"
        >
          {isTouchDevice
            ? "Kéo bên trái để đi · kéo bên phải để nhìn"
            : isWalking
              ? "WASD / phím mũi tên để đi · rê chuột để nhìn · Esc để quay lại orbit"
              : "Click vào thế giới để đi bộ · Drag để orbit debug"}
        </div>
      )}
      {!destinationEntry && !isXinXamInteracting && activeDestination && activeDestination.prefix !== "OD_" && (
        <div className={styles.destinationPrompt} role="status" aria-live="polite">
          {interactionMessage ? (
            <div className={styles.destinationPromptMessage}>{interactionMessage}</div>
          ) : (
            <button
              type="button"
              className={styles.destinationPromptButton}
              onClick={activateDestination}
            >
              <span>{activeDestination.cue}</span>
              <span className={styles.destinationPromptAction}>
                {isTouchDevice ? "Chạm để xem" : "E / Enter"}
              </span>
            </button>
          )}
        </div>
      )}
      {isXinXamInteracting && (
        <div className={styles.xinXamCeremonyCue} role="status" aria-live="polite">
          <span>Xin Xăm</span>
          <strong>Lắng một nhịp…</strong>
        </div>
      )}
      {destinationEntry && destinationEntryRoute ? (
        <div
          className={`${styles.destinationEntryOverlay} ${destinationThemeClass} ${
            destinationEntry.prefix === "XX_" ? styles.xinXamEntryOverlay : ""
          }`}
          role="dialog"
          aria-modal="true"
        >
          <section
            className={`${styles.destinationEntryPanel} ${destinationThemeClass} ${
              destinationEntry.prefix === "XX_" ? styles.xinXamEntryPanel : ""
            }`}
            aria-label={destinationEntryRoute.label}
          >
            <header
              className={`${styles.destinationEntryHeader} ${destinationThemeClass} ${
                destinationEntry.prefix === "XX_" ? styles.xinXamEntryHeader : ""
              }`}
            >
              <div>
                <p className={styles.destinationEntryKicker}>
                  Chợ Neo · {destinationEntryRoute.eyebrow}
                </p>
                <h2>{destinationEntryRoute.label}</h2>
              </div>
              <button
                type="button"
                onClick={closeDestinationEntry}
                aria-label={destinationEntry.prefix === "XX_" ? "Đóng Xin Xăm và quay lại 3D" : undefined}
              >
                {destinationEntry.prefix === "XX_" ? "×" : "← Quay lại 3D"}
              </button>
            </header>
            <iframe
              className={`${styles.destinationEntryFrame} ${destinationThemeClass} ${
                destinationEntry.prefix === "XX_" ? styles.xinXamEntryFrame : ""
              }`}
              src={destinationEntryRoute.href}
              title={`${destinationEntryRoute.label} — Chợ Neo`}
            />
          </section>
        </div>
      ) : null}
      {!destinationEntry && (
        <div
          className={isTouchDevice ? styles.mobileControls : styles.mobileControlsHidden}
          aria-label="Điều khiển đi bộ trên màn hình cảm ứng"
        >
          <div ref={mobileMovePadRef} className={styles.mobileMovePad} aria-label="Khu vực di chuyển">
            <div ref={mobileMoveThumbRef} className={styles.mobileMoveThumb} />
          </div>
          <div ref={mobileLookPadRef} className={styles.mobileLookPad} aria-label="Khu vực nhìn quanh" />
        </div>
      )}
    </div>
  );
}
