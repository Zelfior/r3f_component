import panel as pn
import panel_material_ui as pmui
import param

import numpy as np
import pyvista as pv

from panel.custom import ReactComponent

pn.extension()

class ReactThreeFiber(ReactComponent):

    _esm = 'ReactThreeFiber.bundle.js'

    vertices = param.List()
    objects = param.List()
    colors = param.List()
    edge_colors = param.List()
    values = param.List()
    names = param.List()
    # positions = param.List()

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
        # Create a single cube
        cube = pv.Cube()

        # Create a grid of cubes
        cubes = []
        for i in range(n):
            for j in range(n):
                for k in range(n):
                    # Translate the cube to its position in the grid
                    translated_cube = cube.copy()
                    translated_cube = translated_cube.translate([i * spacing, j * spacing, k * spacing])
                    cubes.append(translated_cube.triangulate())

        return cubes

    # Create the 3x3x3 grid of cubes
    cube_grid = create_cube_grid(n=10, spacing=1.)

    def get_faces(mesh):
        faces = np.array(mesh.faces).reshape((-1, 4))[:, 1:]
        return faces

    vertices = np.array([mesh.points for mesh in cube_grid]).tolist()
    faces = np.array([get_faces(mesh) for mesh in cube_grid]).tolist()

    centers = np.array([mesh.center for mesh in cube_grid])

    colors = (centers - centers.min(axis=0)) / (centers.max(axis=0) - centers.min(axis=0))
    flat_colors = colors.flatten()
    edge_colors = np.where(flat_colors - 0.1 < 0, 0, flat_colors - 0.1).reshape(colors.shape)

    count = len(vertices)
    rtf = ReactThreeFiber(sizing_mode='stretch_both')

    rtf.names += list(f"Object {i}" for i in range(count))
    rtf.values += list(range(count))
    rtf.colors += colors.tolist()
    rtf.edge_colors += edge_colors.tolist()
    rtf.vertices += vertices
    rtf.objects += faces

    rtf.show()