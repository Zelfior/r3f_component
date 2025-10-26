import panel as pn
import panel_material_ui as pmui

from panel.custom import ReactComponent

pn.extension()

class ReactThreeFiber(ReactComponent):

    _esm = 'ReactThreeFiber.bundle.js'

# https://codesandbox.io/p/sandbox/react-three-fiber-poc-segments-forked-yydp95?file=%2Fpackage.json%3A11%2C37-12%2C22

# pmui.Page(
#     main=[ReactThreeFiber(sizing_mode='stretch_both')],
# ).show()

ReactThreeFiber(sizing_mode='stretch_both').show()
