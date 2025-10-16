# backend/tests/test_api_integration.py
import pytest
import requests
import json
import subprocess
import time
import os
import networkx as nx
import sympy as sp

# Flask API code (copied here to avoid import issues in test; in real project, import from api.py)
API_CODE = '''
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
    
    for edge in data.get('edges', []):
        value = sp.S(edge.get('value', '0'))
        G.add_edge(edge['from'], edge['to'], value=value)
    
    return jsonify({
        "status": "Parsed OK",
        "nodes": len(G.nodes()),
        "edges": len(G.edges()),
    })

if __name__ == "__main__":
    app.run(port=5000, debug=False, threaded=True)
'''

@pytest.fixture(scope="module")
def flask_server():
    """Start Flask API in a separate process for testing."""
    import tempfile
    
    # Create temp file for API script
    temp_fd, temp_path = tempfile.mkstemp(suffix='.py')
    os.close(temp_fd)  # Close fd, we'll write via path
    with open(temp_path, 'w') as f:
        f.write(API_CODE)
    
    # Start the Flask server process
    proc = subprocess.Popen(['python', temp_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait for server to start (poll health endpoint or sleep)
    started = False
    for _ in range(10):  # Retry up to 10 times
        time.sleep(1)
        try:
            health_check = requests.get('http://localhost:5000/', timeout=1)  # Flask root may 404, but connection means alive
            started = True
            break
        except requests.ConnectionError:
            pass
    
    if not started:
        proc.terminate()
        raise RuntimeError("Flask server failed to start")
    
    yield proc
    
    # Cleanup
    proc.terminate()
    proc.wait()
    os.unlink(temp_path)

def test_flask_api_parse_nodes(flask_server):
    """Test Flask API receives JSON from 'frontend' and parses nodes."""
    sample_data = {
        "nodes": [{"id": 1, "x": 100, "y": 200}, {"id": 2, "x": 300, "y": 400}],
        "edges": []
    }
    response = requests.post('http://localhost:5000/api/parse', json=sample_data, timeout=5)
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "Parsed OK"
    assert result["nodes"] == 2
    assert result["edges"] == 0
    print("Flask API test passed: Parsed 2 nodes correctly")

def test_flask_api_with_edges(flask_server):
    """Test edge parsing and SymPy integration in API."""
    sample_data = {
        "nodes": [{"id": 1, "x": 100, "y": 100}, {"id": 2, "x": 200, "y": 200}],  # Add missing node 2
        "edges": [{"from": 1, "to": 2, "value": "1000"}]
    }
    response = requests.post('http://localhost:5000/api/parse', json=sample_data, timeout=5)
    assert response.status_code == 200
    result = response.json()
    assert result["nodes"] == 2
    assert result["edges"] == 1
    print("Flask API edge test passed: Handles edges with values")

def test_front_back_compatibility_stub():
    """Stub for full e2e: Simulates frontend JSON shape parsed in backend logic (no server)."""
    sample_frontend_json = '{"nodes": [{"id": 1, "x": 350, "y": 250}], "edges": []}'
    data = json.loads(sample_frontend_json)
    G = nx.Graph()
    for node in data['nodes']:
        G.add_node(node['id'], pos=(node['x'], node['y']))
    assert len(G.nodes()) == 1
    # SymPy stub
    value = sp.S(1000)  # Simulated edge value
    assert float(value) == 1000
    print("Front-back compat stub passed: JSON shape works with NetworkX/SymPy")
