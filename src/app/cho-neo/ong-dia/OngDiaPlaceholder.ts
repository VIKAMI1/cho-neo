import * as THREE from "three";

export function createOngDiaPlaceholder() {
  const group = new THREE.Group();
  group.name = "OngDiaPlaceholder";

  const red = new THREE.MeshStandardMaterial({
    color: "#9d2f1f",
    roughness: 0.55,
    metalness: 0.08,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: "#f3b65a",
    roughness: 0.38,
    metalness: 0.28,
  });
  const warmSkin = new THREE.MeshStandardMaterial({
    color: "#f0c486",
    roughness: 0.48,
    metalness: 0.05,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#3a1f14",
    roughness: 0.6,
    metalness: 0,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.36, 10, 20), red);
  body.position.y = -0.05;
  body.scale.set(1.08, 0.82, 0.76);
  group.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 18), warmSkin);
  belly.position.set(0, -0.18, 0.22);
  belly.scale.set(1.08, 0.82, 0.42);
  group.add(belly);

  const robeBand = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 10, 40), gold);
  robeBand.position.set(0, -0.2, 0.22);
  robeBand.rotation.x = Math.PI / 2;
  robeBand.scale.set(1.22, 0.36, 1);
  group.add(robeBand);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 20), warmSkin);
  head.position.y = 0.37;
  head.scale.set(1.05, 0.92, 0.96);
  group.add(head);

  const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.08, 32), gold);
  hatBase.position.y = 0.61;
  group.add(hatBase);

  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.2, 32), red);
  hatTop.position.y = 0.74;
  group.add(hatTop);

  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.27, 8, 14), gold);
  leftArm.position.set(-0.32, 0.02, 0.12);
  leftArm.rotation.z = -0.92;
  leftArm.rotation.x = 0.34;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.27, 8, 14), gold);
  rightArm.position.set(0.32, 0.02, 0.12);
  rightArm.rotation.z = 0.92;
  rightArm.rotation.x = 0.34;
  group.add(rightArm);

  const leftKnee = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 14), red);
  leftKnee.position.set(-0.24, -0.46, 0.18);
  leftKnee.scale.set(1.1, 0.52, 0.72);
  group.add(leftKnee);

  const rightKnee = leftKnee.clone();
  rightKnee.position.x = 0.24;
  group.add(rightKnee);

  const leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), gold);
  leftFoot.position.set(-0.16, -0.57, 0.29);
  leftFoot.scale.set(1.3, 0.38, 0.62);
  group.add(leftFoot);

  const rightFoot = leftFoot.clone();
  rightFoot.position.x = 0.16;
  group.add(rightFoot);

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.01, 8, 24, Math.PI), dark);
  smile.position.set(0, 0.3, 0.255);
  smile.rotation.z = Math.PI;
  group.add(smile);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), dark);
  leftEye.position.set(-0.08, 0.4, 0.255);
  group.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.08;
  group.add(rightEye);

  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 28), gold);
  coin.position.set(0, -0.03, 0.38);
  coin.rotation.x = Math.PI / 2;
  group.add(coin);

  const fanPivot = new THREE.Group();
  fanPivot.name = "BlessingFanPivot";
  fanPivot.position.set(0.43, -0.02, 0.24);
  fanPivot.rotation.z = -0.26;

  const fanShape = new THREE.Shape();
  fanShape.moveTo(0, 0);
  fanShape.absarc(0, 0, 0.2, 0.16, Math.PI * 0.84, false);
  fanShape.lineTo(0, 0);

  const fanLeaf = new THREE.Mesh(
    new THREE.ShapeGeometry(fanShape),
    new THREE.MeshStandardMaterial({
      color: "#ffd77d",
      roughness: 0.42,
      metalness: 0.16,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  fanLeaf.name = "BlessingFanLeaf";
  fanLeaf.scale.set(1, 0.82, 1);
  fanPivot.add(fanLeaf);

  const ribMaterial = new THREE.LineBasicMaterial({
    color: "#7a351c",
    transparent: true,
    opacity: 0.58,
  });
  [0.24, 0.42, 0.6, 0.78].forEach((angle, index) => {
    const rib = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0.01),
        new THREE.Vector3(Math.cos(angle) * 0.19, Math.sin(angle) * 0.19, 0.01),
      ]),
      ribMaterial,
    );
    rib.name = `BlessingFanRib${index}`;
    fanPivot.add(rib);
  });
  group.add(fanPivot);

  group.position.set(0, 0.02, 0);
  group.scale.setScalar(0.58);

  return group;
}

export function disposeOngDiaPlaceholder(group: THREE.Group) {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Line)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}
