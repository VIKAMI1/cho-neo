# Chợ Neo 3D local asset slot

Place the Blender export here as:

```text
public/3d/cho-neo.glb
```

The isolated `/3d-preview` route checks for that file and loads it in the scene with Three.js's `GLTFLoader`. If the file is not present, the route keeps a small primitive environment placeholder so the route remains usable.

Keep the export lightweight for this proof of concept: low-poly geometry, small textures, and no baked animation are preferred.
