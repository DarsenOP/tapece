from circuit_components import Resistor, VoltageSource, CurrentSource
from circuit_model import CircuitModel
from equation_builder import EquationBuilder

def test_equations():
    print("🧪 Testing Equation Builder...")
    
    circuit = CircuitModel()
    
    # Create a circuit with supernodes
    vs1 = VoltageSource(250, 1, 0)
    vs2 = VoltageSource(4, 4, 2) 
    r1 = Resistor(50, 1, 3)  # Within supernode
    r2 = Resistor(10, 3, 2)  # Connects supernode to regular node
    r3 = Resistor(10, 4, 3)  # Connects supernode to regular node
    r4 = Resistor(40, 4, 0)  # Connects supernode to regular node
    cs1 = CurrentSource(0.2, 2, 0)
    cs2 = CurrentSource(5, 0, 2)


    circuit.add_component(vs1)
    circuit.add_component(vs2)
    circuit.add_component(r1)
    circuit.add_component(r2)
    circuit.add_component(r3)
    circuit.add_component(r4)
    circuit.add_component(cs1)
    circuit.add_component(cs2)
    circuit.set_reference_node(0)
    
    builder = EquationBuilder(circuit)
    equations = builder.build_equations()
    
    print("Equations:")
    for eq in equations:
        print(f"  {eq}")

if __name__ == "__main__":
    test_equations()
