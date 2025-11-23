from typing import List, Tuple
import panel as pn
import panel_material_ui as pmui
import param

import numpy as np
import pyvista as pv

from panel.custom import ReactComponent

pn.extension()

def get_rd_bu(values):
    """Return a red-blue colormap with n colors."""
    import matplotlib
    return matplotlib.colormaps["RdBu"](values)

class ReactThreeFiber(ReactComponent):

    _esm = "ReactThreeFiber.bundle.js"

    # Properties to be sent to React Three Fiber
    vertices = param.List()
    objects = param.List()

    colors = param.List()
    edge_colors = param.List()
    values = param.List()
    names = param.List()

    axes_range = param.List(default=[None, None, None, None, None, None])
    axes_data_box = param.List(default=[None, None, None, None, None, None])
    axes_visible = param.Boolean(default=True)

    slice_tool_visible = param.Boolean(default=False)
    slice_tool_scale = param.Number(default=1.)

    display_axes_gizmo = param.Boolean(default=True)

    intensity = param.Number(3.2)

    # Values provided by the user
    all_colors: List
    all_edge_colors: List
    all_values: List
    all_names: List

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
        ).as_polydata_blocks()  # .fill_holes(hole_size=1e6)
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

        x_bounds = (self.current_multi_block.bounds[0], self.current_multi_block.bounds[1])
        y_bounds = (self.current_multi_block.bounds[2], self.current_multi_block.bounds[3])
        z_bounds = (self.current_multi_block.bounds[4], self.current_multi_block.bounds[5])

        self.axes_data_box = [
            float(x_bounds[0]),
            float(x_bounds[1]),
            float(y_bounds[0]),
            float(y_bounds[1]),
            float(z_bounds[0]),
            float(z_bounds[1]),
        ]


        x_len = x_bounds[1] - x_bounds[0]
        y_len = y_bounds[1] - y_bounds[0]
        z_len = z_bounds[1] - z_bounds[0]

        x_bounds = (x_bounds[0] - 0.1 * x_len, x_bounds[1] + 0.1 * x_len)
        y_bounds = (y_bounds[0] - 0.1 * y_len, y_bounds[1] + 0.1 * y_len)
        z_bounds = (z_bounds[0] - 0.1 * z_len, z_bounds[1] + 0.1 * z_len)

        self.axes_range = [
            float(x_bounds[0]),
            float(x_bounds[1]),
            float(y_bounds[0]),
            float(y_bounds[1]),
            float(z_bounds[0]),
            float(z_bounds[1]),
        ]
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
                    c = pv.Cube(
                            center=(i * spacing, j * spacing, k * spacing)
                        ).triangulate()
                    c["cell_id"] = [f'Object {i * n * n + j * n + k}'] * len(c.points)
                    cubes.append(c)

        return cubes

    # Create the 3x3x3 grid of cubes
    cube_grid = create_cube_grid(n=8, spacing=1.0)

    mb = pv.MultiBlock(cube_grid)
    centers = np.array([mesh.center for mesh in cube_grid])

    range_ = centers.max(axis=0) - centers.min(axis=0)

    if np.any(range_ == 0):
        range_[range_ == 0] = 1.0

    arr = (centers - centers.min(axis=0)) / range_
    values = np.max(arr, axis=1) * np.sum(arr, axis=1)
    values /= max(values)

    colors = get_rd_bu(values)[:, :3]
    flat_colors = colors.flatten()
    edge_colors = np.where(flat_colors - 0.2 < 0, 0, flat_colors - 0.2).reshape(
        colors.shape
    )

    print(edge_colors)

    count = len(colors)

    rtf = ReactThreeFiber(multi_block=mb,
                          colors = colors.tolist(),
                          edge_colors = edge_colors.tolist(),
                          values = list(range(count)),
                          names = list(f"Object {i}" for i in range(count)),
                          sizing_mode="stretch_both"
                          )

    def toggle_slice_tool(event):
        print("Toggle slice tool to ", not rtf.slice_tool_visible)
        rtf.slice_tool_visible = not rtf.slice_tool_visible

    def toggle_axes_gizmo(event):
        print("Toggle axes gizmo to ", not rtf.display_axes_gizmo)
        rtf.display_axes_gizmo = not rtf.display_axes_gizmo

    scale_input = pmui.FloatInput(
        name="Slice Tool Scale",
        value=1.0,
        step=0.1,
    )
    scale_input.param.watch(
        lambda event: setattr(rtf, 'slice_tool_scale', event.new),
        "value",
    )
    row = pmui.Column(
        pmui.Button(
            label="Toggle Slice Tool",
            on_click=toggle_slice_tool,
        ),
        pmui.Button(
            label="Toggle Axes Gizmo",
            on_click=toggle_axes_gizmo,
        ),
        pmui.Button(
            label="Toggle Axes Visibility",
            on_click=lambda event: setattr(rtf, 'axes_visible', not rtf.axes_visible),
        ),
        scale_input,
        styles=dict(background='WhiteSmoke'),
        sizing_mode="stretch_height",
    )

    layout = pmui.Row(row, rtf, sizing_mode="stretch_both")
    pmui.Page(
        main=[layout],
        title="React Three Fiber with PyVista MultiBlock",
    ).show()

