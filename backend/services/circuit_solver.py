import numpy as np
from models.circuit_components import Resistor, VoltageSource, CurrentSource

class CircuitSolver:
    def __init__(self, circuit_model):
        self.model = circuit_model
        self.ref_node = self.model.reference_node
        
        # Get all components
        self.resistors = [c for c in self.model.components.values() if isinstance(c, Resistor)]
        self.voltage_sources = [c for c in self.model.components.values() if isinstance(c, VoltageSource)]
        self.current_sources = [c for c in self.model.components.values() if isinstance(c, CurrentSource)]
        
        # Non-reference nodes (exclude ground)
        self.non_ref_nodes = sorted([n for n in self.model.nodes if n != self.ref_node])
        self.num_nodes = len(self.non_ref_nodes)
        self.num_vs = len(self.voltage_sources)
        
        # Mappings
        self.node_to_index = {node: i for i, node in enumerate(self.non_ref_nodes)}
        self.vs_to_index = {i: vs for i, vs in enumerate(self.voltage_sources)}
        self.index_to_node = {i: node for node, i in self.node_to_index.items()}

    def solve(self):
        """Solve circuit using proper MNA"""
        try:
            # Build MNA matrices
            G, Z = self._build_mna_system()
            
            # Solve [G][X] = [Z]
            X = np.linalg.solve(G, Z)
            
            # Extract solution
            node_voltages = X[:self.num_nodes]
            vs_currents = X[self.num_nodes:]
            
            return self._package_solution(node_voltages, vs_currents, G, Z)
            
        except np.linalg.LinAlgError as e:
            return self._create_error_response(f"Singular matrix: Circuit may be unsolvable. {str(e)}")
        except Exception as e:
            return self._create_error_response(f"Solver error: {str(e)}")

    def _build_mna_system(self):
        """Build the complete MNA system: [G][X] = [Z]"""
        size = self.num_nodes + self.num_vs
        G = np.zeros((size, size))
        Z = np.zeros(size)
        
        # 1. Stamp resistors (conductance matrix)
        self._stamp_conductances(G)
        
        # 2. Stamp current sources (right-hand side)
        self._stamp_current_sources(Z)
        
        # 3. Stamp voltage sources (additional equations)
        self._stamp_voltage_sources(G, Z)
        
        return G, Z

    def _stamp_conductances(self, G):
        """Stamp all resistors into conductance matrix"""
        for resistor in self.resistors:
            n1, n2 = resistor.node1, resistor.node2
            g = 1.0 / resistor.value
            
            # Both nodes are non-reference
            if n1 != self.ref_node and n2 != self.ref_node:
                i = self.node_to_index[n1]
                j = self.node_to_index[n2]
                G[i, i] += g
                G[j, j] += g
                G[i, j] -= g
                G[j, i] -= g
            
            # n1 is non-reference, n2 is ground
            elif n1 != self.ref_node and n2 == self.ref_node:
                i = self.node_to_index[n1]
                G[i, i] += g
            
            # n2 is non-reference, n1 is ground  
            elif n2 != self.ref_node and n1 == self.ref_node:
                j = self.node_to_index[n2]
                G[j, j] += g

    def _stamp_current_sources(self, Z):
        """Stamp all current sources into source vector"""
        for cs in self.current_sources:
            n1, n2 = cs.node1, cs.node2
            current = cs.value  # Flows from n1 to n2
            
            # Current LEAVES n1, ENTERS n2
            if n1 != self.ref_node:
                i = self.node_to_index[n1]
                Z[i] -= current  # Negative because it leaves
            
            if n2 != self.ref_node:
                j = self.node_to_index[n2]
                Z[j] += current  # Positive because it enters

    def _stamp_voltage_sources(self, G, Z):
        """Stamp all voltage sources (adds equations and variables)"""
        for vs_idx, vs in enumerate(self.voltage_sources):
            n1, n2 = vs.node1, vs.node2
            voltage = vs.value
            
            # Row index for this VS equation
            vs_row = self.num_nodes + vs_idx
            # Column index for this VS current variable
            vs_col = self.num_nodes + vs_idx
            
            # KVL Constraint: V_n1 - V_n2 = voltage
            if n1 != self.ref_node:
                i = self.node_to_index[n1]
                G[vs_row, i] = 1.0
            if n2 != self.ref_node:
                j = self.node_to_index[n2]
                G[vs_row, j] = -1.0
            
            Z[vs_row] = voltage
            
            # KCL Contributions: Current I_vs leaves n1, enters n2
            if n1 != self.ref_node:
                i = self.node_to_index[n1]
                G[i, vs_col] = 1.0
            if n2 != self.ref_node:
                j = self.node_to_index[n2]
                G[j, vs_col] = -1.0

    def _package_solution(self, node_voltages, vs_currents, G, Z):
        """Package the complete solution"""
        # Build voltages dictionary (include ground)
        voltages = {self.ref_node: 0.0}
        for i, voltage in enumerate(node_voltages):
            node = self.index_to_node[i]
            voltages[node] = float(voltage)
        
        # Calculate component results
        component_results = []
        total_power = 0.0
        
        # Process all components
        for comp in self.model.components.values():
            result = self._calculate_component_result(comp, voltages, vs_currents)
            component_results.append(result)
            total_power += result["power"]
        
        return {
            "status": "success",
            "voltages": voltages,
            "components": component_results,
            "total_power": float(total_power),
            "matrix_solution": self._build_matrix_info(G, Z, np.concatenate([node_voltages, vs_currents])),
            "summary": {
                "total_components": len(self.model.components),
                "solved_nodes": len(voltages),
                "power_balance": abs(total_power) < 1e-9
            }
        }

    def _calculate_component_result(self, comp, voltages, vs_currents):
        """Calculate V, I, P for a component"""
        v1 = voltages.get(comp.node1, 0.0)
        v2 = voltages.get(comp.node2, 0.0)
        voltage = v1 - v2
        current = 0.0
        power = 0.0
        
        if isinstance(comp, Resistor):
            current = voltage / comp.value
            power = voltage * current  # Always positive (dissipation)
            
        elif isinstance(comp, VoltageSource):
            # Find this VS current in the solution
            for vs_idx, vs in enumerate(self.voltage_sources):
                if vs.id == comp.id:
                    current = vs_currents[vs_idx]
                    break
            power = voltage * current  # Negative = supplying
            
        elif isinstance(comp, CurrentSource):
            current = comp.value  # Fixed current
            power = voltage * current  # Negative = supplying
        
        # Ensure no NaN
        if np.isnan(current): current = 0.0
        if np.isnan(power): power = 0.0
        
        return {
            "id": str(comp.id),
            "type": comp.__class__.__name__.replace("Source", " Source"),
            "value": float(comp.value),
            "node1": int(comp.node1),
            "node2": int(comp.node2),
            "voltage": float(voltage),
            "current": float(current),
            "power": float(power),
            "description": self._get_power_description(power)
        }

    def _get_power_description(self, power):
        """Get human-readable power description"""
        if power < -1e-12:
            return f"Supplying {abs(power):.6f} W"
        elif power > 1e-12:
            return f"Absorbing {power:.6f} W"
        else:
            return "0 W"

    def _build_matrix_info(self, G, Z, X):
        """Build matrix solution information"""
        try:
            residual = G @ X - Z
            max_error = float(np.max(np.abs(residual)))
            
            return {
                "conductance_matrix": G.tolist(),
                "current_vector": Z.tolist(),
                "voltage_solution": X.tolist(),
                "matrix_equation": "[G][X] = [Z]",
                "solution_method": "Modified Nodal Analysis (MNA)",
                "steps": [
                    "Constructed conductance matrix from resistors",
                    "Added current source contributions to source vector",
                    "Added voltage source constraints and variables",
                    "Solved system using numpy.linalg.solve",
                    "Verified solution with residual analysis"
                ],
                "verification": {
                    "residual": residual.tolist(),
                    "max_error": max_error
                }
            }
        except:
            return {
                "conductance_matrix": [],
                "current_vector": [],
                "voltage_solution": [],
                "matrix_equation": "[G][X] = [Z]",
                "solution_method": "Modified Nodal Analysis (MNA)",
                "steps": ["Matrix solution data unavailable"],
                "verification": {
                    "residual": [],
                    "max_error": 0.0
                }
            }

    def _create_error_response(self, message):
        """Create error response"""
        return {
            "status": "error",
            "message": message,
            "suggestion": "Check circuit connectivity and component values"
        }