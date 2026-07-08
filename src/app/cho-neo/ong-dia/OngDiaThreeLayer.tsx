"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createOngDiaPlaceholder,
  disposeOngDiaPlaceholder,
} from "./OngDiaPlaceholder";

type OngDiaThreeLayerProps = {
  blessingSignal?: number;
  onBlessingRequest?: () => void;
};

function canCreateWebGLContext() {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    return Boolean(context);
  } catch {
    return false;
  }
}

export default function OngDiaThreeLayer({
  blessingSignal = 0,
  onBlessingRequest,
}: OngDiaThreeLayerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const blessRef = useRef<(() => void) | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    blessRef.current = onBlessingRequest ?? null;
  }, [onBlessingRequest]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    if (!canCreateWebGLContext()) {
      console.warn("[ong-dia] WebGL unavailable; using static shrine fallback.");
      setWebglFailed(true);
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scene = new THREE.Scene();
    const altarSeatY = 0.18;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.16, 4.25);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch (error) {
      console.warn("[ong-dia] WebGL renderer failed; using static shrine fallback.", {
        message: error instanceof Error ? error.message : "Unknown WebGL error",
      });
      setWebglFailed(true);
      return;
    }

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
    const belly = ongDia.getObjectByName("OngDiaBelly");
    const head = ongDia.getObjectByName("OngDiaHead");
    const smile = ongDia.getObjectByName("OngDiaSmile");

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

    const specks = Array.from({ length: 8 }, (_, index) => {
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

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    let frame = 0;
    let raf = 0;
    let blessingWave = 0;

    const triggerBlessingWave = () => {
      if (prefersReducedMotion) return;
      blessingWave = 1;
    };

    const handlePointerDown = () => {
      triggerBlessingWave();
      blessRef.current?.();
    };

    mount.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("ong-dia-blessing-wave", triggerBlessingWave);

    const animate = () => {
      if (!prefersReducedMotion) {
        frame += 0.01;
        ongDia.position.y = altarSeatY;
        ongDia.rotation.y = Math.sin(frame * 0.5) * 0.025;
        shadow.material.opacity = 0.2 + Math.sin(frame) * 0.018;
        const breath = Math.sin(frame * 1.25) * 0.018;
        if (belly) {
          belly.scale.set(1.08 + breath, 0.82 + breath * 0.35, 0.42 + breath * 0.55);
        }
        if (head) {
          head.position.y = 0.37 + Math.sin(frame * 1.25 + 0.4) * 0.004;
          head.rotation.x = blessingWave * Math.sin(frame * 15) * 0.12;
        }

        blessingWave = Math.max(0, blessingWave - 0.018);
        const fanWave =
          Math.sin(frame * 2.4) * 0.1 + blessingWave * Math.sin(frame * 11) * 0.28;
        if (fanPivot) {
          fanPivot.rotation.z = -0.26 + fanWave;
        }
        if (smile) {
          const smileLift = blessingWave * 0.18;
          smile.scale.set(1 + smileLift, 1 + smileLift * 0.32, 1);
        }

        const fanWorld = new THREE.Vector3();
        if (fanPivot) {
          fanPivot.getWorldPosition(fanWorld);
        } else {
          fanWorld.set(0.25, altarSeatY + 0.05, 0.1);
        }

        const speckStrength = 0.1 + blessingWave * 0.5;
        specks.forEach((speck, index) => {
          const phase = frame * 1.8 + index * 0.9;
          const drift = (index % 4) * 0.018 + blessingWave * 0.04;
          speck.position.set(
            fanWorld.x + Math.cos(phase) * (0.05 + drift) + 0.05,
            fanWorld.y + Math.sin(phase * 0.8) * 0.035 + index * 0.006,
            fanWorld.z + 0.18 + Math.sin(phase * 0.6) * 0.035,
          );
          const material = speck.material as THREE.MeshBasicMaterial;
          material.opacity = Math.max(0, Math.sin(phase) * 0.12 + speckStrength * 0.24);
          speck.scale.setScalar(0.58 + blessingWave * 0.42 + (index % 3) * 0.1);
        });
      }
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      mount.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("ong-dia-blessing-wave", triggerBlessingWave);
      window.cancelAnimationFrame(raf);
      disposeOngDiaPlaceholder(ongDia);
      shadow.geometry.dispose();
      shadow.material.dispose();
      specks.forEach((speck) => {
        speck.geometry.dispose();
        speck.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    if (blessingSignal === 0) return;
    window.dispatchEvent(new Event("ong-dia-blessing-wave"));
  }, [blessingSignal]);

  return (
    <div
      ref={mountRef}
      className={`ong-dia-three-layer ${
        webglFailed ? "ong-dia-three-layer-static" : ""
      }`}
      aria-label="Three.js Ông Địa placeholder"
      onPointerDown={webglFailed ? () => blessRef.current?.() : undefined}
    >
      {webglFailed ? (
        <div className="ong-dia-static-fallback" aria-label="Ông Địa static fallback">
          <span className="ong-dia-static-halo" aria-hidden="true" />
          <span className="ong-dia-static-hat" aria-hidden="true" />
          <span className="ong-dia-static-head" aria-hidden="true">
            <span />
          </span>
          <span className="ong-dia-static-body" aria-hidden="true">
            <span />
          </span>
          <span className="ong-dia-static-fan" aria-hidden="true" />
        </div>
      ) : null}

      <style>{`
        .ong-dia-static-fallback {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(23vw, 190px);
          min-width: 112px;
          aspect-ratio: 0.78;
          transform: translate(-50%, -42%);
          pointer-events: auto;
        }

        .ong-dia-static-fallback span {
          position: absolute;
          display: block;
          box-sizing: border-box;
        }

        .ong-dia-static-halo {
          inset: 5% 6% 8%;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 221, 141, 0.2), transparent 66%);
          filter: blur(2px);
        }

        .ong-dia-static-hat {
          left: 33%;
          top: 10%;
          width: 34%;
          height: 16%;
          border: 2px solid rgba(255, 211, 128, 0.72);
          border-radius: 45% 45% 28% 28%;
          background: linear-gradient(180deg, #d9a147, #a93224);
          box-shadow: 0 6px 18px rgba(80, 27, 14, 0.26);
        }

        .ong-dia-static-head {
          left: 31%;
          top: 21%;
          width: 38%;
          height: 29%;
          border-radius: 50%;
          background: #f0c486;
          box-shadow: inset 0 -8px 12px rgba(126, 66, 31, 0.16);
        }

        .ong-dia-static-head span {
          left: 28%;
          top: 48%;
          width: 44%;
          height: 20%;
          border-bottom: 4px solid #3a1f14;
          border-radius: 0 0 999px 999px;
        }

        .ong-dia-static-body {
          left: 20%;
          top: 47%;
          width: 60%;
          height: 42%;
          border-radius: 42% 42% 30% 30%;
          background: linear-gradient(145deg, #b73725, #7e251b);
          box-shadow:
            inset 0 0 0 3px rgba(243, 182, 90, 0.32),
            0 10px 24px rgba(45, 22, 13, 0.24);
        }

        .ong-dia-static-body span {
          left: 23%;
          top: 14%;
          width: 54%;
          height: 56%;
          border-radius: 50%;
          background: #f0c486;
          box-shadow: inset 0 -8px 16px rgba(126, 66, 31, 0.12);
        }

        .ong-dia-static-fan {
          right: 10%;
          top: 44%;
          width: 25%;
          height: 22%;
          border-radius: 100% 12% 100% 12%;
          background: linear-gradient(135deg, #ffdf8a, #c7802f);
          transform: rotate(-20deg);
          box-shadow: 0 0 14px rgba(255, 217, 121, 0.28);
        }

        @media (max-width: 760px) {
          .ong-dia-static-fallback {
            width: min(30vw, 142px);
            transform: translate(-50%, -42%);
          }
        }
      `}</style>
    </div>
  );
}
