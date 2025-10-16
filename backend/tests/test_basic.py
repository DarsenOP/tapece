# backend/tests/test_basic.py
import pytest
import sympy as sp
import networkx as nx
import numpy as np

def test_sympy_import_and_basic():
    """Test SymPy imports and can handle symbolic expressions (core for equation solving)."""
    x = sp.symbols('x')
    expr = sp.Eq(x**2 + 1, 0)
    sol = sp.solve(expr, x)
    assert sol == [-sp.I, sp.I]  # Expected complex roots for x^2 + 1 = 0
    print(f"SymPy version: {sp.__version__}")  # Logs version for debugging

def test_networkx_import_and_basic():
    """Test NetworkX imports and can create a directed graph (for circuit branches)."""
    G = nx.DiGraph()
    G.add_edge(0, 1, resistance=1000)  # Sample attribute like Ohm
    assert G.number_of_edges() == 1
    assert G[0][1]['resistance'] == 1000
    print(f"NetworkX version: {nx.__version__}")

def test_numpy_import_and_basic():
    """Test NumPy imports and can solve a simple matrix (fallback for numerical solves)."""
    A = np.array([[1, 2], [3, 4]])
    b = np.array([5, 6])
    sol = np.linalg.solve(A, b)
    np.testing.assert_allclose(sol, np.array([-4., 4.5]))  # Expected solution
    print(f"NumPy version: {np.__version__}")

def test_cross_library_compat():
    """Light integration: Use SymPy expr in NetworkX, convert to NumPy for solve."""
    G = nx.DiGraph()
    r1, r2 = sp.symbols('r1 r2')
    G.add_edge(0, 1, conductance=1/r1)  # Symbolic attribute
    assert isinstance(G[0][1]['conductance'], sp.Expr)
    
    # Numerical eval example
    numeric_cond = float(G[0][1]['conductance'].subs(r1, 1000))
    assert numeric_cond == 0.001
