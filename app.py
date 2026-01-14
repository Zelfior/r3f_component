from typing import List, Tuple
from dataclasses import dataclass
import panel as pn
import panel_material_ui as pmui
import param

import numpy as np
import pyvista as pv

from panel.custom import ReactComponent

pn.extension()


def get_rd_bu(values, html=False):
    """Return a red-blue colormap with n colors."""
    import matplotlib

    cmap = matplotlib.colormaps["RdBu"]
    rgba_colors = cmap(values)
    if not html:
        return rgba_colors
    html_colors = [matplotlib.colors.rgb2hex(rgba[:3]) for rgba in rgba_colors]
    return html_colors


@dataclass
class PyvistaData:
    def to_dict(self):
        raise NotImplementedError()

    def slice(self, normal: List[float], origin: List[float]):
        raise NotImplementedError()


@dataclass
class MultiBlockData(PyvistaData):
    multi_block: pv.MultiBlock
    colors: List[Tuple[float, float, float]]
    edge_colors: List[Tuple[float, float, float]]
    values: List[float]
    names: List[str]

    def to_dict(self):
        per_cell_verts = []
        per_cell_faces = []

        indexes = []

        print("Extracting meshes...")
        for b in self.multi_block:
            if len(b.points) > 0 and b.faces is not None:
                # print(b.cells)
                faces = b.faces
                per_cell_verts.append(b.points.tolist())
                per_cell_faces.append(
                    [
                        list(faces[1 + 4 * i: 4 + 4 * i])
                        for i in range(int(len(faces) / 4))
                    ]
                )
                indexes.append(self.names.index(b["cell_id"][0]))
        print("Meshes extracted.")

        x_bounds = (self.multi_block.bounds[0], self.multi_block.bounds[1])
        y_bounds = (self.multi_block.bounds[2], self.multi_block.bounds[3])
        z_bounds = (self.multi_block.bounds[4], self.multi_block.bounds[5])

        axes_data_box = [
            float(x_bounds[0]),
            float(x_bounds[1]),
            float(y_bounds[0]),
            float(y_bounds[1]),
            float(z_bounds[0]),
            float(z_bounds[1]),
        ]

        return {
            "vertices": per_cell_verts,
            "indices": per_cell_faces,
            "colors": self.colors,
            "edge_colors": self.edge_colors,
            "values": self.values,
            "names": self.names,
            "axes_data_box": axes_data_box,
            "type": "MultiBlock",
        }

    def slice(self, normal, origin):
        return MultiBlockData(
            multi_block=self.multi_block.clip(
                normal=normal, origin=origin
            ).as_polydata_blocks(),
            colors=self.colors,
            edge_colors=self.edge_colors,
            values=self.values,
            names=self.names,
        )


@dataclass
class UnstructuredGridData(PyvistaData):
    grid: pv.UnstructuredGrid
    colors: List[Tuple[float, float, float]]
    edge_colors: List[Tuple[float, float, float]]
    values: List[float]
    names: List[str]

    def to_dict(self):
        indexes = []

        all_points = np.array(self.grid.points)

        vertices = []
        indices = []

        for c in range(self.grid.GetNumberOfCells()):
            cell = self.grid.get_cell(c)

            cell_points = all_points[np.array(cell.point_ids)].tolist()
            vertices.append(cell_points)

            sorter = np.argsort(cell.point_ids)
            remapped_indices = np.array([
                sorter[
                    np.searchsorted(cell.point_ids, face.point_ids, sorter=sorter)
                ].tolist()
                for face in self.grid.get_cell(c).faces
            ])

            poly = pv.PolyData(cell_points, np.concatenate(
                [[[remapped_indices.shape[1]]] * remapped_indices.shape[0], remapped_indices], axis=1
            )).triangulate()

            indices.append(
                [
                    list(poly.faces[1 + 4 * i: 4 + 4 * i])
                    for i in range(int(len(poly.faces) / 4))
                ]
            )

            indexes.append(self.grid["cell_id"][c])

        print("Meshes extracted.")

        x_bounds = (self.grid.bounds[0], self.grid.bounds[1])
        y_bounds = (self.grid.bounds[2], self.grid.bounds[3])
        z_bounds = (self.grid.bounds[4], self.grid.bounds[5])

        axes_data_box = [
            float(x_bounds[0]),
            float(x_bounds[1]),
            float(y_bounds[0]),
            float(y_bounds[1]),
            float(z_bounds[0]),
            float(z_bounds[1]),
        ]

        indexes = np.array(indexes)

        colors = np.array(self.colors)[indexes].tolist()
        edge_colors = np.array(self.edge_colors)[indexes].tolist()
        values = np.array(self.values)[indexes].tolist()
        names = np.array(self.names)[indexes].tolist()

        return {
            "vertices": vertices,
            "indices": indices,
            "colors": colors,
            "edge_colors": edge_colors,
            "values": values,
            "names": names,
            "axes_data_box": axes_data_box,
            "type": "MultiBlock",
        }

    def slice(self, normal, origin):
        return UnstructuredGridData(
            grid=self.grid.clip(normal=normal, origin=origin),
            colors=self.colors,
            edge_colors=self.edge_colors,
            values=self.values,
            names=self.names,
        )


class ReactThreeFiber(ReactComponent):

    _esm = "ReactThreeFiber.bundle.js"

    # Properties to be sent to React Three Fiber
    data_dict = param.List()

    axes_range = param.List(default=[None, None, None, None, None, None])
    axes_data_box = param.List(default=[None, None, None, None, None, None])
    axes_visible = param.Boolean(default=True)

    slice_tool_visible = param.Boolean(default=False)
    slice_tool_scale = param.Number(default=1.0)

    display_axes_gizmo = param.Boolean(default=True)

    display_color_map = param.Boolean(default=False)
    color_map_colors = param.List(
        default=[
            "#440154",
            "#482878",
            "#3E4989",
            "#31688E",
            "#26828E",
            "#1F9E89",
            "#35B779",
            "#6DCD59",
            "#B4DE2C",
            "#FDE725",
            "#FFFFE0",
        ]
    )
    color_bar_bounds = param.Tuple(default=(0.0, 1.0))

    intensity = param.Number(3.2)

    matrix = param.List()

    def __init__(
        self,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)

        self.data_to_plot: List[PyvistaData] = []
        self.sliced_data_to_plot: List[PyvistaData] = []

        # self.param.watch(self.updated_matrix, "matrix")

    def display_color_bar(
        self,
        color_map_colors: List[str] = [
            "#440154",
            "#482878",
            "#3E4989",
            "#31688E",
            "#26828E",
            "#1F9E89",
            "#35B779",
            "#6DCD59",
            "#B4DE2C",
            "#FDE725",
            "#FFFFE0",
        ],
        color_bar_bounds: Tuple[float, float] = (0.0, 1.0),
    ):
        self.display_color_map = True
        self.color_map_colors = color_map_colors
        self.color_bar_bounds = color_bar_bounds

    def plot_multi_block(
        self,
        multi_block: pv.MultiBlock,
        colors: List[Tuple[float, float, float]],
        edge_colors: List[Tuple[float, float, float]],
        values: List[float],
        names: List[str],
    ):
        self.data_to_plot.append(
            MultiBlockData(
                multi_block=multi_block,
                colors=colors,
                edge_colors=edge_colors,
                values=values,
                names=names,
            )
        )
        self.sliced_data_to_plot.append(
            MultiBlockData(
                multi_block=multi_block,
                colors=colors,
                edge_colors=edge_colors,
                values=values,
                names=names,
            )
        )

        self.updata_data()

    def plot_unstructured_grid(
        self,
        grid: pv.UnstructuredGrid,
        colors: List[Tuple[float, float, float]],
        edge_colors: List[Tuple[float, float, float]],
        values: List[float],
        names: List[str],
    ):
        self.data_to_plot.append(
            UnstructuredGridData(
                grid=grid,
                colors=colors,
                edge_colors=edge_colors,
                values=values,
                names=names,
            )
        )
        self.sliced_data_to_plot.append(
            UnstructuredGridData(
                grid=grid,
                colors=colors,
                edge_colors=edge_colors,
                values=values,
                names=names,
            )
        )

        self.updata_data()

    def updated_matrix(self, _):
        location = self.matrix[12:15]
        y_vector = self.matrix[4:7]

        for element in self.data_to_plot:
            self.sliced_data_to_plot.append(
                element.slice(normal=y_vector, origin=location)
            )

        self.updata_data()

    @pn.io.hold()
    def updata_data(
        self,
    ):
        self.data_dict = [d.to_dict() for d in self.sliced_data_to_plot]

        if len(self.data_dict) == 0:
            return

        self.axes_data_box = [
            min([float(d["axes_data_box"][0]) for d in self.data_dict]),
            max([float(d["axes_data_box"][1]) for d in self.data_dict]),
            min([float(d["axes_data_box"][2]) for d in self.data_dict]),
            max([float(d["axes_data_box"][3]) for d in self.data_dict]),
            min([float(d["axes_data_box"][4]) for d in self.data_dict]),
            max([float(d["axes_data_box"][5]) for d in self.data_dict]),
        ]

        x_bounds = (self.axes_data_box[0], self.axes_data_box[1])
        y_bounds = (self.axes_data_box[2], self.axes_data_box[3])
        z_bounds = (self.axes_data_box[4], self.axes_data_box[5])

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

        self.slice_tool_scale = max([x_len, y_len, z_len])


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
                    c["cell_id"] = [f"Object {i * n * n + j * n + k}"] * len(c.points)
                    cubes.append(c)

        return cubes

    # Create the 3x3x3 grid of cubes
    cube_grid = create_cube_grid(n=10, spacing=1.0)

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

    count = len(colors)

    rtf = ReactThreeFiber(
        sizing_mode="stretch_both",
    )

    rtf.plot_multi_block(
        multi_block=mb,
        colors=colors.tolist(),
        edge_colors=edge_colors.tolist(),
        values=list(range(count)),
        names=list(f"Object {i}" for i in range(count)),
    )

    rtf.display_color_bar(
        color_map_colors=get_rd_bu(np.linspace(0, 1, 11), html=True),
        color_bar_bounds=(0, count - 1),
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
        lambda event: setattr(rtf, "slice_tool_scale", event.new),
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
            on_click=lambda event: setattr(rtf, "axes_visible", not rtf.axes_visible),
        ),
        pmui.Button(
            label="Toggle Colorbar Visibility",
            on_click=lambda event: setattr(
                rtf, "display_color_map", not rtf.display_color_map
            ),
        ),
        scale_input,
        styles=dict(background="WhiteSmoke"),
        sizing_mode="stretch_height",
    )

    layout = pmui.Row(row, rtf, sizing_mode="stretch_both")
    pmui.Page(
        main=[layout],
        title="React Three Fiber with PyVista MultiBlock",
    ).show()
