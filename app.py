from typing import List, Tuple
import panel as pn
import param

import numpy as np
import pyvista as pv

from panel.custom import ReactComponent

pn.extension()


class ReactThreeFiber(ReactComponent):

    _esm = "ReactThreeFiber.bundle.js"

    vertices = param.List()
    objects = param.List()

    colors = param.List()
    edge_colors = param.List()
    values = param.List()
    names = param.List()

    all_colors: List
    all_edge_colors: List
    all_values: List
    all_names: List

    intensity = param.Number(3.2)
    matrix = param.List()

    def __init__(
        self,
        multi_block: pv.MultiBlock,
        colors: List[Tuple[float, float, float]],
        edge_colors: List[Tuple[float, float, float]],
        values: List[float],
        names: List[str],
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)

        self.param.watch(self.updated_matrix, "matrix")

        self.multi_block = multi_block
        self.current_multi_block = multi_block.copy()

        self.all_colors = colors
        self.all_edge_colors = edge_colors
        self.all_values = values
        self.all_names = names

        self.update_from_multi_block()

    def updated_matrix(self, _):
        print("New matrix", self.matrix)
        location = self.matrix[12:15]
        y_vector = self.matrix[4:7]
        
        print("Slicing...")
        self.current_multi_block = self.multi_block.clip(
            normal=y_vector, origin=location
        ).triangulated().as_polydata_blocks()  # .fill_holes(hole_size=1e6)
        # self.multi_block.cut_with_plane()
        self.update_from_multi_block()
        print("Updated")

    @pn.io.hold()
    def update_from_multi_block(
        self,
    ):
        per_cell_verts = []
        per_cell_faces = []

        indexes = []

        print("Extracting meshes...")
        for b in self.current_multi_block:
            if len(b.points) > 0 and b.faces is not None:
                # print(b.cells)
                faces = b.faces
                per_cell_verts.append(b.points.tolist())
                per_cell_faces.append(
                    [
                        list(faces[1 + 4 * i : 4 + 4 * i])
                        for i in range(int(len(faces) / 4))
                    ]
                )
                indexes.append(self.all_names.index(b["cell_id"][0]))
        print("Meshes extracted.")

        self.vertices = per_cell_verts
        self.objects = per_cell_faces

        print(len(indexes))

        print("Extracting lists...")
        self.colors = [self.all_colors[i] for i in indexes]
        self.edge_colors = [self.all_edge_colors[i] for i in indexes]
        self.values = [self.all_values[i] for i in indexes]
        self.names = [self.all_names[i] for i in indexes]
        print("Lists extracted.")


if __name__ == "__main__":

    # # https://codesandbox.io/p/sandbox/react-three-fiber-poc-segments-forked-yydp95?file=%2Fpackage.json%3A11%2C37-12%2C22

    # # pmui.Page(
    # #     main=[ReactThreeFiber(sizing_mode='stretch_both')],
    # # ).show()

    def create_cube_grid(n=3, spacing=1.0):
        """
        Create a 3x3x3 grid of cubes.

        Parameters:
        - n: Number of cubes along each axis (default: 3)
        - spacing: Distance between each cube (default: 1.0)

        Returns:
        - A PyVista PolyData object representing the grid of cubes.
        """
        # Create a grid of cubes
        cubes = []
        for i in range(n):
            for j in range(n):
                for k in range(n):
                    # Translate the cube to its position in the grid
                    cubes.append(
                        pv.Cube(
                            center=(i * spacing, j * spacing, k * spacing)
                        ).triangulate()
                    )

        return cubes

    # Create the 3x3x3 grid of cubes
    cube_grid = create_cube_grid(n=15, spacing=1.0)
    print("Number of cubes created:", len(cube_grid))

    def get_faces(mesh):
        faces = np.array(mesh.faces).reshape((-1, 4))[:, 1:]
        return faces

    vertices = np.array([mesh.points for mesh in cube_grid]).tolist()
    faces = np.array([get_faces(mesh) for mesh in cube_grid]).tolist()

    centers = np.array([mesh.center for mesh in cube_grid])

    range_ = centers.max(axis=0) - centers.min(axis=0)

    if np.any(range_ == 0):
        range_[range_ == 0] = 1.0

    colors = (centers - centers.min(axis=0)) / range_
    flat_colors = colors.flatten()
    edge_colors = np.where(flat_colors - 0.2 < 0, 0, flat_colors - 0.2).reshape(
        colors.shape
    )

    count = len(vertices)
    rtf = ReactThreeFiber(sizing_mode="stretch_both")

    rtf.names += list(f"Object {i}" for i in range(count))
    rtf.values += list(range(count))
    rtf.colors += colors.tolist()
    rtf.edge_colors += edge_colors.tolist()
    rtf.vertices += vertices
    rtf.objects += faces

    rtf.show()
