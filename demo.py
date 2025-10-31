import panel as pn
import panel_material_ui as pmui
import param

from panel.custom import ReactComponent, Child

pn.extension()

class ReactThreeFiber(ReactComponent):

    _esm = 'ReactThreeFiber.bundle.js'

    cube_count = param.Integer()
    cube_color = param.String()
    
    counter = Child()
    color_selector = Child()

if __name__ == "__main__":
    rtf = ReactThreeFiber(sizing_mode='stretch_both')

    counter = pn.widgets.IntInput(name='Cube Count', value=5, start=1, end=20)
    color_selector = pn.widgets.ColorPicker(name='Cube Color', value='#ff0000')  

    rtf.counter = counter
    rtf.color_selector = color_selector

    counter.param.watch(lambda event: setattr(rtf, 'cube_count', event.new), 'value')
    color_selector.param.watch(lambda event: setattr(rtf, 'cube_color', event.new), 'value')

    rtf.cube_count = counter.value
    rtf.cube_color = color_selector.value

    rtf.show()
