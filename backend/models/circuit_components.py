import uuid

class Component:
    """Base class for all circuit components."""
    
    def __init__(self, value, node1, node2):
        self.id = str(uuid.uuid4())
        self.value = float(value)
        self.node1 = self._parse_node(node1)
        self.node2 = self._parse_node(node2)

    def _parse_node(self, node):
        """Parse node value, converting 'GND' to 0"""
        if str(node).upper() == 'GND':
            return 0
        return int(node)

    def __repr__(self):
        return f"{self.__class__.__name__}({self.value}, {self.node1}, {self.node2})"

class Resistor(Component):
    """
    Represents a resistor in the circuit.
    Convention: Current flows from node1 to node2.
    """
    pass

class VoltageSource(Component):
    """
    Represents an independent voltage source.
    Convention: The voltage at node1 is higher than node2 (V(node1) - V(node2) = value).
    """
    pass

class CurrentSource(Component):
    """
    Represents an independent current source.
    Convention: Current flows from node1 to node2.
    """
    pass