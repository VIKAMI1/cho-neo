"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  createOngDiaPlaceholder,
  disposeOngDiaPlaceholder,
} from "./OngDiaPlaceholder";

export default function OngDiaThreeLayer() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scene = new THREE.Scene();
    const altarSeatY = 0.18;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.16, 4.25);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff1d0", "#5d2c18", 1.35));

    const keyLight = new THREE.DirectionalLight("#ffd28a", 1.25);
    keyLight.position.set(-1.8, 2.4, 2.4);
    scene.add(keyLight);

    const altarGlow = new THREE.PointLight("#ff9e38", 1.8, 5.5);
    altarGlow.position.set(0, altarSeatY + 0.18, 1.8);
    scene.add(altarGlow);

    // Future replacement point:
    // Load /public/models/cho-neo/ong-dia.glb here and add that model instead
    // of createOngDiaPlaceholder(). Keep the model centered in this group.
    const ongDia = createOngDiaPlaceholder();
    scene.add(ongDia);
    const fanPivot = ongDia.getObjectByName("BlessingFanPivot");

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 40),
      new THREE.MeshBasicMaterial({
        color: "#2d160d",
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    shadow.position.set(0, altarSeatY - 0.42, -0.1);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(0.72, 0.28, 1);
    scene.add(shadow);

    const incenseGroup = new THREE.Group();
    incenseGroup.name = "IncenseHolderDetail";
    incenseGroup.position.set(0.55, altarSeatY - 0.03, -0.04);
    scene.add(incenseGroup);

    const stickMaterial = new THREE.MeshStandardMaterial({
      color: "#6d2a19",
      roughness: 0.72,
      metalness: 0,
    });
    const emberMaterial = new THREE.MeshBasicMaterial({
      color: "#db4b2d",
      transparent: true,
      opacity: 0.72,
    });
    const ashMaterial = new THREE.MeshStandardMaterial({
      color: "#7b6958",
      roughness: 0.86,
      metalness: 0,
    });
    const holderMaterial = new THREE.MeshStandardMaterial({
      color: "#b2722b",
      roughness: 0.42,
      metalness: 0.45,
    });

    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.05, 24), holderMaterial);
    holder.position.y = -0.035;
    incenseGroup.add(holder);

    [-0.028, 0, 0.028].forEach((x, index) => {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 8), stickMaterial);
      stick.position.set(x, 0.13, 0);
      stick.rotation.z = (index - 1) * 0.08;
      incenseGroup.add(stick);

      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), emberMaterial.clone());
      ember.position.set(x + (index - 1) * 0.012, 0.3, 0);
      incenseGroup.add(ember);
    });

    [-0.045, -0.014, 0.018, 0.046].forEach((x, index) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 8), ashMaterial);
      stem.position.set(x, 0.055, -0.01);
      stem.rotation.z = (index - 1.5) * 0.1;
      incenseGroup.add(stem);
    });

    const specks = Array.from({ length: 14 }, (_, index) => {
      const speck = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 8, 6),
        new THREE.MeshBasicMaterial({
          color: "#ffd979",
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      speck.name = `BlessingSpeck${index}`;
      speck.visible = !prefersReducedMotion;
      scene.add(speck);
      return speck;
    });

    const smokeLines = Array.from({ length: 5 }, (_, index) => {
      const line = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({
          color: "#ffe4b3",
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      );
      line.name = `FanTouchedIncenseSmoke${index}`;
      scene.add(line);
      return line;
    });

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    let frame = 0;
    let raf = 0;
    let blessingWave = 0;

    const updateSmoke = (time: number, breezeStrength: number) => {
      smokeLines.forEach((line, index) => {
        const stemOffset = (index - 2) * 0.015;
        const baseX = 0.55 + stemOffset;
        const baseY = altarSeatY + 0.23;
        const baseSway = prefersReducedMotion ? 0.015 : Math.sin(time * 1.1 + index) * 0.028;
        const breeze = baseSway + breezeStrength;
        const points = [
          new THREE.Vector3(baseX, baseY, -0.04),
          new THREE.Vector3(baseX + breeze * 0.16, baseY + 0.12, -0.035),
          new THREE.Vector3(baseX + breeze * 0.48, baseY + 0.25, -0.03),
          new THREE.Vector3(baseX + breeze * 0.78, baseY + 0.39, -0.025),
          new THREE.Vector3(baseX + breeze, baseY + 0.51, -0.02),
        ];
        line.geometry.dispose();
        line.geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = line.material as THREE.LineBasicMaterial;
        material.opacity =
          0.11 + (index % 2) * 0.035 + Math.min(Math.abs(breezeStrength), 0.08) * 0.45;
      });
    };

    const triggerBlessingWave = () => {
      if (prefersReducedMotion) return;
      blessingWave = 1;
    };

    mount.addEventListener("pointerdown", triggerBlessingWave);
    updateSmoke(0, 0);

    const animate = () => {
      if (!prefersReducedMotion) {
        frame += 0.01;
        ongDia.position.y = altarSeatY + Math.sin(frame) * 0.012;
        ongDia.rotation.y = Math.sin(frame * 0.65) * 0.04;
        shadow.material.opacity = 0.2 + Math.sin(frame) * 0.018;

        blessingWave = Math.max(0, blessingWave - 0.018);
        const fanWave =
          Math.sin(frame * 2.4) * 0.1 + blessingWave * Math.sin(frame * 11) * 0.28;
        if (fanPivot) {
          fanPivot.rotation.z = -0.26 + fanWave;
        }

        const fanWorld = new THREE.Vector3();
        if (fanPivot) {
          fanPivot.getWorldPosition(fanWorld);
        } else {
          fanWorld.set(0.25, altarSeatY + 0.05, 0.1);
        }

        const speckStrength = 0.18 + blessingWave * 0.72;
        specks.forEach((speck, index) => {
          const phase = frame * 2.2 + index * 0.72;
          const drift = (index % 5) * 0.022 + blessingWave * 0.06;
          speck.position.set(
            fanWorld.x + Math.cos(phase) * (0.05 + drift) + 0.05,
            fanWorld.y + Math.sin(phase * 0.8) * 0.035 + index * 0.006,
            fanWorld.z + 0.18 + Math.sin(phase * 0.6) * 0.035,
          );
          const material = speck.material as THREE.MeshBasicMaterial;
          material.opacity = Math.max(0, Math.sin(phase) * 0.18 + speckStrength * 0.32);
          speck.scale.setScalar(0.72 + blessingWave * 0.65 + (index % 3) * 0.12);
        });

        updateSmoke(frame, blessingWave * 0.075);
      }
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      mount.removeEventListener("pointerdown", triggerBlessingWave);
      window.cancelAnimationFrame(raf);
      disposeOngDiaPlaceholder(ongDia);
      shadow.geometry.dispose();
      shadow.material.dispose();
      incenseGroup.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      });
      specks.forEach((speck) => {
        speck.geometry.dispose();
        speck.material.dispose();
      });
      smokeLines.forEach((line) => {
        line.geometry.dispose();
        line.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="ong-dia-three-layer"
      aria-label="Three.js Ông Địa placeholder"
    />
  );
}
