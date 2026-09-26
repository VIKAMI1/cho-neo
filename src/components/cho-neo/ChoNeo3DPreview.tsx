"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import styles from "@/app/3d-preview/preview.module.css";

const GLB_ASSET_PATH = "/3d/cho-neo.glb";

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

function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

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

export default function ChoNeo3DPreview() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [assetStatus, setAssetStatus] = useState("Chưa có GLB — đang dùng placeholder môi trường");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let loadedAsset: THREE.Object3D | null = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x86a9b8);
    scene.fog = new THREE.Fog(0x86a9b8, 18, 42);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(12, 11, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    scene.add(new THREE.HemisphereLight(0xf5ead2, 0x3d5361, 2.1));

    const sun = new THREE.DirectionalLight(0xffe0b1, 3.4);
    sun.position.set(-8, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 26),
      new THREE.MeshStandardMaterial({ color: 0x6d8b6d, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(26, 26, 0x9bb59a, 0x7c9c84);
    grid.position.y = 0.012;
    scene.add(grid);

    const worldPlaceholder = createWorldPlaceholder();
    scene.add(worldPlaceholder);

    DESTINATIONS.forEach((destination) => {
      scene.add(createDestination(destination, styles.sceneLabel));
    });

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
          loadedAsset.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.remove(worldPlaceholder);
          scene.add(loadedAsset);
          setAssetStatus("Đã nạp local GLB: public/3d/cho-neo.glb");
        }, undefined, () => {
          if (!disposed) setAssetStatus("GLB không tải được — đang giữ placeholder môi trường");
        });
      })
      .catch(() => {
        if (!disposed) setAssetStatus("Chưa có GLB — đang dùng placeholder môi trường");
      });

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    renderer.setAnimationLoop(render);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      controls.dispose();
      renderer.setAnimationLoop(null);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={mountRef} className={styles.sceneRoot}>
      <div className={styles.status} role="status" aria-live="polite">
        {assetStatus}
      </div>
    </div>
  );
}
