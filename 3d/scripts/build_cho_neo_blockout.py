"""Build and export the first-pass Chợ Neo spatial blockout.

Run this script from Blender with ChoNeo_Master.blend open. The source master
is never overwritten; the generated Blender file is saved beside it as
ChoNeo_Master_blockout.blend. The GLB export is written to public/3d/cho-neo.glb.

The script only uses Blender's Python API plus Python's standard library. It is
safe to run repeatedly: the generated CHO_NEO_BLOCKOUT collection is cleared
and rebuilt each time, while existing scene objects are left untouched.
"""

import math
import os

import bpy
from mathutils import Vector


REPO_ROOT = "/Users/baonguyen/dev/cho-neo-main-preview"
MASTER_BLEND_PATH = os.path.join(REPO_ROOT, "3d", "ChoNeo_Master.blend")
BLOCKOUT_BLEND_PATH = os.path.join(REPO_ROOT, "3d", "ChoNeo_Master_blockout.blend")
GLB_EXPORT_PATH = os.path.join(REPO_ROOT, "public", "3d", "cho-neo.glb")

BLOCKOUT_COLLECTION_NAME = "CHO_NEO_BLOCKOUT"
QUAY_COLLECTION_NAME = "QUAY_XA_GIAO_V1"
ONG_DIA_COLLECTION_NAME = "ONG_DIA_V1"
XIN_XAM_COLLECTION_NAME = "XIN_XAM_V1"
HOI_CHO_NEO_COLLECTION_NAME = "HOI_CHO_NEO_V1"
MEO_VAT_COLLECTION_NAME = "MEO_VAT_V1"
ENVIRONMENT_COLLECTION_NAME = "CHO_NEO_ENVIRONMENT_V1"
LIGHTING_COLLECTION_NAME = "CHO_NEO_LIGHTING_V1"
GENERATED_PREFIX = "CHO_NEO_BLOCKOUT__"
QXG_PREFIX = "QXG_"
OD_PREFIX = "OD_"
XX_PREFIX = "XX_"
HCN_PREFIX = "HCN_"
MV_PREFIX = "MV_"
EXPECTED_QXG_OBJECT_COUNT = 24
EXPECTED_OD_OBJECT_COUNT = 23
EXPECTED_XX_OBJECT_COUNT = 28
EXPECTED_HCN_OBJECT_COUNT = 17
EXPECTED_MV_OBJECT_COUNT = 35
EXPECTED_ENVIRONMENT_OBJECT_COUNT = 247


MATERIAL_PALETTE = {
    "MAT_STONE_WARM": ((0.62, 0.52, 0.39, 1.0), 0.9),
    "MAT_STONE_WARM_VARIANT": ((0.55, 0.47, 0.37, 1.0), 0.92),
    "MAT_PLAZA_PAVING": ((0.47, 0.39, 0.30, 1.0), 0.94),
    "MAT_PROMENADE_PAVING": ((0.58, 0.49, 0.38, 1.0), 0.92),
    "MAT_LOOP_PAVING": ((0.41, 0.34, 0.27, 1.0), 0.96),
    "MAT_BRANCH_PAVING": ((0.51, 0.43, 0.33, 1.0), 0.94),
    "MAT_PAVING_INLAY": ((0.38, 0.31, 0.24, 1.0), 0.9),
    "MAT_FOUNDATION_DARK": ((0.19, 0.145, 0.11, 1.0), 0.96),
    "MAT_TIMBER_DARK": ((0.12, 0.065, 0.035, 1.0), 0.88),
    "MAT_TIMBER_MID": ((0.19, 0.10, 0.055, 1.0), 0.9),
    "MAT_TIMBER_HIGHLIGHT": ((0.25, 0.135, 0.072, 1.0), 0.86),
    "MAT_CLAY_TILE": ((0.34, 0.095, 0.045, 1.0), 0.9),
    "MAT_CLAY_EDGE": ((0.27, 0.065, 0.03, 1.0), 0.92),
    "MAT_CLAY_TILE_LIGHT": ((0.42, 0.13, 0.065, 1.0), 0.88),
    "MAT_PLASTER_CREAM": ((0.72, 0.64, 0.52, 1.0), 0.92),
    "MAT_SCREEN_JADE": ((0.25, 0.38, 0.34, 1.0), 0.86),
    "MAT_PLANT_GREEN_DARK": ((0.08, 0.22, 0.07, 1.0), 0.94),
    "MAT_PLANT_GREEN_MID": ((0.16, 0.34, 0.12, 1.0), 0.92),
    "MAT_PLANT_GREEN_LIGHT": ((0.34, 0.43, 0.14, 1.0), 0.9),
    "MAT_SOIL": ((0.12, 0.07, 0.035, 1.0), 0.98),
    "MAT_METAL_DARK": ((0.08, 0.09, 0.085, 1.0), 0.7),
    "MAT_COASTAL_HORIZON": ((0.16, 0.25, 0.28, 1.0), 0.98),
    "MAT_COASTAL_HORIZON_FAR": ((0.12, 0.20, 0.24, 1.0), 0.99),
}

MATERIAL_KEY_TO_PALETTE = {
    "Quay_Floor": "MAT_STONE_WARM",
    "Quay_Aged_Wood": "MAT_TIMBER_DARK",
    "Quay_Beam_Wood": "MAT_TIMBER_MID",
    "Quay_Clay_Roof": "MAT_CLAY_TILE",
    "Quay_Clay_Edge": "MAT_CLAY_EDGE",
    "Quay_Seating": "MAT_TIMBER_MID",
    "Quay_Stone": "MAT_STONE_WARM",
    "OD_Stone": "MAT_STONE_WARM",
    "OD_Plaster": "MAT_PLASTER_CREAM",
    "OD_Wood": "MAT_TIMBER_DARK",
    "OD_Clay_Roof": "MAT_CLAY_TILE",
    "OD_Clay_Edge": "MAT_CLAY_EDGE",
    "OD_Fruit": "MAT_CLAY_TILE",
    "XX_Stone": "MAT_STONE_WARM",
    "XX_Wood": "MAT_TIMBER_MID",
    "XX_Post_Wood": "MAT_TIMBER_DARK",
    "XX_Beam_Wood": "MAT_TIMBER_MID",
    "XX_Clay_Roof": "MAT_CLAY_TILE",
    "XX_Clay_Edge": "MAT_CLAY_EDGE",
    "XX_Backdrop": "MAT_PLASTER_CREAM",
    "XX_Holder": "MAT_TIMBER_DARK",
    "XX_Stick": "MAT_TIMBER_DARK",
    "HCN_Stone": "MAT_STONE_WARM",
    "HCN_Wood": "MAT_TIMBER_MID",
    "HCN_Post_Wood": "MAT_TIMBER_DARK",
    "HCN_Beam_Wood": "MAT_TIMBER_MID",
    "HCN_Clay_Roof": "MAT_CLAY_TILE",
    "HCN_Clay_Edge": "MAT_CLAY_EDGE",
    "HCN_Panel": "MAT_SCREEN_JADE",
    "MV_Stone": "MAT_STONE_WARM",
    "MV_Wood": "MAT_TIMBER_MID",
    "MV_Post_Wood": "MAT_TIMBER_DARK",
    "MV_Beam_Wood": "MAT_TIMBER_MID",
    "MV_Clay_Roof": "MAT_CLAY_TILE",
    "MV_Clay_Edge": "MAT_CLAY_EDGE",
    "MV_Pegboard": "MAT_SCREEN_JADE",
    "MV_Bottle": "MAT_SCREEN_JADE",
    "MV_Tool": "MAT_METAL_DARK",
    "ENV_Main_Path": "MAT_STONE_WARM",
    "ENV_Path": "MAT_STONE_WARM_VARIANT",
    "ENV_Path_Alt": "MAT_STONE_WARM_VARIANT",
    "ENV_Plaza": "MAT_PLASTER_CREAM",
    "ENV_Plaza_Alt": "MAT_STONE_WARM_VARIANT",
    "ENV_Paving_Detail": "MAT_STONE_WARM_VARIANT",
    "ENV_Stone": "MAT_STONE_WARM",
    "ENV_Soil": "MAT_SOIL",
    "ENV_Trunk": "MAT_TIMBER_DARK",
    "ENV_Leaf": "MAT_PLANT_GREEN_MID",
    "ENV_Leaf_Dark": "MAT_PLANT_GREEN_DARK",
    "ENV_Bamboo": "MAT_PLANT_GREEN_LIGHT",
    "ENV_Wood": "MAT_TIMBER_DARK",
    "ENV_Light": "MAT_METAL_DARK",
    "ENV_Light_Warm": "MAT_CLAY_TILE",
    "ENV_Horizon": "MAT_COASTAL_HORIZON",
    "ENV_Horizon_Far": "MAT_COASTAL_HORIZON_FAR",
}

MATERIAL_SURFACE_SETTINGS = {
    "MAT_TIMBER_DARK": {"roughness": 0.9},
    "MAT_TIMBER_MID": {"roughness": 0.86},
    "MAT_TIMBER_HIGHLIGHT": {"roughness": 0.82},
    "MAT_CLAY_TILE": {"roughness": 0.94},
    "MAT_CLAY_EDGE": {"roughness": 0.92},
    "MAT_CLAY_TILE_LIGHT": {"roughness": 0.9},
    "MAT_METAL_DARK": {"roughness": 0.58, "metallic": 0.28},
}


DESTINATIONS = (
    {
        "key": "Quay_Xa_Giao",
        "label": "Quầy Xã Giao",
        "offset": (-7.4, -5.2),
        # Local +Y faces toward the courtyard at this southwest position.
        "rotation": math.radians(-55),
        "form": "box",
        "color": (0.68, 0.28, 0.14, 1.0),
    },
    {
        "key": "Ong_Dia",
        "label": "Ông Địa",
        "offset": (-7.2, 4.8),
        "rotation": math.radians(9),
        "form": "cylinder",
        "color": (0.78, 0.49, 0.16, 1.0),
    },
    {
        "key": "Xin_Xam",
        "label": "Xin Xăm",
        "offset": (3.8, 7.4),
        "rotation": math.radians(-7),
        "form": "box",
        "color": (0.58, 0.25, 0.36, 1.0),
    },
    {
        "key": "Hoi_Cho_Neo",
        "label": "Hỏi Chợ Neo",
        "offset": (8.2, 1.1),
        "rotation": math.radians(16),
        "form": "box",
        "color": (0.16, 0.43, 0.42, 1.0),
    },
    {
        "key": "Meo_Vat",
        "label": "Mẹo Vặt",
        "offset": (6.5, -6.0),
        "rotation": math.radians(-18),
        "form": "cylinder",
        "color": (0.30, 0.37, 0.62, 1.0),
    },
)


def ensure_expected_master_is_open():
    """Fail rather than editing an unexpected Blender file."""

    current_path = os.path.abspath(bpy.data.filepath) if bpy.data.filepath else ""
    allowed_paths = {
        os.path.abspath(MASTER_BLEND_PATH),
        os.path.abspath(BLOCKOUT_BLEND_PATH),
    }
    if current_path not in allowed_paths:
        raise RuntimeError(
            "Open ChoNeo_Master.blend before running this script. "
            "Current file: {!r}".format(current_path or "<unsaved Blender file>")
        )


def find_courtyard():
    courtyard = bpy.data.objects.get("COURTYARD_CENTER")
    if courtyard is None:
        raise RuntimeError("Required existing object COURTYARD_CENTER was not found.")
    return courtyard


def find_existing_ground():
    exact_ground = bpy.data.objects.get("GROUND_ChoNeo")
    if exact_ground is not None:
        return exact_ground

    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and "ground" in obj.name.lower():
            return obj

    return None


def snapshot_scene_anchors():
    """Capture only stable names/coordinates before generated collections rebuild."""

    courtyard = find_courtyard()
    courtyard_name = courtyard.name
    courtyard_center = courtyard.matrix_world.translation.copy()
    ground = find_existing_ground()
    ground_name = ground.name if ground is not None else None
    return courtyard_name, courtyard_center, ground_name


def get_or_create_blockout_collection():
    collection = bpy.data.collections.get(BLOCKOUT_COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(BLOCKOUT_COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    collection.hide_render = False
    collection.hide_viewport = False
    return collection


def get_or_create_quay_collection():
    collection = bpy.data.collections.get(QUAY_COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(QUAY_COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    collection.hide_render = False
    collection.hide_viewport = False
    return collection


def get_or_create_ong_dia_collection():
    collection = bpy.data.collections.get(ONG_DIA_COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(ONG_DIA_COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    collection.hide_render = False
    collection.hide_viewport = False
    return collection


def get_or_create_xin_xam_collection():
    collection = bpy.data.collections.get(XIN_XAM_COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(XIN_XAM_COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    collection.hide_render = False
    collection.hide_viewport = False
    return collection


def get_or_create_hoi_cho_neo_collection():
    collection = bpy.data.collections.get(HOI_CHO_NEO_COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(HOI_CHO_NEO_COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    collection.hide_render = False
    collection.hide_viewport = False
    return collection


def get_or_create_meo_vat_collection():
    collection = bpy.data.collections.get(MEO_VAT_COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(MEO_VAT_COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    collection.hide_render = False
    collection.hide_viewport = False
    return collection


def get_or_create_environment_collection():
    collection = bpy.data.collections.get(ENVIRONMENT_COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(ENVIRONMENT_COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    collection.hide_render = False
    collection.hide_viewport = False
    return collection


def get_or_create_lighting_collection():
    collection = bpy.data.collections.get(LIGHTING_COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(LIGHTING_COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)

    for obj in list(collection.objects):
        light_data = obj.data if obj.type == "LIGHT" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if light_data is not None and light_data.users == 0:
            bpy.data.lights.remove(light_data)

    collection.hide_render = False
    collection.hide_viewport = False
    return collection


def get_or_create_material(key, color):
    palette_name = MATERIAL_KEY_TO_PALETTE.get(
        key, key if key in MATERIAL_PALETTE else None
    )
    material_name = palette_name or "CHO_NEO_BLOCKOUT_MAT__{}".format(key)
    material = bpy.data.materials.get(material_name)
    if material is None and palette_name:
        legacy_name = "CHO_NEO_BLOCKOUT_MAT__{}".format(key)
        material = bpy.data.materials.get(legacy_name)
        if material is not None:
            material.name = material_name
    if material is None:
        material = bpy.data.materials.new(material_name)

    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is not None:
        palette_color, roughness = MATERIAL_PALETTE.get(
            palette_name, (color, 0.88)
        )
        principled.inputs["Base Color"].default_value = palette_color
        surface_settings = MATERIAL_SURFACE_SETTINGS.get(palette_name, {})
        principled.inputs["Roughness"].default_value = surface_settings.get(
            "roughness", roughness
        )
        if "Metallic" in principled.inputs:
            principled.inputs["Metallic"].default_value = surface_settings.get(
                "metallic", 0.0
            )
    return material


def ensure_palette_materials():
    for material_name, (color, _roughness) in MATERIAL_PALETTE.items():
        get_or_create_material(material_name, color)


def assign_material(obj, material):
    """Replace an object's material slots with one shared, GLB-safe material."""

    if obj.type != "MESH":
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)


def apply_phase1_material_dressing(courtyard_name, ground_name):
    """Apply a restrained shared material language without changing geometry.

    This final pass deliberately works from generated object names and fresh
    collection iteration. It keeps the Phase 4/5 spatial composition intact
    while making the civic ground hierarchy and pavilion construction read at
    first-person distance.
    """

    materials = {
        name: get_or_create_material(name, MATERIAL_PALETTE[name][0])
        for name in MATERIAL_PALETTE
    }

    def use(object_name, material_name):
        """Resolve the current datablock immediately before touching it."""

        if not object_name:
            return
        obj = bpy.data.objects.get(object_name)
        if obj is None or obj.type != "MESH":
            return
        assign_material(obj, materials[material_name])

    use(courtyard_name, "MAT_STONE_WARM")
    use(ground_name, "MAT_PLAZA_PAVING")

    generated_collection_names = (
        QUAY_COLLECTION_NAME,
        ONG_DIA_COLLECTION_NAME,
        XIN_XAM_COLLECTION_NAME,
        HOI_CHO_NEO_COLLECTION_NAME,
        MEO_VAT_COLLECTION_NAME,
        ENVIRONMENT_COLLECTION_NAME,
    )

    for collection_name in generated_collection_names:
        collection = bpy.data.collections.get(collection_name)
        if collection is None:
            continue
        object_names = [obj.name for obj in list(collection.objects)]
        for object_name in object_names:
            obj = bpy.data.objects.get(object_name)
            if obj is None:
                continue
            if obj.type != "MESH":
                continue

            name = obj.name.upper()
            material_name = None

            if collection_name == ENVIRONMENT_COLLECTION_NAME:
                if name.startswith("ENV_PATH_MAIN") or name.startswith("ENV_PHO_CHO"):
                    material_name = "MAT_PROMENADE_PAVING"
                elif name.startswith("ENV_PATH_LOOP"):
                    material_name = "MAT_LOOP_PAVING"
                elif name.startswith("ENV_PATH_BRANCH"):
                    material_name = "MAT_BRANCH_PAVING"
                elif "PLAZA_TILE" in name or "PAVING_DETAIL" in name:
                    material_name = "MAT_PAVING_INLAY"
                elif name.startswith("ENV_PLAZA"):
                    material_name = "MAT_PLAZA_PAVING"
                elif "SOIL" in name or "PLANTER_" in name or "PLANT_BED" in name:
                    material_name = "MAT_SOIL"
                elif "PLANT" in name or "SHRUB" in name or "BAMBOO" in name or "GROUNDCOVER" in name:
                    # Keep the deliberate dark/mid/light material variation
                    # assigned by the environment builder.
                    material_name = None
                elif "LEAF" in name or "FOLIAGE" in name or "FROND" in name:
                    material_name = "MAT_PLANT_GREEN_MID"
                elif "TRUNK" in name or "STEM" in name:
                    material_name = "MAT_TIMBER_DARK"
                elif "LIGHT" in name or "LANTERN" in name or "BOLLARD" in name:
                    material_name = "MAT_METAL_DARK"
                elif "HORIZON" in name or "MOUNTAIN" in name:
                    material_name = "MAT_COASTAL_HORIZON"
                elif "CENTER_PLANTER" in name or "EDGE" in name:
                    material_name = "MAT_STONE_WARM"

            else:
                # All five destinations share a family language, with their
                # existing panels/screens retaining their quiet identity.
                if "ROOF" in name or "EAVE" in name:
                    material_name = "MAT_CLAY_TILE" if "EDGE" not in name and "EAVE" not in name else "MAT_CLAY_EDGE"
                elif any(token in name for token in ("COLUMN", "POST", "BEAM", "SLAT")):
                    material_name = "MAT_TIMBER_DARK" if any(
                        token in name for token in ("COLUMN", "POST")
                    ) else "MAT_TIMBER_MID"
                elif any(token in name for token in ("BASE", "FLOOR", "PLATFORM", "PLINTH")):
                    material_name = "MAT_FOUNDATION_DARK" if "BASE" in name or "PLINTH" in name else "MAT_STONE_WARM"
                elif any(token in name for token in ("PANEL", "WALL", "BACKDROP", "SCREEN")):
                    material_name = (
                        "MAT_PLASTER_CREAM"
                        if collection_name in (XIN_XAM_COLLECTION_NAME, ONG_DIA_COLLECTION_NAME)
                        else "MAT_SCREEN_JADE"
                    )
                elif any(token in name for token in ("COUNTER", "TABLE", "SHELF", "BENCH", "CABINET", "SUPPORT")):
                    material_name = "MAT_TIMBER_MID"
                elif "TOOL" in name:
                    material_name = "MAT_METAL_DARK"
                elif "BOTTLE" in name:
                    material_name = "MAT_SCREEN_JADE"
                elif "TRAY" in name or "PROP" in name:
                    material_name = "MAT_STONE_WARM"

            if material_name is not None:
                use(object_name, material_name)

    print("Phase 1 material dressing applied to generated surfaces.")


def move_to_collection(obj, collection):
    for old_collection in list(obj.users_collection):
        old_collection.objects.unlink(obj)
    collection.objects.link(obj)


def finish_mesh(obj, name, material, collection, rotation_euler=(0.0, 0.0, 0.0)):
    obj.name = name
    obj.rotation_euler = rotation_euler
    move_to_collection(obj, collection)
    obj.data.materials.append(material)
    return obj


def add_box(name, location, dimensions, material, collection, rotation_euler=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.object
    obj.dimensions = dimensions
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, name, material, collection, rotation_euler)


def add_cube(name, location, dimensions, material, collection, rotation_z=0.0):
    return add_box(
        name,
        location,
        dimensions,
        material,
        collection,
        (0.0, 0.0, rotation_z),
    )


def add_cylinder(name, location, radius, depth, material, collection, rotation_z=0.0):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=10,
        radius=radius,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    return finish_mesh(obj, name, material, collection, (0.0, 0.0, rotation_z))


def add_tapered_cylinder(name, location, radius, depth, material, collection, rotation_z=0.0):
    """Add a lightly tapered faceted trunk without increasing object count."""

    bpy.ops.mesh.primitive_cone_add(
        vertices=10,
        radius1=radius * 1.12,
        radius2=radius * 0.76,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    return finish_mesh(obj, name, material, collection, (0.0, 0.0, rotation_z))


def add_torus(name, location, major_radius, minor_radius, material, collection):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=24,
        minor_segments=6,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
    )
    obj = bpy.context.object
    return finish_mesh(obj, name, material, collection)


def add_cone(name, location, radius, depth, material, collection, rotation_z=0.0):
    bpy.ops.mesh.primitive_cone_add(
        vertices=4,
        radius1=radius,
        radius2=0.0,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    return finish_mesh(
        obj,
        name,
        material,
        collection,
        (0.0, 0.0, rotation_z + math.radians(45)),
    )


def add_uv_sphere(name, location, radius, material, collection, scale=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=8,
        ring_count=4,
        radius=radius,
        location=location,
    )
    obj = bpy.context.object
    if scale is not None:
        obj.scale = scale
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, name, material, collection)


def get_or_create_asset_mesh(name, vertices, faces):
    """Create one reusable low-poly mesh datablock for linked environment assets."""

    mesh = bpy.data.meshes.get(name)
    if mesh is None:
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        for polygon in mesh.polygons:
            polygon.use_smooth = False
    return mesh


def add_linked_mesh(
    name,
    mesh,
    location,
    material,
    collection,
    scale=(1.0, 1.0, 1.0),
    rotation_euler=(0.0, 0.0, 0.0),
):
    """Add an object that reuses an existing mesh datablock."""

    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = location
    obj.scale = scale
    obj.rotation_euler = rotation_euler
    material_index = next(
        (index for index, slot in enumerate(obj.data.materials) if slot and slot.name == material.name),
        None,
    )
    if material_index is None:
        obj.data.materials.append(material)
        material_index = len(obj.data.materials) - 1
    obj.active_material_index = material_index
    return obj


def get_or_create_leaf_cluster_mesh(name, vertical_bias=1.0, silhouette="A"):
    """Build three separated low-poly foliage lobes in one reusable mesh.

    Keeping the lobes in one mesh preserves the existing tree object count while
    breaking the solid umbrella silhouette and leaving glimpses of branches.
    """

    mesh = bpy.data.meshes.get(name)
    if mesh is not None:
        return mesh

    segments = 6
    profiles = {
        # Broad coastal form with an open lower shoulder.
        "A": (
            (-0.42, -0.08, -0.10, 0.62, 0.50, 0.42),
            (0.28, 0.12, 0.08, 0.56, 0.46, 0.38),
            (-0.04, 0.38, 0.22, 0.46, 0.38, 0.35),
        ),
        # Slightly taller, narrower secondary species.
        "B": (
            (-0.34, 0.08, -0.06, 0.54, 0.48, 0.44),
            (0.34, -0.14, 0.12, 0.50, 0.42, 0.40),
            (-0.10, 0.32, 0.28, 0.42, 0.36, 0.34),
        ),
        # Wider asymmetrical species with a raised rear lobe.
        "C": (
            (-0.44, -0.10, -0.08, 0.64, 0.48, 0.38),
            (0.30, 0.16, 0.06, 0.54, 0.48, 0.36),
            (-0.18, 0.38, 0.24, 0.44, 0.36, 0.32),
        ),
    }
    lobe_specs = profiles.get(silhouette, profiles["A"])
    ring_radii = (1.0, 0.86, 1.08, 0.92, 1.04, 0.88)
    vertices = []
    faces = []
    for center_x, center_y, center_z, radius_x, radius_y, radius_z in lobe_specs:
        bottom_index = len(vertices)
        vertices.append((center_x, center_y, center_z - (radius_z * 0.48)))
        ring_starts = []
        for ring_z, ring_scale_x, ring_scale_y in (
            (-0.18, 0.82, 0.68),
            (0.16 * vertical_bias, 1.0, 0.78),
        ):
            ring_starts.append(len(vertices))
            for index in range(segments):
                angle = (2.0 * math.pi * index) / segments
                radius = ring_radii[index]
                vertices.append(
                    (
                        center_x + (math.cos(angle) * radius_x * ring_scale_x * radius),
                        center_y + (math.sin(angle) * radius_y * ring_scale_y * radius),
                        center_z + (ring_z * radius_z),
                    )
                )
        top_index = len(vertices)
        vertices.append((center_x + (0.12 * radius_x), center_y - (0.05 * radius_y), center_z + (0.52 * radius_z * vertical_bias)))
        for index in range(segments):
            next_index = (index + 1) % segments
            faces.append((bottom_index, ring_starts[0] + next_index, ring_starts[0] + index))
            faces.extend(
                (
                    (ring_starts[0] + index, ring_starts[1] + index, ring_starts[1] + next_index),
                    (ring_starts[0] + index, ring_starts[1] + next_index, ring_starts[0] + next_index),
                )
            )
            faces.append((ring_starts[1] + index, top_index, ring_starts[1] + next_index))
    mesh = get_or_create_asset_mesh(name, vertices, faces)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return mesh


def get_or_create_groundcover_mesh(name):
    """Build one reusable low-profile three-lobed planting mass."""

    mesh = bpy.data.meshes.get(name)
    if mesh is not None:
        return mesh

    segments = 6
    lobe_specs = (
        (-0.38, -0.02, 0.42, 0.29, 0.22),
        (0.02, 0.12, 0.52, 0.34, 0.28),
        (0.38, -0.10, 0.38, 0.27, 0.23),
    )
    vertices = []
    faces = []
    for center_x, center_y, radius_x, radius_y, height in lobe_specs:
        bottom_index = len(vertices)
        vertices.append((center_x, center_y, 0.0))
        ring_start = len(vertices)
        for index in range(segments):
            angle = (2.0 * math.pi * index) / segments
            vertices.append(
                (
                    center_x + math.cos(angle) * radius_x,
                    center_y + math.sin(angle) * radius_y,
                    0.01 + (height * (0.48 + (0.10 * math.sin(angle + 0.6)))),
                )
            )
        top_index = len(vertices)
        vertices.append((center_x + 0.04, center_y - 0.02, height))
        for index in range(segments):
            next_index = (index + 1) % segments
            faces.append((bottom_index, ring_start + next_index, ring_start + index))
            faces.append((ring_start + index, ring_start + next_index, top_index))

    return get_or_create_asset_mesh(name, vertices, faces)


def get_or_create_landscape_field_mesh(name):
    """Build a shallow chamfered landscape field with softened corners."""

    mesh = bpy.data.meshes.get(name)
    if mesh is not None:
        return mesh

    outline = (
        (-0.50, -0.28),
        (-0.34, -0.50),
        (0.34, -0.48),
        (0.50, -0.25),
        (0.45, 0.32),
        (0.24, 0.50),
        (-0.34, 0.46),
        (-0.50, 0.24),
    )
    vertices = [(x, y, 0.0) for x, y in outline]
    vertices.extend((x, y, 0.04) for x, y in outline)
    faces = [tuple(range(7, -1, -1)), tuple(range(8, 16))]
    for index in range(8):
        next_index = (index + 1) % 8
        faces.append((index, next_index, 8 + next_index, 8 + index))
    return get_or_create_asset_mesh(name, vertices, faces)


def get_or_create_site_substrate_mesh(name):
    """Create one shallow connected ground field beneath the inner district."""

    mesh = bpy.data.meshes.get(name)
    if mesh is not None:
        return mesh

    outline = (
        (-16.0, -12.0),
        (-12.0, -15.0),
        (-2.0, -15.8),
        (8.0, -14.8),
        (16.5, -10.0),
        (18.0, -2.0),
        (17.0, 6.0),
        (13.5, 13.0),
        (5.0, 15.5),
        (-4.0, 15.2),
        (-12.5, 13.8),
        (-16.5, 7.0),
        (-17.0, -2.0),
    )
    vertices = [(x, y, 0.0) for x, y in outline]
    vertices.extend((x, y, 0.028) for x, y in outline)
    count = len(outline)
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    return get_or_create_asset_mesh(name, vertices, faces)


def get_or_create_leaf_frond_mesh(name):
    """Build a thin, reusable low-poly tropical leaf/frond silhouette."""

    mesh = bpy.data.meshes.get(name)
    if mesh is not None:
        return mesh
    vertices = (
        (-0.12, 0.0, -0.025),
        (0.12, 0.0, 0.025),
        (0.16, 0.56, 0.045),
        (0.08, 1.16, 0.08),
        (0.0, 1.58, 0.0),
        (-0.08, 1.16, -0.08),
        (-0.16, 0.56, -0.045),
    )
    front_faces = (
        (0, 1, 2),
        (0, 2, 6),
        (2, 3, 6),
        (3, 5, 6),
        (3, 4, 5),
    )
    faces = front_faces + tuple(tuple(reversed(face)) for face in front_faces)
    return get_or_create_asset_mesh(name, vertices, faces)


def get_or_create_material_leaf_cluster_mesh(
    base_name, material, vertical_bias=1.0, silhouette="A"
):
    """Reuse a leaf shape while keeping each material variant GLB-safe."""

    return get_or_create_leaf_cluster_mesh(
        "{}__{}__{}".format(base_name, material.name, silhouette),
        vertical_bias,
        silhouette,
    )


def get_or_create_material_groundcover_mesh(base_name, material):
    """Reuse the low-profile planting mass for each shared material variant."""

    return get_or_create_groundcover_mesh(
        "{}__{}".format(base_name, material.name)
    )


def get_or_create_material_landscape_field_mesh(base_name, material):
    """Reuse softened field geometry for each shared material variant."""

    return get_or_create_landscape_field_mesh(
        "{}__{}".format(base_name, material.name)
    )


def get_or_create_material_leaf_frond_mesh(base_name, material):
    """Reuse a frond shape while keeping each material variant GLB-safe."""

    return get_or_create_leaf_frond_mesh(
        "{}__{}".format(base_name, material.name)
    )


def get_or_create_mountain_ridge_mesh(name, profile, depth):
    """Create a broad, extruded low-poly ridge silhouette for the far horizon."""

    mesh = bpy.data.meshes.get(name)
    if mesh is not None:
        return mesh

    front_top = []
    back_top = []
    front_bottom = []
    back_bottom = []
    vertices = []
    for x, height in profile:
        front_bottom.append(len(vertices))
        vertices.append((x, -depth * 0.5, 0.0))
        front_top.append(len(vertices))
        vertices.append((x, -depth * 0.5, height))
        back_bottom.append(len(vertices))
        vertices.append((x, depth * 0.5, 0.0))
        back_top.append(len(vertices))
        vertices.append((x, depth * 0.5, height))

    faces = []
    for index in range(len(profile) - 1):
        next_index = index + 1
        faces.extend(
            (
                (
                    front_bottom[index],
                    front_bottom[next_index],
                    front_top[next_index],
                    front_top[index],
                ),
                (
                    back_bottom[next_index],
                    back_bottom[index],
                    back_top[index],
                    back_top[next_index],
                ),
                (
                    front_top[index],
                    front_top[next_index],
                    back_top[next_index],
                    back_top[index],
                ),
                (
                    front_bottom[next_index],
                    front_bottom[index],
                    back_bottom[index],
                    back_bottom[next_index],
                ),
            )
        )
    faces.extend(
        (
            (
                front_bottom[0],
                front_top[0],
                back_top[0],
                back_bottom[0],
            ),
            (
                front_bottom[-1],
                back_bottom[-1],
                back_top[-1],
                front_top[-1],
            ),
        )
    )
    return get_or_create_asset_mesh(name, vertices, faces)


def add_cylinder_between(name, start, end, radius, material, collection):
    """Add a faceted branch aligned between two world-space points."""

    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    length = direction.length
    if length <= 0.0:
        raise ValueError("Branch {} has zero length.".format(name))
    midpoint = (start_vector + end_vector) * 0.5
    rotation = direction.to_track_quat("Z", "Y").to_euler()
    bpy.ops.mesh.primitive_cone_add(
        vertices=6,
        radius1=radius * 1.10,
        radius2=radius * 0.55,
        depth=length,
        location=midpoint,
    )
    obj = bpy.context.object
    return finish_mesh(obj, name, material, collection, rotation)


def add_roof_tile_rhythm(box, name_prefix, half_width, length, center_z, slope, material, rows=3):
    """Add a few shallow tile ribs without changing an existing roof footprint."""

    for side in (-1, 1):
        for row in range(1, rows + 1):
            fraction = row / float(rows + 1)
            local_x = side * half_width * fraction
            box(
                "Roof_Tile_Rib_{}_{}".format("L" if side < 0 else "R", row),
                local_x,
                0.0,
                center_z + (0.035 * row),
                (0.07, length, 0.055),
                material,
                roll=side * slope,
            )


def create_path_segment(name, start, end, width, material, collection, height=0.08):
    """Create a lightweight, oriented rectangular walking-path segment."""

    start_x, start_y = start
    end_x, end_y = end
    delta_x = end_x - start_x
    delta_y = end_y - start_y
    length = math.hypot(delta_x, delta_y)
    if length <= 0.0:
        raise ValueError("Path segment {} has zero length.".format(name))

    midpoint = ((start_x + end_x) * 0.5, (start_y + end_y) * 0.5, height * 0.5)
    angle = math.atan2(delta_y, delta_x)
    return add_box(
        name,
        midpoint,
        (length, width, height),
        material,
        collection,
        (0.0, 0.0, angle),
    )


def create_environment_tree(
    collection,
    name_prefix,
    x,
    y,
    scale,
    trunk_material,
    leaf_material,
    base_z=0.0,
    canopy_materials=None,
    variant="A",
):
    """Create a reusable stylized-realistic tropical shade tree."""

    add_tapered_cylinder(
        "{}_Trunk".format(name_prefix),
        (x, y, base_z + (0.88 * scale)),
        0.20 * scale,
        1.76 * scale,
        trunk_material,
        collection,
    )
    branch_material = trunk_material
    branch_specs = (
        ((0.0, 0.0, 1.15), (-0.62, 0.10, 2.02), 0.085),
        ((0.0, 0.0, 1.06), (0.56, -0.12, 1.96), 0.08),
        ((-0.12, 0.03, 1.52), (0.08, 0.52, 2.24), 0.065),
    )
    if variant == "B":
        branch_specs = (
            ((0.0, 0.0, 1.10), (-0.50, -0.20, 2.12), 0.085),
            ((0.0, 0.0, 1.22), (0.70, 0.18, 1.90), 0.075),
            ((0.14, 0.02, 1.48), (-0.12, 0.58, 2.30), 0.06),
        )
    elif variant == "C":
        branch_specs = (
            ((0.0, 0.0, 1.08), (-0.72, -0.16, 1.88), 0.08),
            ((0.0, 0.0, 1.20), (0.42, 0.30, 2.16), 0.075),
            ((-0.10, 0.02, 1.42), (-0.02, -0.62, 2.34), 0.06),
        )
    for index, (start, end, radius) in enumerate(branch_specs, start=1):
        add_cylinder_between(
            "{}_Branch_{:02d}".format(name_prefix, index),
            (x + start[0] * scale, y + start[1] * scale, base_z + start[2] * scale),
            (x + end[0] * scale, y + end[1] * scale, base_z + end[2] * scale),
            radius * scale,
            branch_material,
            collection,
        )

    if variant == "B":
        canopy_locations = (
            ((x - 0.42 * scale, y - 0.04 * scale, base_z + (2.08 * scale)), 0.86, (1.22, 0.80, 0.80)),
            ((x + 0.48 * scale, y + 0.12 * scale, base_z + (2.18 * scale)), 0.74, (1.02, 1.08, 0.76)),
            ((x - 0.04 * scale, y + 0.44 * scale, base_z + (2.42 * scale)), 0.66, (1.18, 0.78, 0.72)),
            ((x + 0.12 * scale, y - 0.38 * scale, base_z + (2.30 * scale)), 0.56, (1.16, 0.86, 0.68)),
        )
    elif variant == "C":
        canopy_locations = (
            ((x - 0.50 * scale, y - 0.14 * scale, base_z + (2.02 * scale)), 0.80, (1.34, 0.74, 0.76)),
            ((x + 0.38 * scale, y + 0.18 * scale, base_z + (2.18 * scale)), 0.70, (1.02, 1.10, 0.72)),
            ((x - 0.08 * scale, y + 0.50 * scale, base_z + (2.40 * scale)), 0.61, (1.24, 0.78, 0.68)),
            ((x + 0.14 * scale, y - 0.42 * scale, base_z + (2.28 * scale)), 0.53, (1.20, 0.82, 0.62)),
        )
    else:
        canopy_locations = (
            ((x - 0.34 * scale, y + 0.02 * scale, base_z + (2.10 * scale)), 0.84, (1.22, 0.84, 0.78)),
            ((x + 0.48 * scale, y - 0.08 * scale, base_z + (2.16 * scale)), 0.74, (1.08, 1.04, 0.74)),
            ((x + 0.02 * scale, y + 0.46 * scale, base_z + (2.42 * scale)), 0.64, (1.16, 0.82, 0.70)),
            ((x - 0.05 * scale, y - 0.34 * scale, base_z + (2.30 * scale)), 0.54, (1.10, 0.90, 0.66)),
        )
    canopy_materials = canopy_materials or (leaf_material, leaf_material, leaf_material)
    for index, (location, radius, volume_scale) in enumerate(canopy_locations, start=1):
        canopy_material = canopy_materials[(index - 1) % len(canopy_materials)]
        leaf_mesh = get_or_create_material_leaf_cluster_mesh(
            "CHO_NEO_ASSET__TREE_FOLIAGE_LOBE", canopy_material, 1.0, variant
        )
        add_linked_mesh(
            "{}_Canopy_{:02d}".format(name_prefix, index),
            leaf_mesh,
            location,
            canopy_material,
            collection,
            tuple(radius * scale * value for value in volume_scale),
            (0.0, 0.0, math.radians((index * 37) + (ord(variant) - ord("A")) * 19)),
        )


def create_environment_palm_tree(
    collection,
    name_prefix,
    x,
    y,
    scale,
    trunk_material,
    leaf_material,
    base_z=0.0,
):
    """Create one restrained coastal palm silhouette from linked fronds."""

    add_cylinder(
        "{}_Trunk".format(name_prefix),
        (x, y, base_z + (1.15 * scale)),
        0.14 * scale,
        2.3 * scale,
        trunk_material,
        collection,
    )
    frond_angles = (-55.0, -20.0, 18.0, 55.0, 145.0)
    for index, angle_degrees in enumerate(frond_angles, start=1):
        angle = math.radians(angle_degrees)
        frond_material = leaf_material if index % 2 else get_or_create_material(
            "ENV_Leaf_Dark", (0.08, 0.22, 0.07, 1.0)
        )
        frond_mesh = get_or_create_material_leaf_frond_mesh(
            "CHO_NEO_ASSET__PALM_FROND", frond_material
        )
        add_linked_mesh(
            "{}_Frond_{:02d}".format(name_prefix, index),
            frond_mesh,
            (x, y, base_z + (2.25 * scale)),
            frond_material,
            collection,
            (0.85 * scale, 0.92 * scale, 0.85 * scale),
            (math.radians(-12.0), math.radians(8.0), angle),
        )


def create_environment_bench(
    collection,
    name_prefix,
    x,
    y,
    rotation,
    seat_material,
    support_material,
):
    """Create a simple public bench with a readable human-scale profile."""

    add_box(
        "{}_Seat".format(name_prefix),
        (x, y, 0.47),
        (1.65, 0.42, 0.14),
        seat_material,
        collection,
        (0.0, 0.0, rotation),
    )
    for index, local_x in enumerate((-0.56, 0.56), start=1):
        offset_x = (local_x * math.cos(rotation)) - (0.0 * math.sin(rotation))
        offset_y = (local_x * math.sin(rotation)) + (0.0 * math.cos(rotation))
        add_box(
            "{}_Support_{:02d}".format(name_prefix, index),
            (x + offset_x, y + offset_y, 0.25),
            (0.18, 0.34, 0.40),
            support_material,
            collection,
            (0.0, 0.0, rotation),
        )


def create_environment_pot(
    collection,
    name_prefix,
    x,
    y,
    rotation,
    pot_material,
    soil_material,
    plant_material,
    plant_scale=0.36,
    silhouette="A",
):
    """Create one grounded pot and reuse the existing low-poly plant language."""

    bpy.ops.mesh.primitive_cone_add(
        vertices=10,
        radius1=0.28,
        radius2=0.38,
        depth=0.70,
        location=(x, y, 0.35),
    )
    pot = bpy.context.object
    finish_mesh(
        pot,
        "{}_Body".format(name_prefix),
        pot_material,
        collection,
        (0.0, 0.0, rotation),
    )
    add_cylinder(
        "{}_Soil".format(name_prefix),
        (x, y, 0.715),
        0.31,
        0.035,
        soil_material,
        collection,
        rotation,
    )
    add_torus(
        "{}_Rim".format(name_prefix),
        (x, y, 0.73),
        0.36,
        0.045,
        pot_material,
        collection,
    )
    plant_mesh = get_or_create_material_leaf_cluster_mesh(
        "CHO_NEO_ASSET__POTTED_FOLIAGE",
        plant_material,
        0.9,
        silhouette,
    )
    add_linked_mesh(
        "{}_Plant".format(name_prefix),
        plant_mesh,
        (x, y, 0.84),
        plant_material,
        collection,
        (plant_scale, plant_scale, plant_scale),
        (0.0, 0.0, rotation),
    )


def create_environment_fixture(
    collection,
    name_prefix,
    x,
    y,
    body_material,
    warm_material,
):
    """Create one restrained low bollard/lantern silhouette."""

    add_cylinder(
        "{}_Body".format(name_prefix),
        (x, y, 0.42),
        0.085,
        0.84,
        body_material,
        collection,
    )
    add_cylinder(
        "{}_Cap".format(name_prefix),
        (x, y, 0.88),
        0.14,
        0.12,
        body_material,
        collection,
    )
    add_uv_sphere(
        "{}_Glow".format(name_prefix),
        (x, y, 0.98),
        0.075,
        warm_material,
        collection,
        (1.0, 1.0, 0.72),
    )


def finish_light(obj, name, collection):
    obj.name = name
    obj.data.name = "{}_DATA".format(name)
    move_to_collection(obj, collection)
    return obj


def add_point_light(name, location, energy, color, collection, radius=1.2):
    bpy.ops.object.light_add(type="POINT", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.color = color
    light.data.shadow_soft_size = radius
    return finish_light(light, name, collection)


def create_cho_neo_lighting(courtyard_center, collection):
    """Create a restrained late-afternoon/blue-hour Blender lighting pass."""

    sun_location = (
        courtyard_center.x - 8.0,
        courtyard_center.y - 10.0,
        12.0,
    )
    bpy.ops.object.light_add(
        type="SUN",
        location=sun_location,
        rotation=(math.radians(28.0), math.radians(-18.0), math.radians(-35.0)),
    )
    sun = bpy.context.object
    sun.data.energy = 1.25
    sun.data.angle = math.radians(18.0)
    sun.data.color = (1.0, 0.88, 0.72)
    finish_light(sun, "LIGHT_MAIN_SUN", collection)

    warm_color = (1.0, 0.62, 0.34)
    practical_lights = (
        ("LIGHT_QXG_AMBER", (-7.4, -5.2, 3.0), 28.0),
        ("LIGHT_XX_AMBER", (3.8, 7.4, 3.0), 22.0),
        ("LIGHT_HCN_AMBER", (8.2, 1.1, 3.0), 24.0),
        ("LIGHT_MV_AMBER", (6.5, -6.0, 3.0), 22.0),
        ("LIGHT_CENTER_AMBER", (0.4, 0.8, 2.8), 18.0),
    )
    for name, (x, y, z), energy in practical_lights:
        add_point_light(
            name,
            (courtyard_center.x + x, courtyard_center.y + y, z),
            energy,
            warm_color,
            collection,
            1.4,
        )

    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("CHO_NEO_WORLD")
        bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background is not None:
        background.inputs["Color"].default_value = (0.075, 0.12, 0.17, 1.0)
        background.inputs["Strength"].default_value = 0.32


def create_cho_neo_environment(courtyard_center, collection):
    """Create a clustered civic garden with a clear walkable hierarchy."""

    def world_xy(x, y):
        return (courtyard_center.x + x, courtyard_center.y + y)

    main_path_material = get_or_create_material(
        "ENV_Main_Path", (0.62, 0.52, 0.39, 1.0)
    )
    path_material = get_or_create_material("ENV_Path", (0.55, 0.47, 0.37, 1.0))
    plaza_material = get_or_create_material("ENV_Plaza", (0.34, 0.27, 0.20, 1.0))
    plaza_material_alt = get_or_create_material(
        "ENV_Plaza_Alt", (0.55, 0.47, 0.37, 1.0)
    )
    paving_detail_material = get_or_create_material(
        "ENV_Paving_Detail", (0.55, 0.47, 0.37, 1.0)
    )
    stone_material = get_or_create_material("ENV_Stone", (0.38, 0.34, 0.27, 1.0))
    soil_material = get_or_create_material("ENV_Soil", (0.20, 0.12, 0.07, 1.0))
    trunk_material = get_or_create_material("ENV_Trunk", (0.14, 0.075, 0.045, 1.0))
    leaf_material = get_or_create_material("ENV_Leaf", (0.16, 0.34, 0.12, 1.0))
    dark_leaf_material = get_or_create_material(
        "ENV_Leaf_Dark", (0.08, 0.22, 0.07, 1.0)
    )
    bamboo_material = get_or_create_material("ENV_Bamboo", (0.42, 0.48, 0.15, 1.0))
    wood_material = get_or_create_material("ENV_Wood", (0.28, 0.13, 0.07, 1.0))
    light_material = get_or_create_material("ENV_Light", (0.52, 0.28, 0.10, 1.0))
    warm_light_material = get_or_create_material(
        "ENV_Light_Warm", (0.62, 0.30, 0.10, 1.0)
    )

    # A single shallow substrate removes the floating-slab read without
    # changing any path, destination, or planting footprint above it.
    substrate_mesh = get_or_create_site_substrate_mesh(
        "CHO_NEO_ASSET__SITE_SUBSTRATE"
    )
    add_linked_mesh(
        "ENV_SITE_SUBSTRATE",
        substrate_mesh,
        (courtyard_center.x, courtyard_center.y, 0.0),
        plaza_material_alt,
        collection,
    )

    # Main promenade: a broad eastbound exit toward future Phố Chợ. It opens
    # generously from the plaza, then settles into a calm, slightly bent spine.
    main_segments = (
        ((0.0, -1.8), (2.5, -3.0), 5.0),
        ((2.5, -3.0), (5.0, -4.0), 4.8),
        ((5.0, -4.0), (18.0, -4.0), 4.5),
    )
    for index, (start, end, width) in enumerate(main_segments, start=1):
        create_path_segment(
            "ENV_PATH_MAIN_{:02d}".format(index),
            world_xy(*start),
            world_xy(*end),
            width,
            main_path_material,
            collection,
        )

    # Phase 8 continuation: the existing inner-district spine remains fixed;
    # these two segments begin beyond its accepted 30 m context.
    promenade_continuation = (
        ((18.0, -4.0), (24.0, -3.6), 4.2),
        ((24.0, -3.6), (34.0, -3.1), 3.8),
    )
    for index, (start, end, width) in enumerate(promenade_continuation, start=1):
        create_path_segment(
            "ENV_PATH_MAIN_CONTINUATION_{:02d}".format(index),
            world_xy(*start),
            world_xy(*end),
            width,
            main_path_material,
            collection,
        )

    promenade_transition_surfaces = (
        ("ENV_PHO_CHO_PAVING_TRANSITION_01", (19.5, -3.9), (4.5, 4.8), math.radians(-4)),
        ("ENV_PHO_CHO_PAVING_TRANSITION_02", (27.0, -3.4), (7.0, 4.2), math.radians(3)),
    )
    for name, (x, y), dimensions, rotation in promenade_transition_surfaces:
        transition_x, transition_y = world_xy(x, y)
        add_box(
            name,
            (transition_x, transition_y, 0.028),
            (dimensions[0], dimensions[1], 0.05),
            main_path_material,
            collection,
            (0.0, 0.0, rotation),
        )

    # Three connected low-relief paving fields make the inner district read as
    # one plaza while leaving planted edges and the eastbound opening legible.
    plaza_surfaces = (
        ("ENV_PLAZA_MAIN_01", (0.0, 0.6), (10.2, 8.0), math.radians(-2)),
        ("ENV_PLAZA_MAIN_02", (2.7, -3.2), (6.5, 3.2), math.radians(-8)),
        ("ENV_PLAZA_EDGE_WEST", (-5.8, 0.0), (3.0, 9.0), 0.0),
    )
    for name, (x, y), dimensions, rotation in plaza_surfaces:
        plaza_x, plaza_y = world_xy(x, y)
        add_box(
            name,
            (plaza_x, plaza_y, 0.045),
            (dimensions[0], dimensions[1], 0.06),
            plaza_material_alt if name == "ENV_PLAZA_EDGE_WEST" else plaza_material,
            collection,
            (0.0, 0.0, rotation),
        )

    paving_details = (
        ("ENV_PLAZA_TILE_01", (-2.6, 0.0), (1.6, 0.05), math.radians(-2)),
        ("ENV_PLAZA_TILE_02", (1.5, 2.35), (1.2, 0.05), math.radians(18)),
        ("ENV_PLAZA_TILE_03", (-5.8, 2.9), (1.25, 0.05), math.radians(90)),
    )
    for name, (x, y), dimensions, rotation in paving_details:
        detail_x, detail_y = world_xy(x, y)
        add_box(
            name,
            (detail_x, detail_y, 0.085),
            (dimensions[0], dimensions[1], 0.018),
            paving_detail_material,
            collection,
            (0.0, 0.0, rotation),
        )

    # A slower, irregular loop with fewer long segments. The changing offsets
    # and one landscaped side of the plaza keep it from reading as a ring.
    loop_points = (
        (-6.5, -4.4),
        (-3.6, -7.3),
        (4.8, -7.1),
        (8.1, -3.4),
        (8.0, 1.8),
        (5.4, 5.4),
        (1.0, 7.5),
        (-4.8, 6.2),
        (-7.2, 2.0),
        (-7.0, -1.8),
        (-6.5, -4.4),
    )
    for index in range(len(loop_points) - 1):
        create_path_segment(
            "ENV_PATH_LOOP_{:02d}".format(index + 1),
            world_xy(*loop_points[index]),
            world_xy(*loop_points[index + 1]),
            2.2,
            path_material,
            collection,
        )

    destinations_by_key = {destination["key"]: destination for destination in DESTINATIONS}

    def front_approach(key, distance):
        """Return a local world-space point just beyond a pavilion's open +Y side."""

        destination = destinations_by_key[key]
        offset_x, offset_y = destination["offset"]
        rotation = destination["rotation"]
        return (
            offset_x - math.sin(rotation) * distance,
            offset_y + math.cos(rotation) * distance,
        )

    def destination_local_point(key, local_x, local_y):
        """Resolve a small furnishing point in a destination's local frame."""

        destination = destinations_by_key[key]
        offset_x, offset_y = destination["offset"]
        rotation = destination["rotation"]
        return world_xy(
            offset_x + (local_x * math.cos(rotation)) - (local_y * math.sin(rotation)),
            offset_y + (local_x * math.sin(rotation)) + (local_y * math.cos(rotation)),
        )

    def destination_rotation(key):
        return destinations_by_key[key]["rotation"]

    def add_destination_detail_box(
        name,
        key,
        local_x,
        local_y,
        local_z,
        dimensions,
        material,
        pitch=0.0,
        roll=0.0,
    ):
        detail_x, detail_y = destination_local_point(key, local_x, local_y)
        return add_box(
            name,
            (detail_x, detail_y, local_z),
            dimensions,
            material,
            collection,
            (pitch, roll, destination_rotation(key)),
        )

    # Existing branches are retained, but now terminate at each structure's
    # actual open/front edge instead of its center or rear screen.
    branch_segments = (
        ((-6.5, -4.4), front_approach("Quay_Xa_Giao", 2.05)),
        ((-7.2, 2.0), front_approach("Ong_Dia", 1.20)),
        ((5.4, 5.4), front_approach("Xin_Xam", 1.75)),
        ((8.0, 1.8), front_approach("Hoi_Cho_Neo", 1.35)),
        ((4.8, -7.1), front_approach("Meo_Vat", 1.60)),
        ((2.4, -3.8), (1.8, -1.2)),
    )
    for index, (start, end) in enumerate(branch_segments, start=1):
        create_path_segment(
            "ENV_PATH_BRANCH_{:02d}".format(index),
            world_xy(*start),
            world_xy(*end),
            2.5 if index == len(branch_segments) else 1.7,
            path_material,
            collection,
        )

    garden_x = courtyard_center.x + 0.4
    garden_y = courtyard_center.y + 0.8
    add_cylinder(
        "ENV_CENTER_PLANTER_Edge",
        (garden_x, garden_y, 0.18),
        2.25,
        0.42,
        stone_material,
        collection,
    )
    add_cylinder(
        "ENV_CENTER_PLANTER_Soil",
        (garden_x, garden_y, 0.44),
        1.9,
        0.08,
        soil_material,
        collection,
    )
    add_torus(
        "ENV_CENTER_PLANTER_Rim",
        (garden_x, garden_y, 0.49),
        2.12,
        0.13,
        stone_material,
        collection,
    )
    create_environment_tree(
        collection,
        "ENV_TREE_CENTER",
        garden_x,
        garden_y,
        1.0,
        trunk_material,
        dark_leaf_material,
        0.5,
        (dark_leaf_material, leaf_material, bamboo_material),
        "C",
    )

    # Three landscape zones: social shade at Quầy, quiet screening at the
    # western/northern edge, and a low practical edge near Hỏi/Mẹo.
    outer_trees = (
        ("ENV_TREE_SOCIAL_01", -10.6, -5.7, 0.92),
        ("ENV_TREE_SOCIAL_02", -10.8, -9.1, 0.82),
        ("ENV_TREE_QUIET_01", -11.5, 8.8, 0.86),
    )
    for name, x, y, scale in outer_trees:
        tree_x, tree_y = world_xy(x, y)
        if "QUIET" in name:
            create_environment_palm_tree(
                collection,
                name,
                tree_x,
                tree_y,
                scale,
                trunk_material,
                leaf_material,
            )
        else:
            create_environment_tree(
                collection,
                name,
                tree_x,
                tree_y,
                scale,
                trunk_material,
                leaf_material,
                0.0,
                (dark_leaf_material, leaf_material, bamboo_material),
                "A" if name.endswith("01") else "B",
            )

    # Outer ring context: large, reusable forms soften the inner district
    # without filling the view corridor or changing any destination approach.
    perimeter_trees = (
        ("ENV_PERIMETER_TREE_WEST_01", -13.0, -9.5, 0.78, "C"),
        ("ENV_PERIMETER_TREE_NORTH_01", -12.8, 10.8, 0.82, "B"),
    )
    for name, x, y, scale, variant in perimeter_trees:
        tree_x, tree_y = world_xy(x, y)
        create_environment_tree(
            collection,
            name,
            tree_x,
            tree_y,
            scale,
            trunk_material,
            leaf_material,
            0.0,
            (dark_leaf_material, leaf_material, bamboo_material),
            variant,
        )
    palm_x, palm_y = world_xy(14.2, 9.2)
    create_environment_palm_tree(
        collection,
        "ENV_PERIMETER_PALM_EAST_01",
        palm_x,
        palm_y,
        0.78,
        trunk_material,
        leaf_material,
    )

    planter_locations = (
        ("ENV_PLANTER_01", -9.4, -4.0, 2.2, 0.9, math.radians(-8)),
        ("ENV_PLANTER_02", -9.6, 5.0, 2.4, 1.0, math.radians(10)),
        ("ENV_PLANTER_03", 10.0, 3.7, 1.8, 0.7, math.radians(-12)),
        ("ENV_PLANTER_04", 9.8, -7.1, 1.8, 0.7, math.radians(10)),
    )
    landscape_field_mesh = get_or_create_material_landscape_field_mesh(
        "CHO_NEO_ASSET__LANDSCAPE_FIELD", soil_material
    )
    for name, x, y, length, width, rotation in planter_locations:
        planter_x, planter_y = world_xy(x, y)
        add_linked_mesh(
            name,
            landscape_field_mesh,
            (planter_x, planter_y, 0.0),
            soil_material,
            collection,
            (length, width, 1.0),
            (0.0, 0.0, rotation),
        )

    shrub_materials = (dark_leaf_material, leaf_material, bamboo_material)
    for index, (name, x, y, length, width, rotation) in enumerate(
        planter_locations, start=1
    ):
        planter_x, planter_y = world_xy(x, y)
        cover_material = shrub_materials[(index - 1) % len(shrub_materials)]
        shrub_mesh = get_or_create_material_groundcover_mesh(
            "CHO_NEO_ASSET__BROAD_LEAF_GROUNDCOVER", cover_material
        )
        add_linked_mesh(
            "ENV_PLANT_BED_COVER_{:02d}".format(index),
            shrub_mesh,
            (planter_x, planter_y, 0.07),
            cover_material,
            collection,
            (length * 0.42, width * 0.72, 0.42),
            (0.0, 0.0, rotation),
        )

    shrub_locations = (
        # Central garden: three low plants around the tree base.
        (0.0, 0.1, 0.78, 0.30),
        (0.9, 0.2, 0.78, 0.30),
        (0.2, 1.5, 0.78, 0.28),
        (-0.65, 0.9, 0.76, 0.34),
        (0.75, 1.45, 0.74, 0.34),
        # Social edge: a compact, open cluster beside Quầy.
        (-10.0, -4.1, 0.38, 0.45),
        (-9.2, -5.0, 0.38, 0.42),
        (-10.1, -6.0, 0.38, 0.44),
        # Quiet edge: denser broad-leaf grouping near Ông Địa/Xin Xăm.
        (-9.8, 5.5, 0.38, 0.46),
        (-8.8, 6.3, 0.38, 0.42),
        # Practical edge: low, visible planting near Hỏi/Mẹo.
        (10.0, 3.5, 0.38, 0.40),
        (9.8, -7.3, 0.38, 0.40),
    )
    for index, (x, y, z, radius) in enumerate(shrub_locations, start=1):
        shrub_x, shrub_y = world_xy(x, y)
        shrub_material = dark_leaf_material if index % 3 == 1 else leaf_material
        shrub_mesh = get_or_create_material_groundcover_mesh(
            "CHO_NEO_ASSET__BROAD_LEAF_GROUNDCOVER", shrub_material
        )
        add_linked_mesh(
            "ENV_SHRUB_{:02d}".format(index),
            shrub_mesh,
            (shrub_x, shrub_y, 0.46 if index <= 5 else 0.07),
            shrub_material,
            collection,
            (radius * (1.45 if index % 2 else 1.25), radius * 1.08, radius * 0.78),
        )

    perimeter_bed_locations = (
        ("ENV_PERIMETER_BED_01", -12.3, -6.5, 3.2, 1.7, math.radians(-12)),
        ("ENV_PERIMETER_BED_02", -12.6, 6.1, 3.0, 1.8, math.radians(12)),
        ("ENV_PERIMETER_BED_03", -6.2, 12.5, 5.2, 1.6, math.radians(-4)),
        ("ENV_PERIMETER_BED_04", 2.0, 12.8, 4.8, 1.7, math.radians(7)),
        ("ENV_PERIMETER_BED_05", 10.0, 12.0, 4.2, 1.6, math.radians(-10)),
        ("ENV_PERIMETER_BED_06", 12.8, -10.4, 3.8, 1.8, math.radians(14)),
    )
    for index, (name, x, y, length, width, rotation) in enumerate(
        perimeter_bed_locations, start=1
    ):
        bed_x, bed_y = world_xy(x, y)
        add_linked_mesh(
            name,
            landscape_field_mesh,
            (bed_x, bed_y, 0.0),
            soil_material,
            collection,
            (length, width, 1.0),
            (0.0, 0.0, rotation),
        )
        cover_material = shrub_materials[(index + 1) % len(shrub_materials)]
        cover_mesh = get_or_create_material_groundcover_mesh(
            "CHO_NEO_ASSET__BROAD_LEAF_GROUNDCOVER", cover_material
        )
        add_linked_mesh(
            "ENV_PERIMETER_COVER_{:02d}".format(index),
            cover_mesh,
            (bed_x, bed_y, 0.07),
            cover_material,
            collection,
            (length * 0.40, width * 0.72, 0.48),
            (0.0, 0.0, rotation),
        )

    # Two low planting bands frame the future market approach while keeping
    # the eastbound travel axis open and visually obvious.
    continuation_beds = (
        ("ENV_PHO_CHO_EDGE_BED_01", 21.0, -7.0, 4.0, 1.2, math.radians(-6)),
        ("ENV_PHO_CHO_EDGE_BED_02", 29.0, -6.4, 4.5, 1.2, math.radians(5)),
    )
    for index, (name, x, y, length, width, rotation) in enumerate(
        continuation_beds, start=1
    ):
        bed_x, bed_y = world_xy(x, y)
        add_linked_mesh(
            name,
            landscape_field_mesh,
            (bed_x, bed_y, 0.0),
            soil_material,
            collection,
            (length, width, 1.0),
            (0.0, 0.0, rotation),
        )
        cover_material = leaf_material if index == 1 else dark_leaf_material
        cover_mesh = get_or_create_material_groundcover_mesh(
            "CHO_NEO_ASSET__BROAD_LEAF_GROUNDCOVER", cover_material
        )
        add_linked_mesh(
            "ENV_PHO_CHO_EDGE_COVER_{:02d}".format(index),
            cover_mesh,
            (bed_x, bed_y, 0.07),
            cover_material,
            collection,
            (length * 0.40, width * 0.70, 0.40),
            (0.0, 0.0, rotation),
        )

    perimeter_edge_specs = (
        ("ENV_PERIMETER_EDGE_WEST", -14.25, 0.0, (0.28, 8.0, 0.22), math.radians(3)),
        ("ENV_PERIMETER_EDGE_NORTH_WEST", -7.0, 14.0, (7.0, 0.28, 0.22), math.radians(-4)),
        ("ENV_PERIMETER_EDGE_NORTH_EAST", 7.0, 14.0, (6.5, 0.28, 0.22), math.radians(5)),
        ("ENV_PERIMETER_EDGE_SOUTH_EAST", 13.4, -13.0, (4.0, 0.28, 0.22), math.radians(10)),
    )
    for name, x, y, dimensions, rotation in perimeter_edge_specs:
        edge_x, edge_y = world_xy(x, y)
        add_box(
            name,
            (edge_x, edge_y, 0.11),
            dimensions,
            stone_material,
            collection,
            (0.0, 0.0, rotation),
        )

    # Broad overlapping fields connect the perimeter beds to the existing
    # ground plane. They stay low enough to read as landscape, not platforms.
    perimeter_ground_specs = (
        ("ENV_PERIMETER_GROUND_01", -12.0, 0.0, (4.4, 18.0), math.radians(2)),
        ("ENV_PERIMETER_GROUND_02", -5.0, 13.0, (9.0, 3.2), math.radians(-4)),
        ("ENV_PERIMETER_GROUND_03", 4.5, 13.4, (9.0, 3.0), math.radians(6)),
        ("ENV_PERIMETER_GROUND_04", 12.5, 5.0, (4.0, 10.0), math.radians(-8)),
        ("ENV_PERIMETER_GROUND_05", 24.0, -5.0, (20.0, 5.0), math.radians(2)),
    )
    for name, x, y, dimensions, rotation in perimeter_ground_specs:
        ground_x, ground_y = world_xy(x, y)
        add_box(
            name,
            (ground_x, ground_y, 0.02),
            (dimensions[0], dimensions[1], 0.04),
            plaza_material_alt,
            collection,
            (0.0, 0.0, rotation),
        )

    # Very low placeholders beyond the promenade imply a future market district
    # without introducing destination architecture or closing the expansion view.
    future_mass_specs = (
        ("ENV_FUTURE_PHO_CHO_MASS_01", 27.0, -8.0, (4.5, 3.0, 1.5), math.radians(-6)),
        ("ENV_FUTURE_PHO_CHO_MASS_02", 32.0, 3.2, (4.0, 3.5, 1.2), math.radians(8)),
    )
    for name, x, y, dimensions, rotation in future_mass_specs:
        mass_x, mass_y = world_xy(x, y)
        add_box(
            name,
            (mass_x, mass_y, dimensions[2] * 0.5),
            dimensions,
            plaza_material_alt,
            collection,
            (0.0, 0.0, rotation),
        )

    # Distant layered ridge silhouettes replace the previous nearby pyramid
    # forms. They are wide, asymmetric, and deliberately subordinate.
    horizon_material = get_or_create_material(
        "ENV_Horizon", (0.16, 0.25, 0.28, 1.0)
    )
    far_horizon_material = get_or_create_material(
        "ENV_Horizon_Far", (0.12, 0.20, 0.24, 1.0)
    )
    near_ridge_mesh = get_or_create_mountain_ridge_mesh(
        "CHO_NEO_ASSET__COASTAL_RIDGE_NEAR",
        (
            (-13.0, 0.0),
            (-10.0, 1.0),
            (-7.0, 0.35),
            (-3.0, 1.85),
            (0.0, 0.58),
            (3.5, 1.18),
            (7.0, 0.25),
            (10.0, 1.55),
            (13.0, 0.55),
            (16.0, 0.0),
        ),
        1.8,
    )
    far_ridge_mesh = get_or_create_mountain_ridge_mesh(
        "CHO_NEO_ASSET__COASTAL_RIDGE_FAR",
        (
            (-15.0, 0.0),
            (-10.5, 0.65),
            (-6.0, 0.2),
            (-1.5, 1.1),
            (3.0, 0.42),
            (7.5, 0.9),
            (12.0, 0.3),
            (16.0, 0.75),
            (19.0, 0.0),
        ),
        2.0,
    )
    ridge_x, ridge_y = world_xy(1.0, 29.0)
    add_linked_mesh(
        "ENV_COASTAL_HORIZON_NEAR",
        near_ridge_mesh,
        (ridge_x, ridge_y, 0.0),
        horizon_material,
        collection,
    )
    far_ridge_x, far_ridge_y = world_xy(2.5, 33.0)
    add_linked_mesh(
        "ENV_COASTAL_HORIZON_FAR",
        far_ridge_mesh,
        (far_ridge_x, far_ridge_y, 0.0),
        far_horizon_material,
        collection,
    )

    bamboo_clusters = (
        (-10.4, 6.8),
        (1.8, 8.5),
    )
    for cluster_index, (x, y) in enumerate(bamboo_clusters, start=1):
        cluster_x, cluster_y = world_xy(x, y)
        stalk_specs = (
            (-0.28, 0.0, 1.38),
            (-0.14, 0.12, 1.62),
            (0.0, -0.02, 1.50),
            (0.16, 0.1, 1.72),
            (0.3, -0.05, 1.42),
        )
        for stalk_index, (dx, dy, height) in enumerate(
            stalk_specs,
            start=1,
        ):
            add_cylinder(
                "ENV_BAMBOO_{:02d}_{:02d}".format(cluster_index, stalk_index),
                (cluster_x + dx, cluster_y + dy, height * 0.5),
                0.05,
                height,
                bamboo_material,
                collection,
            )
        dark_frond_mesh = get_or_create_material_leaf_frond_mesh(
            "CHO_NEO_ASSET__BAMBOO_LEAF", dark_leaf_material
        )
        mid_frond_mesh = get_or_create_material_leaf_frond_mesh(
            "CHO_NEO_ASSET__BAMBOO_LEAF", leaf_material
        )
        light_frond_mesh = get_or_create_material_leaf_frond_mesh(
            "CHO_NEO_ASSET__BAMBOO_LEAF", bamboo_material
        )
        add_linked_mesh(
            "ENV_BAMBOO_{:02d}_LEAF".format(cluster_index),
            dark_frond_mesh,
            (cluster_x - 0.02, cluster_y + 0.06, 1.28),
            dark_leaf_material,
            collection,
            (0.54, 0.48, 0.54),
            (math.radians(-18.0), math.radians(8.0), math.radians(-32.0)),
        )
        add_linked_mesh(
            "ENV_BAMBOO_{:02d}_LEAF_02".format(cluster_index),
            mid_frond_mesh,
            (cluster_x + 0.20, cluster_y - 0.08, 1.05),
            leaf_material,
            collection,
            (0.42, 0.38, 0.44),
            (math.radians(-28.0), math.radians(-5.0), math.radians(28.0)),
        )
        add_linked_mesh(
            "ENV_BAMBOO_{:02d}_LEAF_03".format(cluster_index),
            light_frond_mesh,
            (cluster_x - 0.18, cluster_y + 0.16, 1.12),
            bamboo_material,
            collection,
            (0.38, 0.34, 0.40),
            (math.radians(-22.0), math.radians(12.0), math.radians(150.0)),
        )

    # Five quiet stopping points sit beside the loop and garden edges. None
    # occupies the eastbound promenade or a destination's front approach.
    bench_locations = (
        ("ENV_BENCH_01", -5.4, -6.7, math.radians(18), wood_material, stone_material),
        ("ENV_BENCH_02", 0.4, 7.8, math.radians(8), wood_material, stone_material),
        ("ENV_BENCH_03", 5.8, 4.4, math.radians(-18), wood_material, wood_material),
        ("ENV_BENCH_04", -9.1, 1.5, math.radians(85), stone_material, stone_material),
        ("ENV_BENCH_05", 7.2, -7.8, math.radians(18), wood_material, stone_material),
    )
    for name, x, y, rotation, seat_material, support_material in bench_locations:
        bench_x, bench_y = world_xy(x, y)
        create_environment_bench(
            collection,
            name,
            bench_x,
            bench_y,
            rotation,
            seat_material,
            support_material,
        )

    # A restrained ring of grounded pots gives selected entrances a lived-in
    # threshold without turning the paths into a decorative obstacle course.
    dark_pot_material = get_or_create_material(
        "MAT_FOUNDATION_DARK", (0.19, 0.145, 0.11, 1.0)
    )
    terracotta_pot_material = get_or_create_material(
        "MAT_CLAY_TILE_LIGHT", (0.42, 0.13, 0.065, 1.0)
    )
    pot_specs = (
        ("ENV_POT_01", "Quay_Xa_Giao", -2.55, 1.65, math.radians(-8), terracotta_pot_material, leaf_material, "A"),
        ("ENV_POT_02", "Quay_Xa_Giao", 2.55, 1.65, math.radians(8), dark_pot_material, dark_leaf_material, "B"),
        ("ENV_POT_03", "Ong_Dia", 1.65, 0.95, math.radians(12), stone_material, bamboo_material, "C"),
        ("ENV_POT_04", "Xin_Xam", -2.25, 1.50, math.radians(-10), stone_material, leaf_material, "B"),
        ("ENV_POT_05", "Hoi_Cho_Neo", 1.85, 1.20, math.radians(10), dark_pot_material, bamboo_material, "A"),
        ("ENV_POT_06", "Meo_Vat", -1.85, 0.20, math.radians(-12), terracotta_pot_material, dark_leaf_material, "C"),
    )
    for name, destination_key, local_x, local_y, rotation, pot_material, plant_material, silhouette in pot_specs:
        pot_x, pot_y = destination_local_point(destination_key, local_x, local_y)
        create_environment_pot(
            collection,
            name,
            pot_x,
            pot_y,
            rotation,
            pot_material,
            soil_material,
            plant_material,
            0.34,
            silhouette,
        )

    # Small threshold strips ground selected entrances without extending or
    # rerouting any existing branch path. The Mẹo strip stays to the side of
    # its pavilion so the eastbound Phố Chợ view remains open.
    entry_grounding_specs = (
        ("ENV_DETAIL_ENTRY_QXG", "Quay_Xa_Giao", 0.0, 2.02, 0.06, (1.80, 0.38, 0.08)),
        ("ENV_DETAIL_ENTRY_OD", "Ong_Dia", 0.0, 1.12, 0.05, (1.10, 0.30, 0.06)),
        ("ENV_DETAIL_ENTRY_XX", "Xin_Xam", 0.0, 1.78, 0.06, (1.55, 0.36, 0.08)),
        ("ENV_DETAIL_ENTRY_HCN", "Hoi_Cho_Neo", 0.0, 1.42, 0.06, (1.35, 0.32, 0.08)),
        ("ENV_DETAIL_ENTRY_MV_SIDE", "Meo_Vat", -1.85, 0.20, 0.05, (0.52, 0.68, 0.06)),
    )
    for name, destination_key, local_x, local_y, local_z, dimensions in entry_grounding_specs:
        add_destination_detail_box(
            name,
            destination_key,
            local_x,
            local_y,
            local_z,
            dimensions,
            stone_material,
        )

    # Four modest fixtures mark stopping points while keeping the existing
    # ambient lighting solution and destination interactions unchanged.
    fixture_specs = (
        ("ENV_DETAIL_FIXTURE_01", "Quay_Xa_Giao", -2.65, 1.20),
        ("ENV_DETAIL_FIXTURE_02", "Ong_Dia", 1.65, 0.78),
        ("ENV_DETAIL_FIXTURE_03", "Hoi_Cho_Neo", 1.92, 0.62),
        ("ENV_DETAIL_FIXTURE_04", "Meo_Vat", 2.05, 0.20),
    )
    for name, destination_key, local_x, local_y in fixture_specs:
        fixture_x, fixture_y = destination_local_point(destination_key, local_x, local_y)
        create_environment_fixture(
            collection,
            name,
            fixture_x,
            fixture_y,
            light_material,
            warm_light_material,
        )

    # Low-cost timber joinery sits just below existing pavilion beams. These
    # are small brackets/blocks inside the accepted architecture footprint.
    joinery_specs = (
        ("ENV_DETAIL_JOINERY_QXG_L", "Quay_Xa_Giao", -2.05, 1.32, 2.96, (0.28, 0.20, 0.36)),
        ("ENV_DETAIL_JOINERY_QXG_R", "Quay_Xa_Giao", 2.05, 1.32, 2.96, (0.28, 0.20, 0.36)),
        ("ENV_DETAIL_JOINERY_OD_L", "Ong_Dia", -0.80, 0.42, 1.78, (0.18, 0.16, 0.28)),
        ("ENV_DETAIL_JOINERY_OD_R", "Ong_Dia", 0.80, 0.42, 1.78, (0.18, 0.16, 0.28)),
        ("ENV_DETAIL_JOINERY_XX_L", "Xin_Xam", -1.68, 1.00, 2.54, (0.24, 0.18, 0.34)),
        ("ENV_DETAIL_JOINERY_XX_R", "Xin_Xam", 1.68, 1.00, 2.54, (0.24, 0.18, 0.34)),
        ("ENV_DETAIL_JOINERY_HCN_L", "Hoi_Cho_Neo", -1.32, 0.80, 2.35, (0.22, 0.18, 0.32)),
        ("ENV_DETAIL_JOINERY_HCN_R", "Hoi_Cho_Neo", 1.32, 0.80, 2.35, (0.22, 0.18, 0.32)),
        ("ENV_DETAIL_JOINERY_MV_L", "Meo_Vat", -1.50, 0.00, 2.35, (0.22, 0.18, 0.32)),
        ("ENV_DETAIL_JOINERY_MV_R", "Meo_Vat", 1.50, 0.92, 2.35, (0.22, 0.18, 0.32)),
    )
    for name, destination_key, local_x, local_y, local_z, dimensions in joinery_specs:
        add_destination_detail_box(
            name,
            destination_key,
            local_x,
            local_y,
            local_z,
            dimensions,
            wood_material,
        )

    # A few useful ledges add hand-scale function without adding new rooms or
    # changing the existing pavilion counters and shelves.
    shelf_specs = (
        ("ENV_DETAIL_COUNTER_QXG", "Quay_Xa_Giao", 0.0, -1.20, 1.05, (1.80, 0.26, 0.12), wood_material),
        ("ENV_DETAIL_SHELF_XX", "Xin_Xam", -0.72, -0.96, 1.56, (0.92, 0.22, 0.12), wood_material),
        ("ENV_DETAIL_COUNTER_MV", "Meo_Vat", -0.78, 0.35, 1.30, (0.72, 0.30, 0.12), stone_material),
    )
    for name, destination_key, local_x, local_y, local_z, dimensions, material in shelf_specs:
        add_destination_detail_box(
            name,
            destination_key,
            local_x,
            local_y,
            local_z,
            dimensions,
            material,
        )

    # Unlettered timber sign frames provide a quiet threshold cue without
    # introducing readable UI, signage clutter, or blocking panels.
    sign_frame_specs = (
        ("ENV_DETAIL_SIGNFRAME_QXG", "Quay_Xa_Giao", 1.55, 2.06),
        ("ENV_DETAIL_SIGNFRAME_OD", "Ong_Dia", 0.92, 1.18),
        ("ENV_DETAIL_SIGNFRAME_XX", "Xin_Xam", 1.42, 1.82),
        ("ENV_DETAIL_SIGNFRAME_HCN", "Hoi_Cho_Neo", 1.20, 1.46),
        ("ENV_DETAIL_SIGNFRAME_MV", "Meo_Vat", 1.18, 0.55),
    )
    for name, destination_key, width, local_y in sign_frame_specs:
        for side, suffix in ((-1.0, "L"), (1.0, "R")):
            add_destination_detail_box(
                "{}_POST_{}".format(name, suffix),
                destination_key,
                side * (width * 0.5),
                local_y,
                0.88,
                (0.12, 0.12, 1.76),
                wood_material,
            )
        add_destination_detail_box(
            "{}_HEADER".format(name),
            destination_key,
            0.0,
            local_y,
            1.78,
            (width + 0.12, 0.12, 0.12),
            wood_material,
        )

    # Five tiny, destination-specific cues finish the hand-scale read without
    # adding avatars, mechanics, readable signs, or decorative clutter.
    prop_specs = (
        ("ENV_DETAIL_PROP_QXG_TRAY", "Quay_Xa_Giao", 0.0, 0.0, 0.84, (0.46, 0.28, 0.08), stone_material),
        ("ENV_DETAIL_PROP_OD_PLATE", "Ong_Dia", 0.48, 0.38, 1.82, (0.26, 0.22, 0.06), stone_material),
        ("ENV_DETAIL_PROP_XX_PAPER", "Xin_Xam", 0.58, 0.05, 1.20, (0.42, 0.26, 0.08), wood_material),
        ("ENV_DETAIL_PROP_HCN_BLOCK", "Hoi_Cho_Neo", 0.62, 0.10, 1.24, (0.34, 0.24, 0.08), stone_material),
        ("ENV_DETAIL_PROP_MV_CADDY", "Meo_Vat", -0.64, 0.36, 1.25, (0.38, 0.28, 0.12), wood_material),
    )
    for name, destination_key, local_x, local_y, local_z, dimensions, material in prop_specs:
        add_destination_detail_box(
            name,
            destination_key,
            local_x,
            local_y,
            local_z,
            dimensions,
            material,
        )

    light_locations = (
        (-5.3, -5.8),
        (2.4, 0.6),
        (8.8, 2.5),
        (2.8, -6.1),
    )
    for index, (x, y) in enumerate(light_locations, start=1):
        light_x, light_y = world_xy(x, y)
        add_cylinder(
            "ENV_LIGHT_{:02d}_BODY".format(index),
            (light_x, light_y, 0.42),
            0.12,
            1.02,
            light_material,
            collection,
        )
        add_cylinder(
            "ENV_LIGHT_{:02d}_HOUSING".format(index),
            (light_x, light_y, 1.08),
            0.20,
            0.24,
            warm_light_material,
            collection,
        )


def create_quay_xa_giao_pavilion(destination, courtyard_center, collection):
    """Create an open-sided social pavilion facing the central courtyard."""

    offset_x, offset_y = destination["offset"]
    rotation = destination["rotation"]
    center = Vector((courtyard_center.x + offset_x, courtyard_center.y + offset_y, 0.0))
    cos_rotation = math.cos(rotation)
    sin_rotation = math.sin(rotation)

    def point(local_x, local_y, local_z):
        return (
            center.x + (local_x * cos_rotation) - (local_y * sin_rotation),
            center.y + (local_x * sin_rotation) + (local_y * cos_rotation),
            local_z,
        )

    def box(name, local_x, local_y, local_z, dimensions, material, pitch=0.0, roll=0.0):
        return add_box(
            "{}{}".format(QXG_PREFIX, name),
            point(local_x, local_y, local_z),
            dimensions,
            material,
            collection,
            (pitch, roll, rotation),
        )

    floor_material = get_or_create_material("Quay_Floor", (0.50, 0.25, 0.14, 1.0))
    timber_material = get_or_create_material("Quay_Aged_Wood", (0.14, 0.075, 0.045, 1.0))
    beam_material = get_or_create_material("Quay_Beam_Wood", (0.19, 0.10, 0.055, 1.0))
    roof_material = get_or_create_material("Quay_Clay_Roof", (0.42, 0.12, 0.065, 1.0))
    roof_edge_material = get_or_create_material(
        "Quay_Clay_Edge", (0.27, 0.065, 0.03, 1.0)
    )
    ridge_material = get_or_create_material("MAT_TIMBER_HIGHLIGHT", (0.25, 0.135, 0.072, 1.0))
    tile_detail_material = get_or_create_material("MAT_CLAY_TILE_LIGHT", (0.42, 0.13, 0.065, 1.0))
    seating_material = get_or_create_material("Quay_Seating", (0.28, 0.13, 0.07, 1.0))
    stone_material = get_or_create_material("Quay_Stone", (0.38, 0.34, 0.27, 1.0))

    # Warm raised floor, with a small social focal platform toward the rear.
    box("Floor", 0.0, 0.0, 0.16, (4.9, 3.9, 0.30), floor_material)
    box("Social_Platform", 0.0, -0.55, 0.39, (2.2, 1.15, 0.20), stone_material)

    # Four open-sided timber posts leave the courtyard-facing edge unobstructed.
    for index, (local_x, local_y) in enumerate(
        ((-2.05, -1.42), (2.05, -1.42), (-2.05, 1.42), (2.05, 1.42)),
        start=1,
    ):
        box("Timber_Column_{:02d}".format(index), local_x, local_y, 1.72, (0.24, 0.24, 3.2), timber_material)

    # Exposed beams and a simple gable roof keep the pavilion airy and legible.
    box("Beam_Back", 0.0, -1.42, 3.2, (4.35, 0.24, 0.24), beam_material)
    box("Beam_Front", 0.0, 1.42, 3.2, (4.35, 0.24, 0.24), beam_material)
    box("Beam_Left", -2.05, 0.0, 3.2, (0.24, 3.05, 0.24), beam_material)
    box("Beam_Right", 2.05, 0.0, 3.2, (0.24, 3.05, 0.24), beam_material)
    box("Roof_Panel_Left", -1.03, 0.0, 3.53, (2.65, 3.55, 0.14), roof_material, roll=-0.24)
    box("Roof_Panel_Right", 1.03, 0.0, 3.53, (2.65, 3.55, 0.14), roof_material, roll=0.24)
    box("Roof_Ridge", 0.0, 0.0, 3.88, (0.34, 3.7, 0.30), ridge_material)
    box("Roof_Eave_Left", -2.08, 0.0, 3.2, (0.18, 3.65, 0.24), roof_edge_material)
    box("Roof_Eave_Right", 2.08, 0.0, 3.2, (0.18, 3.65, 0.24), roof_edge_material)
    add_roof_tile_rhythm(
        box, "Roof", 1.05, 3.55, 3.56, 0.24, tile_detail_material, rows=3
    )

    # Minimal gathering layout: two benches and one low communal table.
    box("Bench_Left", 0.0, -1.02, 0.53, (1.55, 0.38, 0.42), seating_material)
    box("Bench_Right", 0.0, 1.02, 0.53, (1.55, 0.38, 0.42), seating_material)
    add_cylinder(
        "{}Table".format(QXG_PREFIX),
        point(0.0, 0.0, 0.62),
        0.5,
        0.34,
        stone_material,
        collection,
        rotation,
    )


def create_ong_dia_shrine(destination, courtyard_center, collection):
    """Create a compact, quiet Ông Địa protective corner beside the path."""

    offset_x, offset_y = destination["offset"]
    rotation = destination["rotation"]
    center = Vector((courtyard_center.x + offset_x, courtyard_center.y + offset_y, 0.0))
    cos_rotation = math.cos(rotation)
    sin_rotation = math.sin(rotation)

    def point(local_x, local_y, local_z):
        return (
            center.x + (local_x * cos_rotation) - (local_y * sin_rotation),
            center.y + (local_x * sin_rotation) + (local_y * cos_rotation),
            local_z,
        )

    def box(name, local_x, local_y, local_z, dimensions, material, pitch=0.0, roll=0.0):
        return add_box(
            "{}{}".format(OD_PREFIX, name),
            point(local_x, local_y, local_z),
            dimensions,
            material,
            collection,
            (pitch, roll, rotation),
        )

    stone_material = get_or_create_material("OD_Stone", (0.38, 0.34, 0.27, 1.0))
    plaster_material = get_or_create_material("OD_Plaster", (0.62, 0.50, 0.38, 1.0))
    wood_material = get_or_create_material("OD_Wood", (0.14, 0.075, 0.045, 1.0))
    roof_material = get_or_create_material("OD_Clay_Roof", (0.38, 0.105, 0.055, 1.0))
    roof_edge_material = get_or_create_material(
        "OD_Clay_Edge", (0.27, 0.065, 0.03, 1.0)
    )
    ridge_material = get_or_create_material("MAT_TIMBER_HIGHLIGHT", (0.25, 0.135, 0.072, 1.0))
    tile_detail_material = get_or_create_material("MAT_CLAY_TILE_LIGHT", (0.42, 0.13, 0.065, 1.0))

    # V1.1: a lower, more body-led silhouette for a modest path-side shrine.
    box("BASE_Plinth", 0.0, 0.0, 0.16, (2.7, 2.0, 0.32), stone_material)
    box("ALTAR_Cabinet", 0.0, -0.18, 0.86, (2.15, 1.1, 1.22), wood_material)
    box("ALTAR_BackPanel", 0.0, -0.7, 1.06, (2.25, 0.18, 1.42), plaster_material)
    box("SHELF_Altar", 0.0, 0.2, 1.48, (2.3, 0.84, 0.16), stone_material)

    # Supports stay close to the altar body; the rear backing does the enclosing.
    for index, (local_x, local_y) in enumerate(
        ((-0.8, -0.45), (0.8, -0.45), (-0.8, 0.45), (0.8, 0.45)),
        start=1,
    ):
        box("POST_{:02d}".format(index), local_x, local_y, 1.22, (0.16, 0.16, 1.85), wood_material)

    # Smaller shallow canopy: protective cap, not a separate pavilion roof.
    box("ROOF_Panel_Left", -0.47, 0.0, 2.08, (1.15, 1.55, 0.1), roof_material, roll=-0.18)
    box("ROOF_Panel_Right", 0.47, 0.0, 2.08, (1.15, 1.55, 0.1), roof_material, roll=0.18)
    box("ROOF_Ridge", 0.0, 0.0, 2.27, (0.20, 1.68, 0.18), ridge_material)
    box("ROOF_Eave_Left", -0.93, 0.0, 1.96, (0.12, 1.7, 0.16), roof_edge_material)
    box("ROOF_Eave_Right", 0.93, 0.0, 1.96, (0.12, 1.7, 0.16), roof_edge_material)
    add_roof_tile_rhythm(
        box, "ROOF", 0.47, 1.48, 2.10, 0.18, tile_detail_material, rows=2
    )

    # Lightweight offerings: deliberately abstract and statue-free.
    box("PROP_FocalBlock", 0.0, 0.23, 1.72, (0.42, 0.32, 0.34), plaster_material)
    add_cylinder(
        "{}PROP_TeaBowl".format(OD_PREFIX),
        point(-0.52, 0.25, 1.54),
        0.14,
        0.08,
        stone_material,
        collection,
        rotation,
    )
    add_cylinder(
        "{}PROP_Vase".format(OD_PREFIX),
        point(0.0, 0.25, 1.64),
        0.11,
        0.24,
        plaster_material,
        collection,
        rotation,
    )
    fruit_material = get_or_create_material("OD_Fruit", (0.62, 0.18, 0.08, 1.0))
    for index, local_x in enumerate((-0.18, 0.18, 0.0), start=1):
        add_uv_sphere(
            "{}PROP_Fruit_{:02d}".format(OD_PREFIX, index),
            point(local_x, 0.38, 1.61 if index < 3 else 1.7),
            0.1,
            fruit_material,
            collection,
        )


def create_xin_xam_pavilion(destination, courtyard_center, collection):
    """Create a quiet, open-sided Xin Xăm reflection pavilion."""

    offset_x, offset_y = destination["offset"]
    rotation = destination["rotation"]
    center = Vector((courtyard_center.x + offset_x, courtyard_center.y + offset_y, 0.0))
    cos_rotation = math.cos(rotation)
    sin_rotation = math.sin(rotation)

    def point(local_x, local_y, local_z):
        return (
            center.x + (local_x * cos_rotation) - (local_y * sin_rotation),
            center.y + (local_x * sin_rotation) + (local_y * cos_rotation),
            local_z,
        )

    def box(name, local_x, local_y, local_z, dimensions, material, pitch=0.0, roll=0.0):
        return add_box(
            "{}{}".format(XX_PREFIX, name),
            point(local_x, local_y, local_z),
            dimensions,
            material,
            collection,
            (pitch, roll, rotation),
        )

    stone_material = get_or_create_material("XX_Stone", (0.38, 0.34, 0.27, 1.0))
    wood_material = get_or_create_material("XX_Wood", (0.14, 0.075, 0.045, 1.0))
    post_material = get_or_create_material("XX_Post_Wood", (0.12, 0.065, 0.035, 1.0))
    beam_material = get_or_create_material("XX_Beam_Wood", (0.19, 0.10, 0.055, 1.0))
    roof_material = get_or_create_material("XX_Clay_Roof", (0.38, 0.105, 0.055, 1.0))
    roof_edge_material = get_or_create_material(
        "XX_Clay_Edge", (0.27, 0.065, 0.03, 1.0)
    )
    ridge_material = get_or_create_material("MAT_TIMBER_HIGHLIGHT", (0.25, 0.135, 0.072, 1.0))
    tile_detail_material = get_or_create_material("MAT_CLAY_TILE_LIGHT", (0.42, 0.13, 0.065, 1.0))
    wall_material = get_or_create_material("XX_Backdrop", (0.56, 0.43, 0.33, 1.0))
    holder_material = get_or_create_material("XX_Holder", (0.28, 0.14, 0.07, 1.0))
    stick_material = get_or_create_material("XX_Stick", (0.54, 0.32, 0.16, 1.0))

    # Modest platform with open edges and a partial rear backdrop.
    box("BASE_Platform", 0.0, 0.0, 0.12, (4.1, 3.25, 0.24), stone_material)
    box("WALL_Backdrop", 0.0, -1.16, 1.36, (2.65, 0.12, 1.28), wall_material)

    for index, (local_x, local_y) in enumerate(
        ((-1.68, -1.08), (1.68, -1.08), (-1.68, 1.08), (1.68, 1.08)),
        start=1,
    ):
        box("POST_{:02d}".format(index), local_x, local_y, 1.45, (0.22, 0.22, 2.7), post_material)

    # Exposed timber frame; the front and sides stay visually open.
    box("BEAM_Back", 0.0, -1.08, 2.78, (3.75, 0.24, 0.24), beam_material)
    box("BEAM_Front", 0.0, 1.08, 2.78, (3.75, 0.24, 0.24), beam_material)
    box("BEAM_Left", -1.68, 0.0, 2.78, (0.24, 2.35, 0.24), beam_material)
    box("BEAM_Right", 1.68, 0.0, 2.78, (0.24, 2.35, 0.24), beam_material)

    # Restrained gable roof: architectural shelter, not a temple mass.
    box("ROOF_Panel_Left", -0.9, 0.0, 3.1, (2.15, 2.7, 0.14), roof_material, roll=-0.22)
    box("ROOF_Panel_Right", 0.9, 0.0, 3.1, (2.15, 2.7, 0.14), roof_material, roll=0.22)
    box("ROOF_Ridge", 0.0, 0.0, 3.43, (0.26, 2.85, 0.24), ridge_material)
    box("ROOF_Eave_Left", -1.82, 0.0, 2.76, (0.14, 2.9, 0.18), roof_edge_material)
    box("ROOF_Eave_Right", 1.82, 0.0, 2.76, (0.14, 2.9, 0.18), roof_edge_material)
    add_roof_tile_rhythm(
        box, "ROOF", 0.9, 2.7, 3.14, 0.22, tile_detail_material, rows=2
    )

    # One central stand, one quiet seat, and a compact abstract xin xăm holder.
    box("TABLE_Top", 0.0, 0.0, 1.06, (1.8, 0.9, 0.16), wood_material)
    box("TABLE_Pedestal", 0.0, 0.0, 0.57, (0.4, 0.4, 0.86), wood_material)
    box("BENCH_01", 0.0, 0.72, 0.43, (1.45, 0.38, 0.38), wood_material)
    add_cylinder(
        "{}HOLDER_Cup".format(XX_PREFIX),
        point(0.0, 0.08, 1.29),
        0.22,
        0.42,
        holder_material,
        collection,
        rotation,
    )

    # Five thin, unmarked sticks provide the xin xăm focal silhouette.
    for index, local_x in enumerate((-0.13, -0.065, 0.0, 0.065, 0.13), start=1):
        box(
            "STICK_{:02d}".format(index),
            local_x,
            0.08,
            1.76,
            (0.035, 0.035, 0.86),
            stick_material,
            roll=(index - 3) * 0.045,
        )


def create_hoi_cho_neo_pavilion(destination, courtyard_center, collection):
    """Create a compact, open orientation and help pavilion."""

    offset_x, offset_y = destination["offset"]
    rotation = destination["rotation"]
    center = Vector((courtyard_center.x + offset_x, courtyard_center.y + offset_y, 0.0))
    cos_rotation = math.cos(rotation)
    sin_rotation = math.sin(rotation)

    def point(local_x, local_y, local_z):
        return (
            center.x + (local_x * cos_rotation) - (local_y * sin_rotation),
            center.y + (local_x * sin_rotation) + (local_y * cos_rotation),
            local_z,
        )

    def box(name, local_x, local_y, local_z, dimensions, material, pitch=0.0, roll=0.0):
        return add_box(
            "{}{}".format(HCN_PREFIX, name),
            point(local_x, local_y, local_z),
            dimensions,
            material,
            collection,
            (pitch, roll, rotation),
        )

    stone_material = get_or_create_material("HCN_Stone", (0.38, 0.34, 0.27, 1.0))
    wood_material = get_or_create_material("HCN_Wood", (0.14, 0.075, 0.045, 1.0))
    post_material = get_or_create_material("HCN_Post_Wood", (0.12, 0.065, 0.035, 1.0))
    beam_material = get_or_create_material("HCN_Beam_Wood", (0.19, 0.10, 0.055, 1.0))
    roof_material = get_or_create_material("HCN_Clay_Roof", (0.38, 0.105, 0.055, 1.0))
    roof_edge_material = get_or_create_material(
        "HCN_Clay_Edge", (0.27, 0.065, 0.03, 1.0)
    )
    tile_detail_material = get_or_create_material("MAT_CLAY_TILE_LIGHT", (0.42, 0.13, 0.065, 1.0))
    panel_material = get_or_create_material("HCN_Panel", (0.28, 0.40, 0.38, 1.0))

    # Compact raised platform with a clear front approach.
    box("BASE_Platform", 0.0, 0.0, 0.11, (3.2, 2.5, 0.22), stone_material)
    box("PANEL_Back", 0.0, -0.9, 1.28, (2.55, 0.16, 1.9), panel_material)

    # Three supports leave the front and one side open for circulation.
    for index, (local_x, local_y) in enumerate(
        ((-1.32, -0.88), (1.32, -0.88), (1.32, 0.88)),
        start=1,
    ):
        box("POST_{:02d}".format(index), local_x, local_y, 1.3, (0.2, 0.2, 2.45), post_material)

    box("BEAM_Back", 0.0, -0.88, 2.58, (2.95, 0.22, 0.22), beam_material)
    box("BEAM_Right", 1.32, 0.0, 2.58, (0.22, 1.95, 0.22), beam_material)
    box("BEAM_Front", 0.0, 0.88, 2.58, (2.95, 0.22, 0.22), beam_material)

    # A shallow slightly asymmetric canopy keeps the help point light and civic.
    box("ROOF_Canopy", 0.12, 0.0, 2.86, (3.15, 2.35, 0.18), roof_material, roll=-0.1)
    box("ROOF_Eave", -1.45, 0.0, 2.67, (0.14, 2.45, 0.18), roof_edge_material)
    add_roof_tile_rhythm(
        box, "ROOF", 1.35, 2.2, 2.91, 0.10, tile_detail_material, rows=2
    )

    # Compact standing counter and a narrow side bench; no signage or screens.
    box("COUNTER_Base", 0.0, 0.06, 0.58, (1.9, 0.54, 0.9), wood_material)
    box("COUNTER_Top", 0.0, 0.08, 1.08, (2.1, 0.68, 0.16), stone_material)
    box("BENCH_Side", -1.02, 0.26, 0.38, (0.42, 1.1, 0.34), wood_material)


def create_meo_vat_pavilion(destination, courtyard_center, collection):
    """Create a compact open workshop for practical nail-profession tips."""

    offset_x, offset_y = destination["offset"]
    rotation = destination["rotation"]
    center = Vector((courtyard_center.x + offset_x, courtyard_center.y + offset_y, 0.0))
    cos_rotation = math.cos(rotation)
    sin_rotation = math.sin(rotation)

    def point(local_x, local_y, local_z):
        return (
            center.x + (local_x * cos_rotation) - (local_y * sin_rotation),
            center.y + (local_x * sin_rotation) + (local_y * cos_rotation),
            local_z,
        )

    def box(name, local_x, local_y, local_z, dimensions, material, pitch=0.0, roll=0.0):
        return add_box(
            "{}{}".format(MV_PREFIX, name),
            point(local_x, local_y, local_z),
            dimensions,
            material,
            collection,
            (pitch, roll, rotation),
        )

    stone_material = get_or_create_material("MV_Stone", (0.38, 0.34, 0.27, 1.0))
    wood_material = get_or_create_material("MV_Wood", (0.14, 0.075, 0.045, 1.0))
    post_material = get_or_create_material("MV_Post_Wood", (0.12, 0.065, 0.035, 1.0))
    beam_material = get_or_create_material("MV_Beam_Wood", (0.19, 0.10, 0.055, 1.0))
    roof_material = get_or_create_material("MV_Clay_Roof", (0.38, 0.105, 0.055, 1.0))
    roof_edge_material = get_or_create_material(
        "MV_Clay_Edge", (0.27, 0.065, 0.03, 1.0)
    )
    ridge_material = get_or_create_material("MAT_TIMBER_HIGHLIGHT", (0.25, 0.135, 0.072, 1.0))
    tile_detail_material = get_or_create_material("MAT_CLAY_TILE_LIGHT", (0.42, 0.13, 0.065, 1.0))
    panel_material = get_or_create_material("MV_Pegboard", (0.32, 0.40, 0.36, 1.0))
    bottle_material = get_or_create_material("MV_Bottle", (0.18, 0.38, 0.42, 1.0))
    tool_material = get_or_create_material("MV_Tool", (0.52, 0.3, 0.14, 1.0))

    # A modest raised workshop platform with open approach on the front side.
    box("BASE_Platform", 0.0, 0.0, 0.11, (3.7, 3.0, 0.22), stone_material)

    for index, (local_x, local_y) in enumerate(
        ((-1.5, -1.0), (1.5, -1.0), (-1.5, 1.0), (1.5, 1.0)),
        start=1,
    ):
        box("POST_{:02d}".format(index), local_x, local_y, 1.3, (0.2, 0.2, 2.45), post_material)

    box("BEAM_Back", 0.0, -1.0, 2.58, (3.35, 0.22, 0.22), beam_material)
    box("BEAM_Front", 0.0, 1.0, 2.58, (3.35, 0.22, 0.22), beam_material)
    box("BEAM_Left", -1.5, 0.0, 2.58, (0.22, 2.2, 0.22), beam_material)
    box("BEAM_Right", 1.5, 0.0, 2.58, (0.22, 2.2, 0.22), beam_material)

    box("ROOF_Panel_Left", -0.82, 0.0, 2.92, (1.95, 2.45, 0.14), roof_material, roll=-0.2)
    box("ROOF_Panel_Right", 0.82, 0.0, 2.92, (1.95, 2.45, 0.14), roof_material, roll=0.2)
    box("ROOF_Ridge", 0.0, 0.0, 3.24, (0.24, 2.6, 0.24), ridge_material)
    box("ROOF_Eave_Left", -1.68, 0.0, 2.6, (0.14, 2.65, 0.18), roof_edge_material)
    box("ROOF_Eave_Right", 1.68, 0.0, 2.6, (0.14, 2.65, 0.18), roof_edge_material)
    add_roof_tile_rhythm(
        box, "ROOF", 0.82, 2.45, 2.96, 0.20, tile_detail_material, rows=3
    )

    # The table is the focal point; the rear wall reads as a practical tool board.
    box("TABLE_Top", 0.0, 0.05, 1.05, (2.35, 1.1, 0.18), wood_material)
    box("TABLE_Support", 0.0, 0.05, 0.58, (0.48, 0.48, 0.86), wood_material)
    box("PANEL_Back", 0.0, -0.92, 1.58, (2.85, 0.16, 1.78), panel_material)
    for index, local_x in enumerate((-0.9, 0.0, 0.9), start=1):
        box("PANEL_Slat_{:02d}".format(index), local_x, -0.82, 1.55, (0.12, 0.16, 1.45), wood_material)
    box("SHELF_Side", -1.22, -0.35, 1.48, (0.62, 1.05, 0.14), wood_material)

    # Minimal symbolic tool station: bottles, tools, and one organizer tray.
    for index, local_x in enumerate((-0.7, -0.35, 0.0), start=1):
        add_cylinder(
            "{}BOTTLE_{:02d}".format(MV_PREFIX, index),
            point(local_x, 0.1, 1.24),
            0.11,
            0.32,
            bottle_material,
            collection,
            rotation,
        )
    for index, local_x in enumerate((0.35, 0.55, 0.75), start=1):
        box(
            "TOOL_{:02d}".format(index),
            local_x,
            0.1,
            1.38,
            (0.05, 0.05, 0.62),
            tool_material,
            roll=(index - 2) * 0.08,
        )
    box("TRAY_Organizer", 0.0, 0.42, 1.15, (0.85, 0.5, 0.1), stone_material)
    add_cylinder(
        "{}STOOL_01".format(MV_PREFIX),
        point(1.12, 0.48, 0.35),
        0.25,
        0.38,
        wood_material,
        collection,
        rotation,
    )


def create_generic_destination_placeholder(destination, courtyard_center, collection):
    if destination["key"] in {"Quay_Xa_Giao", "Ong_Dia", "Xin_Xam", "Hoi_Cho_Neo", "Meo_Vat"}:
        raise RuntimeError(
            "All five Chợ Neo destinations must use dedicated builders, not the generic placeholder builder."
        )

    key = destination["key"]
    label = destination["label"]
    offset_x, offset_y = destination["offset"]
    rotation = destination["rotation"]
    center = Vector((courtyard_center.x + offset_x, courtyard_center.y + offset_y, 0.0))
    material = get_or_create_material(key, destination["color"])
    roof_material = get_or_create_material("Roof", (0.18, 0.12, 0.10, 1.0))
    plinth_material = get_or_create_material("Plinth", (0.36, 0.25, 0.18, 1.0))

    name_prefix = "{}DESTINATION__{}".format(GENERATED_PREFIX, label)

    add_cube(
        "{}__Plinth".format(name_prefix),
        (center.x, center.y, 0.125),
        (3.0, 2.4, 0.25),
        plinth_material,
        collection,
        rotation,
    )

    if destination["form"] == "cylinder":
        add_cylinder(
            "{}__Body".format(name_prefix),
            (center.x, center.y, 1.25),
            1.05,
            2.25,
            material,
            collection,
            rotation,
        )
    else:
        add_cube(
            "{}__Body".format(name_prefix),
            (center.x, center.y, 1.25),
            (2.25, 1.75, 2.25),
            material,
            collection,
            rotation,
        )

    add_cone(
        "{}__Roof".format(name_prefix),
        (center.x, center.y, 2.82),
        1.72,
        0.78,
        roof_material,
        collection,
        rotation,
    )


def gltf_export_supports_lights():
    try:
        operator_type = bpy.ops.export_scene.gltf.get_rna_type()
    except (AttributeError, RuntimeError):
        return False
    return any(
        getattr(prop, "identifier", "") == "export_lights"
        for prop in operator_type.properties
    )


def select_environment_meshes_for_export(
    courtyard_name,
    ground_name,
    collection_names,
    lighting_collection_name=None,
    export_lights=False,
):
    bpy.ops.object.select_all(action="DESELECT")
    candidate_names = []

    if bpy.data.objects.get(courtyard_name) is None:
        raise RuntimeError(
            "Required courtyard object {!r} was not available for GLB export.".format(
                courtyard_name
            )
        )
    candidate_names.append(courtyard_name)

    if ground_name:
        if bpy.data.objects.get(ground_name) is not None:
            candidate_names.append(ground_name)

    for collection_name in collection_names:
        collection = bpy.data.collections.get(collection_name)
        if collection is not None:
            candidate_names.extend(obj.name for obj in collection.objects)

    if lighting_collection_name is not None and export_lights:
        lighting_collection = bpy.data.collections.get(lighting_collection_name)
        if lighting_collection is not None:
            candidate_names.extend(obj.name for obj in lighting_collection.objects)

    export_objects = []
    seen_names = set()
    for object_name in candidate_names:
        # Resolve every candidate through the current datablock before touching
        # it. Collection rebuilds can invalidate an Object reference retained
        # from before the rebuild, so export selection carries names only.
        live_obj = bpy.data.objects.get(object_name)
        if live_obj is None or object_name in seen_names:
            continue
        seen_names.add(object_name)
        is_exportable = live_obj.type == "MESH" or (
            export_lights and live_obj.type == "LIGHT"
        )
        if is_exportable and not live_obj.hide_render:
            live_obj.select_set(True)
            export_objects.append(live_obj)

    if not export_objects:
        raise RuntimeError("No mesh objects are available for GLB export.")

    bpy.context.view_layer.objects.active = export_objects[0]


def export_glb(
    courtyard_name,
    ground_name,
    collection_names,
    lighting_collection_name=None,
):
    os.makedirs(os.path.dirname(GLB_EXPORT_PATH), exist_ok=True)
    lighting_collection = (
        bpy.data.collections.get(lighting_collection_name)
        if lighting_collection_name
        else None
    )
    export_lights = (
        lighting_collection is not None and gltf_export_supports_lights()
    )
    select_environment_meshes_for_export(
        courtyard_name,
        ground_name,
        collection_names,
        lighting_collection_name,
        export_lights,
    )
    export_settings = {
        "filepath": GLB_EXPORT_PATH,
        "export_format": "GLB",
        "use_selection": True,
        "export_apply": True,
    }
    if export_lights:
        export_settings["export_lights"] = True
    bpy.ops.export_scene.gltf(**export_settings)
    print("GLB KHR_lights_punctual exported: {}".format(export_lights))


def verify_quay_xa_giao(quay_collection):
    qxg_objects = [obj for obj in quay_collection.objects if obj.name.startswith(QXG_PREFIX)]
    generic_tokens = ("Quay_Xa_Giao", "Quầy Xã Giao")
    generic_objects = [
        obj
        for obj in bpy.context.scene.objects
        if any(token in obj.name for token in generic_tokens)
        and not obj.name.startswith(QXG_PREFIX)
    ]

    collection_exists = bpy.data.collections.get(QUAY_COLLECTION_NAME) is quay_collection
    print("Verification: QUAY_XA_GIAO_V1 exists: {}".format(collection_exists))
    print("Verification: QXG_ objects created: {}".format(len(qxg_objects)))
    print(
        "Verification: generic Quay_Xa_Giao placeholder remains: {}".format(
            bool(generic_objects)
        )
    )

    if not collection_exists:
        raise RuntimeError("QUAY_XA_GIAO_V1 collection was not created.")
    if len(qxg_objects) != EXPECTED_QXG_OBJECT_COUNT:
        raise RuntimeError(
            "Expected {} QXG_ objects, found {}.".format(
                EXPECTED_QXG_OBJECT_COUNT, len(qxg_objects)
            )
        )
    if generic_objects:
        raise RuntimeError(
            "Generic Quầy Xã Giao placeholder objects remain: {}".format(
                ", ".join(obj.name for obj in generic_objects)
            )
        )


def verify_ong_dia(ong_collection):
    od_objects = [obj for obj in ong_collection.objects if obj.name.startswith(OD_PREFIX)]
    generic_tokens = ("Ong_Dia", "Ông Địa")
    generic_objects = [
        obj
        for obj in bpy.context.scene.objects
        if any(token in obj.name for token in generic_tokens)
        and not obj.name.startswith(OD_PREFIX)
    ]
    quay_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(QXG_PREFIX)]

    collection_exists = bpy.data.collections.get(ONG_DIA_COLLECTION_NAME) is ong_collection
    print("Verification: ONG_DIA_V1 exists: {}".format(collection_exists))
    print("Verification: OD_ objects created: {}".format(len(od_objects)))
    print(
        "Verification: generic Ong_Dia placeholder remains: {}".format(
            bool(generic_objects)
        )
    )
    print("Verification: QXG_ objects preserved: {}".format(bool(quay_objects)))

    if not collection_exists:
        raise RuntimeError("ONG_DIA_V1 collection was not created.")
    if not od_objects:
        raise RuntimeError("No OD_ Ông Địa objects were created.")
    if len(od_objects) != EXPECTED_OD_OBJECT_COUNT:
        raise RuntimeError(
            "Expected {} OD_ objects, found {}.".format(
                EXPECTED_OD_OBJECT_COUNT, len(od_objects)
            )
        )
    if generic_objects:
        raise RuntimeError(
            "Generic Ông Địa placeholder objects remain: {}".format(
                ", ".join(obj.name for obj in generic_objects)
            )
        )
    if not quay_objects:
        raise RuntimeError("Quầy Xã Giao QXG_ objects unexpectedly disappeared.")


def verify_xin_xam(xin_collection):
    xx_objects = [obj for obj in xin_collection.objects if obj.name.startswith(XX_PREFIX)]
    generic_tokens = ("Xin_Xam", "Xin Xăm")
    generic_objects = [
        obj
        for obj in bpy.context.scene.objects
        if any(token in obj.name for token in generic_tokens)
        and not obj.name.startswith(XX_PREFIX)
    ]
    quay_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(QXG_PREFIX)]
    ong_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(OD_PREFIX)]

    collection_exists = bpy.data.collections.get(XIN_XAM_COLLECTION_NAME) is xin_collection
    print("Verification: XIN_XAM_V1 exists: {}".format(collection_exists))
    print("Verification: XX_ objects created: {}".format(len(xx_objects)))
    print(
        "Verification: generic Xin_Xam placeholder remains: {}".format(
            bool(generic_objects)
        )
    )
    print("Verification: QXG_ objects preserved: {}".format(bool(quay_objects)))
    print("Verification: OD_ objects preserved: {}".format(bool(ong_objects)))

    if not collection_exists:
        raise RuntimeError("XIN_XAM_V1 collection was not created.")
    if len(xx_objects) != EXPECTED_XX_OBJECT_COUNT:
        raise RuntimeError(
            "Expected {} XX_ objects, found {}.".format(
                EXPECTED_XX_OBJECT_COUNT, len(xx_objects)
            )
        )
    if generic_objects:
        raise RuntimeError(
            "Generic Xin Xăm placeholder objects remain: {}".format(
                ", ".join(obj.name for obj in generic_objects)
            )
        )
    if not quay_objects:
        raise RuntimeError("Quầy Xã Giao QXG_ objects unexpectedly disappeared.")
    if not ong_objects:
        raise RuntimeError("Ông Địa OD_ objects unexpectedly disappeared.")


def verify_hoi_cho_neo(hoi_collection):
    hcn_objects = [obj for obj in hoi_collection.objects if obj.name.startswith(HCN_PREFIX)]
    generic_tokens = ("Hoi_Cho_Neo", "Hỏi Chợ Neo")
    generic_objects = [
        obj
        for obj in bpy.context.scene.objects
        if any(token in obj.name for token in generic_tokens)
        and not obj.name.startswith(HCN_PREFIX)
    ]
    quay_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(QXG_PREFIX)]
    ong_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(OD_PREFIX)]
    xin_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(XX_PREFIX)]

    collection_exists = bpy.data.collections.get(HOI_CHO_NEO_COLLECTION_NAME) is hoi_collection
    print("Verification: HOI_CHO_NEO_V1 exists: {}".format(collection_exists))
    print("Verification: HCN_ objects created: {}".format(len(hcn_objects)))
    print(
        "Verification: generic Hoi_Cho_Neo placeholder remains: {}".format(
            bool(generic_objects)
        )
    )
    print("Verification: QXG_ objects preserved: {}".format(bool(quay_objects)))
    print("Verification: OD_ objects preserved: {}".format(bool(ong_objects)))
    print("Verification: XX_ objects preserved: {}".format(bool(xin_objects)))

    if not collection_exists:
        raise RuntimeError("HOI_CHO_NEO_V1 collection was not created.")
    if len(hcn_objects) != EXPECTED_HCN_OBJECT_COUNT:
        raise RuntimeError(
            "Expected {} HCN_ objects, found {}.".format(
                EXPECTED_HCN_OBJECT_COUNT, len(hcn_objects)
            )
        )
    if generic_objects:
        raise RuntimeError(
            "Generic Hỏi Chợ Neo placeholder objects remain: {}".format(
                ", ".join(obj.name for obj in generic_objects)
            )
        )
    if not quay_objects:
        raise RuntimeError("Quầy Xã Giao QXG_ objects unexpectedly disappeared.")
    if not ong_objects:
        raise RuntimeError("Ông Địa OD_ objects unexpectedly disappeared.")
    if not xin_objects:
        raise RuntimeError("Xin Xăm XX_ objects unexpectedly disappeared.")


def verify_meo_vat(meo_collection):
    mv_objects = [obj for obj in meo_collection.objects if obj.name.startswith(MV_PREFIX)]
    generic_tokens = ("Meo_Vat", "Mẹo Vặt")
    generic_objects = [
        obj
        for obj in bpy.context.scene.objects
        if any(token in obj.name for token in generic_tokens)
        and not obj.name.startswith(MV_PREFIX)
    ]
    quay_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(QXG_PREFIX)]
    ong_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(OD_PREFIX)]
    xin_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(XX_PREFIX)]
    hoi_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith(HCN_PREFIX)]

    collection_exists = bpy.data.collections.get(MEO_VAT_COLLECTION_NAME) is meo_collection
    print("Verification: MEO_VAT_V1 exists: {}".format(collection_exists))
    print("Verification: MV_ objects created: {}".format(len(mv_objects)))
    print(
        "Verification: generic Meo_Vat placeholder remains: {}".format(
            bool(generic_objects)
        )
    )
    print("Verification: QXG_ objects preserved: {}".format(bool(quay_objects)))
    print("Verification: OD_ objects preserved: {}".format(bool(ong_objects)))
    print("Verification: XX_ objects preserved: {}".format(bool(xin_objects)))
    print("Verification: HCN_ objects preserved: {}".format(bool(hoi_objects)))

    if not collection_exists:
        raise RuntimeError("MEO_VAT_V1 collection was not created.")
    if len(mv_objects) != EXPECTED_MV_OBJECT_COUNT:
        raise RuntimeError(
            "Expected {} MV_ objects, found {}.".format(
                EXPECTED_MV_OBJECT_COUNT, len(mv_objects)
            )
        )
    if generic_objects:
        raise RuntimeError(
            "Generic Mẹo Vặt placeholder objects remain: {}".format(
                ", ".join(obj.name for obj in generic_objects)
            )
        )
    if not quay_objects:
        raise RuntimeError("Quầy Xã Giao QXG_ objects unexpectedly disappeared.")
    if not ong_objects:
        raise RuntimeError("Ông Địa OD_ objects unexpectedly disappeared.")
    if not xin_objects:
        raise RuntimeError("Xin Xăm XX_ objects unexpectedly disappeared.")
    if not hoi_objects:
        raise RuntimeError("Hỏi Chợ Neo HCN_ objects unexpectedly disappeared.")


def verify_environment(environment_collection, courtyard_center):
    """Verify the shared civic environment without accepting destination drift."""

    collection_exists = (
        bpy.data.collections.get(ENVIRONMENT_COLLECTION_NAME) is environment_collection
    )
    environment_objects = list(environment_collection.objects)
    main_paths = [
        obj for obj in environment_objects if obj.name.startswith("ENV_PATH_MAIN_")
    ]
    continuation_paths = [
        obj
        for obj in environment_objects
        if obj.name.startswith("ENV_PATH_MAIN_CONTINUATION_")
    ]
    paving_transitions = [
        obj
        for obj in environment_objects
        if obj.name.startswith("ENV_PHO_CHO_PAVING_TRANSITION_")
    ]
    loop_paths = [
        obj for obj in environment_objects if obj.name.startswith("ENV_PATH_LOOP_")
    ]
    center_planters = [
        obj
        for obj in environment_objects
        if obj.name.startswith("ENV_CENTER_PLANTER_")
    ]
    center_tree_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_TREE_CENTER_")
    ]
    plaza_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_PLAZA_")
    ]
    substrate_objects = [
        obj for obj in environment_objects if obj.name == "ENV_SITE_SUBSTRATE"
    ]
    perimeter_objects = [
        obj
        for obj in environment_objects
        if obj.name.startswith(("ENV_PERIMETER_", "ENV_PHO_CHO_EDGE_"))
    ]
    future_market_masses = [
        obj for obj in environment_objects if obj.name.startswith("ENV_FUTURE_PHO_CHO_MASS_")
    ]
    coastal_horizon_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_COASTAL_HORIZON_")
    ]
    vegetation_objects = [
        obj
        for obj in environment_objects
        if obj.name.startswith(
            (
                "ENV_TREE_",
                "ENV_PERIMETER_PALM_",
                "ENV_SHRUB_",
                "ENV_BAMBOO_",
                "ENV_PLANT_BED_COVER_",
                "ENV_PERIMETER_COVER_",
                "ENV_PHO_CHO_EDGE_COVER_",
            )
        )
    ]
    seating_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_BENCH_") and obj.name.endswith("_Seat")
    ]
    pot_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_POT_") and obj.name.endswith("_Body")
    ]
    entry_detail_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_DETAIL_ENTRY_")
    ]
    fixture_detail_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_DETAIL_FIXTURE_")
    ]
    joinery_detail_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_DETAIL_JOINERY_")
    ]
    shelf_detail_objects = [
        obj for obj in environment_objects
        if obj.name.startswith(("ENV_DETAIL_COUNTER_", "ENV_DETAIL_SHELF_"))
    ]
    sign_frame_detail_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_DETAIL_SIGNFRAME_")
    ]
    prop_detail_objects = [
        obj for obj in environment_objects if obj.name.startswith("ENV_DETAIL_PROP_")
    ]
    expected_destination_counts = (
        (QUAY_COLLECTION_NAME, QXG_PREFIX, EXPECTED_QXG_OBJECT_COUNT),
        (ONG_DIA_COLLECTION_NAME, OD_PREFIX, EXPECTED_OD_OBJECT_COUNT),
        (XIN_XAM_COLLECTION_NAME, XX_PREFIX, EXPECTED_XX_OBJECT_COUNT),
        (HOI_CHO_NEO_COLLECTION_NAME, HCN_PREFIX, EXPECTED_HCN_OBJECT_COUNT),
        (MEO_VAT_COLLECTION_NAME, MV_PREFIX, EXPECTED_MV_OBJECT_COUNT),
    )
    destination_geometry_preserved = True
    for collection_name, prefix, expected_count in expected_destination_counts:
        destination_collection = bpy.data.collections.get(collection_name)
        if destination_collection is None:
            destination_geometry_preserved = False
            continue
        actual_count = sum(
            1 for obj in destination_collection.objects if obj.name.startswith(prefix)
        )
        if actual_count != expected_count:
            destination_geometry_preserved = False

    courtyard_exists = bpy.data.objects.get("COURTYARD_CENTER") is not None
    sightline_blockers = []
    passive_sightline_prefixes = (
        "ENV_PLAZA_MAIN_",
        "ENV_PLAZA_EDGE_",
        "ENV_PATH_MAIN_",
        "ENV_PATH_LOOP_",
        "ENV_PATH_BRANCH_",
        "ENV_PHO_CHO_PAVING_",
        "ENV_PERIMETER_GROUND_",
        "ENV_SITE_SUBSTRATE",
    )
    passive_sightline_names = {
        "GROUND_ChoNeo",
        "COURTYARD_CENTER",
        "ENV_CENTER_PLANTER_Base",
        "ENV_CENTER_PLANTER_Edge",
        "ENV_CENTER_PLANTER_Rim",
        "ENV_CENTER_PLANTER_Soil",
    }
    for obj in environment_objects:
        if obj.name in passive_sightline_names or any(
            obj.name.startswith(prefix) for prefix in passive_sightline_prefixes
        ):
            continue
        if obj.name.lower().startswith(("ground", "courtyard")):
            continue
        relative_x = obj.location.x - courtyard_center.x
        relative_y = obj.location.y - courtyard_center.y
        if 0.0 <= relative_x <= 17.0 and abs(relative_y + 4.0) < 1.2:
            sightline_blockers.append(obj)

    print("Verification: CHO_NEO_ENVIRONMENT_V1 exists: {}".format(collection_exists))
    print("Verification: ENV_ objects created: {}".format(len(environment_objects)))
    print("Verification: main promenade segments: {}".format(len(main_paths)))
    print(
        "Verification: Phố Chợ continuation segments: {}".format(
            len(continuation_paths)
        )
    )
    print(
        "Verification: Phố Chợ paving transitions: {}".format(
            len(paving_transitions)
        )
    )
    print("Verification: scenic loop segments: {}".format(len(loop_paths)))
    print("Verification: center planter objects: {}".format(len(center_planters)))
    print("Verification: center tree objects: {}".format(len(center_tree_objects)))
    print("Verification: vegetation objects: {}".format(len(vegetation_objects)))
    print("Verification: human-scale bench locations: {}".format(len(seating_objects)))
    print("Verification: grounded pot locations: {}".format(len(pot_objects)))
    print("Verification: entrance grounding objects: {}".format(len(entry_detail_objects)))
    print("Verification: restrained fixture objects: {}".format(len(fixture_detail_objects)))
    print("Verification: pavilion joinery objects: {}".format(len(joinery_detail_objects)))
    print("Verification: counter/shelf objects: {}".format(len(shelf_detail_objects)))
    print("Verification: subtle sign-frame objects: {}".format(len(sign_frame_detail_objects)))
    print("Verification: destination prop objects: {}".format(len(prop_detail_objects)))
    print("Verification: plaza surface objects: {}".format(len(plaza_objects)))
    print("Verification: connected site substrate objects: {}".format(len(substrate_objects)))
    print("Verification: perimeter context objects: {}".format(len(perimeter_objects)))
    print(
        "Verification: future Phố Chợ placeholder masses: {}".format(
            len(future_market_masses)
        )
    )
    print(
        "Verification: coastal horizon objects: {}".format(
            len(coastal_horizon_objects)
        )
    )
    print("Verification: COURTYARD_CENTER exists: {}".format(courtyard_exists))
    print(
        "Verification: eastbound promenade sightline clear: {}".format(
            not sightline_blockers
        )
    )
    print(
        "Verification: destination geometry counts preserved: {}".format(
            destination_geometry_preserved
        )
    )

    if not collection_exists:
        raise RuntimeError("CHO_NEO_ENVIRONMENT_V1 collection was not created.")
    if not courtyard_exists:
        raise RuntimeError("COURTYARD_CENTER was not found during environment verification.")
    if not main_paths:
        raise RuntimeError("The main future Phố Chợ promenade was not created.")
    if len(continuation_paths) != 2:
        raise RuntimeError(
            "Expected 2 Phố Chợ continuation segments, found {}.".format(
                len(continuation_paths)
            )
        )
    if len(paving_transitions) != 2:
        raise RuntimeError(
            "Expected 2 Phố Chợ paving transitions, found {}.".format(
                len(paving_transitions)
            )
        )
    if not loop_paths:
        raise RuntimeError("The scenic walking loop was not created.")
    if not center_planters:
        raise RuntimeError("The central garden planter was not created.")
    if not center_tree_objects:
        raise RuntimeError("The central garden tree was not created.")
    if len(seating_objects) != 5:
        raise RuntimeError(
            "Expected 5 human-scale bench locations, found {}.".format(len(seating_objects))
        )
    if len(pot_objects) != 6:
        raise RuntimeError(
            "Expected 6 grounded pot locations, found {}.".format(len(pot_objects))
        )
    expected_detail_counts = (
        ("entrance grounding", entry_detail_objects, 5),
        ("restrained fixtures", fixture_detail_objects, 12),
        ("pavilion joinery", joinery_detail_objects, 10),
        ("counters/shelves", shelf_detail_objects, 3),
        ("subtle sign frames", sign_frame_detail_objects, 15),
        ("destination props", prop_detail_objects, 5),
    )
    for label, objects, expected_count in expected_detail_counts:
        if len(objects) != expected_count:
            raise RuntimeError(
                "Expected {} {} objects, found {}.".format(
                    expected_count, label, len(objects)
                )
            )
    if len(plaza_objects) < 3:
        raise RuntimeError("The connected inner plaza surfaces were not created.")
    if len(substrate_objects) != 1:
        raise RuntimeError("The connected inner site substrate was not created exactly once.")
    if len(perimeter_objects) < 20:
        raise RuntimeError("The Phase 8 perimeter context was not created.")
    if len(future_market_masses) != 2:
        raise RuntimeError("The future Phố Chợ placeholder masses were not created.")
    if len(coastal_horizon_objects) != 2:
        raise RuntimeError("The layered coastal horizon context was not created.")
    if len(environment_objects) != EXPECTED_ENVIRONMENT_OBJECT_COUNT:
        raise RuntimeError(
            "Expected {} ENV_ objects, found {}.".format(
                EXPECTED_ENVIRONMENT_OBJECT_COUNT, len(environment_objects)
            )
        )
    if sightline_blockers:
        raise RuntimeError(
            "Eastbound promenade sightline is blocked by: {}".format(
                ", ".join(obj.name for obj in sightline_blockers)
            )
        )
    if not destination_geometry_preserved:
        raise RuntimeError("One or more dedicated destination object counts changed.")


def verify_lighting(lighting_collection):
    """Verify the idempotent Blender lighting collection."""

    collection_exists = (
        bpy.data.collections.get(LIGHTING_COLLECTION_NAME) is lighting_collection
    )
    lights = [obj for obj in lighting_collection.objects if obj.type == "LIGHT"]
    light_names = {obj.name for obj in lights}
    required_names = {
        "LIGHT_MAIN_SUN",
        "LIGHT_QXG_AMBER",
        "LIGHT_XX_AMBER",
        "LIGHT_HCN_AMBER",
        "LIGHT_MV_AMBER",
        "LIGHT_CENTER_AMBER",
    }
    required_lights_exist = required_names.issubset(light_names)
    print("Verification: CHO_NEO_LIGHTING_V1 exists: {}".format(collection_exists))
    print("Verification: lighting objects created: {}".format(len(lights)))
    print("Verification: required lighting objects exist: {}".format(required_lights_exist))

    if not collection_exists:
        raise RuntimeError("CHO_NEO_LIGHTING_V1 collection was not created.")
    if not required_lights_exist:
        raise RuntimeError("The required Chợ Neo lighting objects were not created.")


def verify_material_palette():
    """Confirm generated destination/environment meshes use assigned materials."""

    missing_materials = [
        name for name in MATERIAL_PALETTE if bpy.data.materials.get(name) is None
    ]
    generated_collection_names = (
        QUAY_COLLECTION_NAME,
        ONG_DIA_COLLECTION_NAME,
        XIN_XAM_COLLECTION_NAME,
        HOI_CHO_NEO_COLLECTION_NAME,
        MEO_VAT_COLLECTION_NAME,
        ENVIRONMENT_COLLECTION_NAME,
    )
    unassigned_meshes = []
    for collection_name in generated_collection_names:
        collection = bpy.data.collections.get(collection_name)
        if collection is None:
            continue
        for obj in collection.objects:
            if obj.type == "MESH" and len(obj.data.materials) == 0:
                unassigned_meshes.append(obj.name)

    print("Verification: palette materials available: {}".format(not missing_materials))
    print("Verification: generated meshes without materials: {}".format(len(unassigned_meshes)))
    if missing_materials:
        raise RuntimeError(
            "Missing Phase 5 palette materials: {}".format(", ".join(missing_materials))
        )
    if unassigned_meshes:
        raise RuntimeError(
            "Generated meshes without material assignments: {}".format(
                ", ".join(unassigned_meshes)
            )
        )


def main():
    ensure_expected_master_is_open()
    ensure_palette_materials()
    courtyard_name, courtyard_center, ground_name = snapshot_scene_anchors()
    if ground_name is None:
        print("WARNING: no existing ground object was found; no ground was created.")
    else:
        print("Preserving existing ground object: {}".format(ground_name))

    collection = get_or_create_blockout_collection()
    quay_collection = get_or_create_quay_collection()
    ong_collection = get_or_create_ong_dia_collection()
    xin_collection = get_or_create_xin_xam_collection()
    hoi_collection = get_or_create_hoi_cho_neo_collection()
    meo_collection = get_or_create_meo_vat_collection()
    environment_collection = get_or_create_environment_collection()
    lighting_collection = get_or_create_lighting_collection()
    for destination in DESTINATIONS:
        if destination["key"] == "Quay_Xa_Giao":
            create_quay_xa_giao_pavilion(destination, courtyard_center, quay_collection)
        elif destination["key"] == "Ong_Dia":
            create_ong_dia_shrine(destination, courtyard_center, ong_collection)
        elif destination["key"] == "Xin_Xam":
            create_xin_xam_pavilion(destination, courtyard_center, xin_collection)
        elif destination["key"] == "Hoi_Cho_Neo":
            create_hoi_cho_neo_pavilion(destination, courtyard_center, hoi_collection)
        elif destination["key"] == "Meo_Vat":
            create_meo_vat_pavilion(destination, courtyard_center, meo_collection)
        else:
            create_generic_destination_placeholder(destination, courtyard_center, collection)

    create_cho_neo_environment(courtyard_center, environment_collection)
    create_cho_neo_lighting(courtyard_center, lighting_collection)
    apply_phase1_material_dressing(courtyard_name, ground_name)
    verify_quay_xa_giao(quay_collection)
    verify_ong_dia(ong_collection)
    verify_xin_xam(xin_collection)
    verify_hoi_cho_neo(hoi_collection)
    verify_meo_vat(meo_collection)
    verify_environment(environment_collection, courtyard_center)
    verify_lighting(lighting_collection)
    verify_material_palette()
    export_glb(
        courtyard_name,
        ground_name,
        (
            BLOCKOUT_COLLECTION_NAME,
            QUAY_COLLECTION_NAME,
            ONG_DIA_COLLECTION_NAME,
            XIN_XAM_COLLECTION_NAME,
            HOI_CHO_NEO_COLLECTION_NAME,
            MEO_VAT_COLLECTION_NAME,
            ENVIRONMENT_COLLECTION_NAME,
        ),
        LIGHTING_COLLECTION_NAME,
    )
    bpy.ops.wm.save_as_mainfile(filepath=BLOCKOUT_BLEND_PATH)

    print("Created {} destination blockouts.".format(len(DESTINATIONS)))
    print("Exported GLB: {}".format(GLB_EXPORT_PATH))
    print("Saved Blender copy: {}".format(BLOCKOUT_BLEND_PATH))


if __name__ == "__main__":
    main()
