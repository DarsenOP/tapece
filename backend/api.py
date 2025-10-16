# backend/api.py
from flask import Flask, request, jsonify
import networkx as nx
import sympy as sp

app = Flask(__name__)

@app.route('/api/parse', methods=['POST'])
def parse():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON received"}), 400
    
    G = nx.Graph()
    for node in data.get('nodes', []):
        G.add_node(node['id'], pos=(node['x'], node['y']))
    
    # Edges stub
    for edge in data.get('edges', []):
        value = sp.S(edge.get('value', '0'))
        G.add_edge(edge['from'], edge['to'], value=value)
    
    return jsonify({
        "status": "Parsed OK",
        "nodes": len(G.nodes()),
        "edges": len(G.edges()),
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)
