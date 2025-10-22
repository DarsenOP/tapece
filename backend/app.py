import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from models.circuit_components import Resistor, VoltageSource, CurrentSource
from models.circuit_model import CircuitModel
from services.equation_builder import EquationBuilder
from services.circuit_solver import CircuitSolver  # <-- Moved to top
from analysis_strategies import NodalAnalysis

app = Flask(__name__)
CORS(app)

# Component type mappings
COMPONENT_MAP = {
    "RESISTOR": Resistor,
    "VOLTAGE SOURCE": VoltageSource, 
    "CURRENT SOURCE": CurrentSource,
    "VS": VoltageSource,
    "CS": CurrentSource,
    "R": Resistor,
    "VOLTAGE": VoltageSource,
    "CURRENT": CurrentSource
}

@app.route('/api/solve-circuit', methods=['POST'])
def solve_circuit():
    """Solve circuit using nodal analysis"""
    data = request.get_json()
    
    if not data or "components" not in data:
        return jsonify({
            "success": False, 
            "error": "Invalid input. 'components' key is missing."
        }), 400

    try:
        app.logger.info("🔧 Building circuit model...")
        model = _build_circuit_model(data["components"])
        app.logger.info(f"✅ Model built with {len(model.components)} components")
        
        # Get analysis steps
        app.logger.info("🔧 Building circuit analysis...")
        analysis_data = build_circuit_analysis(model)
        app.logger.info("✅ Analysis built")
        
        # Get numerical solution
        app.logger.info("🔧 Solving circuit numerically...")
        solver = CircuitSolver(model)
        solution = solver.solve()
        app.logger.info(f"✅ Numerical solution: {solution['status']}")
        
        if solution["status"] == "error":
            return jsonify({
                "success": False,
                "error": solution["message"],
                "suggestion": solution.get("suggestion")
            }), 400
        
        response = {
            "success": True,
            "analysis": analysis_data,
            "solution": solution,
            "circuit_info": {
                "total_components": len(model.components),
                "total_nodes": len(model.nodes),
                "non_reference_nodes": model.get_non_reference_nodes(),
                "reference_node": model.reference_node,
                "supernodes": analysis_data["circuitStatistics"]["supernodes"] # <-- Get from analysis
            }
        }
        
        app.logger.info("🎉 Successfully solved circuit!")
        return jsonify(response)

    except (KeyError, ValueError, TypeError) as e:
        # Handle specific input-related errors
        app.logger.warning(f"❌ Client input error in solve-circuit: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Invalid input: {str(e)}"
        }), 400
        
    except Exception as e:
        # Handle unexpected server errors
        app.logger.error(f"❌ Server error in solve-circuit: {str(e)}")
        app.logger.error("🔍 Full traceback:")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"An unexpected server error occurred: {str(e)}"
        }), 500

def _build_circuit_model(components_data):
    """Build circuit model from component data"""
    model = CircuitModel()
    
    if not isinstance(components_data, list):
        raise ValueError("'components' must be a list.")
        
    for i, comp_data in enumerate(components_data):
        if not isinstance(comp_data, dict):
            raise ValueError(f"Component at index {i} is not a valid object.")
            
        # Validate required keys
        required_keys = ["type", "value", "nodeA", "nodeB"]
        if not all(k in comp_data for k in required_keys):
            raise KeyError(f"Component at index {i} is missing required keys: {required_keys}")
            
        comp_type = comp_data["type"].upper().strip()
        comp_class = COMPONENT_MAP.get(comp_type)
        
        if not comp_class:
            raise ValueError(
                f"Unknown component type: {comp_data['type']}. "
                f"Supported: {list(COMPONENT_MAP.keys())}"
            )
        
        # Validate value
        try:
            value = float(comp_data["value"])
        except (ValueError, TypeError):
            raise ValueError(f"Invalid 'value' for component {i}: {comp_data['value']}. Must be a number.")
        
        component = comp_class(
            value=value,
            node1=int(comp_data["nodeA"]),
            node2=int(comp_data["nodeB"])
        )
        model.add_component(component)

    model.set_reference_node(0)  # Always set reference to 0 (GND). This is now robust.
    return model

def build_circuit_analysis(model):
    """Build comprehensive circuit analysis as structured JSON"""
    # Get analysis summary
    nodal_analysis = NodalAnalysis(model)
    analysis_summary = nodal_analysis.get_analysis_summary()
    
    # Build equations
    supernode_list = nodal_analysis.supernodes  
    equation_builder = EquationBuilder(model, supernode_list)
    equations = equation_builder.build_equations()
    
    # Count components by type (cleaner)
    counts = {"resistors": 0, "voltageSources": 0, "currentSources": 0}
    for c in model.components.values():
        if isinstance(c, Resistor): counts["resistors"] += 1
        elif isinstance(c, VoltageSource): counts["voltageSources"] += 1
        elif isinstance(c, CurrentSource): counts["currentSources"] += 1
    
    analysis = {
        "overview": {
            "title": "Circuit Analysis Solution",
            "subtitle": "Step-by-Step Node Voltage Method",
            "summary": _generate_analysis_summary(model, analysis_summary)
        },
        "circuitStatistics": {
            "totalNodes": len(model.nodes),
            "referenceNode": model.reference_node,
            "nonReferenceNodes": analysis_summary["non_reference_nodes"],  # Use from analysis_summary
            "supernodes": analysis_summary["supernodes"],
            "components": {
                **counts,
                "total": len(model.components)
            }
        },
        "components": _build_components_list(model),
        "analysisMethod": {
            "name": "Node Voltage Method (MNA)",
            "description": "We analyze the circuit by applying Kirchhoff's Current Law (KCL) at each non-reference node and solving for the node voltages. Voltage sources are handled using Modified Nodal Analysis (MNA).",
            "steps": [
                "Select Node 0 as the reference (ground) node",
                "Identify all non-reference nodes",
                "Find supernodes (nodes connected by voltage sources)",
                "Write KCL equations for all non-reference nodes",
                "Add constraint equations for all voltage sources",
                "Solve the resulting system of linear equations"
            ],
            "conventions": analysis_summary["conventions"]
        },
        "solutionSteps": _build_solution_steps(equations),
        "matrixFormulation": {
            "description": "The system of equations is represented in matrix form (Modified Nodal Analysis):",
            "equation": "[G][X] = [Z]",
            "explanation": "Where [G] is the MNA matrix, [X] is the solution vector (containing unknown node voltages and voltage source currents), and [Z] is the source vector."
        },
        "nextSteps": {
            "description": "To complete the analysis:",
            "actions": [
                "Set up the MNA matrix based on all components",
                "Construct the source vector",
                "Solve the linear system for all unknown voltages and currents",
                "Verify the solution satisfies all KCL/KVL equations"
            ]
        }
    }
    
    return analysis

def _generate_analysis_summary(model, analysis_summary):
    """Generate analysis summary text"""
    return (
        f"This circuit has {len(model.nodes)} nodes and {len(model.components)} components. "
        f"We'll use Modified Nodal Analysis to solve for {analysis_summary['num_non_reference_nodes']} node voltages "
        f"and {analysis_summary['num_voltage_sources']} voltage source currents."
    )

def _generate_analysis_summary(model, analysis_summary):
    """Generate analysis summary text"""
    return (
        f"This circuit has {len(model.nodes)} nodes and {len(model.components)} components. "
        f"We'll use Modified Nodal Analysis to solve for {analysis_summary['num_non_reference_nodes']} node voltages "
        f"and {analysis_summary['num_voltage_sources']} voltage source currents."
    )

def _build_components_list(model):
    """Build structured components list (cleaner)"""
    components_list = []
    comp_counts = {"R": 1, "VS": 1, "CS": 1}
    
    # Sort for consistent ordering
    sorted_components = sorted(
        model.components.values(), 
        key=lambda c: (c.__class__.__name__, c.node1, c.node2)
    )

    for c in sorted_components:
        if isinstance(c, Resistor):
            comp_id = f"R{comp_counts['R']}"
            comp_counts['R'] += 1
            components_list.append({
                "id": comp_id, "type": "Resistor", "value": f"{c.value} Ω",
                "nodes": f"{c.node1} → {c.node2}",
                "description": "Obeys Ohm's Law: V = I × R",
                "currentFlow": f"Current (I={comp_id}) flows from node {c.node1} to node {c.node2}"
            })
        elif isinstance(c, VoltageSource):
            comp_id = f"VS{comp_counts['VS']}"
            comp_counts['VS'] += 1
            components_list.append({
                "id": comp_id, "type": "Voltage Source", "value": f"{c.value} V",
                "nodes": f"{c.node1}(+) → {c.node2}(-)",
                "description": f"Maintains constant voltage: V({c.node1}) - V({c.node2}) = {c.value}V",
                "constraint": "This source defines a voltage constraint equation."
            })
        elif isinstance(c, CurrentSource):
            comp_id = f"CS{comp_counts['CS']}"
            comp_counts['CS'] += 1
            components_list.append({
                "id": comp_id, "type": "Current Source", "value": f"{c.value} A",
                "nodes": f"{c.node1} → {c.node2}",
                "description": f"Provides constant current: I = {c.value}A",
                "currentFlow": f"Current flows from node {c.node1} to node {c.node2}"
            })
    
    return components_list

# Note: The functions below are still parsing strings from EquationBuilder.
# A more robust solution would be for EquationBuilder to return
# structured data, but these functions are kept for compatibility
# with the provided `equation_builder.py` structure.

def _build_solution_steps(equations):
    """Build structured solution steps from equations"""
    steps = []
    step_number = 1
    
    for eq in equations:
        if 'Node' in eq:
            steps.extend(_process_node_equation(eq, step_number))
            step_number += 1
        elif 'Supernode' in eq:
            steps.extend(_process_supernode_equation(eq, step_number))
            step_number += 1
        else:
            steps.append(_process_constraint_equation(eq))
    
    return steps

def _process_node_equation(equation, step_number):
    """Process regular node equation"""
    try:
        node_num = equation.split('Node ')[1].split(':')[0]
        latex_eq = equation.split('$')[1] if '$' in equation else equation
    except IndexError:
        node_num = "?"
        latex_eq = equation
    
    return [{
        "type": "kcl",
        "stepNumber": step_number,
        "title": f"Step {step_number}: KCL at Node {node_num}",
        "description": f"Applying Kirchhoff's Current Law at Node {node_num} - the sum of all currents leaving the node equals zero.",
        "equation": latex_eq,
        "explanation": f"This equation ensures current conservation at Node {node_num}. We sum all currents leaving the node.",
        "keyPoint": "Convention: Currents leaving the node are positive, currents entering are negative."
    }]

def _process_supernode_equation(equation, step_number):
    """Process supernode equation"""
    try:
        supernode_str = equation.split('Supernode ')[1].split(':')[0]
        latex_eq = equation.split('$')[1] if '$' in equation else equation
    except IndexError:
        supernode_str = "{?}"
        latex_eq = equation
        
    return [{
        "type": "supernode_kcl",
        "stepNumber": step_number,
        "title": f"Step {step_number}: KCL for Supernode {supernode_str}",
        "description": f"Applying KCL to the entire supernode {supernode_str} - the sum of currents leaving the supernode boundary equals zero.",
        "equation": latex_eq,
        "explanation": f"A supernode combines multiple nodes connected by voltage sources. We treat them as a single entity for KCL.",
        "keyPoint": "We only sum currents flowing from a node *inside* the supernode to a node *outside* it."
    }]

def _process_constraint_equation(equation):
    """Process constraint equation"""
    latex_eq = equation.split('$')[1] if '$' in equation else equation
    
    return {
        "type": "constraint",
        "title": "Voltage Source Constraint",
        "description": "This equation comes from a voltage source in the circuit.",
        "equation": latex_eq,
        "explanation": "Voltage sources define fixed potential differences between nodes, providing essential constraints for our system.",
        "keyPoint": "Each voltage source adds one constraint equation."
    }

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Backend is running!"})

if __name__ == '__main__':
    app.logger.info("🚀 Starting Flask server on http://localhost:5000")
    app.run(debug=True, port=5000)
