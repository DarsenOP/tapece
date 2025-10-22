import networkx as nx
from models.circuit_components import VoltageSource

class CircuitModel:
    def __init__(self):
        self.graph = nx.MultiGraph()
        self.components = {}
        self.nodes = set()
        self.reference_node = 0  # Default to 0

    def add_component(self, component):
        """Adds a component to the circuit."""
        self.components[component.id] = component
        self.graph.add_edge(component.node1, component.node2, 
                           key=component.id, component=component)
        self.nodes.update([component.node1, component.node2])

    def set_reference_node(self, node):
        """
        Sets the reference node (ground).
        Robustly adds the node to the graph if it's not already present.
        """
        node = 0 if str(node).upper() == 'GND' else int(node)
        
        # --- FIX: Ensure the reference node is part of the node set ---
        if node not in self.nodes:
            self.nodes.add(node)
            self.graph.add_node(node) # Also add to graph
            
        self.reference_node = node

    def get_non_reference_nodes(self):
        """Returns a sorted list of non-reference nodes."""
        return sorted([n for n in self.nodes if n != self.reference_node])

    def get_components_connected_to_node(self, node):
        """Returns a list of (component, other_node) tuples."""
        connected_components = []
        if node not in self.graph:
            return []
            
        for neighbor, edges in self.graph[node].items():
            for key, data in edges.items():
                component = data.get('component')
                if component:
                    connected_components.append((component, neighbor))
        return connected_components

    def get_voltage_sources_between_nodes(self, node1, node2):
        """
        Efficiently finds all voltage sources between two nodes.
        --- REFACTORED FOR EFFICIENCY ---
        """
        vs_list = []
        if not self.graph.has_edge(node1, node2):
            return []
            
        for key, data in self.graph.get_edge_data(node1, node2).items():
            comp = data.get('component')
            if isinstance(comp, VoltageSource):
                vs_list.append(comp)
        return vs_list

    # --- REMOVED find_supernodes() ---
    # This logic is correctly handled by NodalAnalysis strategy
    # to avoid repeating code (DRY principle).

    def __repr__(self):
        return (f"<CircuitModel: {len(self.nodes)} nodes, "
                f"{len(self.components)} components>")