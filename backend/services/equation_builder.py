from models.circuit_components import Resistor, VoltageSource, CurrentSource

class EquationBuilder:
    def __init__(self, circuit_model, supernodes):
        self.model = circuit_model
        self.supernodes = supernodes
        self.voltage_sources = [
            c for c in self.model.components.values() 
            if isinstance(c, VoltageSource)
        ]
        
        # Identify which nodes are in supernodes
        self.supernode_nodes = self._get_all_supernode_nodes()
        
    def _get_all_supernode_nodes(self):
        """Get all nodes that are part of any supernode"""
        all_nodes = set()
        for supernode in self.supernodes:
            all_nodes.update(supernode)
        return all_nodes
    
    def build_equations(self):
        """Build all equations using proper MNA procedure"""
        equations = []
        
        # 1. KCL equations for regular nodes (not in any supernode)
        equations.extend(self._build_regular_node_equations())
        
        # 2. KCL equations ONLY for supernodes WITHOUT ground
        equations.extend(self._build_ungrounded_supernode_equations())
        
        # 3. Voltage source constraint equations (for ALL voltage sources)
        equations.extend(self._build_voltage_source_constraints())
        
        return equations
    
    def _build_regular_node_equations(self):
        """Build KCL equations for nodes NOT in any supernode"""
        equations = []
        
        for node in self.model.get_non_reference_nodes():
            # Skip nodes that are in supernodes
            if node in self.supernode_nodes:
                continue
                
            equation_terms = []
            connected_components = self.model.get_components_connected_to_node(node)
            
            for comp, neighbor in connected_components:
                # Skip voltage sources (handled by constraints)
                if isinstance(comp, VoltageSource):
                    continue
                    
                if isinstance(comp, Resistor):
                    term = self._build_resistor_term(comp, node, neighbor)
                    if term:
                        equation_terms.append(term)
                elif isinstance(comp, CurrentSource):
                    term = self._build_current_source_term(comp, node)
                    if term:
                        equation_terms.append(term)
            
            if equation_terms:
                equation = " + ".join(equation_terms).replace("+ -", "- ") + " = 0"
                equations.append(f"Node {node}: ${equation}$")
        
        return equations

    def _build_ungrounded_supernode_equations(self):
        """Build KCL equations ONLY for supernodes that don't contain ground"""
        equations = []
        
        for supernode in self.supernodes:
            # Skip supernodes that contain ground
            if self.model.reference_node in supernode:
                continue
                
            equation_terms = []
            supernode_set = set(supernode)
            
            # Sum currents leaving the supernode boundary
            for node in supernode:
                connected_components = self.model.get_components_connected_to_node(node)
                
                for comp, neighbor in connected_components:
                    # Skip voltage sources within the supernode
                    if isinstance(comp, VoltageSource):
                        continue
                        
                    # Only include components connecting outside the supernode
                    if neighbor not in supernode_set:
                        if isinstance(comp, Resistor):
                            term = self._build_resistor_term(comp, node, neighbor)
                            if term:
                                equation_terms.append(term)
                        elif isinstance(comp, CurrentSource):
                            if comp.node1 == node:  # Current leaving supernode
                                equation_terms.append(f"{comp.value:.1f}")
                            elif comp.node2 == node:  # Current entering supernode
                                equation_terms.append(f"(-{comp.value:.1f})")
            
            if equation_terms:
                supernode_str = "{" + ",".join(map(str, sorted(list(supernode)))) + "}"
                equation = " + ".join(equation_terms).replace("+ -", "- ") + " = 0"
                equations.append(f"Supernode {supernode_str}: ${equation}$")
        
        return equations

    def _build_voltage_source_constraints(self):
        """Build constraint equations for ALL voltage sources"""
        constraints = []
        
        for vs in self.voltage_sources:
            n1 = vs.node1
            n2 = vs.node2
            val = vs.value
            
            if n1 == self.model.reference_node:
                constraints.append(f"V_{{{n2}}} = {-val:.1f}")
            elif n2 == self.model.reference_node:
                constraints.append(f"V_{{{n1}}} = {val:.1f}")
            else:
                constraints.append(f"V_{{{n1}}} - V_{{{n2}}} = {val:.1f}")
        
        return constraints

    def _build_resistor_term(self, resistor, node, neighbor):
        """Build resistor term for equation"""
        if neighbor == self.model.reference_node:
            return f"\\frac{{V_{{{node}}}}}{{{resistor.value:.1f}}}"
        else:
            return f"\\frac{{V_{{{node}}} - V_{{{neighbor}}}}}{{{resistor.value:.1f}}}"

    def _build_current_source_term(self, current_source, node):
        """Build current source term for equation"""
        if current_source.node1 == node:
            return f"{current_source.value:.1f}" 
        elif current_source.node2 == node:
            return f"(-{current_source.value:.1f})"
        return ""