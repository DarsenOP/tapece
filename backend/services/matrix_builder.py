import numpy as np
import re
from models.circuit_components import Resistor, VoltageSource, CurrentSource

class MatrixBuilder:
    def __init__(self, circuit_model, supernodes):
        self.model = circuit_model
        self.supernodes = supernodes
        self.non_ref_nodes = self.model.get_non_reference_nodes()
        self.voltage_sources = [
            c for c in self.model.components.values() 
            if isinstance(c, VoltageSource)
        ]
        
        self.num_nodes = len(self.non_ref_nodes)
        self.num_vs = len(self.voltage_sources)
        self.matrix_size = self.num_nodes + self.num_vs
        
        # Mappings
        self.node_to_index = {node: i for i, node in enumerate(self.non_ref_nodes)}
        self.vs_to_index = {vs.id: i for i, vs in enumerate(self.voltage_sources)}
        self.index_to_node = {i: node for node, i in self.node_to_index.items()}

    def build_matrices_from_equations(self, equations):
        """Build MNA matrices by parsing the equation strings"""
        G = np.zeros((self.matrix_size, self.matrix_size))
        Z = np.zeros(self.matrix_size)
        
        # Process each equation
        for i, equation in enumerate(equations):
            if 'Node' in equation:
                self._process_node_equation(equation, G, Z, i)
            elif 'Supernode' in equation:
                self._process_supernode_equation(equation, G, Z, i)
            elif 'V_' in equation:  # Constraint equation
                self._process_constraint_equation(equation, G, Z, i)
        
        return G, Z

    def _process_node_equation(self, equation, G, Z, eq_index):
        """Process KCL equation for a regular node"""
        # Extract node number: "Node 1: $\frac{V_1}{1000.0} - \frac{V_1 - V_2}{2000.0} = 0$"
        match = re.search(r'Node (\d+):', equation)
        if not match:
            return
            
        node = int(match.group(1))
        if node not in self.node_to_index:
            return
            
        row = self.node_to_index[node]
        
        # Extract the equation part inside $$
        eq_match = re.search(r'\$(.*)\$', equation)
        if not eq_match:
            return
            
        eq_text = eq_match.group(1)
        
        # Parse the equation terms
        self._parse_equation_terms(eq_text, G, Z, row)

    def _process_supernode_equation(self, equation, G, Z, eq_index):
        """Process KCL equation for a supernode"""
        # Supernode equations go in regular node rows
        # We need to assign them to the first node in the supernode
        match = re.search(r'Supernode \{([^}]+)\}:', equation)
        if not match:
            return
            
        nodes = [int(n) for n in match.group(1).split(',')]
        if not nodes:
            return
            
        # Use the first node as the row for this equation
        first_node = nodes[0]
        if first_node not in self.node_to_index:
            return
            
        row = self.node_to_index[first_node]
        
        # Extract and parse the equation
        eq_match = re.search(r'\$(.*)\$', equation)
        if eq_match:
            self._parse_equation_terms(eq_match.group(1), G, Z, row)

    def _process_constraint_equation(self, equation, G, Z, eq_index):
        """Process voltage source constraint equation"""
        # Constraint equations go in the voltage source rows
        row = self.num_nodes + eq_index - self._count_kcl_equations()
        
        # Parse constraint equation like "V_1 = 12.0" or "V_1 - V_2 = 5.0"
        if '=' in equation:
            left, right = equation.split('=', 1)
            right_val = float(right.strip())
            
            # Parse left side for node voltages
            left_terms = self._parse_voltage_terms(left)
            for node, coeff in left_terms:
                if node in self.node_to_index:
                    col = self.node_to_index[node]
                    G[row, col] = coeff
            
            Z[row] = right_val

    def _parse_equation_terms(self, eq_text, G, Z, row):
        """Parse equation terms like \frac{V_1}{1000.0}, \frac{V_1 - V_2}{2000.0}, etc."""
        # Remove "= 0" from KCL equations
        eq_text = eq_text.replace('= 0', '').strip()
        
        # Split by + and - while keeping the operators
        terms = re.findall(r'([+-]?[^+-]+)', eq_text)
        
        for term in terms:
            term = term.strip()
            if not term:
                continue
                
            # Determine sign
            sign = 1
            if term.startswith('-'):
                sign = -1
                term = term[1:].strip()
            elif term.startswith('+'):
                term = term[1:].strip()
            
            # Parse different term types
            if term.startswith(r'\frac'):
                self._parse_resistor_term(term, G, row, sign)
            elif re.match(r'^-?\d+\.?\d*$', term):  # Current source term like "2.0"
                Z[row] -= sign * float(term)  # Current entering node

    def _parse_resistor_term(self, term, G, row, sign):
        """Parse resistor term like \frac{V_1}{1000.0} or \frac{V_1 - V_2}{2000.0}"""
        # Extract numerator and denominator
        match = re.search(r'\\frac\{([^}]+)\}\{([^}]+)\}', term)
        if not match:
            return
            
        numerator = match.group(1)
        denominator = float(match.group(2))
        conductance = 1.0 / denominator
        
        # Parse numerator
        if ' - ' in numerator:
            # \frac{V_1 - V_2}{R}
            nodes_match = re.findall(r'V_\{(\d+)\}', numerator)
            if len(nodes_match) == 2:
                node1, node2 = map(int, nodes_match)
                if node1 in self.node_to_index:
                    col1 = self.node_to_index[node1]
                    G[row, col1] += sign * conductance
                if node2 in self.node_to_index:
                    col2 = self.node_to_index[node2]
                    G[row, col2] -= sign * conductance
        else:
            # \frac{V_1}{R} (connection to ground)
            node_match = re.search(r'V_\{(\d+)\}', numerator)
            if node_match:
                node = int(node_match.group(1))
                if node in self.node_to_index:
                    col = self.node_to_index[node]
                    G[row, col] += sign * conductance

    def _parse_voltage_terms(self, expression):
        """Parse voltage terms like V_1, V_2, etc. with coefficients"""
        terms = []
        
        # Handle cases like "V_1", "V_1 - V_2", etc.
        parts = re.findall(r'([+-]?)\s*V_\{(\d+)\}', expression)
        for sign, node_str in parts:
            node = int(node_str)
            coeff = 1.0
            if sign == '-':
                coeff = -1.0
            terms.append((node, coeff))
            
        return terms

    def _count_kcl_equations(self, equations):
        """Count how many KCL equations we have"""
        kcl_count = 0
        for eq in equations:
            if 'Node' in eq or 'Supernode' in eq:
                kcl_count += 1
        return kcl_count