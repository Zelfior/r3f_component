import panel as pn
import panel_material_ui as pmui
import param

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

if __name__ == "__main__":

    # https://codesandbox.io/p/sandbox/react-three-fiber-poc-segments-forked-yydp95?file=%2Fpackage.json%3A11%2C37-12%2C22

    # pmui.Page(
    #     main=[ReactThreeFiber(sizing_mode='stretch_both')],
    # ).show()

    rtf = ReactThreeFiber(sizing_mode='stretch_both')

    rtf.names += ["coucou"]

    rtf.show()
