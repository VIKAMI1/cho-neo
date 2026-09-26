import Link from "next/link";
import type { Metadata } from "next";

import ChoNeo3DPreview from "@/components/cho-neo/ChoNeo3DPreview";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "3D Preview | Chợ Neo",
  description: "Isolated Three.js proof of concept for a future Chợ Neo environment.",
};

export default function ThreeDPreviewPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Development preview</p>
          <h1>Chợ Neo 3D</h1>
          <p className={styles.intro}>
            A lightweight scene proving the Blender → GLB/glTF → Three.js → Next.js path.
          </p>
        </div>

        <Link className={styles.backLink} href="/cho-neo">
          ← Chợ Neo 2D
        </Link>
      </header>

      <section className={styles.stage} aria-label="Chợ Neo 3D scene">
        <ChoNeo3DPreview />
        <div className={styles.controlsHint}>
          <span>Drag to orbit</span>
          <span>Scroll to zoom</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Placeholder environment only</span>
        <span>GLB slot: public/3d/cho-neo.glb</span>
      </footer>
    </main>
  );
}
