import panel as pn

from panel.custom import ReactComponent

pn.extension()

class ReactThreeFiber(ReactComponent):

    _esm = 'ReactThreeFiber.bundle.js'

pn.Column(
    pn.widgets.Button(name='React Three Fiber Component'),
    ReactThreeFiber(sizing_mode='stretch_both'),
    sizing_mode='stretch_both'
).show()
