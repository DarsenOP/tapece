import networkx as nx
from models.circuit_components import VoltageSource

class NodalAnalysis:
    """Performs nodal analysis on a given circuit model."""
    
    def __init__(self, circuit_model):
        self.model = circuit_model
        self.non_ref_nodes = self.model.get_non_reference_nodes()
        self.num_nodes = len(self.non_ref_nodes)
        self.voltage_sources = [
            c for c in self.model.components.values() 
            if isinstance(c, VoltageSource)
        ]
        self.supernodes = self._find_supernodes()
        self.grounded_supernodes = self._get_grounded_supernodes()
        self.analysis = self._analyze()

    def _find_supernodes(self):
        """Identifies supernodes in the circuit"""
        g = self.model.graph
        vs_graph = nx.Graph()
        
        # Add ALL nodes to the graph
        vs_graph.add_nodes_from(self.model.nodes)
        
        # Add edges between nodes connected by a VS
        for vs in self.voltage_sources:
            u, v = vs.node1, vs.node2
            vs_graph.add_edge(u, v)

        # Connected components with more than one node are supernodes
        return [
            set(c) for c in nx.connected_components(vs_graph) 
            if len(c) > 1
        ]

    def _get_grounded_supernodes(self):
        """Get supernodes that contain the reference node"""
        return [
            sn for sn in self.supernodes 
            if self.model.reference_node in sn
        ]

    def _analyze(self):
        """Provides a summary of the circuit for nodal analysis."""
        
        # Count equations properly
        regular_nodes = [
            n for n in self.non_ref_nodes 
            if not any(n in sn for sn in self.supernodes)
        ]
        
        ungrounded_supernodes = [
            sn for sn in self.supernodes 
            if self.model.reference_node not in sn
        ]
        
        num_kcl_equations = len(regular_nodes) + len(ungrounded_supernodes)
        num_constraint_equations = len(self.voltage_sources)

        return {
            "conventions": {
                "Resistor": "Current flows from node1 to node2.",
                "VoltageSource": "Voltage at node1 is higher than node2 (V(node1) - V(node2) = value).",
                "CurrentSource": "Current (value) flows from node1 to node2.", 
            },
            "reference_node": self.model.reference_node,
            "non_reference_nodes": self.non_ref_nodes,
            "num_non_reference_nodes": len(self.non_ref_nodes),  # ADD THIS LINE - Frontend expects this
            "supernodes": [list(sn) for sn in self.supernodes],
            "grounded_supernodes": [list(sn) for sn in self.grounded_supernodes],
            "ungrounded_supernodes": [list(sn) for sn in self.supernodes if self.model.reference_node not in sn],
            "regular_nodes": regular_nodes,
            "num_kcl_equations": num_kcl_equations,
            "num_constraint_equations": num_constraint_equations,
            "num_voltage_sources": len(self.voltage_sources),
            "total_equations": num_kcl_equations + num_constraint_equations
        }

    def get_analysis_summary(self):
        """Returns the analysis summary dictionary."""
        return self.analysis